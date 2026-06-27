/** Strip leading pointer emoji from export text; web page keeps original content. */
export function stripFinalChoiceEmojiForExport(text: string): string {
  return text.replace(/👉/gu, "").replace(/\s{2,}/g, " ").trim();
}
