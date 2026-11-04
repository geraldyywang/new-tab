import {useState} from 'react';
import type {StoredLink} from '../lib/links';
import {extensionFaviconUrl, siteIconElement} from '../lib/siteIcons';

interface LinkIconProps {
  link: StoredLink;
  className?: string;
}

function LetterBadge({label}: {label: string}) {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-800 text-sm font-bold uppercase"
    >
      {label.trim().charAt(0) || '?'}
    </span>
  );
}

// Unknown site: Chrome's favicon cache in the extension, a letter otherwise
function SiteFavicon({link}: {link: StoredLink}) {
  const [failed, setFailed] = useState(false);
  const src = extensionFaviconUrl(link.url);
  if (!src || failed) return <LetterBadge label={link.label} />;
  return (
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      className="h-6 w-6 opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Icon link to a site: a bundled brand icon if there is one, else the site's
 * favicon, else its first letter.
 */
export function LinkIcon({link, className = ''}: LinkIconProps) {
  const icon = siteIconElement(link.url);
  return (
    <a
      href={link.url}
      aria-label={link.label}
      title={link.label}
      className={`group flex shrink-0 items-center justify-center hover:text-neutral-600 ${className}`}
    >
      {icon ?? <SiteFavicon key={link.url} link={link} />}
    </a>
  );
}
