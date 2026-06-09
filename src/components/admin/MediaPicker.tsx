import { FolderUp, ImagePlus, Library } from 'lucide-react';
import { ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { createMediaAsset, getMediaAssets } from '../../services/contentRepository';
import type { MediaAsset } from '../../types';
import { compressImageFile, getMediaStyle, rememberMediaAssets } from '../../utils/media';

interface MediaPickerProps {
  label?: string;
  onSelect: (url: string, asset?: MediaAsset) => void;
}

const imageNamePattern = /\.(avif|gif|jpe?g|png|webp)$/i;

function isImageFile(file: File) {
  return file.type.startsWith('image/') || imageNamePattern.test(file.name);
}

function getAssetTitle(file: File) {
  const filePath = file.webkitRelativePath || file.name;
  const fileName = filePath.split('/').pop() || file.name;
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || fileName;
}

function mergeMediaAssets(current: MediaAsset[], uploaded: MediaAsset[]) {
  const nextAssets = [...uploaded];
  const knownIds = new Set(nextAssets.map((asset) => asset.id));

  current.forEach((asset) => {
    if (!knownIds.has(asset.id)) nextAssets.push(asset);
  });

  return nextAssets;
}

export function MediaPicker({ label = 'Загрузить фото', onSelect }: MediaPickerProps) {
  const reactInputId = useId();
  const filesInputId = `media-upload-files-${reactInputId.replace(/:/g, '')}`;
  const folderInputId = `media-upload-folder-${reactInputId.replace(/:/g, '')}`;
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
    folderInputRef.current?.setAttribute('directory', '');
  }, []);

  const loadMedia = () => {
    setLoading(true);
    setError('');
    getMediaAssets()
      .then((assetsResponse) => {
        setAssets(assetsResponse.data);
        rememberMediaAssets(assetsResponse.data);
      })
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Не удалось загрузить медиатеку';
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    loadMedia();
  }, [open]);

  const uploadFiles = async (files: File[]) => {
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) {
      setError('Выберите изображения в формате JPG, PNG, WebP, GIF или AVIF.');
      setNotice('');
      return;
    }

    setOpen(true);
    setUploading(true);
    setUploadTotal(imageFiles.length);
    setUploadedCount(0);
    setError('');
    setNotice('');

    const uploadedAssets: MediaAsset[] = [];
    const failedFiles: Array<{ name: string; reason: string }> = [];

    for (const file of imageFiles) {
      try {
        const compressed = await compressImageFile(file);
        const title = getAssetTitle(file);
        const response = await createMediaAsset({
          fileName: file.webkitRelativePath || file.name,
          title,
          altText: title,
          url: compressed.dataUrl,
          mimeType: compressed.mimeType,
          sizeBytes: compressed.sizeBytes,
          width: compressed.width,
          height: compressed.height,
        });

        uploadedAssets.push(response.data);
        setUploadedCount(uploadedAssets.length);
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : '';
        if (message.includes('Сессия') || message.includes('Authentication')) {
          setError('Сессия администратора истекла. Войдите заново.');
          break;
        }
        failedFiles.push({ name: file.name, reason: message || 'ошибка обработки файла' });
      }
    }

    if (uploadedAssets.length > 0) {
      rememberMediaAssets(uploadedAssets);
      setAssets((current) => mergeMediaAssets(current, uploadedAssets));
      setNotice(`Загружено в медиатеку: ${uploadedAssets.length}. Теперь выберите нужное фото ниже.`);
    }

    if (failedFiles.length > 0) {
      const names = failedFiles
        .slice(0, 3)
        .map((file) => `${file.name} (${file.reason})`)
        .join(', ');
      const tail = failedFiles.length > 3 ? ` и еще ${failedFiles.length - 3}` : '';
      setError(`Не удалось загрузить: ${names}${tail}.`);
    }

    setUploading(false);
    setUploadTotal(0);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    await uploadFiles(files);
    event.target.value = '';
  };

  return (
    <div className="media-picker">
      <div className="file-upload-control">
        <label className="button button-secondary file-upload-button" htmlFor={filesInputId}>
          <ImagePlus size={17} />
          {label}
        </label>
        <label className="button button-secondary file-upload-button" htmlFor={folderInputId}>
          <FolderUp size={17} />
          Папку
        </label>
        <button type="button" className="button button-ghost" onClick={() => setOpen((current) => !current)}>
          <Library size={17} />
          Медиатека
        </button>
        <input id={filesInputId} className="file-upload-input" type="file" accept="image/*" multiple onChange={handleFileChange} />
        <input ref={folderInputRef} id={folderInputId} className="file-upload-input" type="file" accept="image/*" multiple onChange={handleFileChange} />
      </div>
      {uploading && <small className="media-picker-status">Загрузка: {uploadedCount} из {uploadTotal}</small>}
      {notice && <small className="media-picker-status media-picker-status-success">{notice}</small>}
      {error && <small className="standalone-error">{error}</small>}

      {open && (
        <div className="inline-edit-panel media-picker-panel">
          <div className="media-picker-panel-header">
            <strong>Медиатека</strong>
            <small>Загрузка добавляет фото сюда. Обложка меняется только после выбора изображения из сетки.</small>
          </div>

          {loading && !uploading && <small>Загружаем медиатеку...</small>}
          {!loading && (
            <div className="media-picker-grid">
              {assets.map((asset) => (
                <button
                  className="media-picker-item"
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(`media:${asset.id}`, asset);
                    setOpen(false);
                    setNotice('');
                  }}
                >
                  <div className="media-picker-thumb" style={getMediaStyle(asset.url)} />
                  <strong>{asset.title}</strong>
                  <span>{asset.fileName}</span>
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
