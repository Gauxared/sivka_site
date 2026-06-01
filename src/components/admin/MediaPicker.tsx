import { ImagePlus, Library } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { compactEditableMediaReferences } from '../../services/adminContent';
import { compactContentStorage, createMediaAsset, getMediaAssets, getMediaFolders } from '../../services/contentRepository';
import type { MediaAsset, MediaFolder } from '../../types';
import { createMediaAssetRef } from '../../utils/media';

interface MediaPickerProps {
  label?: string;
  onSelect: (url: string, asset?: MediaAsset) => void;
}

const MAX_IMAGE_SIZE = 1000;
const JPEG_QUALITY = 0.72;

async function readOptimizedImage(file: File): Promise<string> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = sourceUrl;
    await image.decode();

    const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available');
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function MediaPicker({ label = 'Добавить файл', onSelect }: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [folderId, setFolderId] = useState('');
  const [uploadError, setUploadError] = useState('');

  const loadMedia = () => {
    setLoading(true);
    Promise.all([getMediaAssets(), getMediaFolders()])
      .then(([assetsResponse, foldersResponse]) => {
        setAssets(assetsResponse.data);
        setFolders(foldersResponse.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    loadMedia();
  }, [open]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setLoading(true);
    try {
      compactContentStorage();
      compactEditableMediaReferences();

      const optimizedUrl = await readOptimizedImage(file);
      const nextTitle = title.trim() || file.name;
      const nextAlt = altText.trim() || nextTitle;
      const response = await createMediaAsset({
        fileName: file.name,
        title: nextTitle,
        altText: nextAlt,
        url: optimizedUrl,
        folderId: folderId || undefined,
        mimeType: 'image/jpeg',
        sizeBytes: Math.round((optimizedUrl.length * 3) / 4),
      });

      onSelect(createMediaAssetRef(response.data.id), response.data);
      setTitle('');
      setAltText('');
      setFolderId('');
      loadMedia();
    } catch {
      setUploadError('Не удалось загрузить изображение. Попробуйте файл меньшего размера или другой формат.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="media-picker">
      <div className="file-upload-control">
        <button type="button" className="button button-secondary" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={17} />
          {label}
        </button>
        <button type="button" className="button button-ghost" onClick={() => setOpen((current) => !current)}>
          <Library size={17} />
          Медиатека
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      {open && (
        <div className="inline-edit-panel">
          <strong>Загрузка и выбор изображения</strong>
          <label>
            <span>Название файла в библиотеке</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: Главный фон" />
          </label>
          <label>
            <span>Alt-текст</span>
            <input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Краткое описание изображения" />
          </label>
          <label>
            <span>Папка</span>
            <select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
              <option value="">Без папки</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.title}
                </option>
              ))}
            </select>
          </label>

          {loading && <small>Загружаем медиатеку...</small>}
          {uploadError && <small className="field-error">{uploadError}</small>}
          {!loading && (
            <div className="media-picker-grid">
              {assets.map((asset) => (
                <button
                  className="media-picker-item"
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(createMediaAssetRef(asset.id), asset);
                    setOpen(false);
                  }}
                >
                  <div className="media-picker-thumb" style={{ backgroundImage: `url(${asset.url})` }} />
                  <strong>{asset.title}</strong>
                  <span>{asset.altText}</span>
                </button>
              ))}
              {assets.length === 0 && <small>В медиатеке пока нет изображений.</small>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
