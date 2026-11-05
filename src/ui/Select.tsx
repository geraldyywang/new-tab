import type {ComponentProps} from 'react';
import {inputClass, joinClasses} from './styles';

/** Drop-down list, styled like `TextInput`. */
export function Select({className, ...rest}: ComponentProps<'select'>) {
  return <select {...rest} className={joinClasses(inputClass, className)} />;
}
