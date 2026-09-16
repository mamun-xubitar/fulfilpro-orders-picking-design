export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

/** Trims and upper-cases a free-text field — every operator-entered inventory field except
 *  description and handle is stored upper-case. */
export function upperTrim(value: string): string {
  return value.trim().toUpperCase();
}
