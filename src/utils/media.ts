import type { CSSProperties } from 'react';
import type { MediaAsset } from '../types';
import { env } from '../services/env';

const legacyGalleryTokens: Record<string, string> = {
  lesson: 'linear-gradient(135deg, #315734, #b67f4a)',
  walk: 'linear-gradient(135deg, #4d6f4f, #d8b978)',
  photo: 'linear-gradient(135deg, #69513a, #e1c7a0)',
  horse: 'linear-gradient(135deg, #352216, #8f6f4d)',
  territory: 'linear-gradient(135deg, #375c42, #d7bc80)',
  briefing: 'linear-gradient(135deg, #214b38, #9fb57a)',
};

const MEDIA_CACHE_KEY = 'orlov_media_asset_cache';
const defaultImagePosition = '50% 50%';
const defaultImageScale = 100;

const horizontalPositions: Record<string, number> = {
  left: 0,
  center: 50,
  right: 100,
};

const verticalPositions: Record<string, number> = {
  top: 0,
  center: 50,
  bottom: 100,
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

function parsePositionPart(value: string, keywordMap: Record<string, number>, fallback: number) {
  const lowerValue = value.toLowerCase();
  if (lowerValue in keywordMap) return keywordMap[lowerValue];
  if (lowerValue.endsWith('%')) {
    const parsedValue = Number(lowerValue.slice(0, -1));
    if (Number.isFinite(parsedValue)) return clampPercent(parsedValue);
  }
  return fallback;
}

export function getImagePositionCoordinates(value?: string) {
  const normalizedValue = (value || '').trim().toLowerCase();
  if (!normalizedValue || normalizedValue === 'center') return { x: 50, y: 50 };

  const parts = normalizedValue.split(/\s+/);
  if (parts.length === 1) {
    const part = parts[0];
    if (part in verticalPositions && !(part in horizontalPositions)) {
      return { x: 50, y: parsePositionPart(part, verticalPositions, 50) };
    }
    return { x: parsePositionPart(part, horizontalPositions, 50), y: 50 };
  }

  const [firstPart, secondPart] = parts;
  const verticalFirst = firstPart in verticalPositions && !(firstPart in horizontalPositions);
  const horizontalSecond = secondPart in horizontalPositions;

  if (verticalFirst && horizontalSecond) {
    return {
      x: parsePositionPart(secondPart, horizontalPositions, 50),
      y: parsePositionPart(firstPart, verticalPositions, 50),
    };
  }

  return {
    x: parsePositionPart(firstPart, horizontalPositions, 50),
    y: parsePositionPart(secondPart, verticalPositions, 50),
  };
}

export function normalizeImagePosition(value?: string) {
  const { x, y } = getImagePositionCoordinates(value);
  return `${Math.round(x)}% ${Math.round(y)}%`;
}

export function normalizeImageScale(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return defaultImageScale;
  return Math.min(200, Math.max(50, Math.round(value)));
}

export function getResolvedMediaSource(value: string) {
  const resolvedValue = resolveMediaReference(value);
  const normalizedValue = legacyGalleryTokens[resolvedValue] || resolvedValue;
  return normalizedValue && !normalizedValue.includes('gradient(') ? normalizedValue : '';
}

function readMediaCache(): Record<string, MediaAsset> {
  try {
    return JSON.parse(window.localStorage.getItem(MEDIA_CACHE_KEY) || '{}') as Record<string, MediaAsset>;
  } catch {
    window.localStorage.removeItem(MEDIA_CACHE_KEY);
    return {};
  }
}

export function rememberMediaAssets(assets: MediaAsset[]) {
  if (typeof window === 'undefined') return;
  if (!env.useMockApi) {
    window.localStorage.removeItem(MEDIA_CACHE_KEY);
    return;
  }

  const cache = readMediaCache();
  assets.forEach((asset) => {
    cache[asset.id] = asset;
  });

  try {
    window.localStorage.setItem(MEDIA_CACHE_KEY, JSON.stringify(cache));
  } catch {
    window.localStorage.removeItem(MEDIA_CACHE_KEY);
  }
}

export function rememberMediaAsset(asset: MediaAsset) {
  rememberMediaAssets([asset]);
}

export function resolveMediaReference(value: string) {
  if (!value.startsWith('media:')) return value;

  const mediaId = value.slice('media:'.length);
  if (!mediaId) return '';

  if (!env.useMockApi) {
    return `${env.apiBaseUrl}/media/${encodeURIComponent(mediaId)}/file`;
  }

  return readMediaCache()[mediaId]?.url || '';
}

export function getMediaStyle(value: string, imagePosition?: string, imageScale?: number): CSSProperties {
  const resolvedValue = resolveMediaReference(value);
  const normalizedValue = legacyGalleryTokens[resolvedValue] || resolvedValue;
  const backgroundPosition = normalizeImagePosition(imagePosition || defaultImagePosition);
  const backgroundSize = `${normalizeImageScale(imageScale)}%`;

  if (!resolvedValue) {
    return { backgroundImage: 'linear-gradient(135deg, #315734, #b67f4a)', backgroundSize, backgroundPosition, backgroundRepeat: 'no-repeat' };
  }

  if (normalizedValue.includes('gradient(')) {
    return { backgroundImage: normalizedValue, backgroundSize, backgroundPosition, backgroundRepeat: 'no-repeat' };
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(20, 53, 31, 0.08), rgba(20, 53, 31, 0.45)), url("${normalizedValue}")`,
    backgroundSize,
    backgroundPosition,
    backgroundRepeat: 'no-repeat',
  };
}

export function getPhotoMediaStyle(value: string, imagePosition?: string, imageScale?: number): CSSProperties {
  const resolvedValue = resolveMediaReference(value);
  const normalizedValue = legacyGalleryTokens[resolvedValue] || resolvedValue;
  const backgroundPosition = normalizeImagePosition(imagePosition || defaultImagePosition);
  const backgroundSize = `${normalizeImageScale(imageScale)}%`;

  if (!resolvedValue || normalizedValue.includes('gradient(')) {
    return { backgroundColor: '#dfe5dc', backgroundSize, backgroundPosition, backgroundRepeat: 'no-repeat' };
  }

  return {
    backgroundImage: `url("${normalizedValue}")`,
    backgroundSize,
    backgroundPosition,
    backgroundRepeat: 'no-repeat',
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения'));
    reader.readAsDataURL(file);
  });
}

export async function compressImageFile(file: File, maxSize = 1000, quality = 0.72) {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = sourceUrl;
    });

    const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Не удалось подготовить изображение');

    context.drawImage(image, 0, 0, width, height);
    const mimeType = file.type === 'image/png' && file.size < 300_000 ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? quality : undefined);
    const sizeBytes = Math.round((dataUrl.length * 3) / 4);

    return { dataUrl, mimeType, sizeBytes, width, height };
  } catch {
    const dataUrl = await readFileAsDataUrl(file);
    const mimeType = file.type || dataUrl.match(/^data:([^;,]+)/)?.[1] || 'application/octet-stream';
    return { dataUrl, mimeType, sizeBytes: file.size, width: undefined, height: undefined };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
