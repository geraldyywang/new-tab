import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {Button, IconButton} from './Button';
import {Card} from './Card';
import {joinClasses, surfaceAttributes} from './styles';
import {TextInput} from './TextInput';

describe('joinClasses', () => {
  it('joins class names and skips empty ones', () => {
    expect(joinClasses('a', undefined, false, '', 'b')).toBe('a b');
  });
});

describe('surfaceAttributes', () => {
  it('defaults to a solid surface', () => {
    expect(surfaceAttributes()).toEqual({
      'data-surface': 'solid',
      className: 'rounded-xl bg-surface',
    });
  });

  it('appends extra classes', () => {
    expect(surfaceAttributes('solid', 'p-4').className).toBe(
      'rounded-xl bg-surface p-4',
    );
  });
});

describe('Card', () => {
  it('renders a solid div by default', () => {
    render(<Card data-testid="card">Hi</Card>);
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('DIV');
    expect(card).toHaveProperty('dataset.surface', 'solid');
    expect(card.className).toBe('rounded-xl bg-surface');
  });

  it('renders the requested element with extra props and classes', () => {
    render(
      <Card as="nav" aria-label="Bar" className="m-3">
        Links
      </Card>,
    );
    const nav = screen.getByRole('navigation', {name: 'Bar'});
    expect(nav.className).toBe('rounded-xl bg-surface m-3');
    expect(nav.textContent).toBe('Links');
  });
});

describe('Button and IconButton', () => {
  it.each([
    ['Button', Button],
    ['IconButton', IconButton],
  ])('%s defaults to type=button and keeps extra classes', (_, component) => {
    const Component = component;
    render(<Component className="text-xl">Go</Component>);
    const button = screen.getByRole('button', {name: 'Go'});
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className.endsWith(' text-xl')).toBe(true);
  });

  it('honours an explicit type', () => {
    render(<Button type="submit">Save</Button>);
    expect(
      screen.getByRole('button', {name: 'Save'}).getAttribute('type'),
    ).toBe('submit');
  });
});

describe('TextInput', () => {
  it('passes props through and keeps extra classes', () => {
    render(<TextInput aria-label="Key" aria-invalid className="font-mono" />);
    const input = screen.getByRole('textbox', {name: 'Key'});
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.className.endsWith(' font-mono')).toBe(true);
  });
});
