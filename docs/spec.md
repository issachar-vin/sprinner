# Sprinner — Consolidated Spec

Supersedes ambiguities in [overview.md](overview.md). Decisions recorded in [answers.md](answers.md).

## What this is

A **roadmap grid**, not a kanban board. Sprints are columns, each ticket owns a row, tickets span
one or more columns. Layout is CSS Grid with `grid-column: start / span n` — column snapping is a
property of the grid, never pixel math.

Desktop-only. Single board. Single user. No mobile layout.

**Full-bleed layout is a standing constraint.** Every screen spans the viewport width — no centred
`max-width` container, in this or any later phase. The board is a horizontally scrolling column
grid, and a centred column would waste exactly the horizontal room the sprints need. Padding uses
`clamp()` so it breathes on wide monitors without capping content width.

Colour comes from UKG's brand palette in both light and dark themes — see
[palette.md](palette.md) for the values, their provenance, and measured contrast.

## Decisions locked

| #   | Decision                                                                                    |
| --- | ------------------------------------------------------------------------------------------- |
| 1   | Points count against the **first** sprint only. Spillover shows as **creep**, display-only. |
| 2   | Bandwidth in person-days, converted to points via `daysPerPoint` (default 1).               |
| 3   | `blockedBy` is a ticket reference. Violating moves are **rejected**, with a reason shown.   |
| 4   | Sprint dates are per-sprint and editable; a setup wizard generates the initial set.         |
| 5   | Jira: start with CSV import. Live sync deferred pending Cloud vs Data Center.               |

## Data model

```ts
type Board = {
  version: 1;
  settings: {
    daysPerPoint: number; // default 1
    thresholds: { green: number; yellow: number }; // default 5, 0
  };
  members: Member[];
  sprints: Sprint[];
  tickets: Ticket[];
  timeOff: TimeOff[];
  rowOrder: string[]; // ticket ids, top-to-bottom board order
};

type Member = { id: string; name: string };

type Sprint = {
  id: string; // stable uuid; the displayed "Sprint #" is derived from position
  name: string | null;
  startDate: string; // ISO
  endDate: string;
};

type Ticket = {
  id: string; // internal uuid
  key: string; // PROJ-123 — display field and import merge key
  title: string;
  points: number | null; // null = unestimated
  assigneeId: string | null;
  blockedBy: string[]; // ticket ids
  epicKey: string | null;
  placement: { startSprintId: string; span: number } | null; // null = in backlog
};

// Discriminated so "PTO without a member" and "holiday scoped to one member"
// are unrepresentable rather than validated against.
type Holiday = {
  id: string;
  type: 'holiday';
  startDate: string;
  endDate: string | null; // null = single day
  label: string;
};

type Pto = {
  id: string;
  type: 'pto';
  memberId: string;
  startDate: string;
  endDate: string | null;
  label: string;
};

type TimeOff = Holiday | Pto;
```

Every optional field is spelled `T | null` rather than `field?: T`. One representation of
"absent" keeps the zod schema and the TypeScript types in step under
`exactOptionalPropertyTypes`.

Time off is stored **globally**, not inside sprints. A vacation crossing a sprint boundary is one
record; sprint intersection is derived. Sprint IDs are stable uuids so deleting sprint 3 doesn't
silently rot every reference to "sprint 4".

## Bandwidth math

```
workdays        = Mon–Fri days in [sprint.start, sprint.end]
capacityDays    = workdays × members.length
                − holidayWorkdaysInSprint × members.length
                − ptoWorkdaysInSprint (summed per member, clipped to sprint range)

bandwidthPoints = capacityDays / daysPerPoint

committed       = Σ points of tickets whose placement starts in this sprint
creep           = Σ points of tickets spanning into this sprint that started earlier
balance         = bandwidthPoints − committed
```

Header renders `committed (+creep)` — e.g. `12 (+8)`. Creep is informational only and does **not**
reduce the balance.

> **Known limitation, accepted:** a sprint consumed entirely by carryover work shows a full green
> balance. The creep figure must therefore be visually prominent, not a footnote — it is the only
> signal that the sprint is occupied.

Balance color: `> green` green · `yellow..green` yellow · `< yellow` red. Thresholds configurable;
defaults 5 and 0.

