use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

use crate::error::{AppError, Result};

/// Signals the persistent overlay to enter recording (red) state.
/// The overlay window is created at app startup and never closed during normal operation.
#[tauri::command]
pub async fn show_overlay(app: AppHandle) -> Result<()> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay
            .emit("overlay-state", json!({ "state": "recording" }))
            .map_err(|e| AppError::Window(e.to_string()))?;
    }
    Ok(())
}

/// Signals the persistent overlay to return to idle (dark) state.
/// Does NOT close the window — the overlay is always visible while the app runs.
#[tauri::command]
pub async fn hide_overlay(app: AppHandle) -> Result<()> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay
            .emit("overlay-state", json!({ "state": "idle" }))
            .map_err(|e| AppError::Window(e.to_string()))?;
    }
    Ok(())
}
