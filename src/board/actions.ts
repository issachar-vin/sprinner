/**
 * What the board surfaces can ask for. Grouped so `BoardView` and `Backlog`
 * take one prop rather than a growing list of callbacks.
 */
export type BoardActions = {
  editTicket: (ticketId: string) => void;
  deleteTicket: (ticketId: string) => void;
  unplaceTicket: (ticketId: string) => void;
  resizeTicket: (ticketId: string, startSprintId: string, span: number) => void;
  editSprint: (sprintId: string) => void;
  removeSprint: (sprintId: string) => void;
  addSprint: () => void;
  setUpSprints: () => void;
};
