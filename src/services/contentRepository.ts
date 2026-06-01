import {
  contentBlocks as initialContentBlocks,
  contentRevisions as initialContentRevisions,
  mediaAssets as initialMediaAssets,
  mediaFolders as initialMediaFolders,
} from '../data/mockData';
import type { ApiResponse, ContentBlock, ContentRevision, ManagedPageKey, MediaAsset, MediaFolder } from '../types';

const CONTENT_BLOCKS_KEY = 'orlov_content_blocks';
const MEDIA_ASSETS_KEY = 'orlov_media_assets';
const MEDIA_FOLDERS_KEY = 'orlov_media_folders';
const CONTENT_REVISIONS_KEY = 'orlov_content_revisions';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const delay = (ms = 300) => new Promise((resolve) => window.setTimeout(resolve, ms));

const respond = async <T>(data: T, ms?: number): Promise<ApiResponse<T>> => {
  await delay(ms);
  return { data };
};

function readStorage<T>(key: string, fallback: T): T {
  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return clone(fallback);

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    window.localStorage.removeItem(key);
    return clone(fallback);
  }
}

function isQuotaError(error: unknown) {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

function writeStorage<T>(key: string, value: T) {
  const serializedValue = JSON.stringify(value);

  try {
    window.localStorage.setItem(key, serializedValue);
  } catch (error) {
    if (!isQuotaError(error)) throw error;

    window.localStorage.removeItem(CONTENT_REVISIONS_KEY);
    window.localStorage.setItem(key, serializedValue);
  }

  window.dispatchEvent(new Event('orlov-content-updated'));
}

function replaceOldLocation(value: string) {
  return value.replace('г. Гурьевск', 'пгт. Шерегеш').replace('Гурьевск', 'пгт. Шерегеш');
}

function normalizeContentBlock(block: ContentBlock): ContentBlock {
  const nextBlock = { ...block } as ContentBlock & { data?: Record<string, unknown> };

  if (typeof nextBlock.eyebrow === 'string' && nextBlock.eyebrow.includes('Гурьевск')) {
    nextBlock.eyebrow = replaceOldLocation(nextBlock.eyebrow);
  }

  if (nextBlock.data && typeof nextBlock.data === 'object' && !Array.isArray(nextBlock.data)) {
    const nextData = { ...nextBlock.data };
    Object.entries(nextData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.includes('Гурьевск')) {
        nextData[key] = replaceOldLocation(value);
      }
    });
    nextBlock.data = nextData;
  }

  return nextBlock;
}

function getStoredContentBlocks() {
  return readStorage<ContentBlock[]>(CONTENT_BLOCKS_KEY, initialContentBlocks).map(normalizeContentBlock);
}

function saveContentBlocks(items: ContentBlock[]) {
  writeStorage(CONTENT_BLOCKS_KEY, items);
}

function getStoredMediaAssets() {
  return readStorage<MediaAsset[]>(MEDIA_ASSETS_KEY, initialMediaAssets);
}

function saveMediaAssets(items: MediaAsset[]) {
  writeStorage(MEDIA_ASSETS_KEY, items);
}

function getStoredMediaFolders() {
  return readStorage<MediaFolder[]>(MEDIA_FOLDERS_KEY, initialMediaFolders);
}

function getStoredContentRevisions() {
  return readStorage<ContentRevision[]>(CONTENT_REVISIONS_KEY, initialContentRevisions);
}

function saveContentRevisions(items: ContentRevision[]) {
  writeStorage(CONTENT_REVISIONS_KEY, items);
}

function sanitizeRevisionSnapshot(snapshot: unknown) {
  return JSON.parse(
    JSON.stringify(snapshot, (_key, value) => {
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        return `[image omitted: ${Math.round(value.length / 1024)} KB]`;
      }
      return value;
    }),
  ) as unknown;
}

