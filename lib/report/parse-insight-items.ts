/**
 * Parse insights_and_actions into logical items.
 * Merges continuation lines (body text) into the preceding titled item.
 */
export function parseInsightItems(raw: string): string[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const items: string[] = [];

  for (const line of lines) {
    const isNumbered = /^\d+\.\s/.test(line);
    const stripped = isNumbered ? line.replace(/^\d+\.\s*/, "") : line;
    const isTitledItem = /^【[^】]+】/.test(stripped);
    const isNewItem = isNumbered || isTitledItem || items.length === 0;

    if (isNewItem) {
      items.push(stripped);
    } else {
      items[items.length - 1] = `${items[items.length - 1]}\n${stripped}`;
    }
  }

  return items;
}
