import { defineComponent, h } from '../../js/vendor/vue.esm-browser.prod.js';
import { store, showToast } from '../store.js';
import * as api from '../api.js';
import { AudioRecorder } from '../audio.js';

let recorder = null;

async function handleToggle(viaHotkey = false, willInsert = false) {
  // Guard: no API key
  if (!store.settings.geminiApiKey) {
    store.settingsPanelOpen = true;
    store.settingsPanelRequired = true;
    return;
  }

  // Guard: already processing a previous recording
  if (store.isProcessing) {
    showToast('Processing previous recording — please wait', 'info');
    return;
  }

  if (!store.isRecording) {
    // START recording
    // TODO(future): hold-to-record mode — start on hotkey down, stop on hotkey up
    try {
      recorder = new AudioRecorder();
      store.isRecording = true;
      const result = await recorder.start(); // resolves when stop() is called
      const wasMaxTimer = recorder.isMaxTimerFired;
      recorder = null;

      if (wasMaxTimer) {
        showToast('Maximum recording length reached (20 min)', 'info');
      }

      await processAudio(result.data, result.mimeType, viaHotkey, willInsert);
    } catch (err) {
      recorder = null;
      store.isRecording = false;
      store.isProcessing = false;
      const msg = err.message || String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        showToast('Microphone access denied — check browser permissions', 'error');
      } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
        showToast('No microphone found', 'error');
      } else {
        showToast('Recording failed: ' + msg, 'error');
      }
    }
  } else {
    // STOP recording
    if (recorder) {
      recorder.stop();
      // isRecording will be set to false after audio is processed
    }
  }
}

async function processAudio(audioData, mimeType, viaHotkey = false, willInsert = false) {
  store.isRecording = false;
  store.isProcessing = true;
  // Hide overlay (no-op if recording was via button and overlay doesn't exist)
  api.hideOverlay().catch(() => {});
  try {
    if (viaHotkey && willInsert) {
      // Insert-only path: transcribe without saving, paste into external text field.
      // The note is NOT added to the app's note list.
      const note = await api.transcribeAudio(audioData, mimeType, false);
      if (!note || !note.transcription || !note.transcription.trim()) {
        showToast('No speech detected', 'info');
        return;
      }
      api.autoInsertText(note.transcription).catch(() => {});
    } else {
      // Save-only path: transcribe and persist note, show it in the list.
      const note = await api.transcribeAudio(audioData, mimeType, true);
      if (note === 'empty_transcription' || !note) {
        showToast('No speech detected', 'info');
        return;
      }
      store.notes.unshift(note);
    }
  } catch (err) {
    const msg = String(err);
    if (msg.includes('empty_transcription')) {
      showToast('No speech detected', 'info');
    } else if (msg.includes('Invalid API key')) {
      showToast('Invalid API key — check Settings', 'error');
    } else if (msg.includes('No API key')) {
      store.settingsPanelOpen = true;
      store.settingsPanelRequired = true;
    } else {
      showToast('Transcription failed: ' + msg, 'error');
    }
  } finally {
    store.isProcessing = false;
  }
}

// Exported so the hotkey handler in app.js can call it
export { handleToggle as handleRecordToggle, processAudio };

export const RecordButton = defineComponent({
  name: 'RecordButton',
  setup() {
    return () => {
      const isRecording = store.isRecording;
      const isProcessing = store.isProcessing;
      const noKey = !store.settings.geminiApiKey;

      const btnClass = ['mic-btn'];
      if (isRecording) btnClass.push('recording');
      if (isProcessing) btnClass.push('processing');

      const iconContent = isProcessing
        ? h('div', { class: 'spinner' })
        : h('svg', {
            viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', 'stroke-width': '2',
            'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          }, [
            h('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }),
            h('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
            h('line', { x1: '12', y1: '19', x2: '12', y2: '23' }),
            h('line', { x1: '8', y1: '23', x2: '16', y2: '23' }),
          ]);

      return h('div', { class: 'mic-button-area' }, [
        h('button', {
          class: btnClass,
          disabled: isProcessing,
          onClick: handleToggle,
          title: isRecording ? 'Stop recording' : 'Start recording',
        }, [iconContent]),
        h('span', { class: 'mic-hint' }, 'Ctrl+Shift+Space to record anywhere'),
      ]);
    };
  },
});
