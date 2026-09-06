import { toBlob } from 'html-to-image';

export type WhiteboardExportResult = 'shared' | 'downloaded';

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const renderBlob = async (node: HTMLElement, pixelRatio: number): Promise<Blob> => {
  const blob = await toBlob(node, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    pixelRatio,
    filter: (child) => !child.classList?.contains('no-screenshot'),
  });

  if (!blob) throw new Error('無法產生白板圖片');
  return blob;
};

export const exportAndShareWhiteboard = async (
  node: HTMLElement,
  filename: string
): Promise<WhiteboardExportResult> => {
  if ('fonts' in document) await document.fonts.ready;
  await nextPaint();
  await nextPaint();

  const preferredPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  let blob: Blob;

  try {
    blob = await renderBlob(node, preferredPixelRatio);
  } catch (error) {
    if (preferredPixelRatio === 1) throw error;
    blob = await renderBlob(node, 1);
  }

  const file = new File([blob], filename, { type: 'image/png' });
  const shareData = { files: [file] };

  if (navigator.canShare?.(shareData)) {
    try {
      await navigator.share({
        ...shareData,
        title: filename.replace(/\.png$/i, ''),
      });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'shared';
      }
      console.warn('系統分享失敗，改用下載。', error);
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
};

