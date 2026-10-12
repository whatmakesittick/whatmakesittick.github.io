import { describe, expect, it } from 'vitest';
import { capitalise } from './format';

describe('capitalise', () => {
  it('raises the first letter of a clause in scripts with case', () => {
    expect(capitalise('burnt gas rushes out', 'en')).toBe('Burnt gas rushes out');
    expect(capitalise('évacuation des gaz', 'fr')).toBe('Évacuation des gaz');
    expect(capitalise('поршень стискає суміш', 'uk')).toBe('Поршень стискає суміш');
  });

  it('leaves scripts without case and empty text unchanged', () => {
    expect(capitalise('燃烧的气体推动活塞', 'zh')).toBe('燃烧的气体推动活塞');
    expect(capitalise('燃えたガスが出ていく', 'ja')).toBe('燃えたガスが出ていく');
    expect(capitalise('', 'en')).toBe('');
  });
});
