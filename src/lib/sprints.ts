import type { ISODate, Sprint } from '../model/types';
import { addDays, daysBetween } from './dates';
import { newId } from './id';

export const DEFAULT_SPRINT_LENGTH_DAYS = 14;

export type SprintDateIssue = {
  /** The later sprint of the pair, or the sprint itself when inverted. */
  sprintId: string;
  kind: 'gap' | 'overlap' | 'inverted';
};

/** Calendar days covered, inclusive of both ends. */
export function sprintLength(sprint: Sprint): number {
  return daysBetween(sprint.startDate, sprint.endDate) + 1;
}

export function generateSprints(start: ISODate, count: number, lengthDays: number): Sprint[] {
  return Array.from({ length: count }, (_, index) => {
    const startDate = addDays(start, index * lengthDays);
    return {
      id: newId(),
      name: null,
      startDate,
      endDate: addDays(startDate, lengthDays - 1),
    };
  });
}

/** The sprint that would follow the current last one, kept contiguous. */
export function nextSprint(sprints: readonly Sprint[], today: ISODate): Sprint {
  const last = sprints[sprints.length - 1];
  if (!last) return generateSprints(today, 1, DEFAULT_SPRINT_LENGTH_DAYS)[0] as Sprint;

  const startDate = addDays(last.endDate, 1);
  return {
    id: newId(),
    name: null,
    startDate,
    endDate: addDays(startDate, sprintLength(last) - 1),
  };
}

/**
 * Sprint dates are edited one at a time and never cascade silently, so gaps and
 * overlaps are surfaced as warnings for the user to act on.
 */
export function sprintDateIssues(sprints: readonly Sprint[]): SprintDateIssue[] {
  const issues: SprintDateIssue[] = [];

  sprints.forEach((sprint, index) => {
    if (sprint.endDate < sprint.startDate) {
      issues.push({ sprintId: sprint.id, kind: 'inverted' });
    }

    const previous = sprints[index - 1];
    if (!previous) return;
    if (sprint.startDate <= previous.endDate) {
      issues.push({ sprintId: sprint.id, kind: 'overlap' });
    } else if (sprint.startDate > addDays(previous.endDate, 1)) {
      issues.push({ sprintId: sprint.id, kind: 'gap' });
    }
  });

  return issues;
}

/**
 * Pushes every sprint after `index` back into a contiguous run, each keeping
 * its own length. Only ever run from the explicit re-flow action.
 */
export function reflowFrom(sprints: readonly Sprint[], index: number): Sprint[] {
  const reflowed = [...sprints];

  for (let i = index + 1; i < reflowed.length; i += 1) {
    const previous = reflowed[i - 1];
    const sprint = reflowed[i];
    if (!previous || !sprint) continue;

    const startDate = addDays(previous.endDate, 1);
    reflowed[i] = {
      ...sprint,
      startDate,
      endDate: addDays(startDate, sprintLength(sprint) - 1),
    };
  }

  return reflowed;
}
