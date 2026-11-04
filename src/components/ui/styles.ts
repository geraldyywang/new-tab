// Shared Tailwind classes for buttons, inputs and status text

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500';

export const buttonClass = `inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-bold text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-400 ${focusRing}`;

export const iconButtonClass = `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500 ${focusRing}`;

export const inputClass =
  'w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-300 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none aria-[invalid=true]:border-red-400/70';

export const sectionTitleClass = 'text-lg font-bold text-neutral-400';

export type StatusTone = 'ok' | 'error' | 'info';

export interface StatusMessage {
  tone: StatusTone;
  text: string;
}

export const statusClass: Record<StatusTone, string> = {
  ok: 'text-emerald-400/80',
  error: 'text-red-400/90',
  info: 'text-neutral-500',
};
