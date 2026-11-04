import type { IconType } from "react-icons";

export interface LinkItem {
  href: string;
  label: string;
  Icon: IconType;
}

interface LinkIconProps extends LinkItem {
  className?: string;
}

const LinkIcon = ({ href, label, Icon, className = "" }: LinkIconProps) => (
  <a
    href={href}
    aria-label={label}
    title={label}
    className={`hover:text-neutral-600 ${className}`}
  >
    <Icon />
  </a>
);

export default LinkIcon;
