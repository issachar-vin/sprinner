import type { Board, ISODate, Placement, Sprint, Ticket } from '../model/types';
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../model/types';
import { addDays, parseISODate, todayISO } from './dates';

const SPRINT_COUNT = 6;
const SPRINT_LENGTH_DAYS = 14;
/** Which sprint the demo places today in, so the marker is always visible. */
const CURRENT_SPRINT_INDEX = 2;

function mondayOf(iso: ISODate): ISODate {
  const weekday = parseISODate(iso).getUTCDay();
  return addDays(iso, weekday === 0 ? -6 : 1 - weekday);
}

function sprintId(index: number): string {
  return `s${index + 1}`;
}

function place(index: number, span: number): Placement {
  return { startSprintId: sprintId(index), span };
}

function buildSprints(startOfSprint: (index: number) => ISODate): Sprint[] {
  return Array.from({ length: SPRINT_COUNT }, (_, index) => ({
    id: sprintId(index),
    name: null,
    startDate: startOfSprint(index),
    endDate: addDays(startOfSprint(index), SPRINT_LENGTH_DAYS - 1),
  }));
}

function buildTickets(): Ticket[] {
  return [
    {
      id: 't-101',
      key: 'PLAT-101',
      title: 'Rewrite auth token refresh',
      points: 5,
      assigneeId: 'm1',
      blockedBy: [],
      epicKey: 'PLAT-100',
      placement: place(0, 1),
    },
    {
      id: 't-104',
      key: 'PLAT-104',
      title: 'Migrate session store to Redis',
      points: 8,
      assigneeId: 'm2',
      blockedBy: [],
      epicKey: 'PLAT-100',
      placement: place(0, 2),
    },
    {
      id: 't-108',
      key: 'PLAT-108',
      title: 'Retire legacy /v1 endpoints',
      points: 3,
      assigneeId: 'm3',
      blockedBy: ['t-101'],
      epicKey: 'PLAT-100',
      placement: place(1, 1),
    },
    {
      id: 't-112',
      key: 'PLAT-112',
      title: 'Audit log pipeline',
      points: 13,
      assigneeId: 'm4',
      blockedBy: [],
      epicKey: 'PLAT-100',
      placement: place(1, 3),
    },
    {
      id: 't-115',
      key: 'PLAT-115',
      title: 'SSO metadata refresh job',
      points: 2,
      assigneeId: 'm1',
      blockedBy: [],
      epicKey: 'PLAT-100',
      placement: place(2, 1),
    },
    {
      id: 't-117',
      key: 'PLAT-117',
      title: 'Rate limiter for the public API',
      points: 8,
      assigneeId: 'm2',
      blockedBy: ['t-104'],
      epicKey: 'PLAT-100',
      placement: place(2, 2),
    },
    {
      id: 't-121',
      key: 'PLAT-121',
      title: 'Scheduler dead-letter queue',
      points: null,
      assigneeId: 'm3',
      blockedBy: [],
      epicKey: 'PLAT-100',
      placement: place(2, 1),
    },
    {
      id: 't-124',
      key: 'PLAT-124',
      title: 'Tenant export service',
      points: 13,
      assigneeId: 'm4',
      blockedBy: [],
      epicKey: 'PLAT-120',
      placement: place(3, 2),
    },
    {
      id: 't-130',
      key: 'PLAT-130',
      title: 'Rotate service credentials',
      points: 3,
      assigneeId: null,
      blockedBy: [],
      epicKey: 'PLAT-120',
      placement: place(4, 1),
    },
    {
      id: 't-133',
      key: 'PLAT-133',
      title: 'Read replica failover drill',
      points: 5,
      assigneeId: 'm1',
      blockedBy: [],
      epicKey: 'PLAT-120',
      placement: place(5, 1),
    },
    {
      id: 't-136',
      key: 'PLAT-136',
      title: 'Search index rebuild',
      points: 8,
      assigneeId: 'm2',
      blockedBy: [],
      epicKey: 'PLAT-120',
      placement: place(4, 2),
    },
    {
      id: 't-140',
      key: 'PLAT-140',
      title: 'Webhook retry backoff',
      points: 5,
      assigneeId: 'm3',
      blockedBy: [],
      epicKey: 'PLAT-120',
      placement: null,
    },
    {
      id: 't-141',
      key: 'PLAT-141',
      title: 'Deprecate the legacy CSV export',
      points: 2,
      assigneeId: null,
      blockedBy: [],
      epicKey: 'PLAT-120',
      placement: null,
    },
    {
      id: 't-145',
      key: 'PLAT-145',
      title: 'Config service cache invalidation',
      points: 8,
      assigneeId: 'm1',
      blockedBy: [],
      epicKey: 'PLAT-120',
      placement: null,
    },
    {
      id: 't-149',
      key: 'PLAT-149',
      title: 'Per-tenant rate limit dashboard',
      points: null,
      assigneeId: 'm4',
      blockedBy: [],
      epicKey: 'PLAT-120',
      placement: null,
    },
    {
      id: 't-152',
      key: 'PLAT-152',
      title: 'Move cron jobs to the workflow engine',
      points: 13,
      assigneeId: null,
      blockedBy: [],
      epicKey: 'PLAT-150',
      placement: null,
    },
    {
      id: 't-158',
      key: 'PLAT-158',
      title: 'Purge orphaned attachments',
      points: 3,
      assigneeId: 'm2',
      blockedBy: ['t-124'],
      epicKey: 'PLAT-150',
      placement: null,
    },
  ];
}

/**
 * Demo board so the grid is visible before import lands in phase 5. Dates are
 * derived from `today` rather than hard-coded, otherwise the today marker
 * disappears a fortnight after the seed is written.
 */
export function createDemoBoard(today: ISODate = todayISO()): Board {
  const firstStart = addDays(mondayOf(today), -SPRINT_LENGTH_DAYS * CURRENT_SPRINT_INDEX);
  const startOfSprint = (index: number) => addDays(firstStart, index * SPRINT_LENGTH_DAYS);
  const tickets = buildTickets();

  return {
    version: SCHEMA_VERSION,
    settings: DEFAULT_SETTINGS,
    members: [
      { id: 'm1', name: 'Priya Raman' },
      { id: 'm2', name: 'Marcus Cole' },
      { id: 'm3', name: 'Dana Whitfield' },
      { id: 'm4', name: 'Tomas Ruiz' },
    ],
    sprints: buildSprints(startOfSprint),
    tickets,
    timeOff: [
      {
        id: 'h1',
        type: 'holiday',
        startDate: startOfSprint(CURRENT_SPRINT_INDEX),
        endDate: null,
        label: 'Company holiday',
      },
      {
        id: 'p1',
        type: 'pto',
        memberId: 'm2',
        startDate: addDays(startOfSprint(1), 2),
        endDate: addDays(startOfSprint(1), 6),
        label: 'Vacation',
      },
    ],
    rowOrder: tickets.map((ticket) => ticket.id),
  };
}
