export const LOADER_VERSION = 1;
export const LOADER_META_NAME = 'wmit-loader';
export const WIDGET_MODULE_FILE = 'widget.js';
export const LOADER_MAX_BYTES = 8 * 1024;

export interface LoaderInbox {
  take(): MessageEvent[];
}

export interface WidgetStartOptions {
  assetBase: string;
  inbox?: LoaderInbox;
  loaderVersion?: number;
}

export type WidgetStart = (root: HTMLElement, options: WidgetStartOptions) => void;
