import { defineComponent, h, ref } from '../../js/vendor/vue.esm-browser.prod.js';
import { store, showToast } from '../store.js';
import * as api from '../api.js';

const MODELS = [
  { value: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro',        hint: 'Highest accuracy' },
  { value: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash',      hint: 'Fast · Lower cost' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', hint: 'Fastest · Cheapest' },
];

export const SettingsPanel = defineComponent({
  name: 'SettingsPanel',
  setup() {
    const keyValue = ref('');
    const keyVisible = ref(false);
    const keyError = ref('');
    const saving = ref(false);
    const selectedModel = ref(store.settings.modelName || 'gemini-2.5-flash');

    // Initialize with current values when panel opens
    function onPanelOpen() {
      keyValue.value = store.settings.geminiApiKey || '';
      keyError.value = '';
      selectedModel.value = store.settings.modelName || 'gemini-2.5-flash';
    }

    async function save() {
      keyError.value = '';
      if (!keyValue.value.trim()) {
        keyError.value = 'API key is required';
        // If required mode, keep panel open
        if (!store.settings.geminiApiKey) {
          store.settingsPanelRequired = true;
        }
        return;
      }
      saving.value = true;
      try {
        // API key is the critical path — if it fails, abort and surface the error.
        await api.saveApiKey(keyValue.value.trim());
        store.settings.geminiApiKey = keyValue.value.trim();
        // Model save is secondary — if it fails, log internally but do not show
        // a confusing error since the API key was already saved successfully.
        try {
          await api.saveModel(selectedModel.value);
          store.settings.modelName = selectedModel.value;
        } catch (err) {
          console.error('Failed to save model selection:', err);
        }
        store.settingsPanelRequired = false;
        store.settingsPanelOpen = false;
        showToast('Settings saved', 'info');
      } catch (err) {
        showToast('Failed to save: ' + String(err), 'error');
      } finally {
        saving.value = false;
      }
    }

    function close() {
      if (store.settingsPanelRequired) return; // can't close without a key
      store.settingsPanelOpen = false;
    }

    function onBackdropClick() {
      close();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') save();
    }

    return () => {
      if (!store.settingsPanelOpen) return null;

      // Initialize input when first rendered
      if (keyValue.value === '' && store.settings.geminiApiKey) {
        keyValue.value = store.settings.geminiApiKey;
      }

      const isRequired = store.settingsPanelRequired;

      return h('div', { class: 'settings-backdrop', onClick: onBackdropClick }, [
        h('div', {
          class: 'settings-panel',
          onClick: (e) => e.stopPropagation(),
          onVnodeMounted: onPanelOpen,
        }, [
          // Header
          h('div', { class: 'settings-header' }, [
            h('h2', {}, 'Settings'),
            !isRequired && h('button', {
              class: 'modal-close',
              onClick: close,
              title: 'Close',
            }, [
              h('svg', {
                viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
                'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
                width: '18', height: '18',
              }, [
                h('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
                h('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
              ]),
            ]),
          ]),

          // Body
          h('div', { class: 'settings-body' }, [
            // Required banner
            isRequired && h('div', { class: 'settings-required-banner' },
              'An API key is required to use VoiceNote. Paste your Gemini API key below to get started.'
            ),

            // API Key field
            h('div', { class: 'form-group' }, [
              h('label', {}, 'Gemini API Key'),
              h('div', { class: 'input-row' }, [
                h('input', {
                  type: keyVisible.value ? 'text' : 'password',
                  value: keyValue.value,
                  placeholder: 'Paste your Gemini API key',
                  onInput: (e) => { keyValue.value = e.target.value; keyError.value = ''; },
                  onKeydown,
                  autocomplete: 'off',
                  spellcheck: false,
                }),
                h('button', {
                  class: 'btn',
                  style: 'padding: 8px 10px; flex-shrink: 0;',
                  onClick: () => { keyVisible.value = !keyVisible.value; },
                  title: keyVisible.value ? 'Hide' : 'Show',
                }, keyVisible.value ? '●' : '○'),
              ]),
              keyError.value && h('div', { class: 'input-error' }, keyError.value),
            ]),

            // Transcription model selector
            h('div', { class: 'form-group' }, [
              h('label', {}, 'Transcription Model'),
              h('select', {
                value: selectedModel.value,
                onChange: (e) => { selectedModel.value = e.target.value; },
                class: 'form-select',
              }, MODELS.map(m =>
                h('option', { value: m.value }, `${m.label} — ${m.hint}`)
              )),
            ]),

            // Privacy note
            h('p', { class: 'settings-note' },
              'Your API key is stored locally on this device and is never transmitted anywhere except to the Gemini API.'
            ),
          ]),

          // Footer
          h('div', { class: 'settings-footer' }, [
            h('button', {
              class: 'btn btn-primary',
              onClick: save,
              disabled: saving.value,
            }, saving.value ? 'Saving...' : 'Save'),
          ]),
        ]),
      ]);
    };
  },
});
