export interface StoredLink {
  id: string;
  label: string;
  url: string;
}

export const MAX_LINKS = 50;
export const MAX_LABEL_LENGTH = 100;
export const MAX_URL_LENGTH = 2048;
const MAX_ID_LENGTH = 64;

export const DEFAULT_SIDEBAR_LINKS: readonly StoredLink[] = [
  {
    id: 'default-gmail',
    label: 'Gmail',
    url: 'https://mail.google.com/mail/u/0/#inbox',
  },
  {
    id: 'default-calendar',
    label: 'Google Calendar',
    url: 'https://calendar.google.com/',
  },
  {
    id: 'default-drive',
    label: 'Google Drive',
    url: 'https://drive.google.com/drive/u/0/my-drive',
  },
  {id: 'default-youtube', label: 'YouTube', url: 'https://www.youtube.com/'},
  {id: 'default-claude', label: 'Claude', url: 'https://claude.ai/'},
  {id: 'default-chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/'},
  {id: 'default-gemini', label: 'Gemini', url: 'https://gemini.google.com/'},
  {id: 'default-notion', label: 'Notion', url: 'https://www.notion.so/'},
];

export const DEFAULT_SOCIAL_LINKS: readonly StoredLink[] = [
  {id: 'default-github', label: 'GitHub', url: 'https://github.com/'},
  {
    id: 'default-linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/feed/',
  },
  {
    id: 'default-instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/',
  },
  {id: 'default-x', label: 'X', url: 'https://x.com/'},
  {id: 'default-reddit', label: 'Reddit', url: 'https://www.reddit.com/'},
];

/** Parses `input` and returns it only if it is an absolute http(s) URL. */
export const parseHttpUrl = (input: string): URL | null => {
  if (input.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return url;
  } catch {
    return null;
  }
};

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
// `localhost:3000`, `example.com:8080/x`: a port, not a scheme
const HOST_WITH_PORT = /^[^/?#:]+:\d+(?:[/?#]|$)/;

/**
 * Adds `https://` when the user typed a bare host such as `example.com` or
 * `localhost:3000`. Anything with a real scheme is left for validation.
 */
export const normalizeUrlInput = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (SCHEME.test(trimmed) && !HOST_WITH_PORT.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const newLinkId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Validates an untrusted value read from storage. Returns `null` when the
 * value is not a list at all (caller falls back to defaults); otherwise drops
 * malformed entries, duplicate ids and anything that is not an http(s) URL.
 */
export const sanitizeLinks = (value: unknown): StoredLink[] | null => {
  if (!Array.isArray(value)) return null;

  const seen = new Set<string>();
  const links: StoredLink[] = [];

  for (const item of value.slice(0, MAX_LINKS)) {
    if (typeof item !== 'object' || item === null) continue;
    const {id, label, url} = item as Record<string, unknown>;
    if (typeof id !== 'string' || !id || id.length > MAX_ID_LENGTH) continue;
    if (seen.has(id)) continue;
    if (typeof label !== 'string' || typeof url !== 'string') continue;

    const parsed = parseHttpUrl(url);
    if (!parsed) continue;

    seen.add(id);
    links.push({
      id,
      label: label.trim().slice(0, MAX_LABEL_LENGTH) || parsed.hostname,
      url: parsed.href,
    });
  }

  return links;
};

/** Same labels and URLs in the same order (ids ignored). */
export const sameLinks = (
  a: readonly StoredLink[],
  b: readonly StoredLink[],
): boolean =>
  a.length === b.length &&
  a.every((link, i) => link.label === b[i].label && link.url === b[i].url);
