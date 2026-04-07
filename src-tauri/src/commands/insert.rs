use std::time::Duration;

#[cfg(target_os = "macos")]
use tauri::Emitter as _;
use tauri::{AppHandle, State};

use crate::{error::Result, AppState};

/// Information about the window that was in focus when the hotkey fired to start recording.
/// Captured before the overlay appears; cleared after insertion (or on failure).
pub struct FocusTarget {
    /// Whether the focused element appeared to be an editable text control.
    /// Defaults to `true` when detection is inconclusive — we attempt insertion anyway
    /// per spec (worst case is an ignored paste).
    pub is_text_field: bool,

    #[cfg(target_os = "windows")]
    /// Raw HWND value stored as isize for Send/Sync safety.
    pub hwnd: isize,

    #[cfg(target_os = "macos")]
    /// PID of the frontmost NSRunningApplication at capture time.
    pub pid: i32,
}

// SAFETY: FocusTarget only carries primitive values (isize / i32) across threads.
unsafe impl Send for FocusTarget {}
unsafe impl Sync for FocusTarget {}

// ── Tauri commands ───────────────────────────────────────────────────────────

/// Called from JS before `show_overlay` when the global hotkey fires to START recording.
/// Captures the currently focused external window. Returns `true` if a valid external
/// text target was captured, `false` if VoiceNote itself is in focus or detection failed.
/// Must complete before the overlay appears so we read OS focus state before it changes.
#[tauri::command]
pub async fn capture_target_focus(state: State<'_, AppState>, app: AppHandle) -> Result<bool> {
    let target = platform::capture_focus(&app);
    let captured = target.is_some();
    *state.focus_target.lock().unwrap() = target;
    Ok(captured)
}

/// Called from JS after transcription completes (only when recording was via hotkey).
/// Restores focus to the captured window and simulates Ctrl+V / Cmd+V to paste the
/// transcription. Always returns Ok — insertion is best-effort; errors are logged only.
#[tauri::command]
pub async fn auto_insert_text(
    state: State<'_, AppState>,
    app: AppHandle,
    text: String,
) -> Result<()> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let target = state.focus_target.lock().unwrap().take();
    let target = match target {
        Some(t) => t,
        None => return Ok(()),
    };

    // macOS: check Accessibility permission before attempting anything.
    // On first denial, emit a toast event; subsequent denials are silent.
    #[cfg(target_os = "macos")]
    {
        if !platform::is_ax_trusted() {
            let mut warned = state.accessibility_warned.lock().unwrap();
            if !*warned {
                *warned = true;
                let _ = app.emit(
                    "accessibility-warning",
                    "Enable Accessibility access for VoiceNote in System Settings \
                     to insert text into other apps.",
                );
            }
            return Ok(());
        }
    }

    // Suppress unused-variable warning on Windows (app not used there).
    drop(app);

    if let Err(e) = do_insert(target, text).await {
        eprintln!("[auto_insert_text] insertion failed (non-fatal): {e}");
    }

    Ok(())
}

// ── Core insertion logic ─────────────────────────────────────────────────────

async fn do_insert(
    target: FocusTarget,
    text: String,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    // Save current clipboard so we can restore it afterward.
    // Clipboard is created and dropped before any await point (arboard may not be Send).
    let prev_clipboard = {
        let mut cb = arboard::Clipboard::new()?;
        let prev = cb.get_text().ok();
        cb.set_text(&text)?;
        prev
    };

    // Restore focus to the previously focused window.
    // NSRunningApplication.activate() is asynchronous on macOS; 150ms is empirically
    // chosen as sufficient on a normally loaded system — may need tuning on slow hardware.
    platform::restore_focus(&target)?;
    tokio::time::sleep(Duration::from_millis(150)).await;

    // Simulate paste via enigo.
    // enigo 0.2.1 API: Direction enum + Key::Control (Win) / Key::Meta (macOS) + Key::V.
    // Verified against enigo 0.2.1 changelog — differs from 0.1.x key_down/key_up API.
    platform::paste_keyboard()?;

    // Wait for the paste to land before restoring the clipboard.
    tokio::time::sleep(Duration::from_millis(350)).await;

    // Restore original clipboard.
    if let Some(prev) = prev_clipboard {
        let mut cb = arboard::Clipboard::new()?;
        cb.set_text(prev)?;
    }

    Ok(())
}

// ── Platform implementations ─────────────────────────────────────────────────

