import {renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {SHORTCUTS} from './registry';
import {
  bindShortcut,
  findShortcut,
  formatCombo,
  matchesCombo,
  shouldIgnoreKeyEvent,
  useShortcut,
  type Shortcut,
} from './shortcuts';

const COMMA: Shortcut = {
  id: 'comma',
  combos: [{key: ','}, {key: ',', mod: true}],
  description: 'Comma',
};
const HELP: Shortcut = {id: 'help', combos: [{key: '?'}], description: 'Help'};

function key(init: KeyboardEventInit, target: EventTarget = document.body) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

const unbinders: Array<() => void> = [];

afterEach(() => {
  unbinders.splice(0).forEach(unbind => unbind());
  document.body.innerHTML = '';
});

describe('matchesCombo', () => {
  it('matches the key with or without Ctrl/Cmd as asked', () => {
    const plain = {key: ','};
    const mod = {key: ',', mod: true};
    expect(matchesCombo(new KeyboardEvent('keydown', {key: ','}), plain)).toBe(
      true,
    );
    for (const init of [{ctrlKey: true}, {metaKey: true}]) {
      const event = new KeyboardEvent('keydown', {key: ',', ...init});
      expect(matchesCombo(event, plain)).toBe(false);
      expect(matchesCombo(event, mod)).toBe(true);
    }
    const alt = new KeyboardEvent('keydown', {key: ',', altKey: true});
    expect(matchesCombo(alt, plain)).toBe(false);
  });

  it('ignores Shift, so shifted keys like ? match', () => {
    const event = new KeyboardEvent('keydown', {key: '?', shiftKey: true});
    expect(findShortcut(event, [COMMA, HELP])).toBe(HELP);
  });
});

describe('shouldIgnoreKeyEvent', () => {
  it.each(['input', 'textarea', 'select'])('ignores typing in <%s>', tag => {
    const field = document.createElement(tag);
    document.body.append(field);
    expect(shouldIgnoreKeyEvent(key({key: ','}, field))).toBe(true);
  });

  it('ignores typing in contenteditable', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    // jsdom doesn't compute isContentEditable
    Object.defineProperty(editor, 'isContentEditable', {value: true});
    document.body.append(editor);
    expect(shouldIgnoreKeyEvent(key({key: ','}, editor))).toBe(true);
  });

  it('ignores IME composition, repeats and an open dialog', () => {
    expect(shouldIgnoreKeyEvent(key({key: ',', isComposing: true}))).toBe(true);
    expect(shouldIgnoreKeyEvent(key({key: ',', keyCode: 229}))).toBe(true);
    expect(shouldIgnoreKeyEvent(key({key: ',', repeat: true}))).toBe(true);
    expect(shouldIgnoreKeyEvent(key({key: ','}))).toBe(false);
    document.body.innerHTML = '<dialog open></dialog>';
    expect(shouldIgnoreKeyEvent(key({key: ','}))).toBe(true);
  });
});

describe('bindShortcut', () => {
  it('runs the handler and prevents the default action', () => {
    const run = vi.fn();
    unbinders.push(bindShortcut(COMMA, run));
    const event = key({key: ',', ctrlKey: true});
    expect(run).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    expect(key({key: 'x'}).defaultPrevented).toBe(false);
  });

  it('does nothing while typing or after unbinding', () => {
    const run = vi.fn();
    const unbind = bindShortcut(COMMA, run);
    const input = document.createElement('input');
    document.body.append(input);
    key({key: ','}, input);
    unbind();
    key({key: ','});
    expect(run).not.toHaveBeenCalled();
  });

  it('keeps a newer binding when an older one unbinds', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unbindFirst = bindShortcut(COMMA, first);
    unbinders.push(bindShortcut(COMMA, second));
    unbindFirst();
    key({key: ','});
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});

describe('useShortcut', () => {
  it('calls the latest handler while mounted', () => {
    const calls: string[] = [];
    const {rerender, unmount} = renderHook(
      ({label}) => useShortcut(HELP, () => calls.push(label)),
      {initialProps: {label: 'a'}},
    );
    rerender({label: 'b'});
    key({key: '?'});
    unmount();
    key({key: '?'});
    expect(calls).toEqual(['b']);
  });
});

describe('registry', () => {
  it('has unique ids and no two shortcuts on the same combo', () => {
    expect(new Set(SHORTCUTS.map(s => s.id)).size).toBe(SHORTCUTS.length);
    const combos = SHORTCUTS.flatMap(s =>
      s.combos.map(c => `${c.mod ? 'mod+' : ''}${c.key}`),
    );
    expect(new Set(combos).size).toBe(combos.length);
  });
});

describe('formatCombo', () => {
  it('shows Ctrl or Cmd for modified combos', () => {
    expect(formatCombo({key: ','}, false)).toBe(',');
    expect(formatCombo({key: ',', mod: true}, false)).toBe('Ctrl+,');
    expect(formatCombo({key: ',', mod: true}, true)).toBe('⌘,');
    expect(formatCombo({key: 'Escape'}, true)).toBe('Esc');
  });
});
