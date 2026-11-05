import {applyTheme, currentThemeEnvironment} from './applyTheme';
import type {PhotoBackdrop} from '../../theme/photoBackdrop';
import {
  msUntilNextSwitch,
  resolvePresetId,
  type ThemeSettings,
} from './themeSettings';

// Re-check at least hourly, in case the clock jumps (sleep, DST)
const MAX_TIMER_MS = 60 * 60_000;

/**
 * Applies `settings` (and the background `photo`, if any) to `root` now and again whenever the result may change:
 * the system colour scheme flips, the page becomes visible, or the schedule
 * reaches a switch time. Returns a function that stops watching.
 */
export function watchTheme(
  root: HTMLElement,
  settings: ThemeSettings,
  photo?: PhotoBackdrop | null,
): () => void {
  function apply() {
    const presetId = resolvePresetId(settings, currentThemeEnvironment());
    applyTheme(root, presetId, settings.accent, photo);
  }
  apply();

  const media =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  media?.addEventListener('change', apply);
  document.addEventListener('visibilitychange', apply);

  let timer: ReturnType<typeof setTimeout> | undefined;
  function scheduleNextSwitch() {
    const {lightFrom, lightUntil} = settings;
    const delay = msUntilNextSwitch(new Date(), lightFrom, lightUntil);
    timer = setTimeout(
      () => {
        apply();
        scheduleNextSwitch();
      },
      // A little late rather than early, so the new minute has begun
      Math.min(delay + 50, MAX_TIMER_MS),
    );
  }
  if (settings.mode === 'scheduled') scheduleNextSwitch();

  return () => {
    media?.removeEventListener('change', apply);
    document.removeEventListener('visibilitychange', apply);
    clearTimeout(timer);
  };
}
