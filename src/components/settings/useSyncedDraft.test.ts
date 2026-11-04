import {act, renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useReportDirty, useSyncedDraft} from './useSyncedDraft';

const trimEquals = (a: string, b: string) => a.trim() === b.trim();

const setup = (initial: string) =>
  renderHook(({saved}) => useSyncedDraft(saved, trimEquals), {
    initialProps: {saved: initial},
  });

describe('useSyncedDraft', () => {
  it('starts clean with the saved value', () => {
    const {result} = setup('a');
    expect(result.current).toMatchObject({
      draft: 'a',
      dirty: false,
      conflict: false,
    });
  });

  it('becomes dirty when edited and clean when edited back', () => {
    const {result} = setup('a');
    act(() => result.current.setDraft('b'));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.setDraft(' a '));
    expect(result.current.dirty).toBe(false);
  });

  it('adopts an external change when the draft is clean', () => {
    const {result, rerender} = setup('a');
    rerender({saved: 'from-other-device'});
    expect(result.current).toMatchObject({
      draft: 'from-other-device',
      dirty: false,
      conflict: false,
    });
  });

  it('keeps a dirty draft and flags a conflict on an external change', () => {
    const {result, rerender} = setup('a');
    act(() => result.current.setDraft('my edit'));
    rerender({saved: 'from-other-device'});
    expect(result.current).toMatchObject({
      draft: 'my edit',
      dirty: true,
      conflict: true,
    });

    act(() => result.current.reload());
    expect(result.current).toMatchObject({
      draft: 'from-other-device',
      dirty: false,
      conflict: false,
    });
  });

  it('does not flag a conflict when the saved value catches up with the draft', () => {
    // e.g. our own save finishing
    const {result, rerender} = setup('a');
    act(() => result.current.setDraft('b'));
    rerender({saved: 'b'});
    expect(result.current).toMatchObject({dirty: false, conflict: false});
  });

  it('clears the conflict if the draft is edited to match the saved value', () => {
    const {result, rerender} = setup('a');
    act(() => result.current.setDraft('mine'));
    rerender({saved: 'theirs'});
    act(() => result.current.setDraft('theirs'));
    expect(result.current.conflict).toBe(false);
  });
});

describe('useReportDirty', () => {
  it('reports changes and false on unmount', () => {
    const onDirtyChange = vi.fn();
    const {rerender, unmount} = renderHook(
      ({dirty}) => useReportDirty(dirty, onDirtyChange),
      {initialProps: {dirty: false}},
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    rerender({dirty: true});
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
