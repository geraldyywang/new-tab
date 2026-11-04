import {useSlice} from '../../settings/slices';
import {sidebarLinksSlice} from './settings';
import {LinkIcon} from './LinkIcon';
import {Card} from '../../ui/Card';

/**
 * Quick-access sidebar on the right; links are edited in the settings panel.
 */
export function HelpfulLinks() {
  const {loaded, value: sidebarLinks} = useSlice(sidebarLinksSlice);

  return (
    <Card
      aria-label="Quick links"
      as="nav"
      className="absolute z-20 inset-y-0 right-0 m-3 w-16"
    >
      <div className="flex h-full flex-col items-center justify-center-safe overflow-y-auto px-5 py-5 text-2xl text-fg-subtle [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]">
        {loaded &&
          sidebarLinks.map(link => (
            <LinkIcon key={link.id} link={link} className="my-3" />
          ))}
      </div>
    </Card>
  );
}
