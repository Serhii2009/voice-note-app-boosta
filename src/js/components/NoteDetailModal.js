import { defineComponent, h, ref, computed, watch } from '../../js/vendor/vue.esm-browser.prod.js';
import { store, showToast } from '../store.js';
import * as api from '../api.js';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export const NoteDetailModal = defineComponent({
  name: 'NoteDetailModal',
  setup() {
    const editingTitle = ref(false);
    const titleValue = ref('');
    const activeView = ref('enhanced'); // 'original' | 'enhanced'
    const showDeleteConfirm = ref(false);
    const enhancing = ref(false);
    const copied = ref(false);
    let copyTimer = null;

    const note = computed(() => {
      if (!store.activeNoteId) return null;
      return store.notes.find((n) => n.id === store.activeNoteId) ?? null;
    });

    // Reset state when note changes
    watch(
      () => store.activeNoteId,
      () => {
        editingTitle.value = false;
        showDeleteConfirm.value = false;
        enhancing.value = false;
        // Default to enhanced view if available
        const n = note.value;
        activeView.value = n?.enhancedText ? 'enhanced' : 'original';
      }
    );

    function close() {
      store.activeNoteId = null;
    }

    function onBackdropClick() { close(); }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        if (editingTitle.value) { editingTitle.value = false; return; }
        close();
      }
    }

    function startEditTitle() {
      const n = note.value;
      if (!n) return;
      titleValue.value = n.userTitle ?? n.autoTitle;
      editingTitle.value = true;
    }

    async function commitTitle() {
      editingTitle.value = false;
      const n = note.value;
      if (!n) return;
      const newTitle = titleValue.value.trim();
      const current = n.userTitle ?? n.autoTitle;
      if (newTitle === current) return;
      try {
        await api.updateNoteTitle(n.id, newTitle);
        const idx = store.notes.findIndex((x) => x.id === n.id);
        if (idx !== -1) {
          store.notes[idx] = { ...store.notes[idx], userTitle: newTitle || null };
        }
      } catch (err) {
        showToast('Failed to save title', 'error');
      }
    }

    function onTitleKeydown(e) {
      if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
      if (e.key === 'Escape') { editingTitle.value = false; }
    }

    const visibleText = computed(() => {
      const n = note.value;
      if (!n) return '';
      if (activeView.value === 'enhanced' && n.enhancedText) return n.enhancedText;
      return n.transcription;
    });

    async function copyText() {
      try {
        await navigator.clipboard.writeText(visibleText.value);
        copied.value = true;
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => { copied.value = false; }, 2000);
      } catch {
        showToast('Failed to copy', 'error');
      }
    }

    async function enhance() {
      const n = note.value;
      if (!n) return;
      enhancing.value = true;
      try {
        const enhanced = await api.enhanceText(n.transcription);
        const idx = store.notes.findIndex((x) => x.id === n.id);
        if (idx !== -1) {
          const updated = { ...store.notes[idx], enhancedText: enhanced };
          store.notes[idx] = updated;
          // Also persist via save_note
          await api.saveNote(updated);
        }
        activeView.value = 'enhanced';
      } catch (err) {
        const msg = String(err);
        if (msg.includes('Invalid API key')) {
          showToast('Invalid API key — check Settings', 'error');
        } else {
          showToast('Enhancement failed: ' + msg, 'error');
        }
      } finally {
        enhancing.value = false;
      }
    }

    async function confirmDelete() {
      const n = note.value;
      if (!n) return;
      try {
        await api.deleteNote(n.id);
        store.notes = store.notes.filter((x) => x.id !== n.id);
        close();
      } catch (err) {
        showToast('Failed to delete note', 'error');
      }
    }

    return () => {
      if (!store.activeNoteId) return null;
      const n = note.value;
      if (!n) return null;

      const displayTitle = n.userTitle ?? n.autoTitle;
      const hasEnhanced = !!n.enhancedText;

      const titleNode = editingTitle.value
        ? h('input', {
            value: titleValue.value,
            onInput: (e) => { titleValue.value = e.target.value; },
            onBlur: commitTitle,
            onKeydown: onTitleKeydown,
            autofocus: true,
            style: 'display:block; width:100%; font-size:18px; font-weight:600; border:none; border-bottom:1.5px solid var(--border-hover); outline:none; background:transparent; color:var(--text-primary); font-family:inherit; padding:2px 0;',
          })
        : h('span', {
            class: 'modal-title',
            onDblclick: startEditTitle,
            title: 'Double-click to edit',
          }, displayTitle);

      const viewToggle = hasEnhanced
        ? h('div', { class: 'view-toggle' }, [
            h('button', {
              class: activeView.value === 'original' ? 'active' : '',
              onClick: () => { activeView.value = 'original'; },
            }, 'Original'),
            h('button', {
              class: activeView.value === 'enhanced' ? 'active' : '',
              onClick: () => { activeView.value = 'enhanced'; },
            }, 'Enhanced'),
          ])
        : null;

      const footerLeft = showDeleteConfirm.value
        ? h('div', { class: 'delete-confirm' }, [
            h('span', {}, 'Delete this note?'),
            h('button', { class: 'btn', onClick: () => { showDeleteConfirm.value = false; } }, 'Cancel'),
            h('button', { class: 'btn btn-danger', onClick: confirmDelete }, 'Delete'),
          ])
        : h('div', { class: 'modal-footer-left' }, [
            h('button', {
              class: 'btn btn-danger',
              onClick: () => { showDeleteConfirm.value = true; },
              title: 'Delete note',
            }, [
              h('svg', {
                viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
                'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
                width: '15', height: '15',
              }, [
                h('polyline', { points: '3 6 5 6 21 6' }),
                h('path', { d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }),
                h('path', { d: 'M10 11v6' }),
                h('path', { d: 'M14 11v6' }),
                h('path', { d: 'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' }),
              ]),
              'Delete',
            ]),
          ]);

      const footerRight = h('div', { class: 'modal-footer-right' }, [
        !hasEnhanced && h('button', {
          class: 'btn btn-primary',
          onClick: enhance,
          disabled: enhancing.value,
        }, enhancing.value
          ? [h('div', { class: 'spinner', style: 'width:14px;height:14px;border-width:2px;' }), ' Enhancing...']
          : 'Enhance with AI'
        ),
      ]);

      return h('div', {
        class: 'modal-backdrop',
        onClick: onBackdropClick,
        onKeydown,
        tabindex: -1,
      }, [
        h('div', {
          class: 'modal',
          onClick: (e) => e.stopPropagation(),
        }, [
          // Header
          h('div', { class: 'modal-header' }, [
            h('div', { class: 'modal-meta' }, [
              h('span', {}, formatTime(n.createdAt)),
              h('span', {}, formatDate(n.createdAt)),
            ]),
            h('button', {
              class: 'modal-close',
              onClick: close,
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

          // Title
          h('div', { class: 'modal-title-row' }, [titleNode]),

          // Body
          h('div', { class: 'modal-body' }, [
            h('div', { class: 'text-block' }, [
              h('div', { class: 'text-block-toolbar' }, [
                viewToggle,
                h('button', {
                  class: ['copy-btn', copied.value ? 'copied' : ''],
                  onClick: copyText,
                }, copied.value ? 'Copied!' : [
                  h('svg', {
                    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
                    'stroke-width': '2', width: '13', height: '13',
                  }, [
                    h('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2' }),
                    h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }),
                  ]),
                  'Copy',
                ]),
              ]),
              h('div', { class: 'note-text' }, visibleText.value),
            ]),
          ]),

          // Footer
          h('div', { class: 'modal-footer' }, [footerLeft, footerRight]),
        ]),
      ]);
    };
  },
});
