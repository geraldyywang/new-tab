// jsdom has no HTMLDialogElement.showModal/close; add just enough for tests.
const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
  __polyfilled?: boolean;
};

if (!proto.__polyfilled) {
  proto.__polyfilled = true;
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.show = proto.showModal;
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/** Simulates pressing Esc: fires a cancelable `cancel`, closes unless prevented. */
export function pressEscape(dialog: HTMLDialogElement): boolean {
  const event = new Event('cancel', {cancelable: true});
  dialog.dispatchEvent(event);
  if (!event.defaultPrevented) dialog.close();
  return !event.defaultPrevented;
}
