// Minimal script for the overlay pill window.
// This window appears when recording via global hotkey.
// It has no interactive elements — just visual feedback.

// The overlay is destroyed by Rust when recording stops,
// so no additional logic is needed here. The pill is always
// in "Recording..." state while this window is alive.

// If the API key is missing, the overlay shows an error message.
// This is communicated via the window label or by passing data
// through the URL hash when the window is created.

const label = document.getElementById('label');
const pill = document.getElementById('pill');

// Check if we were opened with an error flag (future enhancement)
const params = new URLSearchParams(window.location.search);
if (params.get('error')) {
  pill.classList.add('error');
  label.textContent = params.get('error');
}
