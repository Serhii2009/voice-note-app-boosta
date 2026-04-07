import { reactive } from './vendor/vue.esm-browser.prod.js';

export const store = reactive({
  notes: [],
  settings: {
    geminiApiKey: '',
    modelName: 'gemini-2.5-flash',
    noteCounter: 0,
  },
  isRecording: false,
  isProcessing: false, // true during transcription API call
  activeNoteId: null,
  settingsPanelOpen: false,
  settingsPanelRequired: false, // non-dismissable mode
  toast: null, // { message: string, type: 'info'|'error' }
});

let toastTimer = null;

export function showToast(message, type = 'info', duration = 3500) {
  clearTimeout(toastTimer);
  store.toast = { message, type };
  toastTimer = setTimeout(() => {
    store.toast = null;
  }, duration);
}
