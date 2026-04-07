// Persistent ambient overlay — always visible while the app is running.
// Starts in idle (dark) state from CSS; switches to recording (red + glow)
// when the global hotkey recording is active.
//
// State changes arrive as Tauri events emitted by show_overlay / hide_overlay
// Rust commands (which no longer create or destroy this window).

const capsule = document.getElementById('capsule');
const { listen } = window.__TAURI__.event;

listen('overlay-state', (event) => {
  if (event.payload && event.payload.state === 'recording') {
    capsule.classList.add('recording');
  } else {
    capsule.classList.remove('recording');
  }
});
