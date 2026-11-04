import {useSettings} from '../lib/storage';
import {LinkIcon} from './LinkIcon';
import {Card} from './ui/Card';

/**
 * Social links bar at the bottom left; renders nothing when the list is empty.
 * Links are edited in the settings panel.
 */
export function Socials() {
  const {loaded, socialLinks} = useSettings();
  if (!loaded || socialLinks.length === 0) return null;

  return (
    <Card
      aria-label="Social links"
      as="nav"
      className="absolute z-20 bottom-0 left-0 m-3 min-w-72 max-w-[max(18rem,calc(100vw-24rem))]"
    >
      <div className="flex flex-row flex-wrap justify-center gap-y-4 px-5 py-5 text-2xl text-fg-subtle">
        {socialLinks.map(link => (
          <LinkIcon key={link.id} link={link} className="mx-4" />
        ))}
      </div>
    </Card>
  );
}
