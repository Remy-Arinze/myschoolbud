export const NOTIFICATION_SOUND_SRC =
  '/sounds/universfield-new-notification-051-494246.mp3';

const PLAY_DEBOUNCE_MS = 900;

let audio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;

function getAudio() {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio(NOTIFICATION_SOUND_SRC);
    audio.preload = 'auto';
  }
  return audio;
}

/** Prime the audio element during a user gesture so later plays are allowed. */
export function unlockNotificationSound() {
  const el = getAudio();
  if (!el) return;
  const prev = el.volume;
  el.volume = 0;
  void el
    .play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      el.volume = prev || 0.7;
    })
    .catch(() => {
      el.volume = prev || 0.7;
    });
}

export function playNotificationSound() {
  const el = getAudio();
  if (!el) return;
  const now = Date.now();
  if (now - lastPlayedAt < PLAY_DEBOUNCE_MS) return;
  lastPlayedAt = now;
  try {
    el.pause();
    el.currentTime = 0;
    el.volume = 0.7;
    void el.play().catch(() => {
      // Autoplay may still be blocked until the next user gesture.
    });
  } catch {
    // ignore
  }
}
