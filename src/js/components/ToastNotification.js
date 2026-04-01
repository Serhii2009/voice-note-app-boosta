import { defineComponent, h } from '../../js/vendor/vue.esm-browser.prod.js';
import { store } from '../store.js';

export const ToastNotification = defineComponent({
  name: 'ToastNotification',
  setup() {
    return () => {
      if (!store.toast) return null;
      return h('div', { class: 'toast-container' }, [
        h('div', { class: ['toast', store.toast.type === 'error' ? 'error' : ''] },
          store.toast.message
        ),
      ]);
    };
  },
});
