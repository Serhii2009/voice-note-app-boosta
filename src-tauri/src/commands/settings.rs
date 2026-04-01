use tauri::State;

use crate::{
    error::Result,
    models::settings::Settings,
    storage::settings_store,
    AppState,
};

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Settings> {
    let settings = state.settings.lock().unwrap().clone();
    Ok(settings)
}

/// Only updates the API key field. Never touches note_counter.
#[tauri::command]
pub async fn save_api_key(state: State<'_, AppState>, api_key: String) -> Result<()> {
    let mut settings = state.settings.lock().unwrap();
    settings.gemini_api_key = api_key;
    settings_store::save(&state.data_dir, &settings)?;
    Ok(())
}
