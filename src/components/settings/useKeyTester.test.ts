import {act, renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {keyTestStatus, useKeyTester} from './useKeyTester';

describe('keyTestStatus', () => {
  it('describes each outcome', () => {
    expect(keyTestStatus({kind: 'ok'}).tone).toBe('ok');
    expect(keyTestStatus({kind: 'network'}).text).toMatch(/Network error/);
    expect(keyTestStatus({kind: 'problem', problem: {kind: 'key'}}).text).toBe(
      'Invalid key.',
    );
    expect(
      keyTestStatus({
        kind: 'problem',
        problem: {kind: 'key', detail: 'API key is invalid.'},
      }).text,
    ).toBe('Invalid key: API key is invalid.');
    expect(
      keyTestStatus({kind: 'problem', problem: {kind: 'quota'}}).text,
    ).toBe('WeatherAPI monthly quota reached.');
  });
});

describe('useKeyTester', () => {
  it('tracks the testing flag and returns the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', {status: 200})),
    );
    const {result} = renderHook(() => useKeyTester());
    let status: Awaited<ReturnType<typeof result.current.run>> = null;
    await act(async () => {
      status = await result.current.run('k');
    });
    expect(status).toMatchObject({tone: 'ok'});
    expect(result.current.testing).toBe(false);
  });

  it('aborts an in-flight test on unmount and resolves to null', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_: string, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise((_, reject) =>
          signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        );
      }),
    );
    const {result, unmount} = renderHook(() => useKeyTester());
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.run('k');
    });
    expect(result.current.testing).toBe(true);
    unmount();
    expect(signal?.aborted).toBe(true);
    await expect(pending).resolves.toBeNull();
  });
});
