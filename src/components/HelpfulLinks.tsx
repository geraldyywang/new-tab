import {useSettings} from '../lib/storage';
import {LinkIcon} from './LinkIcon';

// Quick-access side bar; links are edited in the settings panel
export const HelpfulLinks = () => {
  const {loaded, sidebarLinks} = useSettings();

  return (
    <nav
      aria-label="Quick links"
      className="absolute z-20 inset-y-0 right-0 m-3 w-16 rounded-xl bg-neutral-900"
    >
      <div className="flex h-full flex-col items-center justify-center-safe overflow-y-auto px-5 py-5 text-2xl text-neutral-500 [scrollbar-color:var(--color-neutral-700)_transparent] [scrollbar-width:thin]">
        {loaded &&
          sidebarLinks.map(link => (
            <LinkIcon key={link.id} link={link} className="my-3" />
          ))}
      </div>
    </nav>
  );
};
