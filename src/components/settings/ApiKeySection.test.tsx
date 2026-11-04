import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ApiKeySection from "./ApiKeySection";

const input = () => screen.getByLabelText<HTMLInputElement>("WeatherAPI key");
const button = (name: string) => screen.getByRole("button", { name });

const renderSection = (savedKey = "", onDirtyChange = vi.fn()) => {
  const utils = render(
    <ApiKeySection
      savedKey={savedKey}
      backend="local-storage"
      onDirtyChange={onDirtyChange}
    />,
  );
  const rerenderWith = (key: string) =>
    utils.rerender(
      <ApiKeySection
        savedKey={key}
        backend="local-storage"
        onDirtyChange={onDirtyChange}
      />,
    );
  return { ...utils, rerenderWith, onDirtyChange };
};

afterEach(() => window.localStorage.clear());

describe("ApiKeySection", () => {
  it("saves the trimmed key", async () => {
    renderSection();
    fireEvent.change(input(), { target: { value: "  abc  " } });
    fireEvent.click(button("Save"));
    await screen.findByText("Key saved.");
    expect(window.localStorage.getItem("new-tab:weatherApiKey")).toBe('"abc"');
  });

  it("toggles key visibility", () => {
    renderSection("secret");
    expect(input().type).toBe("password");
    fireEvent.click(button("Show API key"));
    expect(input().type).toBe("text");
    fireEvent.click(button("Hide API key"));
    expect(input().type).toBe("password");
  });

  it("reports dirtiness to the parent", () => {
    const { onDirtyChange } = renderSection("a");
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    fireEvent.change(input(), { target: { value: "b" } });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it.each([
    [401, 2006, "Invalid key: API key is invalid."],
    [403, 2007, "WeatherAPI monthly quota reached."],
    [403, 2008, "Your key has been disabled."],
  ])("Test shows the API's verdict for %i/%i", async (status, code, text) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code, message: "API key is invalid." } }),
            { status },
          ),
        ),
    );
    renderSection("k");
    fireEvent.click(button("Test"));
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it("Test reports success and network errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    renderSection("k");

    fireEvent.click(button("Test"));
    await screen.findByText("OK — the key works.");
    fireEvent.click(button("Test"));
    await screen.findByText(/Network error/);
  });

  it("adopts a key changed on another device when not editing", () => {
    const { rerenderWith } = renderSection("old");
    rerenderWith("new");
    expect(input().value).toBe("new");
    expect(screen.queryByText(/Changed on another device/)).toBeNull();
  });

  it("keeps unsaved edits and offers Reload on a conflicting change", () => {
    const { rerenderWith } = renderSection("old");
    fireEvent.change(input(), { target: { value: "typing" } });
    rerenderWith("new");
    expect(input().value).toBe("typing");
    screen.getByText(/Changed on another device/);

    fireEvent.click(button("Reload"));
    expect(input().value).toBe("new");
    expect(screen.queryByText(/Changed on another device/)).toBeNull();
  });

  it("Clear removes the stored key", async () => {
    window.localStorage.setItem("new-tab:weatherApiKey", '"abc"');
    renderSection("abc");
    fireEvent.click(button("Clear"));
    await screen.findByText("Key cleared.");
    await waitFor(() =>
      expect(window.localStorage.getItem("new-tab:weatherApiKey")).toBeNull(),
    );
    expect(input().value).toBe("");
  });
});
