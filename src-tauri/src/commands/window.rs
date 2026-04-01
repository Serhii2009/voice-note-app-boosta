use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::error::{AppError, Result};

#[tauri::command]
pub async fn show_overlay(app: AppHandle) -> Result<()> {
    // Idempotency: return early if overlay already exists
    if app.get_webview_window("overlay").is_some() {
        return Ok(());
    }

    // Find the monitor containing the cursor
    let cursor_pos = app.cursor_position().map_err(|e| AppError::Window(e.to_string()))?;
    let monitors = app.available_monitors().map_err(|e| AppError::Window(e.to_string()))?;

    let monitor = monitors
        .iter()
        .find(|m| {
            let pos = m.position();
            let size = m.size();
            cursor_pos.x >= pos.x as f64
                && cursor_pos.x < (pos.x as f64 + size.width as f64)
                && cursor_pos.y >= pos.y as f64
                && cursor_pos.y < (pos.y as f64 + size.height as f64)
        })
        .or_else(|| monitors.first())
        .ok_or(AppError::NoMonitor)?;

    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let overlay_width = 220.0_f64;
    let overlay_height = 56.0_f64;
    let x = monitor_pos.x as f64 + (monitor_size.width as f64 - overlay_width) / 2.0;
    let y = monitor_pos.y as f64 + monitor_size.height as f64 - 100.0;

    let overlay = WebviewWindowBuilder::new(
        &app,
        "overlay",
        WebviewUrl::App("overlay.html".into()),
    )
    .title("")
    .inner_size(overlay_width, overlay_height)
    .position(x, y)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .build()
    .map_err(|e| AppError::Window(e.to_string()))?;

    overlay
        .set_ignore_cursor_events(true)
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn hide_overlay(app: AppHandle) -> Result<()> {
    // Idempotency: no-op if overlay does not exist
    if let Some(window) = app.get_webview_window("overlay") {
        window.close().map_err(|e| AppError::Window(e.to_string()))?;
    }
    Ok(())
}
