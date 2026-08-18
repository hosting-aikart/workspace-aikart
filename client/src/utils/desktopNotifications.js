/**
 * Native OS/browser notifications (the `Notification` Web API) — the little
 * toast that appears from the OS notification tray even when this tab isn't
 * the focused one.
 *
 * Scope, honestly stated: this only fires while the app is open somewhere
 * (a tab, even backgrounded/minimized) — the browser process has to be
 * running this page's JS for it to work. Notifications while the browser
 * itself is fully closed need a service worker + the Push API + a backend
 * subscription store, which is a materially bigger feature (VAPID keys, a
 * push subscription per device, etc.) and isn't what's built here.
 */

let permissionRequested = false;

/**
 * requestNotificationPermission
 * Call once per session (after login) — if the user has never answered the
 * browser's permission prompt this asks once; if they already granted or
 * denied it, this is a no-op (the browser remembers and won't re-prompt).
 */
export function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (permissionRequested) return;
  permissionRequested = true;

  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {
      // Ignore — some browsers reject instead of resolving 'denied'.
    });
  }
}

/**
 * showDesktopNotification
 * Skips showing one if this tab is already the focused, visible one — the
 * in-app bell/toast already covers that case, so a duplicate OS popup would
 * just be noise while you're actively looking at the app.
 */
export function showDesktopNotification(title, { body, tag, icon, onClick } = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return;

  try {
    const notification = new Notification(title, { body, tag, icon });
    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch {
    // The constructor form isn't supported everywhere (notably mobile
    // Safari, which requires a service worker) — fail silently rather than
    // breaking the in-app notification this is layered on top of.
  }
}
