export type Scheme = 'dark' | 'light';

export const SCHEME_NAMES: readonly Scheme[] = ['dark', 'light'];
export const DEFAULT_SCHEME: Scheme = 'dark';
export const SCHEME_STORAGE_KEY = 'wmit-theme';
export const THEME_COLOR: Readonly<Record<Scheme, string>> = {
  dark: '#1e1b17',
  light: '#f4f3ef',
};

export interface SchemeEnvironment {
  storage(): { getItem(key: string): string | null };
  matchMedia(query: string): { matches: boolean };
}

export interface PreferredScheme {
  scheme: Scheme;
  stored: boolean;
}

export function isScheme(value: unknown): value is Scheme {
  return value === 'dark' || value === 'light';
}

export function otherScheme(scheme: Scheme): Scheme {
  return scheme === 'dark' ? 'light' : 'dark';
}

export function schemeQuery(scheme: Scheme): string {
  return `(prefers-color-scheme: ${scheme})`;
}

function storedScheme(environment: SchemeEnvironment): Scheme | undefined {
  try {
    const value = environment.storage().getItem(SCHEME_STORAGE_KEY);
    return isScheme(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function systemScheme(environment: SchemeEnvironment): Scheme {
  try {
    return environment.matchMedia(schemeQuery('light')).matches ? 'light' : DEFAULT_SCHEME;
  } catch {
    return DEFAULT_SCHEME;
  }
}

export function preferredScheme(environment: SchemeEnvironment): PreferredScheme {
  const stored = storedScheme(environment);
  return stored
    ? { scheme: stored, stored: true }
    : { scheme: systemScheme(environment), stored: false };
}

export function storeScheme(
  storage: () => { setItem(key: string, value: string): void },
  scheme: Scheme,
): boolean {
  try {
    storage().setItem(SCHEME_STORAGE_KEY, scheme);
    return true;
  } catch {
    return false;
  }
}
