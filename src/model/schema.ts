import { z } from 'zod';
import type { Board } from './types';
import { SCHEMA_VERSION } from './types';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});

const sprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  startDate: isoDate,
  endDate: isoDate,
});

const placementSchema = z.object({
  startSprintId: z.string().min(1),
  span: z.number().int().min(1),
});

const ticketSchema = z.object({
  id: z.string().min(1),
  key: z.string(),
  title: z.string(),
  points: z.number().nonnegative().nullable(),
  assigneeId: z.string().nullable(),
  blockedBy: z.array(z.string()),
  epicKey: z.string().nullable(),
  placement: placementSchema.nullable(),
});

const timeOffSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    type: z.literal('holiday'),
    startDate: isoDate,
    endDate: isoDate.nullable(),
    label: z.string(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('pto'),
    memberId: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate.nullable(),
    label: z.string(),
  }),
]);

export const boardSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  settings: z.object({
    daysPerPoint: z.number().positive(),
    thresholds: z.object({ green: z.number(), yellow: z.number() }),
  }),
  members: z.array(memberSchema),
  sprints: z.array(sprintSchema),
  tickets: z.array(ticketSchema),
  timeOff: z.array(timeOffSchema),
  rowOrder: z.array(z.string()),
});

export type BoardParseResult = { ok: true; board: Board } | { ok: false; error: string };

/**
 * Boundary for anything that did not originate in this session — imported
 * files and rehydrated localStorage. Invalid input is rejected with a readable
 * message rather than being allowed to corrupt the board.
 */
export function parseBoard(input: unknown): BoardParseResult {
  const result = boardSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.');
    return {
      ok: false,
      error: path ? `${path}: ${issue?.message}` : (issue?.message ?? 'Unrecognised board file'),
    };
  }
  return { ok: true, board: result.data as Board };
}
