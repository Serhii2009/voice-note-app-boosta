use tauri::State;

use crate::{
    error::Result,
    models::note::Note,
    storage::notes_store,
    AppState,
};

#[tauri::command]
pub async fn get_notes(state: State<'_, AppState>) -> Result<Vec<Note>> {
    let notes = state.notes.lock().unwrap().clone();
    Ok(notes)
}

#[tauri::command]
pub async fn save_note(state: State<'_, AppState>, note: Note) -> Result<Note> {
    let mut notes = state.notes.lock().unwrap();
    // Upsert: replace if id matches, otherwise prepend
    if let Some(existing) = notes.iter_mut().find(|n| n.id == note.id) {
        *existing = note.clone();
    } else {
        notes.insert(0, note.clone());
    }
    notes_store::save(&state.data_dir, &notes)?;
    Ok(note)
}

#[tauri::command]
pub async fn delete_note(state: State<'_, AppState>, id: String) -> Result<()> {
    let mut notes = state.notes.lock().unwrap();
    notes.retain(|n| n.id != id);
    notes_store::save(&state.data_dir, &notes)?;
    Ok(())
}

#[tauri::command]
pub async fn update_note_title(
    state: State<'_, AppState>,
    id: String,
    title: String,
) -> Result<()> {
    let mut notes = state.notes.lock().unwrap();
    if let Some(note) = notes.iter_mut().find(|n| n.id == id) {
        note.user_title = if title.trim().is_empty() {
            None
        } else {
            Some(title)
        };
    }
    notes_store::save(&state.data_dir, &notes)?;
    Ok(())
}
