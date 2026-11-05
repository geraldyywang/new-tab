import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {
  clearSlicePreview,
  setSlicePreview,
  usePreviewedSlice,
} from './slicePreview';
import {defineSettingsSlice} from './slices';

const slice = defineSettingsSlice<string>({
  key: 'test.preview',
  area: 'sync',
  parse: data => (typeof data === 'string' ? data : null),
  default: 'saved',
});

afterEach(() => clearSlicePreview(slice));

describe('usePreviewedSlice', () => {
  it('shows the saved value, then the preview, then the saved value', async () => {
    const {result} = renderHook(() => usePreviewedSlice(slice));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.value).toBe('saved');

    act(() => setSlicePreview(slice, 'draft'));
    expect(result.current).toEqual({loaded: true, value: 'draft'});

    act(() => clearSlicePreview(slice));
    expect(result.current.value).toBe('saved');
  });
});
