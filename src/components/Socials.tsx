import {useSettings} from '../lib/storage';
import {LinkIcon} from './LinkIcon';

// Socials bottom-left bar; links are edited in the settings panel
export function Socials() {
  const {loaded, socialLinks} = useSettings();
  if (!loaded || socialLinks.length === 0) return null;

  return (
    <nav
      aria-label="Social links"
      className="absolute z-20 bottom-0 left-0 m-3 min-w-72 max-w-[max(18rem,calc(100vw-24rem))] rounded-xl bg-neutral-900"
    >
      <div className="flex flex-row flex-wrap justify-center gap-y-4 px-5 py-5 text-2xl text-neutral-500">
        {socialLinks.map(link => (
          <LinkIcon key={link.id} link={link} className="mx-4" />
        ))}
      </div>
    </nav>
  );
}
