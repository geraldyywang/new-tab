// Shared Tailwind classes for buttons, inputs and status text

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Text button. */
export const buttonClass = `inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-bold text-fg-muted hover:bg-surface-3 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-2 disabled:hover:text-fg-muted ${focusRing}`;

/** Square, icon-only button. */
export const iconButtonClass = `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-subtle ${focusRing}`;

/** Text input; the border turns red when `aria-invalid` is set. */
export const inputClass =
  'w-full min-w-0 rounded-lg border border-border bg-surface-inset px-3 py-1.5 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none aria-[invalid=true]:border-danger/70';

/** Heading of a settings section. */
export const sectionTitleClass = 'text-lg font-bold text-fg-muted';

/** Tone of a status message; picks its colour. */
export type StatusTone = 'ok' | 'error' | 'info';

/** A short status line shown after an action such as Save or Test. */
export interface StatusMessage {
  tone: StatusTone;
  text: string;
}

/** Text colour for each status tone. */
export const statusClass: Record<StatusTone, string> = {
  ok: 'text-success/80',
  error: 'text-danger/90',
  info: 'text-fg-subtle',
};
