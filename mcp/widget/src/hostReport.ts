import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { REPORT_CONTEXT_META_NAME } from '../../shared/config.ts';
import type { HostContextReport } from '../../shared/tools.ts';

export function readReportFlag(doc: Document = document): boolean {
  const value = doc
    .querySelector(`meta[name="${REPORT_CONTEXT_META_NAME}"]`)
    ?.getAttribute('content')
    ?.trim();
  return value === '1';
}

export function hostContextReport(
  ctx: Partial<McpUiHostContext>,
  viewport: { width: number; height: number },
): HostContextReport {
  const dimensions = ctx.containerDimensions as Record<string, number> | undefined;
  return {
    ...(ctx.displayMode ? { displayMode: ctx.displayMode } : {}),
    ...(ctx.platform ? { platform: ctx.platform } : {}),
    ...(ctx.userAgent ? { userAgent: ctx.userAgent } : {}),
    ...(ctx.safeAreaInsets ? { safeAreaInsets: { ...ctx.safeAreaInsets } } : {}),
    ...(dimensions ? { containerDimensions: { ...dimensions } } : {}),
    ...(ctx.locale ? { locale: ctx.locale } : {}),
    ...(ctx.theme ? { theme: ctx.theme } : {}),
    ...(ctx.timeZone ? { timeZone: ctx.timeZone } : {}),
    viewport,
  };
}

export function createContextReporter(send: (report: HostContextReport) => void) {
  const seen = new Set<string>();
  return (report: HostContextReport) => {
    const key = JSON.stringify([
      report.displayMode,
      report.safeAreaInsets,
      report.locale,
      report.theme,
      report.timeZone,
    ]);
    if (seen.has(key)) return;
    seen.add(key);
    send(report);
  };
}
