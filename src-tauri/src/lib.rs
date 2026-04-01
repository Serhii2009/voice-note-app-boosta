use std::{path::PathBuf, sync::Mutex};

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

mod commands;
mod error;
mod models;
mod storage;

use models::{note::Note, settings::Settings};
use storage::{notes_store, settings_store};

pub struct AppState {
    pub notes: Mutex<Vec<Note>>,
    pub settings: Mutex<Settings>,
    pub data_dir: PathBuf,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus existing window if user launches a second instance
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app: &AppHandle, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        // Emit event to all windows; frontend handles recording toggle
                        let _ = app.emit("hotkey-recording-toggle", ());
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Resolve and create the app data directory
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");
            std::fs::create_dir_all(&data_dir)?;

            // Load persisted state from disk
            let notes = notes_store::load(&data_dir).unwrap_or_default();
            let settings = settings_store::load(&data_dir).unwrap_or_default();

            app.manage(AppState {
                notes: Mutex::new(notes),
                settings: Mutex::new(settings),
                data_dir,
            });

            // Register global hotkey: Ctrl+Shift+Space
            app.global_shortcut()
                .register("Ctrl+Shift+Space")
                .expect("Failed to register global shortcut");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::notes::get_notes,
            commands::notes::save_note,
            commands::notes::delete_note,
            commands::notes::update_note_title,
            commands::settings::get_settings,
            commands::settings::save_api_key,
            commands::transcribe::transcribe_audio,
            commands::enhance::enhance_text,
            commands::window::show_overlay,
            commands::window::hide_overlay,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VoiceNote");
}