#[cfg(target_os = "windows")]
mod platform {
    use super::FocusTarget;
    use tauri::AppHandle;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetWindowThreadProcessId, SetForegroundWindow,
    };

    pub fn capture_focus(_app: &AppHandle) -> Option<FocusTarget> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return None;
            }

            // Exclude VoiceNote's own process by comparing PIDs (avoids HWND type mismatch).
            let mut fg_pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, Some(&mut fg_pid));
            if fg_pid == std::process::id() {
                return None;
            }

            // Best-effort text-field detection via window class.
            // Unknown classes default to true (attempt insertion per spec).
            let mut buf = [0u16; 256];
            let len = GetClassNameW(hwnd, &mut buf) as usize;
            let class = String::from_utf16_lossy(&buf[..len]);
            let is_text_field = is_likely_editable(&class);

            Some(FocusTarget { hwnd: hwnd.0 as isize, is_text_field })
        }
    }

    fn is_likely_editable(class: &str) -> bool {
        // These classes are known text controls. Unknown classes also return true
        // per spec (the worst case is that a harmless paste is ignored).
        matches!(
            class,
            "Edit"
                | "RichEdit20W"
                | "RichEdit50W"
                | "RICHEDIT50W"
                | "Chrome_RenderWidgetHostHWND"
                | "MozillaWindowClass"
        ) || !matches!(
            class,
            "Shell_TrayWnd" | "Progman" | "WorkerW" | "DV2ControlHost"
        )
    }

    pub fn restore_focus(target: &FocusTarget) -> std::result::Result<(), Box<dyn std::error::Error>> {
        unsafe {
            let _ = SetForegroundWindow(HWND(target.hwnd as *mut _));
        }
        Ok(())
    }

    pub fn paste_keyboard() -> std::result::Result<(), Box<dyn std::error::Error>> {
        use enigo::{Direction, Enigo, Key, Keyboard};
        let mut enigo = Enigo::new(&enigo::Settings::default())?;
        enigo.key(Key::Control, Direction::Press)?;
        enigo.key(Key::V, Direction::Press)?;
        enigo.key(Key::V, Direction::Release)?;
        enigo.key(Key::Control, Direction::Release)?;
        Ok(())
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use super::FocusTarget;
    use tauri::AppHandle;

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
    }

    /// Check Accessibility permission. Safe to call from any thread.
    pub fn is_ax_trusted() -> bool {
        unsafe { AXIsProcessTrusted() }
    }

    pub fn capture_focus(_app: &AppHandle) -> Option<FocusTarget> {
        // NSWorkspace and NSRunningApplication must be accessed on the main thread.
        let pid = dispatch::Queue::main().sync(|| frontmost_pid_main())?;

        // Exclude VoiceNote's own process.
        if pid == std::process::id() as i32 {
            return None;
        }

        // AX role check for text field. Defaults to true if AX not trusted yet.
        // Full role introspection is omitted — is_text_field defaults to true per spec
        // (attempt insertion; worst case is an ignored paste).
        Some(FocusTarget { pid, is_text_field: true })
    }

    fn frontmost_pid_main() -> Option<i32> {
        // SAFETY: Cocoa calls on main thread via dispatch::Queue::main().
        unsafe {
            use objc::{class, msg_send, sel, sel_impl};
            use objc::runtime::Object;

            let workspace: *mut Object = msg_send![class!(NSWorkspace), sharedWorkspace];
            if workspace.is_null() { return None; }

            let app: *mut Object = msg_send![workspace, frontmostApplication];
            if app.is_null() { return None; }

            let pid: i32 = msg_send![app, processIdentifier];
            if pid <= 0 { None } else { Some(pid) }
        }
    }

    pub fn restore_focus(target: &FocusTarget) -> std::result::Result<(), Box<dyn std::error::Error>> {
        let pid = target.pid;
        // SAFETY: Cocoa activation on main thread.
        dispatch::Queue::main().sync(move || {
            unsafe {
                use objc::{class, msg_send, sel, sel_impl};
                use objc::runtime::Object;

                let app: *mut Object = msg_send![
                    class!(NSRunningApplication),
                    runningApplicationWithProcessIdentifier: pid
                ];
                if !app.is_null() {
                    // NSApplicationActivateIgnoringOtherApps = 2
                    let _: bool = msg_send![app, activateWithOptions: 2usize];
                }
            }
        });
        Ok(())
    }

    pub fn paste_keyboard() -> std::result::Result<(), Box<dyn std::error::Error>> {
        use enigo::{Direction, Enigo, Key, Keyboard};
        let mut enigo = Enigo::new(&enigo::Settings::default())?;
        enigo.key(Key::Meta, Direction::Press)?;
        enigo.key(Key::V, Direction::Press)?;
        enigo.key(Key::V, Direction::Release)?;
        enigo.key(Key::Meta, Direction::Release)?;
        Ok(())
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod platform {
    use super::FocusTarget;
    use tauri::AppHandle;

    pub fn capture_focus(_app: &AppHandle) -> Option<FocusTarget> {
        None
    }

    pub fn restore_focus(_target: &FocusTarget) -> std::result::Result<(), Box<dyn std::error::Error>> {
        Ok(())
    }

    pub fn paste_keyboard() -> std::result::Result<(), Box<dyn std::error::Error>> {
        Ok(())
    }
}
