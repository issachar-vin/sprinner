import { describe, expect, it } from 'vitest';
import type { Sprint } from '../model/types';
import { generateSprints, nextSprint, reflowFrom, sprintDateIssues, sprintLength } from './sprints';

function sprint(id: string, startDate: string, endDate: string): Sprint {
  return { id, name: null, startDate, endDate };
}

describe('generateSprints', () => {
  it('generates a contiguous run of the requested length', () => {
    const sprints = generateSprints('2026-01-05', 3, 14);

    expect(sprints).toHaveLength(3);
    expect(sprints.map((s) => [s.startDate, s.endDate])).toEqual([
      ['2026-01-05', '2026-01-18'],
      ['2026-01-19', '2026-02-01'],
      ['2026-02-02', '2026-02-15'],
    ]);
  });

  it('gives every sprint its own id', () => {
    const ids = generateSprints('2026-01-05', 4, 7).map((s) => s.id);
    expect(new Set(ids).size).toBe(4);
  });
});

describe('sprintLength', () => {
  it('counts both ends', () => {
    expect(sprintLength(sprint('s1', '2026-01-05', '2026-01-18'))).toBe(14);
    expect(sprintLength(sprint('s1', '2026-01-05', '2026-01-05'))).toBe(1);
  });
});

describe('nextSprint', () => {
  it('starts the day after the last one and matches its length', () => {
    const next = nextSprint([sprint('s1', '2026-01-05', '2026-01-11')], '2026-03-01');
    expect(next.startDate).toBe('2026-01-12');
    expect(sprintLength(next)).toBe(7);
  });

  it('falls back to today on an empty board', () => {
    const next = nextSprint([], '2026-03-02');
    expect(next.startDate).toBe('2026-03-02');
    expect(sprintLength(next)).toBe(14);
  });
});

describe('sprintDateIssues', () => {
  const contiguous = [
    sprint('s1', '2026-01-05', '2026-01-18'),
    sprint('s2', '2026-01-19', '2026-02-01'),
  ];

  it('is quiet when sprints run back to back', () => {
    expect(sprintDateIssues(contiguous)).toEqual([]);
  });

  it('reports a gap on the later sprint', () => {
    const sprints = [contiguous[0] as Sprint, sprint('s2', '2026-01-21', '2026-02-01')];
    expect(sprintDateIssues(sprints)).toEqual([{ sprintId: 's2', kind: 'gap' }]);
  });

  it('reports an overlap on the later sprint', () => {
    const sprints = [contiguous[0] as Sprint, sprint('s2', '2026-01-15', '2026-02-01')];
    expect(sprintDateIssues(sprints)).toEqual([{ sprintId: 's2', kind: 'overlap' }]);
  });

  it('reports a range that runs backwards', () => {
    expect(sprintDateIssues([sprint('s1', '2026-01-18', '2026-01-05')])).toEqual([
      { sprintId: 's1', kind: 'inverted' },
    ]);
  });
});

describe('reflowFrom', () => {
  it('closes a gap without moving the edited sprint', () => {
    const sprints = [
      sprint('s1', '2026-01-05', '2026-01-18'),
      sprint('s2', '2026-01-26', '2026-02-08'),
      sprint('s3', '2026-02-09', '2026-02-22'),
    ];

    const reflowed = reflowFrom(sprints, 0);

    expect(reflowed[0]).toEqual(sprints[0]);
    expect(reflowed.map((s) => [s.startDate, s.endDate])).toEqual([
      ['2026-01-05', '2026-01-18'],
      ['2026-01-19', '2026-02-01'],
      ['2026-02-02', '2026-02-15'],
    ]);
  });

  it('preserves each sprint its own length', () => {
    const sprints = [
      sprint('s1', '2026-01-05', '2026-01-11'),
      sprint('s2', '2026-01-20', '2026-02-02'),
    ];
    expect(sprintLength(reflowFrom(sprints, 0)[1] as Sprint)).toBe(14);
  });

  it('leaves earlier sprints alone', () => {
    const sprints = [
      sprint('s1', '2026-01-05', '2026-01-18'),
      sprint('s2', '2026-02-01', '2026-02-14'),
      sprint('s3', '2026-03-01', '2026-03-14'),
    ];
    const reflowed = reflowFrom(sprints, 1);

    expect(reflowed[0]).toEqual(sprints[0]);
    expect(reflowed[1]).toEqual(sprints[1]);
    expect(reflowed[2]?.startDate).toBe('2026-02-15');
  });
});
