import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { ENGLISH, type Strings } from './strings.ts';

export const StringsContext = createContext<Strings>(ENGLISH);

export function useStrings(): Strings {
  return useContext(StringsContext);
}
