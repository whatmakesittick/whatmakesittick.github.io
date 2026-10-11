import type { CallToolResult } from '@modelcontextprotocol/server';
import { z } from 'zod';

const num = z.number().finite();
const point = z.object({ x: num, y: num });
const rect = z.object({ x: num, y: num, width: num, height: num });
const path = z.string().max(600);
const element = z.string().max(80);

export const pointerEventSchema = z.object({
  type: z.string().max(32),
  pointerType: z.string().max(16).optional(),
  button: num.optional(),
  isPrimary: z.boolean().optional(),
  client: point.optional(),
  screen: point.optional(),
  offset: point.optional(),
  target: path,
  hit: path.optional(),
  targetControl: element.optional(),
  hitControl: element.optional(),
  capturePrevented: z.boolean(),
  defaultPrevented: z.boolean().optional(),
  reachedBubble: z.boolean(),
  timeStamp: num,
  displayMode: z.string().max(32).optional(),
  viewport: z.object({ width: num, height: num, dpr: num }),
  visualViewport: rect.extend({ scale: num }).optional(),
  documentRect: rect,
  dockRect: rect.optional(),
  sinceDownMs: num.optional(),
  sameAsDown: z.boolean().optional(),
  note: z.string().max(80).optional(),
});

export const pointerEventsReportSchema = z.object({
  events: z.array(pointerEventSchema).max(20),
  dropped: z.number().int().nonnegative().optional(),
});

export type PointerEventsReport = z.infer<typeof pointerEventsReportSchema>;

export function reportPointerEvents(
  report: PointerEventsReport,
  write: (line: string) => void,
): CallToolResult {
  for (const event of report.events) write(`pointer ${JSON.stringify(event)}`);
  if (report.dropped) write(`pointer dropped ${report.dropped}`);
  return { content: [{ type: 'text', text: 'Logged.' }] };
}
