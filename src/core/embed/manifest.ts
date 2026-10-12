export const EMBED_API_VERSION = 1 as const;
export type EmbedApiVersion = typeof EMBED_API_VERSION;

export interface EmbedChapterOutline {
  id: string;
  paragraphs: readonly string[];
}

export interface EmbedManifestEntry {
  slug: string;
  module: string;
  cover: string;
  title: string;
  eyebrow: string;
  summary: string;
  tagline: string;
  tags: readonly string[];
  topic: string;
  chapters: readonly { id: string; title: string }[];
}

export interface EmbedManifest {
  apiVersion: EmbedApiVersion;
  explainers: readonly EmbedManifestEntry[];
}
