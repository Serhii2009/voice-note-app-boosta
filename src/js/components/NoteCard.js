import { defineComponent, h, ref } from '../../js/vendor/vue.esm-browser.prod.js';
import * as api from '../api.js';
import { store, showToast } from '../store.js';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const NoteCard = defineComponent({
  name: 'NoteCard',
  props: {
    note: { type: Object, required: true },
  },
  emits: ['open'],
  setup(props, { emit }) {
    const editingTitle = ref(false);
    const titleValue = ref('');

    function startEdit(e) {
      e.stopPropagation();
      titleValue.value = props.note.userTitle ?? props.note.autoTitle;
      editingTitle.value = true;
    }

    async function commitTitle() {
      editingTitle.value = false;
      const newTitle = titleValue.value.trim();
      const current = props.note.userTitle ?? props.note.autoTitle;
      if (newTitle === current) return;
      try {
        await api.updateNoteTitle(props.note.id, newTitle);
        const idx = store.notes.findIndex((n) => n.id === props.note.id);
        if (idx !== -1) {
          store.notes[idx] = {
            ...store.notes[idx],
            userTitle: newTitle || null,
          };
        }
      } catch (err) {
        showToast('Failed to save title', 'error');
      }
    }

    function onTitleKeydown(e) {
      if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
      if (e.key === 'Escape') { editingTitle.value = false; }
    }

    const displayTitle = () => props.note.userTitle ?? props.note.autoTitle;
    const previewText = () => props.note.enhancedText ?? props.note.transcription;

    return () => {
      const titleNode = editingTitle.value
        ? h('div', { class: 'note-card-title' }, [
            h('input', {
              value: titleValue.value,
              onInput: (e) => { titleValue.value = e.target.value; },
              onBlur: commitTitle,
              onKeydown: onTitleKeydown,
              onClick: (e) => e.stopPropagation(),
              autofocus: true,
            }),
          ])
        : h('div', {
            class: 'note-card-title',
            onDblclick: startEdit,
          }, displayTitle());

      return h('div', {
        class: 'note-card',
        onClick: () => emit('open', props.note.id),
      }, [
        titleNode,
        h('div', { class: 'note-card-preview' }, previewText()),
        h('div', { class: 'note-card-footer' }, [
          h('span', {}, formatTime(props.note.createdAt)),
          h('span', {}, formatDate(props.note.createdAt)),
        ]),
      ]);
    };
  },
});
