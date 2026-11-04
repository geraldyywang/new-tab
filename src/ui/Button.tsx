import type {ComponentProps} from 'react';
import {buttonClass, iconButtonClass, joinClasses} from './styles';

/** Text button. `type` defaults to `button`, not the HTML default `submit`. */
export function Button({
  type = 'button',
  className,
  ...rest
}: ComponentProps<'button'>) {
  return (
    <button
      {...rest}
      type={type}
      className={joinClasses(buttonClass, className)}
    />
  );
}

/**
 * Square, icon-only button. Give it an `aria-label`; `type` defaults to
 * `button`.
 */
export function IconButton({
  type = 'button',
  className,
  ...rest
}: ComponentProps<'button'>) {
  return (
    <button
      {...rest}
      type={type}
      className={joinClasses(iconButtonClass, className)}
    />
  );
}
