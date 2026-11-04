import {describe, expect, it} from 'vitest';
import {
  DEFAULT_SIDEBAR_LINKS,
  DEFAULT_SOCIAL_LINKS,
  MAX_LABEL_LENGTH,
  MAX_LINKS,
  MAX_URL_LENGTH,
  newLinkId,
  normalizeUrlInput,
  parseHttpUrl,
  sameLinks,
  sanitizeLinks,
} from './links';

describe('parseHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(parseHttpUrl('https://example.com/a?b=1')?.href).toBe(
      'https://example.com/a?b=1',
    );
    expect(parseHttpUrl('http://localhost:3000')?.host).toBe('localhost:3000');
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com/file',
    'file:///etc/passwd',
    'chrome://settings',
  ])('rejects non-http(s) protocol %s', url => {
    expect(parseHttpUrl(url)).toBeNull();
  });

  it('rejects relative URLs, garbage and an empty host', () => {
    expect(parseHttpUrl('')).toBeNull();
    expect(parseHttpUrl('/path')).toBeNull();
    expect(parseHttpUrl('example.com')).toBeNull();
    expect(parseHttpUrl('https://')).toBeNull();
    expect(parseHttpUrl('http://exa mple.com')).toBeNull();
  });

  it('rejects overlong URLs', () => {
    const base = 'https://example.com/';
    const atLimit = base + 'a'.repeat(MAX_URL_LENGTH - base.length);
    expect(parseHttpUrl(atLimit)).not.toBeNull();
    expect(parseHttpUrl(atLimit + 'a')).toBeNull();
  });
});

describe('normalizeUrlInput', () => {
  it('trims and leaves URLs with a scheme alone', () => {
    expect(normalizeUrlInput('  https://example.com  ')).toBe(
      'https://example.com',
    );
    expect(normalizeUrlInput('http://example.com')).toBe('http://example.com');
    expect(normalizeUrlInput('javascript:alert(1)')).toBe(
      'javascript:alert(1)',
    );
    expect(normalizeUrlInput('mailto:me@example.com')).toBe(
      'mailto:me@example.com',
    );
  });

  it('prefixes bare hosts with https://', () => {
    expect(normalizeUrlInput('example.com')).toBe('https://example.com');
    expect(normalizeUrlInput('www.example.com/path')).toBe(
      'https://www.example.com/path',
    );
  });

  it('treats host:port as a host, not a scheme', () => {
    expect(normalizeUrlInput('localhost:3000')).toBe('https://localhost:3000');
    expect(normalizeUrlInput('example.com:8080/x')).toBe(
      'https://example.com:8080/x',
    );
    expect(normalizeUrlInput('example.com:8080?q=1')).toBe(
      'https://example.com:8080?q=1',
    );
    expect(parseHttpUrl(normalizeUrlInput('localhost:3000'))).not.toBeNull();
  });

  it('does not mistake a non-numeric suffix for a port', () => {
    expect(normalizeUrlInput('localhost:abc')).toBe('localhost:abc');
    expect(normalizeUrlInput('https://example.com:8080')).toBe(
      'https://example.com:8080',
    );
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeUrlInput('   ')).toBe('');
  });
});

describe('sanitizeLinks', () => {
  const good = {id: 'a', label: 'Example', url: 'https://example.com'};

  it('returns null for anything that is not an array', () => {
    for (const value of [undefined, null, 'x', 42, {}, {0: good}]) {
      expect(sanitizeLinks(value)).toBeNull();
    }
  });

  it('keeps valid links and normalises the URL', () => {
    expect(sanitizeLinks([good])).toEqual([
      {id: 'a', label: 'Example', url: 'https://example.com/'},
    ]);
  });

  it('drops malformed entries', () => {
    const result = sanitizeLinks([
      null,
      'https://example.com',
      42,
      {label: 'No id', url: 'https://example.com'},
      {id: '', label: 'Empty id', url: 'https://example.com'},
      {id: 'x'.repeat(65), label: 'Long id', url: 'https://example.com'},
      {id: 'b', label: 5, url: 'https://example.com'},
      {id: 'c', label: 'No url'},
      {id: 'd', label: 'Script', url: 'javascript:alert(1)'},
      {id: 'e', label: 'Relative', url: '/foo'},
      good,
    ]);
    expect(result?.map(l => l.id)).toEqual(['a']);
  });

  it('drops entries with a duplicate id, keeping the first', () => {
    const result = sanitizeLinks([
      good,
      {id: 'a', label: 'Dup', url: 'https://dup.example.com'},
    ]);
    expect(result).toHaveLength(1);
    expect(result?.[0].label).toBe('Example');
  });

  it(`keeps at most ${MAX_LINKS} links`, () => {
    const many = Array.from({length: MAX_LINKS + 10}, (_, i) => ({
      id: `id-${i}`,
      label: `L${i}`,
      url: `https://example.com/${i}`,
    }));
    expect(sanitizeLinks(many)).toHaveLength(MAX_LINKS);
  });

  it('trims and truncates labels, falling back to the hostname', () => {
    const result = sanitizeLinks([
      {id: 'a', label: '  Padded  ', url: 'https://a.example.com'},
      {id: 'b', label: '   ', url: 'https://b.example.com/x'},
      {id: 'c', label: 'x'.repeat(MAX_LABEL_LENGTH + 5), url: 'https://c.io'},
    ]);
    expect(result?.map(l => l.label)).toEqual([
      'Padded',
      'b.example.com',
      'x'.repeat(MAX_LABEL_LENGTH),
    ]);
  });

  it('returns an empty list when every entry is invalid', () => {
    expect(sanitizeLinks([{id: 'a'}])).toEqual([]);
  });

  it('accepts the defaults unchanged', () => {
    expect(sanitizeLinks(DEFAULT_SIDEBAR_LINKS)).toEqual(DEFAULT_SIDEBAR_LINKS);
    expect(sanitizeLinks(DEFAULT_SOCIAL_LINKS)).toEqual(DEFAULT_SOCIAL_LINKS);
  });
});

describe('sameLinks', () => {
  const a = {id: '1', label: 'A', url: 'https://a.com/'};
  const b = {id: '2', label: 'B', url: 'https://b.com/'};

  it('compares labels and URLs in order, ignoring ids', () => {
    expect(
      sameLinks(
        [a, b],
        [
          {...a, id: 'x'},
          {...b, id: 'y'},
        ],
      ),
    ).toBe(true);
    expect(sameLinks([a, b], [b, a])).toBe(false);
    expect(sameLinks([a], [a, b])).toBe(false);
    expect(sameLinks([a], [{...a, label: 'Other'}])).toBe(false);
    expect(sameLinks([a], [{...a, url: 'https://other.com/'}])).toBe(false);
    expect(sameLinks([], [])).toBe(true);
  });
});

describe('newLinkId', () => {
  it('returns unique ids', () => {
    const ids = new Set(Array.from({length: 100}, newLinkId));
    expect(ids.size).toBe(100);
  });
});
