// Shared Tailwind classes for surfaces, buttons, inputs and status text

/** Joins class names, skipping empty and `false` entries. */
export function joinClasses(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/**
 * How a surface is drawn: `solid` for cards and bars, `overlay` for modal
 * dialogs, which get a stronger tint over a photo. Both are opaque token
 * colours until a background photo turns every surface into a frosted pane
 * of it (src/ui/surfaces.css). The liquid-glass styles (#29) are meant to be
 * added here.
 */
export type Surface = 'solid' | 'overlay';

const SURFACE_CLASS: Record<Surface, string> = {
  solid: 'bg-surface',
  overlay: 'bg-surface-overlay',
};

/** Props that draw an element as a card surface. */
export interface SurfaceAttributes {
  /** Styling hook for the surface style, e.g. `[data-surface=glass]`. */
  'data-surface': Surface;
  className: string;
}

/**
 * Card surface props for elements `Card` can't render, such as `<dialog>` or
 * a `<button>`. Spread them onto the element: `<dialog {...attrs}>`.
 */
export function surfaceAttributes(
  surface: Surface = 'solid',
  className?: string,
): SurfaceAttributes {
  return {
    'data-surface': surface,
    className: joinClasses('rounded-xl', SURFACE_CLASS[surface], className),
  };
}

/** Keyboard focus ring for interactive elements. */
export const focusRingClass =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Text button. */
export const buttonClass = `inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-bold text-fg-muted hover:bg-surface-3 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-2 disabled:hover:text-fg-muted ${focusRingClass}`;

/** Square, icon-only button. */
export const iconButtonClass = `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-subtle ${focusRingClass}`;

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
