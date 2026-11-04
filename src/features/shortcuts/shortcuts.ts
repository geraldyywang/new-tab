/**
 * Page-wide keyboard shortcuts: matching key events to shortcuts, and one
 * `keydown` listener that runs the handlers features bind with
 * `bindShortcut` / `useShortcut`.
 */
import {useEffect, useRef} from 'react';

/** One key press that triggers a shortcut. */
export interface KeyCombo {
  /** `KeyboardEvent.key`, e.g. `,`, `/`, `?` or `Escape`. Shift is ignored. */
  key: string;
  /** Needs Ctrl (Windows, Linux) or Cmd (macOS). */
  mod?: boolean;
}

/** A keyboard shortcut, as listed in the shortcuts registry. */
export interface Shortcut {
  /** Unique id. */
  id: string;
  /** Any of these presses triggers it. */
  combos: readonly KeyCombo[];
  /** What it does, for the shortcuts list. */
  description: string;
  /** Kept for a planned feature: no handler yet, and not listed. */
  reserved?: boolean;
}

/** Whether `event` is a press of `combo`. Alt never matches. */
export function matchesCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  const mod = event.ctrlKey || event.metaKey;
  return event.key === combo.key && !event.altKey && mod === Boolean(combo.mod);
}

/** Whether keys typed into `target` are text input (not shortcuts). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Whether shortcuts should ignore `event`: typing in a field, IME
 * composition, key repeat, already handled, or a modal dialog is open.
 */
export function shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
  return (
    event.defaultPrevented ||
    event.repeat ||
    // 229: some browsers' keydown during IME composition
    event.isComposing ||
    event.keyCode === 229 ||
    isTypingTarget(event.target) ||
    document.querySelector('dialog[open]') !== null
  );
}

/** The first of `shortcuts` that `event` triggers. */
export function findShortcut(
  event: KeyboardEvent,
  shortcuts: Iterable<Shortcut>,
): Shortcut | undefined {
  for (const shortcut of shortcuts) {
    if (shortcut.combos.some(combo => matchesCombo(event, combo))) {
      return shortcut;
    }
  }
  return undefined;
}

/** How to show a combo, e.g. `Ctrl+,`, `⌘,` or `Esc`. */
export function formatCombo(combo: KeyCombo, isMac: boolean): string {
  const key = combo.key === 'Escape' ? 'Esc' : combo.key;
  if (!combo.mod) return key;
  return isMac ? `⌘${key}` : `Ctrl+${key}`;
}

/** Whether this looks like a Mac, for showing Cmd instead of Ctrl. */
export function isMacPlatform(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

const bound = new Map<string, {shortcut: Shortcut; run: () => void}>();

function handleKeyDown(event: KeyboardEvent) {
  if (bound.size === 0 || shouldIgnoreKeyEvent(event)) return;
  const shortcuts = [...bound.values()].map(entry => entry.shortcut);
  const shortcut = findShortcut(event, shortcuts);
  if (!shortcut) return;
  event.preventDefault();
  bound.get(shortcut.id)?.run();
}

/**
 * Runs `run` when `shortcut` is pressed anywhere on the page; returns
 * unbind. Binding the same id again replaces the earlier handler.
 */
export function bindShortcut(shortcut: Shortcut, run: () => void): () => void {
  if (bound.size === 0) window.addEventListener('keydown', handleKeyDown);
  const entry = {shortcut, run};
  bound.set(shortcut.id, entry);
  return () => {
    if (bound.get(shortcut.id) !== entry) return;
    bound.delete(shortcut.id);
    if (bound.size === 0) window.removeEventListener('keydown', handleKeyDown);
  };
}

/** Binds `shortcut` to `run` while the component is mounted. */
export function useShortcut(shortcut: Shortcut, run: () => void): void {
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => bindShortcut(shortcut, () => runRef.current()), [shortcut]);
}
