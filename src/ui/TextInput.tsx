import type {ComponentProps} from 'react';
import {inputClass, joinClasses} from './styles';

/**
 * Single-line text input. Set `aria-invalid` to show the error border.
 */
export function TextInput({className, ...rest}: ComponentProps<'input'>) {
  return <input {...rest} className={joinClasses(inputClass, className)} />;
}
