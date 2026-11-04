import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {ShortcutsSettings} from './ShortcutsSettings';

describe('ShortcutsSettings', () => {
  it('lists shortcuts with their keys, leaving reserved ones out', () => {
    render(
      <ShortcutsSettings title="Keyboard shortcuts" onDirtyChange={() => {}} />,
    );
    expect(
      screen.getByRole('heading', {name: 'Keyboard shortcuts'}),
    ).toBeDefined();
    const keys = screen.getAllByText((_, el) => el?.tagName === 'KBD');
    expect(keys.map(k => k.textContent)).toEqual([',', 'Ctrl+,', 'Esc']);
    expect(screen.getByText('Open settings')).toBeDefined();
    expect(screen.queryByText('Focus search')).toBeNull();
  });
});
