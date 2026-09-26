export const SITE_URL = 'https://whatmakesittick.github.io';
export const SITE_NAME = 'What makes it tick';
export const REPOSITORY_URL = 'https://github.com/whatmakesittick/whatmakesittick.github.io';
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;
export const AUTHOR = { name: 'Vitalii Elenhaupt', url: 'https://github.com/veelenga' } as const;
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function explainerUrl(slug: string): string {
  return `${SITE_URL}/${slug}/`;
}

export function explainerSourceUrl(slug: string): string {
  return `${REPOSITORY_URL}/tree/main/explainers/${slug}`;
}
