import { defineComponent, h } from '../../js/vendor/vue.esm-browser.prod.js';
import { NoteCard } from './NoteCard.js';

export const NoteGrid = defineComponent({
  name: 'NoteGrid',
  props: {
    notes: { type: Array, required: true },
  },
  emits: ['open'],
  setup(props, { emit }) {
    return () => {
      if (props.notes.length === 0) {
        return h('div', { class: 'empty-state' }, [
          h('svg', {
            width: 48, height: 48, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', 'stroke-width': '1.5',
            'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          }, [
            h('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }),
            h('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
            h('line', { x1: '12', y1: '19', x2: '12', y2: '23' }),
            h('line', { x1: '8', y1: '23', x2: '16', y2: '23' }),
          ]),
          h('p', {}, 'No notes yet'),
          h('p', { style: 'font-size:13px' }, 'Press the mic button or Ctrl+Shift+Space to record'),
        ]);
      }
      return h('div', { class: 'note-grid' },
        props.notes.map((note) =>
          h(NoteCard, {
            key: note.id,
            note,
            onOpen: (id) => emit('open', id),
          })
        )
      );
    };
  },
});
