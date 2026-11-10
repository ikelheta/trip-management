/** Escapes LIKE/ILIKE wildcards so `%`, `_` and `\` in user input match literally. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}
