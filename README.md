# VoiceNote

A lightweight desktop application for voice recording and AI-powered transcription. Everything stays on your machine — no accounts, no subscriptions, no cloud storage.

Built with [Tauri v2](https://tauri.app), powered by [Google Gemini](https://aistudio.google.com/app/apikey).

---

## Overview

VoiceNote lets you capture spoken thoughts instantly, from anywhere on your desktop, and turn them into clean, readable text in seconds. Press a global hotkey, speak, press it again — a new note appears at the top of your library.

If your cursor is inside a text field in another application when you press the hotkey, VoiceNote will transcribe your voice and paste the result directly into that field, without saving a note. This makes it a seamless dictation tool for any application on your system.

All notes are stored locally as a single JSON file. The only outbound network calls are transcription and enhancement requests to the Gemini API.

---

## Features

- **Global hotkey recording** — `Ctrl+Shift+Space` starts and stops recording from any application, no window switching required
- **Auto-insert mode** — when the cursor is in a text field in another app, the hotkey transcribes and pastes directly into that field instead of saving a note
- **Always-on-top overlay** — a minimal pill indicator appears at the bottom of the screen during hotkey recording; fully click-through
- **Instant transcription** — audio is sent to Gemini immediately on stop; results appear in seconds
- **Multilingual support** — transcribes in the language spoken; Russian and Ukrainian are explicitly supported
- **AI enhancement** — opt-in text cleanup that removes filler words, fixes grammar, and improves readability without altering meaning
- **Fully local storage** — notes and settings are saved to your OS app data directory; audio is never written to disk
- **Inline title editing** — double-click any note title to rename it, from the grid or inside the detail view
- **Original vs. enhanced toggle** — both versions of a note are preserved and switchable at any time
- **Dark and light mode** — follows your OS preference automatically
- **Single instance** — launching a second instance focuses the existing window

---

## Requirements

- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier is sufficient)
- Windows 10/11 or macOS 12+

No additional runtime is required. The installer is self-contained.

---

## Installation

Download the appropriate installer for your platform from the [Releases](../../releases) page.

| Platform        | File                            |
| --------------- | ------------------------------- |
| Windows         | `VoiceNote_x.x.x_x64-setup.exe` |
| macOS (Intel)   | `VoiceNote_x.x.x_x64.dmg`       |
| macOS (Silicon) | `VoiceNote_x.x.x_aarch64.dmg`   |

---

## Quick Install — macOS

For the fastest setup, open **Terminal** and paste the following single command. It will find the downloaded `.dmg` file, install the app, remove macOS security restrictions, and launch it automatically.

```sh
cd ~/Downloads && \
FILE=$(ls *.dmg | grep -i voicenote | head -n 1) && \
[ -z "$FILE" ] && echo "No VoiceNote .dmg found in ~/Downloads" && exit 1 || \
hdiutil attach "$FILE" -nobrowse -quiet && \
cp -R /Volumes/VoiceNote/VoiceNote.app /Applications/ && \
hdiutil detach /Volumes/VoiceNote -quiet && \
xattr -cr /Applications/VoiceNote.app && \
open /Applications/VoiceNote.app
```

This command:

- Looks only for `.dmg` files matching "voicenote" in your Downloads folder
- Stops with a clear message if no file is found, rather than failing silently
- Mounts the disk image, copies the app to Applications, and unmounts cleanly
- Removes the macOS quarantine flag so the app opens without a security warning
- Launches the app immediately

> **If the app does not open automatically**, launch it manually from `/Applications/VoiceNote.app` — right-click → Open on the first launch if macOS shows a security prompt.

> **If you see "VoiceNote.dmg not found"**, check that the file downloaded completely and that its name contains "VoiceNote". You can also drag the `.dmg` directly to your Desktop and change `~/Downloads` in the command to `~/Desktop`.

---

## macOS: Manual Installation

If you prefer to install manually or the quick command does not work:

**Option 1 — Right-click method (simplest):**

1. Double-click the `.dmg` file to mount it
2. Drag `VoiceNote.app` into your `Applications` folder
3. In Finder, right-click `VoiceNote.app` → **Open**
4. Click **Open** in the security dialog that appears
5. VoiceNote will open and be remembered as trusted

**Option 2 — System Settings:**

1. Attempt to open the app normally — macOS will block it
2. Open **System Settings → Privacy & Security**
3. Scroll to the Security section and click **Open Anyway**

**Option 3 — Remove quarantine via Terminal:**

```sh
xattr -cr /Applications/VoiceNote.app
```

Then open the app normally from Finder or Launchpad.

