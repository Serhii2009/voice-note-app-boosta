use std::{path::PathBuf, sync::Mutex};

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

mod commands;
mod error;
mod models;
mod storage;

use commands::insert::FocusTarget;
use models::{note::Note, settings::Settings};
use storage::{notes_store, settings_store};

pub struct AppState {
    pub notes: Mutex<Vec<Note>>,
    pub settings: Mutex<Settings>,
    pub data_dir: PathBuf,
    /// Foreground window captured at hotkey-start time; used by auto_insert_text.
    pub focus_target: Mutex<Option<FocusTarget>>,
    /// macOS: set to true after showing the one-time accessibility permission toast.
    pub accessibility_warned: Mutex<bool>,
}

fn create_overlay_window(app: &tauri::App) -> tauri::Result<()> {
    // Window is sized to contain the 44×10px capsule with enough padding on each side
    // so the pulsing glow animation (box-shadow) is not clipped by the window bounds.
    let overlay_width = 56.0_f64;
    let overlay_height = 16.0_f64;

    // Monitor detection: pick the monitor closest to (0,0) — this is always the logical
    // primary monitor regardless of physical arrangement. available_monitors() returns
    // PhysicalPosition and PhysicalSize (physical/device pixels).
    //
    // Note: primary_monitor() and current_monitor() are unreliable during setup() before
    // the event loop is fully running on some platforms. available_monitors() is robust.
    let monitors: Vec<_> = app.available_monitors().unwrap_or_default();
    eprintln!("[overlay] {} monitor(s) detected", monitors.len());
    for m in &monitors {
        let p = m.position();
        eprintln!("[overlay]   pos=({},{}) size={}×{} scale={:.2}",
            p.x, p.y, m.size().width, m.size().height, m.scale_factor());
    }
    let monitor = monitors.into_iter().min_by_key(|m| {
        let p = m.position();
        (p.x.abs() + p.y.abs()) as u64
    });

    // WebviewWindowBuilder::position() takes LOGICAL pixels.
    // Monitor::position() and Monitor::size() return PHYSICAL pixels.
    // Dividing by scale_factor() converts physical → logical for correct placement on HiDPI.
    let (x, y) = if let Some(m) = monitor {
        let pos = m.position();
        let size = m.size();
        let scale = m.scale_factor();
        // Convert physical monitor dimensions to logical.
        let logical_w = size.width as f64 / scale;
        let logical_h = size.height as f64 / scale;
        let logical_x = pos.x as f64 / scale;
        let logical_y = pos.y as f64 / scale;
        // Center horizontally; 72 logical px above the bottom edge
        // (≈40px taskbar + 32px gap, expressed in logical units at any DPI).
        let offset_x = -10.0;
        let x = logical_x + (logical_w - overlay_width) / 2.0 + offset_x;
        let y = logical_y + logical_h - overlay_height - 56.0;
        eprintln!("[overlay] logical position: x={x:.1}, y={y:.1} (scale={scale:.2})");
        (x, y)
    } else {
        eprintln!("[overlay] WARNING: no monitors detected — using fallback position");
        (880.0, 980.0)
    };

    let overlay = WebviewWindowBuilder::new(
        app,
        "overlay",
        WebviewUrl::App("overlay.html".into()),
    )
    .title("")
    .inner_size(overlay_width, overlay_height)
    .position(x, y)
    .decorations(false)
    // always_on_top maps to HWND_TOPMOST on Windows and kCGFloatingWindowLevel on macOS.
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    // transparent(true) is required for see-through rendering:
    // - Windows: tao sets WS_EX_LAYERED + WS_EX_TRANSPARENT and calls DwmEnableBlurBehindWindow
    //   with an empty region, making the window host fully transparent. WRY then sets
    //   WebView2's DefaultBackgroundColor to (0,0,0,0). Do NOT call DwmExtendFrameIntoClientArea
    //   separately — it conflicts with the DwmEnableBlurBehindWindow approach and breaks transparency.
    // - macOS: required so WKWebView respects body { background: transparent } in CSS.
    .transparent(true)
    .build()?;

    // tauri-plugin-window-state saves and restores ALL named windows, including "overlay".
    // If on a previous launch the overlay had a different size or position, that stale state
    // was persisted. Calling set_size() + set_position() here overrides whatever the plugin
    // restored, ensuring the overlay is always the correct size and position on every launch.
    overlay.set_size(tauri::LogicalSize::new(overlay_width, overlay_height))?;
    overlay.set_position(tauri::LogicalPosition::new(x, y))?;

    overlay.set_ignore_cursor_events(true)?;

    Ok(())
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
                focus_target: Mutex::new(None),
                accessibility_warned: Mutex::new(false),
            });

            // Register global hotkey: Ctrl+Shift+Space
            app.global_shortcut()
                .register("Ctrl+Shift+Space")
                .expect("Failed to register global shortcut");

            // Create the persistent overlay window at startup.
            // It stays open for the entire app lifetime — never closed during normal operation.
            // show_overlay / hide_overlay emit events to change its visual state.
            create_overlay_window(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // When the main window is closed, exit the whole process.
            // Without this, the overlay window keeps the process alive after
            // the user clicks the close button on the main window.
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    window.app_handle().exit(0);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::notes::get_notes,
            commands::notes::save_note,
            commands::notes::delete_note,
            commands::notes::update_note_title,
            commands::settings::get_settings,
            commands::settings::save_api_key,
            commands::settings::save_model,
            commands::transcribe::transcribe_audio,
            commands::enhance::enhance_text,
            commands::window::show_overlay,
            commands::window::hide_overlay,
            commands::insert::capture_target_focus,
            commands::insert::auto_insert_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VoiceNote");
}
