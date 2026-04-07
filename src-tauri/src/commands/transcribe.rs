use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use serde_json::json;
use tauri::State;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::note::Note,
    storage::{notes_store, settings_store},
    AppState,
};

/// `save = true` (default): transcribe and persist the note.
/// `save = false`: transcribe only — return the note shape but skip disk write and counter.
/// Used for hotkey recordings where text is auto-inserted into another app instead.
#[tauri::command]
pub async fn transcribe_audio(
    state: State<'_, AppState>,
    audio_data: Vec<u8>,
    mime_type: String,
    save: bool,
) -> Result<Note> {
    let (api_key, model_name) = {
        let settings = state.settings.lock().unwrap();
        if settings.gemini_api_key.is_empty() {
            return Err(AppError::NoApiKey);
        }
        (settings.gemini_api_key.clone(), settings.model_name.clone())
    };

    let audio_b64 = BASE64.encode(&audio_data);

    let body = json!({
        "contents": [{
            "parts": [
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": audio_b64
                    }
                },
                {
                    "text": "Transcribe this audio recording accurately. Return only the transcription text — no commentary, no labels, no formatting. Preserve the spoken language exactly as spoken; do not translate. Russian and Ukrainian must be transcribed in their original scripts."
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0
        }
    });

    let transcription = call_gemini_with_retry(&api_key, &model_name, &body).await?;

    if transcription.trim().is_empty() {
        return Err(AppError::GeminiApi("empty_transcription".to_string()));
    }

    if !save {
        // Transcribe-only path: return the text without persisting anything.
        // The note object is returned so JS can read .transcription uniformly,
        // but it is not stored to disk or added to the notes list.
        return Ok(Note {
            id: String::new(),
            auto_title: String::new(),
            user_title: None,
            transcription,
            enhanced_text: None,
            created_at: Utc::now(),
        });
    }

    // Increment note_counter and generate auto-title
    let (auto_title, note_id) = {
        let mut settings = state.settings.lock().unwrap();
        settings.note_counter += 1;
        let title = format!("Text {}", settings.note_counter);
        let id = Uuid::new_v4().to_string();
        settings_store::save(&state.data_dir, &settings)?;
        (title, id)
    };

    let note = Note {
        id: note_id,
        auto_title,
        user_title: None,
        transcription,
        enhanced_text: None,
        created_at: Utc::now(),
    };

    {
        let mut notes = state.notes.lock().unwrap();
        notes.insert(0, note.clone());
        notes_store::save(&state.data_dir, &notes)?;
    }

    Ok(note)
}

async fn call_gemini_with_retry(
    api_key: &str,
    model: &str,
    body: &serde_json::Value,
) -> Result<String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let client = reqwest::Client::new();

    for attempt in 0..2 {
        let resp = client.post(&url).json(body).send().await;

        match resp {
            Ok(r) => {
                let status = r.status();
                if status == 401 || status == 403 {
                    return Err(AppError::InvalidApiKey);
                }
                if status.is_server_error() && attempt == 0 {
                    // retry once on 5xx
                    continue;
                }
                if !status.is_success() {
                    let text = r.text().await.unwrap_or_default();
                    return Err(AppError::GeminiApi(format!("HTTP {}: {}", status, text)));
                }
                let json: serde_json::Value = r.json().await?;
                let text = extract_text(&json)?;
                return Ok(text);
            }
            Err(e) if attempt == 0 => {
                // retry once on network error
                let _ = e;
                continue;
            }
            Err(e) => return Err(AppError::Http(e)),
        }
    }

    Err(AppError::GeminiApi("Max retries exceeded".to_string()))
}

fn extract_text(json: &serde_json::Value) -> Result<String> {
    json.pointer("/candidates/0/content/parts/0/text")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::GeminiApi("Unexpected response structure".to_string()))
}
