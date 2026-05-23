import { toPng } from "html-to-image";

export async function nodeToPngBlob(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#050505",
  });

  const response = await fetch(dataUrl);
  return response.blob();
}

export async function nodeToPngFile(node: HTMLElement, fileName: string): Promise<File> {
  const blob = await nodeToPngBlob(node);
  return new File([blob], fileName, { type: "image/png" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openBlobFallback(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function exportNodeAsPng(node: HTMLElement, fileName: string) {
  const blob = await nodeToPngBlob(node);
  downloadBlob(blob, fileName);
}