You only need to do this once. After the first approved launch, macOS remembers the app as trusted.

---

## macOS: Accessibility Permission (for auto-insert)

The auto-insert feature — pasting transcribed text into other apps — requires Accessibility access. On first use of the hotkey while a text field is focused in another application, VoiceNote will show a notification prompting you to grant this permission.

To enable it:

1. Open **System Settings → Privacy & Security → Accessibility**
2. Find **VoiceNote** in the list and enable it
3. If VoiceNote is not listed, click the **+** button and navigate to `/Applications/VoiceNote.app`

This permission is only required for auto-insert. Recording and saving notes works without it.

---

## Windows Installation

Run `VoiceNote_x.x.x_x64-setup.exe` and follow the installer prompts. No additional configuration is needed.

On first launch, you will be prompted to enter your Gemini API key.

---

## Usage

### Recording

| Method                       | Action                                                                |
| ---------------------------- | --------------------------------------------------------------------- |
| Click the microphone button  | Records and saves a new note to the library                           |
| `Ctrl+Shift+Space` (Windows) | If cursor is in a text field: transcribes and pastes directly into it |
| `Cmd+Shift+Space` (macOS)    | If cursor is in a text field: transcribes and pastes directly into it |
| `Ctrl+Shift+Space` (Windows) | If no text field is focused: records and saves a note                 |
| `Cmd+Shift+Space` (macOS)    | If no text field is focused: records and saves a note                 |

A small pill indicator appears at the bottom of the screen while recording via hotkey. Press the same shortcut again to stop recording — transcription starts automatically.

The maximum recording duration is **20 minutes**. Recording stops automatically at this limit and transcription proceeds with the collected audio.

### Notes

- Click any note card to open the full detail view
- Double-click a title to rename it — press `Enter` or click away to save
- Use the **Copy** button to copy the currently visible text to your clipboard
- Press `Escape` or click the backdrop to close the detail view

### AI Enhancement

Inside the detail view, click **Enhance with AI** to run a cleanup pass on the transcription. The enhanced version is saved alongside the original — you can toggle between them freely. Enhancement never runs automatically.

### Settings

Click the gear icon in the top-right corner to open Settings. Paste your Gemini API key, select a transcription model, and click **Save**.

---

## Data & Privacy

| What     | Where                                                           |
| -------- | --------------------------------------------------------------- |
| Notes    | `%APPDATA%\VoiceNote\notes.json` (Windows)                      |
| Settings | `%APPDATA%\VoiceNote\settings.json` (Windows)                   |
| Notes    | `~/Library/Application Support/VoiceNote/notes.json` (macOS)    |
| Settings | `~/Library/Application Support/VoiceNote/settings.json` (macOS) |

- Audio is **never** written to disk under any circumstance
- No telemetry, no analytics, no background network activity
- The only outbound requests are transcription and enhancement calls to `generativelanguage.googleapis.com`

---

## Building from Source

### Prerequisites

**All platforms:**

- [Rust](https://rustup.rs) (stable toolchain, 1.77+)
- [Tauri CLI v2](https://tauri.app/start/prerequisites/)

**macOS only:**

- Xcode Command Line Tools: `xcode-select --install`
- For Apple Silicon builds, ensure the `aarch64-apple-darwin` target is installed:
  ```sh
  rustup target add aarch64-apple-darwin
  ```

**Windows only:**

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (or Visual Studio with C++ workload)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) — pre-installed on Windows 10/11

No Node.js or frontend build step is required. The frontend is plain HTML/CSS/JS served directly from the `src/` directory.

### Running in Development

```sh
# Install Tauri CLI (once)
cargo install tauri-cli --version "^2" --locked

# Clone the repository
git clone https://github.com/Serhii2009/voice-note-app-boosta.git
cd voice-note-app-boosta

# Run in development mode (hot-reload for frontend, recompile for Rust changes)
cargo tauri dev
```

### Building a Production Installer

```sh
cargo tauri build
```

Output locations:

| Platform | Path                                          |
| -------- | --------------------------------------------- |
| Windows  | `src-tauri/target/release/bundle/nsis/*.exe`  |
| macOS    | `src-tauri/target/release/bundle/dmg/*.dmg`   |
| macOS    | `src-tauri/target/release/bundle/macos/*.app` |

---

## Keyboard Reference

| Shortcut           | Action                     |
| ------------------ | -------------------------- |
| `Ctrl+Shift+Space` | Toggle recording (global)  |
| `Escape`           | Close modal or detail view |
| `Enter`            | Confirm inline title edit  |
| Double-click title | Begin editing a note title |

---

## License

MIT
