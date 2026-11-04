import {
  SiClaude,
  SiGmail,
  SiGooglecalendar,
  SiGooglegemini,
  SiNotion,
} from "react-icons/si";
import { GiAcorn, GiFruitTree } from "react-icons/gi";
import { FaGoogleDrive, FaYoutube } from "react-icons/fa";
import { PiMicrosoftOutlookLogoFill } from "react-icons/pi";
import { RiOpenaiFill } from "react-icons/ri";
import LinkIcon, { type LinkItem } from "./LinkIcon";

// Add, remove, or reorder links here.
const LINKS: LinkItem[] = [
  { href: "https://acorn.utoronto.ca/", label: "Acorn", Icon: GiAcorn },
  { href: "https://q.utoronto.ca/", label: "Quercus", Icon: GiFruitTree },
  {
    // Replace with your Notion page
    href: "https://www.notion.so/f9a6a338e0404893b26e1a7c280c3f82?v=988ed6935b4e4bb2b20282080773e057",
    label: "Notion",
    Icon: SiNotion,
  },
  {
    href: "https://outlook.office.com/mail/",
    label: "Outlook",
    Icon: PiMicrosoftOutlookLogoFill,
  },
  {
    href: "https://mail.google.com/mail/u/0/#inbox",
    label: "Gmail",
    Icon: SiGmail,
  },
  {
    href: "https://calendar.google.com/",
    label: "Google Calendar",
    Icon: SiGooglecalendar,
  },
  {
    href: "https://drive.google.com/drive/u/0/my-drive",
    label: "Google Drive",
    Icon: FaGoogleDrive,
  },
  { href: "https://www.youtube.com/", label: "YouTube", Icon: FaYoutube },
  { href: "https://claude.ai/", label: "Claude", Icon: SiClaude },
  { href: "https://chatgpt.com/", label: "ChatGPT", Icon: RiOpenaiFill },
  { href: "https://gemini.google.com/", label: "Gemini", Icon: SiGooglegemini },
];

const HelpfulLinks = () => (
  <nav className="flex flex-col items-center justify-center h-full px-5 py-5 text-2xl text-neutral-500">
    {LINKS.map((link) => (
      <LinkIcon key={link.href} {...link} className="my-3" />
    ))}
  </nav>
);

export default HelpfulLinks;
