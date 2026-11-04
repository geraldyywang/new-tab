import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MAX_LINKS, type StoredLink } from "../../lib/links";
import {
  cleanRows,
  linksReducer,
  useLinksDraft,
  validateRow,
} from "./linksDraft";

const link = (id: string, label = id, url = `https://${id}.example.com/`) => ({
  id,
  label,
  url,
});
const a = link("a");
const b = link("b");
const c = link("c");
const defaults: readonly StoredLink[] = [a, b];

describe("validateRow", () => {
  it("requires a label and an http(s) URL", () => {
    expect(validateRow(a)).toEqual({});
    expect(validateRow({ id: "x", label: " ", url: "" })).toEqual({
      label: "Enter a label.",
      url: "Enter a URL.",
    });
    expect(validateRow(link("x", "X", "javascript:alert(1)")).url).toMatch(
      /http:\/\/ or https:\/\//,
    );
    expect(validateRow(link("x", "X", "ftp://files.example.com")).url).toBe(
      "Enter a valid web address starting with http:// or https://.",
    );
  });

  it("accepts bare hosts and host:port", () => {
    expect(validateRow(link("x", "X", "example.com"))).toEqual({});
    expect(validateRow(link("x", "X", "localhost:3000"))).toEqual({});
  });
});

describe("linksReducer", () => {
  it("updates one row", () => {
    expect(
      linksReducer([a, b], {
        type: "update",
        index: 1,
        patch: { label: "B!" },
      }),
    ).toEqual([a, { ...b, label: "B!" }]);
  });

  it("moves rows and ignores moves past either end", () => {
    expect(
      linksReducer([a, b, c], { type: "move", index: 0, delta: 1 }),
    ).toEqual([b, a, c]);
    expect(
      linksReducer([a, b, c], { type: "move", index: 2, delta: -1 }),
    ).toEqual([a, c, b]);
    const rows = [a, b];
    expect(linksReducer(rows, { type: "move", index: 0, delta: -1 })).toBe(
      rows,
    );
    expect(linksReducer(rows, { type: "move", index: 1, delta: 1 })).toBe(rows);
  });

  it("removes and adds rows, up to MAX_LINKS", () => {
    expect(linksReducer([a, b], { type: "remove", index: 0 })).toEqual([b]);
    expect(linksReducer([a], { type: "add", id: "new" })).toEqual([
      a,
      { id: "new", label: "", url: "" },
    ]);
    const full = Array.from({ length: MAX_LINKS }, (_, i) => link(`l${i}`));
    expect(linksReducer(full, { type: "add", id: "x" })).toBe(full);
  });

  it("resets to a copy of the given links", () => {
    const result = linksReducer([c], { type: "reset", links: defaults });
    expect(result).toEqual(defaults);
    expect(result[0]).not.toBe(defaults[0]);
  });
});

describe("cleanRows", () => {
  it("trims labels and normalises URLs", () => {
    expect(
      cleanRows([{ id: "x", label: " X ", url: " example.com " }]),
    ).toEqual([{ id: "x", label: "X", url: "https://example.com/" }]);
  });

  it("returns null if any row is invalid", () => {
    expect(
      cleanRows([a, { id: "x", label: "X", url: "javascript:1()" }]),
    ).toBeNull();
    expect(cleanRows([{ ...a, label: "  " }])).toBeNull();
  });
});

describe("useLinksDraft", () => {
  const setup = (saved: readonly StoredLink[] = [c]) =>
    renderHook(({ saved }) => useLinksDraft(saved, defaults), {
      initialProps: { saved },
    });

  it("tracks dirtiness through add, move and remove", () => {
    const { result } = setup([a, b]);
    expect(result.current.dirty).toBe(false);
    act(() => result.current.dispatch({ type: "move", index: 0, delta: 1 }));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.dispatch({ type: "move", index: 1, delta: -1 }));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.add());
    expect(result.current.rows).toHaveLength(3);
    act(() => result.current.dispatch({ type: "remove", index: 2 }));
    expect(result.current.dirty).toBe(false);
  });

  it("only shows errors after a field is left or a save is attempted", () => {
    const { result } = setup([a]);
    act(() => result.current.add());
    expect(result.current.errorFor(1, "url")).toBeUndefined();

    act(() => result.current.markTouched(result.current.rows[1].id, "url"));
    expect(result.current.errorFor(1, "url")).toBe("Enter a URL.");
    expect(result.current.errorFor(1, "label")).toBeUndefined();

    let prepared: ReturnType<typeof result.current.prepareSave> = null;
    act(() => {
      prepared = result.current.prepareSave();
    });
    expect(prepared).toBeNull();
    expect(result.current.errorFor(1, "label")).toBe("Enter a label.");
  });

  it("prepares a cleaned list and normalises the draft", () => {
    const { result } = setup([a]);
    act(() =>
      result.current.dispatch({
        type: "update",
        index: 0,
        patch: { url: "localhost:3000" },
      }),
    );
    let prepared: ReturnType<typeof result.current.prepareSave> = null;
    act(() => {
      prepared = result.current.prepareSave();
    });
    expect(prepared).toEqual({
      links: [{ id: "a", label: "a", url: "https://localhost:3000/" }],
    });
    expect(result.current.rows[0].url).toBe("https://localhost:3000/");
  });

  it("saves null when the list matches the defaults", () => {
    const { result } = setup([c]);
    expect(result.current.isDefault).toBe(false);
    act(() => result.current.reset());
    expect(result.current.isDefault).toBe(true);
    expect(result.current.dirty).toBe(true);
    let prepared: ReturnType<typeof result.current.prepareSave> = null;
    act(() => {
      prepared = result.current.prepareSave();
    });
    expect(prepared).toEqual({ links: null });
  });

  it("adopts external changes when clean and flags them when dirty", () => {
    const { result, rerender } = setup([a]);
    rerender({ saved: [b] });
    expect(result.current.rows).toEqual([b]);

    act(() => result.current.add());
    rerender({ saved: [c] });
    expect(result.current.conflict).toBe(true);
    expect(result.current.rows).toHaveLength(2);

    act(() => result.current.reload());
    expect(result.current.rows).toEqual([c]);
    expect(result.current.conflict).toBe(false);
  });
});
