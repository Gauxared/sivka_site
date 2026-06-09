import { ChevronLeft, ChevronRight, FolderOpen, Images, Maximize2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EditablePageTitle } from '../components/admin/EditablePageTitle';
import { ImagePositionControl } from '../components/admin/ImagePositionControl';
import { ImageUploadButton } from '../components/admin/ImageUploadButton';
import { Button } from '../components/ui/Button';
import { SectionTitle } from '../components/ui/SectionTitle';
import { ErrorState, LoadingState } from '../components/ui/States';
import {
  createEmptyGalleryItem,
  isAdminAuthorized,
  isAdminEditMode,
} from '../services/adminContent';
import {
  createGalleryItem,
  deleteGalleryItem,
  getGalleryItems,
  updateGalleryItem,
} from '../services/api';
import type { GalleryItem } from '../types';
import { getMediaStyle, getPhotoMediaStyle, getResolvedMediaSource, normalizeImagePosition } from '../utils/media';

const gallerySections: { value: GalleryItem['category']; title: string; text: string }[] = [
  { value: 'walks', title: 'Прогулки', text: 'Маршруты, спокойный темп и прогулки по территории.' },
  { value: 'lessons', title: 'Занятия', text: 'Тренировки, инструктаж и первые шаги в верховой езде.' },
  { value: 'photosessions', title: 'Фотосессии', text: 'Постановочные кадры с лошадьми и семейные съемки.' },
  { value: 'horses', title: 'Лошади', text: 'Лошади клуба, их характер и спокойная атмосфера.' },
  { value: 'territory', title: 'Территория', text: 'Место проведения занятий, манеж и зоны отдыха.' },
];

const categoryLabels = Object.fromEntries(gallerySections.map((section) => [section.value, section.title])) as Record<GalleryItem['category'], string>;

function getNextIndex(currentIndex: number, length: number, direction: 1 | -1) {
  if (length === 0) return 0;
  return (currentIndex + direction + length) % length;
}

