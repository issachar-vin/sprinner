import type { Member } from '../model/types';

/**
 * Distinguishable hues keyed by roster position, so a member's colour is stable
 * for the life of the board. Saturation and lightness come from the theme, not
 * from here — see `--assignee-*` in index.css.
 */
const HUES = [174, 262, 28, 210, 330, 96, 46, 320];

export function assigneeHue(members: readonly Member[], assigneeId: string | null): number | null {
  if (assigneeId === null) return null;
  const index = members.findIndex((member) => member.id === assigneeId);
  if (index === -1) return null;
  return HUES[index % HUES.length] ?? null;
}

export function assigneeName(members: readonly Member[], assigneeId: string | null): string | null {
  if (assigneeId === null) return null;
  return members.find((member) => member.id === assigneeId)?.name ?? null;
}

/** Two letters at most, so a chip stays a chip. `?` stands in for unassigned. */
export function initialsOf(name: string | null): string {
  if (name === null) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
