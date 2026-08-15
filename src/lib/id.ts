/** Ids only have to be unique within a board file, so the platform uuid does. */
export function newId(): string {
  return crypto.randomUUID();
}
