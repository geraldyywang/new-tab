import { afterEach, describe, expect, it, vi } from "vitest";
import { installChromeStorageMock } from "../test/chromeStorageMock";
import {
  chromeSyncBackend,
  createBackend,
  hasChromeSync,
  LOCAL_STORAGE_PREFIX,
  localStorageBackend,
} from "./storageBackends";

afterEach(() => window.localStorage.clear());

describe("backend selection", () => {
  it("uses chrome.storage.sync when it exists", () => {
    installChromeStorageMock();
    expect(hasChromeSync()).toBe(true);
    expect(createBackend().kind).toBe("chrome-sync");
  });

  it("falls back to localStorage without the chrome global", () => {
    expect(hasChromeSync()).toBe(false);
    expect(createBackend().kind).toBe("local-storage");
  });

  it("falls back to localStorage on a regular web page in Chrome", () => {
    // Chrome exposes `chrome` to pages, but without `storage`
    vi.stubGlobal("chrome", { runtime: {} });
    expect(createBackend().kind).toBe("local-storage");
  });
});

describe("chromeSyncBackend", () => {
  it("reads, writes and removes our keys", async () => {
    const mock = installChromeStorageMock();
    mock.data.set("unrelated", 1);
    const backend = chromeSyncBackend();

    await backend.set("weatherApiKey", "abc");
    expect(await backend.get()).toEqual({ weatherApiKey: "abc" });

    await backend.remove("weatherApiKey");
    expect(await backend.get()).toEqual({});
    expect(mock.data.get("unrelated")).toBe(1);
  });

  it("notifies only for changes to our keys in the sync area", async () => {
    const mock = installChromeStorageMock();
    const onChange = vi.fn();
    const unsubscribe = chromeSyncBackend().subscribe(onChange);

    mock.externalSet({ unrelated: 1 });
    await new Promise((r) => setTimeout(r, 5));
    expect(onChange).not.toHaveBeenCalled();

    mock.externalSet({ socialLinks: [] });
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    unsubscribe();
    expect(mock.listenerCount()).toBe(0);
  });
});

describe("localStorageBackend", () => {
  it("stores JSON under a prefix", async () => {
    const backend = localStorageBackend();
    await backend.set("sidebarLinks", [{ id: "a" }]);
    expect(
      window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}sidebarLinks`),
    ).toBe('[{"id":"a"}]');
    expect(await backend.get()).toEqual({ sidebarLinks: [{ id: "a" }] });

    await backend.remove("sidebarLinks");
    expect(await backend.get()).toEqual({});
  });

  it("skips items with corrupt JSON", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem(
      `${LOCAL_STORAGE_PREFIX}weatherApiKey`,
      "{oops",
    );
    window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX}socialLinks`, "[]");
    expect(await localStorageBackend().get()).toEqual({ socialLinks: [] });
  });

  it("notifies on storage events for our prefix or a full clear", () => {
    const onChange = vi.fn();
    const unsubscribe = localStorageBackend().subscribe(onChange);

    window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    expect(onChange).not.toHaveBeenCalled();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: `${LOCAL_STORAGE_PREFIX}socialLinks`,
      }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
