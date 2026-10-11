import type { CallToolResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { HostContextReport } from '../../shared/tools.ts';

const size = z.number().finite();

export const hostContextReportSchema = z.object({
  displayMode: z.string().max(32).optional(),
  platform: z.string().max(32).optional(),
  userAgent: z.string().max(200).optional(),
  safeAreaInsets: z.object({ top: size, right: size, bottom: size, left: size }).optional(),
  containerDimensions: z.record(z.string().max(32), size).optional(),
  locale: z.string().max(35).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  timeZone: z.string().max(64).optional(),
  viewport: z.object({ width: size, height: size }),
});

export function reportHostContext(
  report: HostContextReport,
  write: (line: string) => void,
): CallToolResult {
  write(`host context ${JSON.stringify(report)}`);
  return { content: [{ type: 'text', text: 'Logged.' }] };
}
