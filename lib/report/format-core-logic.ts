const SECOND_PARAGRAPH_MARKER = "更关键的是";

/** Split core_logic into two display paragraphs at "更关键的是". */
export function splitCoreLogicParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const markerIndex = trimmed.indexOf(SECOND_PARAGRAPH_MARKER);
  if (markerIndex === -1) {
    return [trimmed];
  }

  const first = trimmed.slice(0, markerIndex).trim();
  const second = trimmed.slice(markerIndex).trim();

  if (first && second) {
    return [first, second];
  }

  return [trimmed];
}
