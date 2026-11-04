import {useEffect} from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {
  SETTINGS_SECTIONS,
  sortSections,
  type SettingsSection,
  type SettingsSectionProps,
} from './sections';

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
    ]);
    expect(SETTINGS_SECTIONS.map(s => s.title)).toEqual([
      'Weather API key',
      'Sidebar links',
      'Social links',
    ]);
  });
});
