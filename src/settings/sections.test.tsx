import {fireEvent, render, screen} from '@testing-library/react';
import {useEffect} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  SETTINGS_SECTIONS,
  sortSections,
  type SettingsSection,
  type SettingsSectionProps,
} from './sections';
import {SettingsDialog} from './SettingsDialog';

function FakeSection({title, onDirtyChange}: SettingsSectionProps) {
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  return (
    <section>
      <h3>{title}</h3>
      <button type="button" onClick={() => onDirtyChange(true)}>
        Edit {title}
      </button>
    </section>
  );
}

function fake(id: string, order: number): SettingsSection {
  return {id, title: `Title ${id}`, order, slices: [], Component: FakeSection};
}

afterEach(() => window.localStorage.clear());

describe('sortSections', () => {
  it('orders by `order`', () => {
    const sorted = sortSections([fake('b', 20), fake('a', 10), fake('c', 30)]);
    expect(sorted.map(s => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('rejects duplicate ids', () => {
    expect(() => sortSections([fake('a', 1), fake('a', 2)])).toThrow(
      /Duplicate/,
    );
  });
});

describe('SETTINGS_SECTIONS', () => {
  it('lists the built-in sections in display order', () => {
    expect(SETTINGS_SECTIONS.map(s => s.id)).toEqual([
      'apiKey',
      'sidebarLinks',
      'socialLinks',
      'appearance',
      'background',
    ]);
    expect(SETTINGS_SECTIONS.map(s => s.title)).toEqual([
      'Weather API key',
      'Sidebar links',
      'Social links',
      'Appearance',
      'Background',
    ]);
  });
});

describe('SettingsDialog with a custom registry', () => {
  it('renders each section with its title, in order', () => {
    render(
      <SettingsDialog
        open
        onClose={() => {}}
        sections={sortSections([fake('two', 2), fake('one', 1)])}
      />,
    );
    expect(
      screen.getAllByRole('heading', {level: 3}).map(h => h.textContent),
    ).toEqual(['Title one', 'Title two']);
  });

  it('asks before closing when any section reports unsaved edits', () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    const onClose = vi.fn();
    render(
      <SettingsDialog
        open
        onClose={onClose}
        sections={sortSections([fake('one', 1), fake('two', 2)])}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Edit Title two'}));
    fireEvent.click(screen.getByRole('button', {name: 'Close settings'}));
    expect(confirm).toHaveBeenCalledWith('Discard unsaved changes?');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
