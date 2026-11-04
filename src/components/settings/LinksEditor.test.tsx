import {fireEvent, render, screen, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {StoredLink} from '../../lib/links';
import {SettingsWriteError} from '../../lib/storage';
import {LinksEditor} from './LinksEditor';

const defaults: StoredLink[] = [
  {id: 'd1', label: 'GitHub', url: 'https://github.com/'},
];
const custom: StoredLink[] = [
  {id: 'c1', label: 'Example', url: 'https://example.com/'},
  {id: 'c2', label: 'Other', url: 'https://other.example/'},
];

function renderEditor(links: readonly StoredLink[] = custom) {
  const onSave = vi.fn<(links: StoredLink[] | null) => Promise<void>>(
    async () => {},
  );
  const props = {title: 'Sidebar links', description: '', defaults, onSave};
  const utils = render(<LinksEditor {...props} links={links} />);
  function rerenderWith(next: readonly StoredLink[]) {
    return utils.rerender(<LinksEditor {...props} links={next} />);
  }
  return {onSave, rerenderWith};
}

function button(name: string | RegExp) {
  return screen.getByRole('button', {name});
}
function urlInput(n: number) {
  return screen.getByLabelText<HTMLInputElement>(`URL for link ${n}`);
}
function labelInput(n: number) {
  return screen.getByLabelText<HTMLInputElement>(`Label for link ${n}`);
}

describe('LinksEditor', () => {
  it('saves reordered links', async () => {
    const {onSave} = renderEditor();
    expect(button('Save')).toHaveProperty('disabled', true);
    fireEvent.click(button('Move Other up'));
    fireEvent.click(button('Save'));
    await screen.findByText('Saved.');
    expect(onSave).toHaveBeenCalledWith([custom[1], custom[0]]);
  });

  it('disables moving past the ends', () => {
    renderEditor();
    expect(button('Move Example up')).toHaveProperty('disabled', true);
    expect(button('Move Other down')).toHaveProperty('disabled', true);
  });

  it('adds a link, normalising a bare host', async () => {
    const {onSave} = renderEditor();
    fireEvent.click(button('Add link'));
    fireEvent.change(labelInput(3), {target: {value: 'Local'}});
    fireEvent.change(urlInput(3), {target: {value: 'localhost:3000'}});
    fireEvent.click(button('Save'));
    await screen.findByText('Saved.');
    expect(onSave.mock.calls[0][0]?.[2]).toMatchObject({
      label: 'Local',
      url: 'https://localhost:3000/',
    });
  });

  it('shows an inline error and does not save an unsafe URL', () => {
    const {onSave} = renderEditor();
    fireEvent.change(urlInput(1), {target: {value: 'javascript:alert(1)'}});
    expect(screen.queryByText(/valid web address/)).toBeNull();
    fireEvent.blur(urlInput(1));
    screen.getByText(/valid web address/);
    expect(urlInput(1).getAttribute('aria-invalid')).toBe('true');

    fireEvent.click(button('Save'));
    screen.getByText('Fix the highlighted links first.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('removes a link', async () => {
    const {onSave} = renderEditor();
    fireEvent.click(button('Remove Example'));
    fireEvent.click(button('Save'));
    await screen.findByText('Saved.');
    expect(onSave).toHaveBeenCalledWith([custom[1]]);
  });

  it('saves null after Reset to defaults', async () => {
    const {onSave} = renderEditor();
    fireEvent.click(button('Reset to defaults'));
    expect(labelInput(1).value).toBe('GitHub');
    fireEvent.click(button('Save'));
    await screen.findByText('Saved.');
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('shows storage errors', async () => {
    const {onSave} = renderEditor();
    onSave.mockRejectedValueOnce(new SettingsWriteError('Sync is full.'));
    fireEvent.click(button('Remove Example'));
    fireEvent.click(button('Save'));
    await screen.findByText('Sync is full.');
  });

  it('offers Reload when links change elsewhere during an edit', () => {
    const {rerenderWith} = renderEditor();
    fireEvent.change(labelInput(1), {target: {value: 'Mine'}});
    rerenderWith(defaults);
    expect(labelInput(1).value).toBe('Mine');
    const notice = screen.getByText(/Changed on another device/).parentElement;
    fireEvent.click(within(notice as HTMLElement).getByRole('button'));
    expect(labelInput(1).value).toBe('GitHub');
  });
});
