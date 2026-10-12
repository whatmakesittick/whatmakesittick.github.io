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

export const ENV = {
  port: 'PORT',
  host: 'WMIT_HOST',
  allowedOrigins: 'WMIT_ALLOWED_ORIGINS',
  assetBase: 'WMIT_ASSET_BASE',
  publicUrl: 'MCP_PUBLIC_URL',
  excludeTags: 'WMIT_EXCLUDE_TAGS',
  logRequests: 'WMIT_LOG_REQUESTS',
  siteDir: 'WMIT_SITE_DIR',
} as const;

export const PATHS = {
  site: 'dist',
  loader: 'mcp/widget/loader.html',
  widgetModule: 'dist/embed/v1/widget.js',
} as const;

export const ATTRIBUTION = 'What makes it tick, by Vitalii Elenhaupt, MIT';
