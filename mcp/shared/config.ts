export const SERVER_NAME = 'whatmakesittick-mcp';
export const SERVER_VERSION = '0.1.0';
export const DEFAULT_PORT = 3003;
export const DEFAULT_HOST = '127.0.0.1';

export const ROUTES = {
  mcp: '/mcp',
  embed: '/embed/v1/',
  healthz: '/healthz',
} as const;

export const ASSET_BASE_TOKEN = '__WMIT_ASSET_BASE__';
export const ASSET_BASE_META_NAME = 'wmit-asset-base';
export const REPORT_CONTEXT_TOKEN = '__WMIT_REPORT_CONTEXT__';
export const REPORT_CONTEXT_META_NAME = 'wmit-report-context';

export const ENV = {
  port: 'PORT',
  assetBase: 'WMIT_ASSET_BASE',
  publicUrl: 'MCP_PUBLIC_URL',
  excludeTags: 'WMIT_EXCLUDE_TAGS',
  logRequests: 'WMIT_LOG_REQUESTS',
} as const;

export const PATHS = {
  site: 'dist',
  build: 'mcp/dist',
  catalogue: 'mcp/dist/catalogue.json',
  loader: 'mcp/widget/loader.html',
  widgetModule: 'dist/embed/v1/widget.js',
} as const;

export const SITE_ASSET_BASE = 'https://whatmakesittick.github.io/embed/v1/';
export const ATTRIBUTION = 'What makes it tick, by Vitalii Elenhaupt, MIT';
