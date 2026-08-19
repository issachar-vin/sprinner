/** Bumped whenever the persisted/exported shape changes. */
export const SCHEMA_VERSION = 1;

/** Calendar date, `YYYY-MM-DD`. Never carries a time or a timezone. */
export type ISODate = string;

export type Member = {
  id: string;
  name: string;
};

export type Sprint = {
  /** Stable id. The displayed "Sprint #" is derived from board position. */
  id: string;
  name: string | null;
  startDate: ISODate;
  endDate: ISODate;
};

export type Placement = {
  startSprintId: string;
  /** Number of columns covered, minimum 1. Always contiguous. */
  span: number;
};

export type Ticket = {
  /** Internal id. Distinct from `key` so Jira renames don't orphan placements. */
  id: string;
  /** Jira-style key, e.g. PROJ-123. Display field and import merge key. */
  key: string;
  title: string;
  /** null means unestimated — counted separately, never treated as zero work. */
  points: number | null;
  assigneeId: string | null;
  blockedBy: string[];
  epicKey: string | null;
  /** null means the ticket sits in the backlog. */
  placement: Placement | null;
};

/** Team-wide non-working day. Applies to every member. */
export type Holiday = {
  id: string;
  type: 'holiday';
  startDate: ISODate;
  endDate: ISODate | null;
  label: string;
};

/** Time off for a single member. */
export type Pto = {
  id: string;
  type: 'pto';
  memberId: string;
  startDate: ISODate;
  endDate: ISODate | null;
  label: string;
};

/**
 * Discriminated so "PTO without a member" and "holiday scoped to one member"
 * are unrepresentable rather than validated against.
 */
export type TimeOff = Holiday | Pto;

/**
 * A time-off entry before it has an id. Spelled out per variant because
 * `Omit<TimeOff, 'id'>` collapses the union and loses `memberId`.
 */
export type NewTimeOff = Omit<Holiday, 'id'> | Omit<Pto, 'id'>;

export type BoardSettings = {
  /** Person-days one story point represents. */
  daysPerPoint: number;
  /** Balance above `green` is green; down to `yellow` is yellow; below is red. */
  thresholds: { green: number; yellow: number };
};

export type Board = {
  version: number;
  settings: BoardSettings;
  members: Member[];
  sprints: Sprint[];
  tickets: Ticket[];
  timeOff: TimeOff[];
  /** Ticket ids in board row order, top to bottom. */
  rowOrder: string[];
};

export const DEFAULT_SETTINGS: BoardSettings = {
  daysPerPoint: 1,
  thresholds: { green: 5, yellow: 0 },
};

export function createEmptyBoard(): Board {
  return {
    version: SCHEMA_VERSION,
    settings: DEFAULT_SETTINGS,
    members: [],
    sprints: [],
    tickets: [],
    timeOff: [],
    rowOrder: [],
  };
}
