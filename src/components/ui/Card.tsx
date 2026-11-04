import type {HTMLAttributes} from 'react';
import {surfaceAttributes, type Surface} from './styles';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Element to render; `nav` for a landmark bar. Defaults to `div`. */
  as?: 'div' | 'nav';
  /** How the surface is drawn. Defaults to `solid`. */
  surface?: Surface;
}

/**
 * The surface primitive: a rounded panel in the theme's surface colour. Every
 * card, bar and dialog uses it (or `surfaceAttributes`), so surface styles
 * such as glass are defined in one place.
 */
export function Card({
  as: element = 'div',
  surface = 'solid',
  className,
  ...rest
}: CardProps) {
  const Tag = element;
  return <Tag {...rest} {...surfaceAttributes(surface, className)} />;
}
