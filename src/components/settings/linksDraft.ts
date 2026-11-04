import { useState } from "react";
import {
  MAX_LABEL_LENGTH,
  MAX_LINKS,
  MAX_URL_LENGTH,
  newLinkId,
  normalizeUrlInput,
  parseHttpUrl,
  sameLinks,
  type StoredLink,
} from "../../lib/links";
import { useSyncedDraft } from "./useSyncedDraft";

export type LinkField = "label" | "url";
export type RowErrors = Partial<Record<LinkField, string>>;

export const validateRow = (row: StoredLink): RowErrors => {
  const errors: RowErrors = {};
  if (!row.label.trim()) errors.label = "Enter a label.";
  const url = normalizeUrlInput(row.url);
  if (!url) errors.url = "Enter a URL.";
  else if (url.length > MAX_URL_LENGTH) errors.url = "That URL is too long.";
  else if (!parseHttpUrl(url)) {
    errors.url = "Enter a valid web address starting with http:// or https://.";
  }
  return errors;
};

export type LinksAction =
  | { type: "update"; index: number; patch: Partial<Record<LinkField, string>> }
  | { type: "move"; index: number; delta: -1 | 1 }
  | { type: "remove"; index: number }
  | { type: "add"; id: string }
  | { type: "reset"; links: readonly StoredLink[] };

export const linksReducer = (
  rows: readonly StoredLink[],
  action: LinksAction,
): readonly StoredLink[] => {
  switch (action.type) {
    case "update":
      return rows.map((row, i) =>
        i === action.index ? { ...row, ...action.patch } : row,
      );
    case "move": {
      const target = action.index + action.delta;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[action.index], next[target]] = [next[target], next[action.index]];
      return next;
    }
    case "remove":
      return rows.filter((_, i) => i !== action.index);
    case "add":
      if (rows.length >= MAX_LINKS) return rows;
      return [...rows, { id: action.id, label: "", url: "" }];
    case "reset":
      return action.links.map((link) => ({ ...link }));
  }
};

/** Trimmed labels and normalised URLs, or null if any row is invalid. */
export const cleanRows = (rows: readonly StoredLink[]): StoredLink[] | null => {
  const cleaned: StoredLink[] = [];
  for (const row of rows) {
    const url = parseHttpUrl(normalizeUrlInput(row.url));
    const label = row.label.trim().slice(0, MAX_LABEL_LENGTH);
    if (!url || !label) return null;
    cleaned.push({ id: row.id, label, url: url.href });
  }
  return cleaned;
};

/** Editable copy of a saved link list with validation state. */
export const useLinksDraft = (
  saved: readonly StoredLink[],
  defaults: readonly StoredLink[],
) => {
  const synced = useSyncedDraft(saved, sameLinks);
  // "<row id>:<field>" for fields the user has left at least once
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const rows = synced.draft;
  const errors = rows.map(validateRow);

  const clearValidation = () => {
    setTouched(new Set());
    setSubmitted(false);
  };
  const dispatch = (action: LinksAction) =>
    synced.setDraft((prev) => linksReducer(prev, action));

  return {
    rows,
    dirty: synced.dirty,
    conflict: synced.conflict,
    isDefault: sameLinks(rows, defaults),
    canAdd: rows.length < MAX_LINKS,
    dispatch,
    add: () => dispatch({ type: "add", id: newLinkId() }),
    reset: () => {
      dispatch({ type: "reset", links: defaults });
      clearValidation();
    },
    reload: () => {
      synced.reload();
      clearValidation();
    },
    markTouched: (id: string, field: LinkField) =>
      setTouched((prev) => new Set(prev).add(`${id}:${field}`)),
    /** Error to show for a field: after it was left, or after a save attempt. */
    errorFor: (index: number, field: LinkField) =>
      submitted || touched.has(`${rows[index].id}:${field}`)
        ? errors[index][field]
        : undefined,
    /**
     * Validates for saving. Returns null if invalid (errors now shown);
     * otherwise the list to store, with `null` meaning "use the defaults".
     */
    prepareSave: (): { links: StoredLink[] | null } | null => {
      setSubmitted(true);
      const cleaned = cleanRows(rows);
      if (!cleaned) return null;
      synced.setDraft(cleaned);
      return { links: sameLinks(cleaned, defaults) ? null : cleaned };
    },
    clearValidation,
  };
};
