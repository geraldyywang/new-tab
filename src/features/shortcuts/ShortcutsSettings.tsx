import {Fragment} from 'react';
import type {SettingsSectionProps} from '../../settings/sections';
import * as ui from '../../ui/styles';
import {SHORTCUTS} from './registry';
import {formatCombo, isMacPlatform} from './shortcuts';

/** Settings section listing the keyboard shortcuts (read-only). */
export function ShortcutsSettings({title}: SettingsSectionProps) {
  const isMac = isMacPlatform();
  return (
    <section aria-labelledby="settings-shortcuts-title">
      <h3 id="settings-shortcuts-title" className={ui.sectionTitleClass}>
        {title}
      </h3>
      <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        {SHORTCUTS.filter(s => !s.reserved).map(shortcut => (
          <Fragment key={shortcut.id}>
            <dt className="flex gap-1">
              {shortcut.combos.map((combo, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="text-fg-subtle">or</span>}
                  <kbd className="rounded border border-border bg-surface-inset px-1.5 font-mono text-fg">
                    {formatCombo(combo, isMac)}
                  </kbd>
                </Fragment>
              ))}
            </dt>
            <dd>{shortcut.description}</dd>
          </Fragment>
        ))}
      </dl>
      <p className="mt-2 text-xs text-fg-subtle">
        Shortcuts don't work while you're typing in a field.
      </p>
    </section>
  );
}