Unestimated tickets (`points: null`) contribute 0 and are surfaced separately in the header
(`3 unestimated`), otherwise a full sprint reads as empty.

Per-member load per sprint is also computed — a green team total hides Alice at 20 points and Bob
at 2.

## Blocked-by rules

Let `endIndex(t) = startIndex(t) + span(t) - 1`.

1. A ticket cannot be placed while any of its blockers is unplaced.
2. `startIndex(blocked) >= max(endIndex(blocker))` — measured against the blocker's **end**, so a
   spanning blocker can't be overlapped.
3. Moving a **blocker** later is rejected if it would violate any dependent.
4. Returning a blocker to the backlog is rejected while dependents are placed.
5. Deleting a ticket strips its id from every `blockedBy`, with the affected tickets named in the
   confirmation.
6. Cycles are rejected in the ticket editor, not on the board. A cycle makes both tickets
   permanently unplaceable and will hang a naive validator.

Every rejection shows an inline reason (`Blocked by PROJ-12 — not yet placed`). A silent no-op drop
reads as a broken feature.

## Sprint dates

- Setup wizard asks **sprint count** and **length in calendar days**. 10 working days is 14 calendar
  days; workday count is derived, not entered.
- Generated sprints are contiguous — each starts the day after the previous ends.
- Editing one sprint's dates is **local**. Gaps and overlaps show a warning with a
  "re-flow following sprints" action. Edits never cascade silently.
- Sprints are added and removed explicitly. There is no "set board to N columns" — that silently
  destroys work.
- **Deleting a sprint:** spans clip; tickets whose _start_ sprint is deleted return to the backlog.
  Named in the confirmation.

## Interaction

- Drag backlog → board, between columns, and vertically to reorder rows.
- Span resize via handles on **both** edges; left-edge drag changes the start sprint. Spans are
  contiguous only.
- `X` returns a ticket to the backlog and discards its placement.
- Delete confirms.
- **Undo (Cmd+Z)** over a board snapshot stack. Delete is guarded by a modal; a mis-drop that wipes
  a four-sprint span is not, and that is the more common mistake.
- Keyboard-accessible drag via dnd-kit. Resize is pointer-only.
- Marker on the sprint containing today's date.
- Cards colored by assignee.
- Backlog has search (key, title) and assignee filter — an unfiltered list of 200 epic issues is
  unusable.

## Persistence

- `localStorage`, `version` field present from day one.
- Import is validated with zod against the version. Unversioned or invalid JSON is rejected with a
  readable error rather than corrupting state.
- Import **replaces** after confirmation.
- Export is the same versioned shape.

## Stack

Vite · React · TypeScript · CSS Grid · dnd-kit (maintained and keyboard-accessible;
`react-beautiful-dnd` is deprecated) · custom pointer handlers for span resize · Zustand + persist ·
zod · Vitest + Testing Library · Playwright for drag flows, which do not unit-test honestly.

## Phases

**0 — Model & scaffold**
Types, versioned persistence, Vite/TS/lint/test/CI. Workday and bandwidth functions with unit tests
— every downstream number depends on them.

**1 — Static board**
Grid columns, sprint headers, backlog sidebar, cards rendering all fields. No interaction. Proves
the grid model before drag complexity lands on top of it.

**2 — Interaction**
Drag in/out/between, row reorder, both-edge span resize, X-to-backlog, delete + confirm, undo stack.

**3 — Editing**
Ticket edit panel, sprint edit panel, sprint add/remove with the clip rules, setup wizard.

**4 — Capacity**
Member roster, global time off, bandwidth + balance + color, creep display, per-member load,
blocked-by validation and rejection messaging.

**5 — Import/export**
Versioned JSON round-trip, validated import, migration path.

**6 — Jira (deferred)**
CSV import with a column mapper first. Data access sits behind an interface so a live fetcher can
slot in without touching the board.

Re-import merges by `key`: fields update, **placements are preserved**, and a diff is surfaced
(`3 new issues, 1 no longer in the epic`). An import that wipes planning work is an import nobody
runs twice.

## Open

- Jira Cloud vs Data Center — determines whether live sync is possible without a backend.
- Partial-allocation members (someone at 50%) — deferred.
