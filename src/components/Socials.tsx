import { FiGithub, FiInstagram, FiLinkedin } from "react-icons/fi";
import { FaXTwitter } from "react-icons/fa6";
import { AiOutlineReddit } from "react-icons/ai";
import LinkIcon, { type LinkItem } from "./LinkIcon";

// Add, remove, or reorder links here.
const SOCIALS: LinkItem[] = [
  { href: "https://github.com/", label: "GitHub", Icon: FiGithub },
  {
    href: "https://www.linkedin.com/feed/",
    label: "LinkedIn",
    Icon: FiLinkedin,
  },
  { href: "https://www.instagram.com/", label: "Instagram", Icon: FiInstagram },
  { href: "https://x.com/", label: "X", Icon: FaXTwitter },
  { href: "https://www.reddit.com/", label: "Reddit", Icon: AiOutlineReddit },
];

const Socials = () => (
  <nav className="flex flex-row px-5 py-5 text-2xl text-neutral-500 justify-center">
    {SOCIALS.map((link) => (
      <LinkIcon key={link.href} {...link} className="mx-4" />
    ))}
  </nav>
);

export default Socials;
