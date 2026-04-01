import { defineComponent, h, ref } from '../../js/vendor/vue.esm-browser.prod.js';
import { store, showToast } from '../store.js';
import * as api from '../api.js';

export const SettingsPanel = defineComponent({
  name: 'SettingsPanel',
  setup() {
    const keyValue = ref('');
    const keyVisible = ref(false);
    const keyError = ref('');
    const saving = ref(false);

    // Initialize with current value when panel opens
    function onPanelOpen() {
      keyValue.value = store.settings.geminiApiKey || '';
      keyError.value = '';
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
        await api.saveApiKey(keyValue.value.trim());
        store.settings.geminiApiKey = keyValue.value.trim();
        store.settingsPanelRequired = false;
        store.settingsPanelOpen = false;
        showToast('API key saved', 'info');
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

            // Model (read-only)
            h('div', { class: 'form-group' }, [
              h('label', {}, 'Model'),
              h('div', { class: 'form-readonly' }, 'Gemini 2.5 Pro'),
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