export function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [adminEditMode, setAdminEditMode] = useState(isAdminAuthorized() && isAdminEditMode());
  const [lightboxItemId, setLightboxItemId] = useState('');

  const loadGallery = () => {
    setError(false);
    getGalleryItems()
      .then((response) => {
        setItems(response.data);
        setSelectedId((currentId) => (response.data.some((item) => item.id === currentId) ? currentId : response.data[0]?.id || ''));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const syncAdminState = () => setAdminEditMode(isAdminAuthorized() && isAdminEditMode());

    loadGallery();
    window.addEventListener('orlov-content-updated', loadGallery);
    window.addEventListener('orlov-admin-state-updated', syncAdminState);

    return () => {
      window.removeEventListener('orlov-content-updated', loadGallery);
      window.removeEventListener('orlov-admin-state-updated', syncAdminState);
    };
  }, []);

  const groupedItems = useMemo(
    () =>
      gallerySections.map((section) => ({
        ...section,
        items: items.filter((item) => item.category === section.value),
      })),
    [items],
  );

  const selectedItem = items.find((item) => item.id === selectedId) || items[0];
  const selectedIndex = selectedItem ? items.findIndex((item) => item.id === selectedItem.id) : -1;
  const lightboxItem = lightboxItemId ? items.find((item) => item.id === lightboxItemId) : undefined;
  const lightboxIndex = lightboxItem ? items.findIndex((item) => item.id === lightboxItem.id) : -1;
  const fullImageSource = lightboxItem ? getResolvedMediaSource(lightboxItem.image) : '';

  const selectByDirection = (direction: 1 | -1) => {
    if (items.length === 0) return;
    const nextIndex = getNextIndex(Math.max(selectedIndex, 0), items.length, direction);
    setSelectedId(items[nextIndex].id);
  };

  const openFullImage = (item: GalleryItem) => {
    setSelectedId(item.id);
    setLightboxItemId(item.id);
  };

  const selectLightboxByDirection = (direction: 1 | -1) => {
    if (items.length === 0 || lightboxIndex < 0) return;
    const nextItem = items[getNextIndex(lightboxIndex, items.length, direction)];
    setSelectedId(nextItem.id);
    setLightboxItemId(nextItem.id);
  };

  useEffect(() => {
    if (!lightboxItem) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxItemId('');
      if (event.key === 'ArrowLeft') selectLightboxByDirection(-1);
      if (event.key === 'ArrowRight') selectLightboxByDirection(1);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxItem, lightboxIndex, items]);

  const patchLocalItem = (id: string, data: Partial<GalleryItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...data } : item)));
  };

  const saveItemPatch = async (id: string, data: Partial<GalleryItem>) => {
    setSaving(true);
    setStatusMessage('');
    patchLocalItem(id, data);

    try {
      const response = await updateGalleryItem(id, data);
      if (response.data) patchLocalItem(id, response.data);
      setStatusMessage('Фото обновлено.');
    } catch (saveError) {
      setStatusMessage(saveError instanceof Error ? saveError.message : 'Не удалось сохранить фото.');
      loadGallery();
    } finally {
      setSaving(false);
      window.setTimeout(() => setStatusMessage(''), 2400);
    }
  };

  const addItem = async (category: GalleryItem['category']) => {
    const newItem: GalleryItem = {
      ...createEmptyGalleryItem(),
      id: `gallery-${Date.now()}`,
      title: `Новое фото: ${categoryLabels[category]}`,
      category,
      image: '',
      imagePosition: '50% 50%',
      imageScale: 100,
    };

    setSaving(true);
    setStatusMessage('');
    try {
      const response = await createGalleryItem(newItem);
      setItems((current) => [response.data, ...current]);
      setSelectedId(response.data.id);
      setStatusMessage('Фото добавлено. Выберите изображение из медиатеки.');
    } catch (addError) {
      setStatusMessage(addError instanceof Error ? addError.message : 'Не удалось добавить фото.');
    } finally {
      setSaving(false);
      window.setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const removeSelectedItem = async () => {
    if (!selectedItem) return;
    setSaving(true);
    setStatusMessage('');

    try {
      await deleteGalleryItem(selectedItem.id);
      setItems((current) => current.filter((item) => item.id !== selectedItem.id));
      const fallback = items.find((item) => item.id !== selectedItem.id);
      setSelectedId(fallback?.id || '');
      setStatusMessage('Фото удалено.');
    } catch (deleteError) {
      setStatusMessage(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить фото.');
    } finally {
      setSaving(false);
      window.setTimeout(() => setStatusMessage(''), 2400);
    }
  };

  return (
    <section className="page-section gallery-page">
      <EditablePageTitle pageKey="gallery" />

      {loading && <LoadingState />}
      {error && <ErrorState />}

      {!loading && !error && (
        <>
          <section className="gallery-carousel-section" aria-label="Просмотр фотографий">
            {selectedItem ? (
              <div className="gallery-carousel">
                <button className="gallery-carousel-nav" type="button" onClick={() => selectByDirection(-1)} aria-label="Предыдущее фото">
                  <ChevronLeft size={24} />
                </button>
                <div
                  className="gallery-carousel-media gallery-carousel-media-button"
                  role="button"
                  tabIndex={0}
                  style={getMediaStyle(selectedItem.image, selectedItem.imagePosition, selectedItem.imageScale)}
                  onClick={() => openFullImage(selectedItem)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openFullImage(selectedItem);
                    }
                  }}
                  aria-label={`Открыть фото полностью: ${selectedItem.title}`}
                >
                  <div className="gallery-carousel-caption">
                    <span>{categoryLabels[selectedItem.category]}</span>
                    <h2>{selectedItem.title}</h2>
                    <small><Maximize2 size={15} /> {selectedIndex + 1} / {items.length}</small>
                  </div>
                </div>
                <button className="gallery-carousel-nav" type="button" onClick={() => selectByDirection(1)} aria-label="Следующее фото">
                  <ChevronRight size={24} />
                </button>
              </div>
            ) : (
              <div className="gallery-empty-hero">
                <Images size={32} />
                <strong>В галерее пока нет фотографий</strong>
              </div>
            )}

            {items.length > 0 && (
              <div className="gallery-carousel-thumbs" aria-label="Миниатюры галереи">
                {items.map((item) => (
                  <button
                    className={item.id === selectedItem?.id ? 'active' : ''}
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    aria-label={`Открыть фото: ${item.title}`}
                    style={getMediaStyle(item.image, item.imagePosition, item.imageScale)}
                  />
                ))}
              </div>
            )}

            {adminEditMode && (
              <div className="gallery-admin-panel">
                <div className="gallery-admin-panel-header">
                  <strong>Управление галереей</strong>
                  <div className="gallery-add-actions">
                    {gallerySections.map((section) => (
                      <Button key={section.value} variant="secondary" onClick={() => void addItem(section.value)} disabled={saving}>
                        <Plus size={16} /> {section.title}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedItem && (
                  <div className="gallery-selected-editor">
                    <label>
                      <span>Название выбранного фото</span>
                      <input
                        value={selectedItem.title}
                        onBlur={(event) => void saveItemPatch(selectedItem.id, { title: event.target.value })}
                        onChange={(event) => patchLocalItem(selectedItem.id, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Альбом</span>
                      <select
                        value={selectedItem.category}
                        onChange={(event) => void saveItemPatch(selectedItem.id, { category: event.target.value as GalleryItem['category'] })}
                      >
                        {gallerySections.map((section) => (
                          <option key={section.value} value={section.value}>
                            {section.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="gallery-image-picker">
                      <span className="field-title">Изображение</span>
                      <ImageUploadButton label="Загрузить фото" onUpload={(url) => void saveItemPatch(selectedItem.id, { image: url })} />
                    </div>
                    <ImagePositionControl
                      image={selectedItem.image}
                      value={selectedItem.imagePosition}
                      scale={selectedItem.imageScale}
                      onChange={(position) => patchLocalItem(selectedItem.id, { imagePosition: position })}
                      onCommit={(position) => void saveItemPatch(selectedItem.id, { imagePosition: position })}
                      onScaleChange={(nextScale) => patchLocalItem(selectedItem.id, { imageScale: nextScale })}
                      onScaleCommit={(nextScale) => void saveItemPatch(selectedItem.id, { imageScale: nextScale })}
                    />
                    <Button variant="ghost" className="danger-button" onClick={() => void removeSelectedItem()} disabled={saving}>
                      <Trash2 size={17} /> Удалить выбранное фото
                    </Button>
                  </div>
                )}

                {statusMessage && <small className="media-picker-status">{statusMessage}</small>}
              </div>
            )}
          </section>

          <div className="gallery-story">
            {groupedItems.map((section) => (
              <section className="gallery-section" id={`gallery-${section.value}`} key={section.value}>
                <div className="gallery-section-heading">
                  <div>
                    <span className="eyebrow">{section.items.length} фото</span>
                    <h2>{section.title}</h2>
                    <p>{section.text}</p>
                  </div>
                </div>

                {section.items.length > 0 ? (
                  <div className="gallery-album-grid">
                    {section.items.map((item) => (
                      <button
                        className={item.id === selectedItem?.id ? 'gallery-album-card active' : 'gallery-album-card'}
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(item.id);
                          if (!adminEditMode) setLightboxItemId(item.id);
                        }}
                      >
                        <span className="gallery-album-photo" style={getMediaStyle(item.image, item.imagePosition, item.imageScale)} />
                        <strong>{item.title}</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="state-box">В этом альбоме пока нет фотографий.</div>
                )}
              </section>
            ))}
          </div>

          <section className="gallery-folders" aria-label="Папки галереи">
            <SectionTitle eyebrow="Папки" title="Все фотографии по разделам" text="Быстрый переход к альбомам с загруженными изображениями." />
            <div className="folder-grid">
              {groupedItems.map((section) => (
                <a className="folder-card" href={`#gallery-${section.value}`} key={section.value}>
                  <FolderOpen size={28} />
                  <strong>{section.title}</strong>
                  <span>{section.items.length} фото</span>
                </a>
              ))}
            </div>
          </section>

          {lightboxItem && (
            <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`Полное фото: ${lightboxItem.title}`} onClick={() => setLightboxItemId('')}>
              <button className="gallery-lightbox-close" type="button" onClick={() => setLightboxItemId('')} aria-label="Закрыть фото">
                <X size={22} />
              </button>
              {items.length > 1 && (
                <button
                  className="gallery-lightbox-nav gallery-lightbox-nav--prev"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectLightboxByDirection(-1);
                  }}
                  aria-label="Предыдущее фото"
                >
                  <ChevronLeft size={28} />
                </button>
              )}
              <div className="gallery-lightbox-stage" onClick={(event) => event.stopPropagation()}>
                {fullImageSource ? (
                  <img src={fullImageSource} alt={lightboxItem.title} style={{ objectPosition: normalizeImagePosition(lightboxItem.imagePosition) }} />
                ) : (
                  <div className="gallery-lightbox-fallback" style={getPhotoMediaStyle(lightboxItem.image, lightboxItem.imagePosition, lightboxItem.imageScale)} />
                )}
                <div className="gallery-lightbox-caption">
                  <span>{categoryLabels[lightboxItem.category]}</span>
                  <strong>{lightboxItem.title}</strong>
                  <small>{lightboxIndex + 1} / {items.length}</small>
                </div>
              </div>
              {items.length > 1 && (
                <button
                  className="gallery-lightbox-nav gallery-lightbox-nav--next"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectLightboxByDirection(1);
                  }}
                  aria-label="Следующее фото"
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
