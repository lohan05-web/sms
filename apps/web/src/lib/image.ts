const DEFAULT_MAX_DIMENSION = 256;

export interface Dimensions {
  width: number;
  height: number;
}

/** Scale `width` x `height` down so neither side exceeds `max` (never upscales). */
export function fitWithin(width: number, height: number, max: number): Dimensions {
  const largest = Math.max(width, height);
  if (largest <= max || largest === 0) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  const scale = max / largest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the selected image'));
    image.src = src;
  });
}

/**
 * Reads an image file and returns a resized data URL so photos stay small
 * enough to store directly on a student record.
 */
export async function fileToPhotoDataUrl(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
): Promise<string> {
  if (!isImageType(file.type)) throw new Error('Please choose an image file');
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const { width, height } = fitWithin(image.width, image.height, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  context.drawImage(image, 0, 0, width, height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(type, 0.85);
}
