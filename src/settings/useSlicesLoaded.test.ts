import {renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {installChromeStorageMock} from '../test/chromeStorageMock';

function parse(data: unknown) {
  return typeof data === 'string' ? data : null;
}

describe('useSlicesLoaded', () => {
  it('is true only once every slice has loaded', async () => {
    const mock = installChromeStorageMock();
    vi.resetModules();
    const {defineSettingsSlice} = await import('./slices');
    const {useSlicesLoaded} = await import('./useSlicesLoaded');
    const slices = [
      defineSettingsSlice({key: 'a', area: 'sync', parse, default: ''}),
      defineSettingsSlice({key: 'b', area: 'local', parse, default: ''}),
    ];

    mock.deferGets = true;
    const {result} = renderHook(() => useSlicesLoaded(slices));
    expect(result.current).toBe(false);
    await vi.waitFor(() => expect(mock.pendingGets).toHaveLength(2));

    mock.pendingGets[0]();
    await new Promise(r => setTimeout(r, 5));
    expect(result.current).toBe(false);

    mock.pendingGets[1]();
    await vi.waitFor(() => expect(result.current).toBe(true));
  });
});
