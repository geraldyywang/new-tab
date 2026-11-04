import { describe, expect, it, vi } from "vitest";
import { FiGithub } from "react-icons/fi";
import { FaXTwitter } from "react-icons/fa6";
import { SiGmail } from "react-icons/si";
import { extensionFaviconUrl, iconForUrl, siteIconElement } from "./siteIcons";

describe("iconForUrl", () => {
  it("matches the host itself and its subdomains", () => {
    expect(iconForUrl("https://github.com/")).toBe(FiGithub);
    expect(iconForUrl("https://gist.github.com/x")).toBe(FiGithub);
    expect(iconForUrl("https://GITHUB.COM/")).toBe(FiGithub);
    expect(iconForUrl("https://mail.google.com/mail/u/0/#inbox")).toBe(SiGmail);
  });

  it("does not match lookalike hosts", () => {
    expect(iconForUrl("https://evilgithub.com/")).toBeNull();
    expect(iconForUrl("https://github.com.evil.example/")).toBeNull();
    expect(iconForUrl("https://notmail.google.com/")).toBeNull();
  });

  it("only matches the specific Google products", () => {
    expect(iconForUrl("https://www.google.com/")).toBeNull();
    expect(iconForUrl("https://maps.google.com/")).toBeNull();
  });

  it("maps both X and Twitter", () => {
    expect(iconForUrl("https://x.com/")).toBe(FaXTwitter);
    expect(iconForUrl("https://mobile.twitter.com/")).toBe(FaXTwitter);
  });

  it("returns null for unknown sites and invalid URLs", () => {
    expect(iconForUrl("https://example.com/")).toBeNull();
    expect(iconForUrl("not a url")).toBeNull();
    expect(iconForUrl("")).toBeNull();
  });
});

describe("siteIconElement", () => {
  it("returns a decorative element for known sites only", () => {
    const element = siteIconElement("https://github.com/");
    expect(element?.type).toBe(FiGithub);
    expect(element?.props).toMatchObject({ "aria-hidden": true });
    expect(siteIconElement("https://example.com/")).toBeNull();
  });
});

describe("extensionFaviconUrl", () => {
  it("is null outside the extension", () => {
    expect(extensionFaviconUrl("https://example.com/")).toBeNull();
    vi.stubGlobal("chrome", { runtime: {} });
    expect(extensionFaviconUrl("https://example.com/")).toBeNull();
  });

  it("uses Chrome's _favicon endpoint with an encoded page URL", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        id: "abc",
        getURL: (path: string) => `chrome-extension://abc${path}`,
      },
    });
    const url = new URL(
      extensionFaviconUrl("https://example.com/a?b=1&c=2") ?? "",
    );
    expect(url.href.split("?")[0]).toBe("chrome-extension://abc/_favicon/");
    expect(url.searchParams.get("pageUrl")).toBe(
      "https://example.com/a?b=1&c=2",
    );
    expect(url.searchParams.get("size")).toBe("32");
  });
});
