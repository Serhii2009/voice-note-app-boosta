# VoiceNote

A lightweight desktop application for voice recording and AI-powered transcription. Everything stays on your machine — no accounts, no subscriptions, no cloud storage.

Built with [Tauri](https://tauri.app), powered by [Google Gemini 2.5 Pro](https://deepmind.google/technologies/gemini/).

---

## Overview

VoiceNote lets you capture spoken thoughts instantly, from anywhere on your desktop, and turn them into clean, readable text in seconds. Press a global hotkey, speak, press it again — a new note appears at the top of your library.

All notes are stored locally as a single JSON file. The only outbound network call is the transcription request to the Gemini API.

---

## Features

- **Global hotkey recording** — `Ctrl+Shift+Space` starts and stops recording from any application, no window switching required
- **Always-on-top overlay** — a minimal pill indicator appears during hotkey recording, fully click-through so it never interrupts your workflow
- **Instant transcription** — audio is sent to Gemini 2.5 Pro immediately on stop; results appear in seconds
- **Multilingual support** — transcribes in the language spoken; Russian and Ukrainian are explicitly supported
- **AI enhancement** — opt-in text cleanup that removes filler words, fixes grammar, and improves readability without altering meaning
- **Fully local storage** — notes and settings are saved to your OS app data directory; audio is never written to disk
- **Inline title editing** — double-click any note title to rename it, from the grid or inside the detail view
- **Original vs. enhanced toggle** — both versions of a note are preserved and switchable at any time
- **Dark and light mode** — follows your OS preference automatically
- **No audio stored** — the recording buffer is held in memory only and discarded after transcription

---

## Requirements

- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)
- Windows 10/11 or macOS 12+

No additional runtime or setup is required. The installer is self-contained.

---

## Installation

Download the appropriate installer for your platform from the [Releases](../../releases) page.

| Platform | File                            |
| -------- | ------------------------------- |
| Windows  | `VoiceNote_x.x.x_x64-setup.exe` |
| macOS    | `VoiceNote_x.x.x_x64.dmg`       |

Run the installer and launch VoiceNote. On first launch, you will be prompted to enter your Gemini API key — paste it in and click **Save**.

---

## Usage

### Recording

| Method                      | Action                                                   |
| --------------------------- | -------------------------------------------------------- |
| Click the microphone button | Starts and stops recording within the app window         |
| `Ctrl+Shift+Space`          | Starts and stops recording from anywhere on your desktop |

A recording indicator appears while active. Once stopped, transcription begins automatically. The new note appears at the top of the grid when ready.

The maximum recording duration is **20 minutes**. Recording stops automatically at this limit and transcription proceeds with the collected audio.

### Notes

- Click any note card to open the full detail view
- Double-click a title to rename it — press `Enter` or click away to save
- Use the **Copy** button to copy the currently visible text to your clipboard
- Press `Escape` or click the backdrop to close the detail view

### AI Enhancement

Inside the detail view, click **Enhance with AI** to run a cleanup pass on the transcription. The enhanced version is saved alongside the original — you can toggle between them freely. Enhancement never runs automatically.

### Settings

Click the gear icon (top-right) to open Settings. Paste your Gemini API key and click **Save**. The key is stored locally and is only ever sent to the Gemini API.

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

**Prerequisites:** [Rust](https://rustup.rs) (stable), [Tauri CLI v2](https://tauri.app/start/prerequisites/)

```sh
# Install Tauri CLI
cargo install tauri-cli --version "^2" --locked

# Clone and run in development mode
git clone https://github.com/your-username/voice-note-app-boosta.git
cd voice-note-app-boosta
cargo tauri dev

# Build a production installer
cargo tauri build
```

The release installer will be in `src-tauri/target/release/bundle/`.

---

## Keyboard Reference

| Shortcut             | Action                     |
| -------------------- | -------------------------- |
| `Ctrl+Shift+Space`   | Toggle recording (global)  |
| `Escape`             | Close modal or detail view |
| `Enter`              | Confirm inline title edit  |
| `Double-click` title | Begin editing a note title |

---

## License

MIT
