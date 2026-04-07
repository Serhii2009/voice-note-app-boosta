import { createApp, h, onMounted, defineComponent } from './vendor/vue.esm-browser.prod.js';
import { store, showToast } from './store.js';
import * as api from './api.js';
import { NoteGrid } from './components/NoteGrid.js';
import { RecordButton, handleRecordToggle } from './components/RecordButton.js';
import { NoteDetailModal } from './components/NoteDetailModal.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { ToastNotification } from './components/ToastNotification.js';

const { listen } = window.__TAURI__.event;

const App = defineComponent({
  name: 'App',
  setup() {
    onMounted(async () => {
      // Load settings first
      try {
        const settings = await api.getSettings();
        store.settings = settings;
      } catch (err) {
        console.error('Failed to load settings:', err);
      }

      // First-launch: open settings if no API key
      if (!store.settings.geminiApiKey) {
        store.settingsPanelOpen = true;
        store.settingsPanelRequired = true;
      }

      // Load notes
      try {
        const notes = await api.getNotes();
        store.notes = notes;
      } catch (err) {
        showToast('Failed to load notes', 'error');
      }

      // Listen for global hotkey events from Rust
      await api.onHotkeyToggle(async () => {
        if (!store.settings.geminiApiKey) {
          showToast('API key required — open Settings', 'error');
          store.settingsPanelOpen = true;
          store.settingsPanelRequired = true;
          return;
        }
        let willInsert = false;
        if (!store.isRecording && !store.isProcessing) {
          // await captureTargetFocus so focus is read before anything changes.
          // Returns true if an external text target was captured.
          willInsert = await api.captureTargetFocus().catch(() => false);
          // showOverlay is visual-only — fire-and-forget so it cannot delay
          // handleRecordToggle. Awaiting window creation (old design) caused a
          // race: a second hotkey press would arrive while the first was blocked,
          // see isRecording=false, re-enter the start branch, and immediately
          // stop the recording the second handler had just started.
          api.showOverlay().catch(() => {});
        }
        await handleRecordToggle(true, willInsert); // viaHotkey=true, willInsert
      });

      // macOS: show a one-time toast if Accessibility permission is not granted.
      listen('accessibility-warning', (event) => {
        showToast(event.payload, 'info', 6000);
      }).catch(() => {});
    });

    function openNote(id) {
      store.activeNoteId = id;
    }

    return () => h('div', { id: 'app-inner' }, [
      // Top bar
      h('div', { class: 'top-bar' }, [
        h('button', {
          class: 'btn-icon',
          onClick: () => { store.settingsPanelOpen = true; },
          title: 'Settings',
        }, [
          h('svg', {
            viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
            'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          }, [
            h('circle', { cx: '12', cy: '12', r: '3' }),
            h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }),
          ]),
        ]),
      ]),

      // Heading
      h('div', { class: 'page-heading' }, [
        h('h1', {}, 'Your recorded thoughts'),
      ]),

      // Notes area
      h('div', { class: 'notes-area' }, [
        h(NoteGrid, { notes: store.notes, onOpen: openNote }),
      ]),

      // Fixed mic button
      h(RecordButton),

      // Overlays
      h(NoteDetailModal),
      h(SettingsPanel),
      h(ToastNotification),
    ]);
  },
});

createApp(App).mount('#app');
