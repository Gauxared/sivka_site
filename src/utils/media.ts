import type { CSSProperties } from 'react';

const MEDIA_ASSETS_KEY = 'orlov_media_assets';
const MEDIA_REF_PREFIX = 'media:';

const legacyGalleryTokens: Record<string, string> = {
  lesson: 'linear-gradient(135deg, #315734, #b67f4a)',
  walk: 'linear-gradient(135deg, #4d6f4f, #d8b978)',
  photo: 'linear-gradient(135deg, #69513a, #e1c7a0)',
  horse: 'linear-gradient(135deg, #352216, #8f6f4d)',
  territory: 'linear-gradient(135deg, #375c42, #d7bc80)',
  briefing: 'linear-gradient(135deg, #214b38, #9fb57a)',
};

interface MediaStyleOptions {
  fit?: 'cover' | 'contain';
}

interface StoredMediaAsset {
  id: string;
  url: string;
}

export function createMediaAssetRef(id: string) {
  return `${MEDIA_REF_PREFIX}${id}`;
}

function getStoredMediaAssets(): StoredMediaAsset[] {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(MEDIA_ASSETS_KEY);
    const assets = rawValue ? (JSON.parse(rawValue) as StoredMediaAsset[]) : [];
    return Array.isArray(assets) ? assets : [];
  } catch {
    return [];
  }
}

function resolveMediaRef(value: string) {
  if (!value.startsWith(MEDIA_REF_PREFIX)) return value;
  const mediaId = value.slice(MEDIA_REF_PREFIX.length);
  const asset = getStoredMediaAssets().find((item) => item.id === mediaId);
  return asset?.url || '';
}

export function findMediaAssetRefByUrl(url: string) {
  if (!url.startsWith('data:image/')) return undefined;
  const asset = getStoredMediaAssets().find((item) => item.url === url);
  return asset ? createMediaAssetRef(asset.id) : undefined;
}

export function replaceKnownMediaDataUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return (findMediaAssetRefByUrl(value) || value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceKnownMediaDataUrls(item)) as T;
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(Object.entries(source).map(([key, item]) => [key, replaceKnownMediaDataUrls(item)])) as T;
  }

  return value;
}

export function getMediaStyle(value: string, options: MediaStyleOptions = {}): CSSProperties {
  const normalizedValue = legacyGalleryTokens[value] || resolveMediaRef(value);
  const fit = options.fit || 'cover';

  if (!normalizedValue) {
    return { backgroundImage: 'linear-gradient(135deg, #315734, #b67f4a)', backgroundSize: 'cover', backgroundPosition: 'center' };
  }

  if (normalizedValue.includes('gradient(')) {
    return { backgroundImage: normalizedValue, backgroundSize: 'cover', backgroundPosition: 'center' };
  }

  return {
    backgroundColor: '#f5f1e8',
    backgroundImage: `url("${normalizedValue}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: fit,
    backgroundPosition: 'center',
  };
}
