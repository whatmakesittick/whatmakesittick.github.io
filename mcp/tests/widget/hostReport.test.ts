import { describe, expect, it } from 'vitest';
import {
  createContextReporter,
  hostContextReport,
  readReportFlag,
} from '../../widget/src/hostReport.ts';
import type { HostContextReport } from '../../shared/tools.ts';

const viewport = { width: 840, height: 900 };

describe('host context report', () => {
  it('keeps the fields that place the dock and the locale, theme and time zone', () => {
    expect(
      hostContextReport(
        {
          displayMode: 'fullscreen',
          platform: 'desktop',
          safeAreaInsets: { top: 0, right: 0, bottom: 140, left: 0 },
          containerDimensions: { maxHeight: 900, width: 840 },
          locale: 'uk-UA',
          theme: 'dark',
          timeZone: 'Europe/Kyiv',
          hostCapabilities: {},
        },
        viewport,
      ),
    ).toEqual({
      displayMode: 'fullscreen',
      platform: 'desktop',
      safeAreaInsets: { top: 0, right: 0, bottom: 140, left: 0 },
      containerDimensions: { maxHeight: 900, width: 840 },
      locale: 'uk-UA',
      theme: 'dark',
      timeZone: 'Europe/Kyiv',
      viewport,
    });
  });

  it('reports once per display mode and set of insets', () => {
    const sent: HostContextReport[] = [];
    const report = createContextReporter((r) => sent.push(r));
    report({ displayMode: 'inline', viewport });
    report({ displayMode: 'inline', viewport: { width: 1, height: 1 } });
    report({ displayMode: 'fullscreen', viewport });
    report({
      displayMode: 'fullscreen',
      safeAreaInsets: { top: 0, right: 0, bottom: 140, left: 0 },
      viewport,
    });
    expect(sent.map((r) => r.displayMode)).toEqual(['inline', 'fullscreen', 'fullscreen']);
  });

  it('reports again when the locale, theme or time zone changes', () => {
    const sent: HostContextReport[] = [];
    const report = createContextReporter((r) => sent.push(r));
    report({ displayMode: 'inline', locale: 'en-US', viewport });
    report({ displayMode: 'inline', locale: 'en-US', viewport });
    report({ displayMode: 'inline', locale: 'de-DE', viewport });
    report({ displayMode: 'inline', locale: 'de-DE', theme: 'dark', viewport });
    report({ displayMode: 'inline', locale: 'de-DE', theme: 'dark', timeZone: 'UTC', viewport });
    expect(sent).toHaveLength(4);
  });

  it('reads the flag the server injects', () => {
    const doc = (content: string) =>
      ({
        querySelector: () => ({ getAttribute: () => content }),
      }) as unknown as Document;
    expect(readReportFlag(doc('1'))).toBe(true);
    expect(readReportFlag(doc('0'))).toBe(false);
    expect(readReportFlag(doc('__WMIT_REPORT_CONTEXT__'))).toBe(false);
  });
});
