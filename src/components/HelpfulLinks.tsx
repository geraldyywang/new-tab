import {useSettings} from '../lib/storage';
import {LinkIcon} from './LinkIcon';

/**
 * Quick-access sidebar on the right; links are edited in the settings panel.
 */
export function HelpfulLinks() {
  const {loaded, sidebarLinks} = useSettings();

  return (
    <nav
      aria-label="Quick links"
      className="absolute z-20 inset-y-0 right-0 m-3 w-16 rounded-xl bg-surface"
    >
      <div className="flex h-full flex-col items-center justify-center-safe overflow-y-auto px-5 py-5 text-2xl text-fg-subtle [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]">
        {loaded &&
          sidebarLinks.map(link => (
            <LinkIcon key={link.id} link={link} className="my-3" />
          ))}
      </div>
    </nav>
  );
}
