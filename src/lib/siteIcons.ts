import { createElement, type ReactElement } from "react";
import type { IconType } from "react-icons";
import {
  SiClaude,
  SiGmail,
  SiGooglecalendar,
  SiGooglegemini,
  SiNotion,
} from "react-icons/si";
import { FaGoogleDrive, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { PiMicrosoftOutlookLogoFill } from "react-icons/pi";
import { RiOpenaiFill } from "react-icons/ri";
import { FiGithub, FiInstagram, FiLinkedin } from "react-icons/fi";
import { AiOutlineReddit } from "react-icons/ai";

// Hostname suffix -> icon. A suffix matches the host itself or any subdomain.
const SITE_ICONS: ReadonlyArray<readonly [readonly string[], IconType]> = [
  [["mail.google.com"], SiGmail],
  [["calendar.google.com"], SiGooglecalendar],
  [["drive.google.com"], FaGoogleDrive],
  [["gemini.google.com"], SiGooglegemini],
  [["youtube.com", "youtu.be"], FaYoutube],
  [["notion.so", "notion.site", "notion.com"], SiNotion],
  [
    ["outlook.office.com", "outlook.office365.com", "outlook.live.com"],
    PiMicrosoftOutlookLogoFill,
  ],
  [["claude.ai", "claude.com"], SiClaude],
  [["chatgpt.com", "chat.openai.com"], RiOpenaiFill],
  [["github.com"], FiGithub],
  [["linkedin.com"], FiLinkedin],
  [["instagram.com"], FiInstagram],
  [["x.com", "twitter.com"], FaXTwitter],
  [["reddit.com"], AiOutlineReddit],
];

const hostMatches = (hostname: string, suffix: string) =>
  hostname === suffix || hostname.endsWith(`.${suffix}`);

/** Returns a bundled icon for well-known sites, or null. */
export const iconForUrl = (url: string): IconType | null => {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const match = SITE_ICONS.find(([suffixes]) =>
    suffixes.some((suffix) => hostMatches(hostname, suffix)),
  );
  return match ? match[1] : null;
};

/**
 * The bundled icon as an element (decorative; the link carries the label).
 * Returned as an element rather than a component so callers don't create
 * component types during render.
 */
export const siteIconElement = (url: string): ReactElement | null => {
  const Icon = iconForUrl(url);
  return Icon ? createElement(Icon, { "aria-hidden": true }) : null;
};

/**
 * Chrome's built-in favicon cache (needs the "favicon" permission). Only
 * available when running as an extension; returns null on the dev server.
 */
export const extensionFaviconUrl = (pageUrl: string, size = 32) => {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return null;
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", String(size));
  return url.toString();
};
