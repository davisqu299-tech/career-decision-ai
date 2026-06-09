import { toPng } from "html-to-image";

function defaultFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `荔枝AI-决策报告-${date}.png`;
}

export async function exportReportImage(
  node: HTMLElement,
  filename?: string
): Promise<void> {
  await document.fonts.ready;

  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
  });

  const link = document.createElement("a");
  link.download = filename ?? defaultFilename();
  link.href = dataUrl;
  link.click();
}
