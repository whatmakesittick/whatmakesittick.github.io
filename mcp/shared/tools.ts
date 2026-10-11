import type { EmbedApiVersion } from '../../src/core/embed/manifest.ts';
import type { LanguageCode } from '../../src/core/i18n/languages.ts';
import type { Tag } from './catalogue.ts';

export const TOOL_SHOW_EXPLAINER = 'show_explainer' as const;
export const TOOL_LIST_EXPLAINERS = 'list_explainers' as const;
export const TOOL_REPORT_HOST_CONTEXT = 'report_host_context' as const;
export const TOOL_REPORT_POINTER_EVENTS = 'report_pointer_events' as const;

export const WIDGET_RESOURCE_URI = 'ui://wmit/explainer.html' as const;
export const WIDGET_RESOURCE_NAME = 'What makes it tick explainer' as const;
export const WIDGET_RESOURCE_DESCRIPTION = 'Interactive 3D explainer viewer' as const;

export const SHOW_EXPLAINER_DESCRIPTION_MAX = 1200;
export const MODEL_TEXT_MAX_BYTES = 4096;

export const SHOW_EXPLAINER_CHAPTER_DESCRIBE =
  'Chapter id from list_explainers (e.g. "magnet"), a 1-based number, or words from the chapter title. Omit to start at the overview.';

export const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: false,
  idempotentHint: true,
} as const;

export const OPENAI_INVOCATION_META = {
  'openai/toolInvocation/invoking': 'Loading the 3D model…',
  'openai/toolInvocation/invoked': 'Explainer ready',
} as const;

export interface ShowExplainerInput {
  slug: string;
  chapter?: string;
  lang?: string;
}

export interface ShowExplainerResult {
  slug: string;
  chapter: string;
  chapterIndex: number;
  chapterCount: number;
  title: string;
  chapterTitle: string;
  url: string;
  apiVersion: EmbedApiVersion;
  lang?: LanguageCode;
}

export interface ListExplainersInput {
  tag?: Tag;
  lang?: string;
}

export interface ListExplainersItem {
  slug: string;
  title: string;
  summary: string;
  tags: Tag[];
  chapters: { id: string; title: string }[];
}

export interface ListExplainersResult {
  explainers: ListExplainersItem[];
}

export interface ModelContextSnapshot {
  slug: string;
  chapter: string;
  view: Record<string, boolean>;
  choices: Record<string, string>;
  playing: boolean;
}

export const MODEL_CONTEXT_DEBOUNCE_MS = 600;

export interface WidgetUiMeta {
  prefersBorder?: boolean;
  csp: {
    resourceDomains: string[];
    connectDomains: string[];
  };
  domain?: string;
}

export interface HostInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HostContextReport {
  displayMode?: string;
  platform?: string;
  userAgent?: string;
  safeAreaInsets?: HostInsets;
  containerDimensions?: Record<string, number>;
  locale?: string;
  theme?: 'light' | 'dark';
  timeZone?: string;
  viewport: { width: number; height: number };
}
