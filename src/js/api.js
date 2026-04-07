// All Tauri IPC wrappers.
// window.__TAURI__ is available because withGlobalTauri: true in tauri.conf.json

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

export async function getNotes() {
  return invoke('get_notes');
}

export async function saveNote(note) {
  return invoke('save_note', { note });
}

export async function deleteNote(id) {
  return invoke('delete_note', { id });
}

export async function updateNoteTitle(id, title) {
  return invoke('update_note_title', { id, title });
}

export async function getSettings() {
  return invoke('get_settings');
}

export async function saveApiKey(apiKey) {
  return invoke('save_api_key', { apiKey });
}

export async function saveModel(modelName) {
  return invoke('save_model', { modelName });
}

// save=true (default): transcribe and persist note.
// save=false: transcribe only — returns note shape with .transcription but nothing is saved.
export async function transcribeAudio(audioData, mimeType, save = true) {
  return invoke('transcribe_audio', { audioData, mimeType, save });
}

export async function enhanceText(text) {
  return invoke('enhance_text', { text });
}

export async function showOverlay() {
  return invoke('show_overlay');
}

export async function hideOverlay() {
  return invoke('hide_overlay');
}

export async function captureTargetFocus() {
  return invoke('capture_target_focus');
}

export async function autoInsertText(text) {
  return invoke('auto_insert_text', { text });
}

export function onHotkeyToggle(callback) {
  return listen('hotkey-recording-toggle', callback);
}
