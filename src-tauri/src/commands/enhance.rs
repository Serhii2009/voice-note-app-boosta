use serde_json::json;
use tauri::State;

use crate::{
    error::{AppError, Result},
    AppState,
};

#[tauri::command]
pub async fn enhance_text(state: State<'_, AppState>, text: String) -> Result<String> {
    let (api_key, model_name) = {
        let settings = state.settings.lock().unwrap();
        if settings.gemini_api_key.is_empty() {
            return Err(AppError::NoApiKey);
        }
        (settings.gemini_api_key.clone(), settings.model_name.clone())
    };

    let prompt = format!(
        "Clean up this voice transcription. Remove filler words (um, uh, like, you know, and similar in any language). Fix grammar and punctuation. Improve sentence flow and readability. Preserve the original meaning exactly — do not summarize, condense, or add any new content. Return only the cleaned text:\n\n{}",
        text
    );

    let body = json!({
        "contents": [{
            "parts": [{ "text": prompt }]
        }],
        "generationConfig": {
            "temperature": 0.3
        }
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model_name, api_key
    );

    let client = reqwest::Client::new();

    for attempt in 0..2 {
        let resp = client.post(&url).json(&body).send().await;

        match resp {
            Ok(r) => {
                let status = r.status();
                if status == 401 || status == 403 {
                    return Err(AppError::InvalidApiKey);
                }
                if status.is_server_error() && attempt == 0 {
                    continue;
                }
                if !status.is_success() {
                    let text = r.text().await.unwrap_or_default();
                    return Err(AppError::GeminiApi(format!("HTTP {}: {}", status, text)));
                }
                let json: serde_json::Value = r.json().await?;
                let result = json
                    .pointer("/candidates/0/content/parts/0/text")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .ok_or_else(|| {
                        AppError::GeminiApi("Unexpected response structure".to_string())
                    })?;
                return Ok(result);
            }
            Err(e) if attempt == 0 => {
                let _ = e;
                continue;
            }
            Err(e) => return Err(AppError::Http(e)),
        }
    }

    Err(AppError::GeminiApi("Max retries exceeded".to_string()))
}