function upsertRevision(entityType: ContentRevision['entityType'], entityId: string, snapshot: unknown) {
  const nextRevision: ContentRevision = {
    id: `revision-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
    createdBy: 'admin-local',
    snapshot: sanitizeRevisionSnapshot(snapshot),
  };
  saveContentRevisions([nextRevision, ...getStoredContentRevisions()].slice(0, 40));
}

export function compactContentStorage() {
  window.localStorage.removeItem(CONTENT_REVISIONS_KEY);
}

export async function getPageContent(pageKey: ManagedPageKey): Promise<ApiResponse<ContentBlock[]>> {
  const blocks = getStoredContentBlocks()
    .filter((block) => block.pageKey === pageKey)
    .sort((a, b) => a.order - b.order);
  return respond(blocks);
}

export async function createContentBlock(data: Omit<ContentBlock, 'id'>): Promise<ApiResponse<ContentBlock>> {
  const block: ContentBlock = {
    ...data,
    id: `content-block-${Date.now()}`,
  };
  const nextBlocks = [block, ...getStoredContentBlocks()];
  saveContentBlocks(nextBlocks);
  upsertRevision('page', block.pageKey, block);
  return respond(block);
}

export async function updateContentBlock(id: string, data: Partial<ContentBlock>): Promise<ApiResponse<ContentBlock | undefined>> {
  let updatedBlock: ContentBlock | undefined;
  const nextBlocks = getStoredContentBlocks().map((block) => {
    if (block.id !== id) return block;
    updatedBlock = { ...block, ...data, id: block.id };
    return updatedBlock;
  });

  saveContentBlocks(nextBlocks);
  if (updatedBlock) {
    upsertRevision('page', updatedBlock.pageKey, updatedBlock);
  }
  return respond(updatedBlock);
}

export async function deleteContentBlock(id: string): Promise<ApiResponse<{ id: string }>> {
  const currentBlocks = getStoredContentBlocks();
  const removed = currentBlocks.find((block) => block.id === id);
  const nextBlocks = currentBlocks.filter((block) => block.id !== id);
  saveContentBlocks(nextBlocks);

  if (removed) {
    upsertRevision('page', removed.pageKey, { removedId: removed.id });
  }
  return respond({ id });
}

export async function reorderContentBlocks(pageKey: ManagedPageKey, orderedIds: string[]): Promise<ApiResponse<ContentBlock[]>> {
  const pageSet = new Set(orderedIds);
  const currentBlocks = getStoredContentBlocks();
  const pageBlocks = currentBlocks.filter((block) => block.pageKey === pageKey);
  const untouched = currentBlocks.filter((block) => block.pageKey !== pageKey);

  const orderedBlocks = orderedIds
    .map((id, index) => {
      const block = pageBlocks.find((item) => item.id === id);
      return block ? { ...block, order: index + 1 } : undefined;
    })
    .filter(Boolean) as ContentBlock[];

  const remainingBlocks = pageBlocks
    .filter((block) => !pageSet.has(block.id))
    .sort((a, b) => a.order - b.order)
    .map((block, index) => ({ ...block, order: orderedBlocks.length + index + 1 }));

  const nextPageBlocks = [...orderedBlocks, ...remainingBlocks];
  saveContentBlocks([...untouched, ...nextPageBlocks]);
  upsertRevision('page', pageKey, nextPageBlocks.map((block) => ({ id: block.id, order: block.order })));
  return respond(nextPageBlocks);
}

export async function getMediaAssets(): Promise<ApiResponse<MediaAsset[]>> {
  const assets = getStoredMediaAssets().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return respond(assets);
}

export async function getMediaFolders(): Promise<ApiResponse<MediaFolder[]>> {
  const folders = getStoredMediaFolders().sort((a, b) => a.order - b.order);
  return respond(folders);
}

export async function createMediaAsset(data: Omit<MediaAsset, 'id' | 'createdAt'>): Promise<ApiResponse<MediaAsset>> {
  compactContentStorage();

  const asset: MediaAsset = {
    ...data,
    id: `media-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const nextAssets = [asset, ...getStoredMediaAssets()];
  saveMediaAssets(nextAssets);
  upsertRevision('gallery', asset.id, asset);
  return respond(asset);
}

export async function updateMediaAsset(id: string, data: Partial<MediaAsset>): Promise<ApiResponse<MediaAsset | undefined>> {
  let updatedAsset: MediaAsset | undefined;
  const nextAssets = getStoredMediaAssets().map((asset) => {
    if (asset.id !== id) return asset;
    updatedAsset = { ...asset, ...data, id: asset.id };
    return updatedAsset;
  });
  saveMediaAssets(nextAssets);
  if (updatedAsset) {
    upsertRevision('gallery', updatedAsset.id, updatedAsset);
  }
  return respond(updatedAsset);
}

export async function deleteMediaAsset(id: string): Promise<ApiResponse<{ id: string }>> {
  const nextAssets = getStoredMediaAssets().filter((asset) => asset.id !== id);
  saveMediaAssets(nextAssets);
  upsertRevision('gallery', id, { removedId: id });
  return respond({ id });
}
