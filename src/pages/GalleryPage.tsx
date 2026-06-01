import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EditableTextField } from '../components/admin/EditableTextField';
import { EditablePageTitle } from '../components/admin/EditablePageTitle';
import { ImageUploadButton } from '../components/admin/ImageUploadButton';
import { Button } from '../components/ui/Button';
import { ErrorState, LoadingState } from '../components/ui/States';
import {
  createEmptyGalleryItem,
  getEditableGalleryItems,
  isAdminAuthorized,
  isAdminEditMode,
  saveEditableGalleryItems,
} from '../services/adminContent';
import { getGalleryItems } from '../services/api';
import type { GalleryItem } from '../types';
import { getMediaStyle } from '../utils/media';

const gallerySections: { value: GalleryItem['category']; title: string; text: string }[] = [
  { value: 'walks', title: 'Прогулки', text: 'Маршруты, спокойный темп и прогулки по территории.' },
  { value: 'lessons', title: 'Занятия', text: 'Тренировки, инструктаж и первые шаги в верховой езде.' },
  { value: 'photosessions', title: 'Фотосессии', text: 'Постановочные кадры с лошадьми и семейные съемки.' },
  { value: 'horses', title: 'Лошади', text: 'Лошади клуба, их характер и спокойная атмосфера.' },
  { value: 'territory', title: 'Территория', text: 'Место проведения занятий, манеж и зоны отдыха.' },
];

const defaultCategoryImage: Record<GalleryItem['category'], string> = {
  lessons: 'linear-gradient(135deg, #315734, #b67f4a)',
  walks: 'linear-gradient(135deg, #4d6f4f, #d8b978)',
  photosessions: 'linear-gradient(135deg, #69513a, #e1c7a0)',
  horses: 'linear-gradient(135deg, #352216, #8f6f4d)',
  territory: 'linear-gradient(135deg, #375c42, #d7bc80)',
};

type ActiveIndexes = Partial<Record<GalleryItem['category'], number>>;

export function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [activeIndexes, setActiveIndexes] = useState<ActiveIndexes>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adminEditMode, setAdminEditMode] = useState(isAdminAuthorized() && isAdminEditMode());

  useEffect(() => {
    const loadGallery = () => {
      getGalleryItems()
        .then((response) => {
          setItems(response.data);
          setError(false);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    };
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

  const saveGallery = (nextItems: GalleryItem[]) => {
    setItems(nextItems);
    saveEditableGalleryItems(nextItems);
  };

  const updateItem = <K extends keyof GalleryItem>(id: string, field: K, value: GalleryItem[K]) => {
    saveGallery(getEditableGalleryItems().map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addItem = (category: GalleryItem['category']) => {
    const newItem = {
      ...createEmptyGalleryItem(),
      id: `gallery-${Date.now()}`,
      title: `Новое фото: ${gallerySections.find((section) => section.value === category)?.title || 'Галерея'}`,
      category,
      image: defaultCategoryImage[category],
    };
    saveGallery([newItem, ...getEditableGalleryItems()]);
    setActiveIndexes((current) => ({ ...current, [category]: 0 }));
  };

  const deleteItem = (id: string, category: GalleryItem['category']) => {
    saveGallery(getEditableGalleryItems().filter((item) => item.id !== id));
    setActiveIndexes((current) => ({ ...current, [category]: Math.max(0, (current[category] || 0) - 1) }));
  };

  const getActiveIndex = (category: GalleryItem['category'], count: number) => {
    if (count <= 0) return 0;
    return Math.min(activeIndexes[category] || 0, count - 1);
  };

  const moveCarousel = (category: GalleryItem['category'], count: number, direction: -1 | 1) => {
    if (count <= 1) return;
    setActiveIndexes((current) => {
      const nextIndex = ((current[category] || 0) + direction + count) % count;
      return { ...current, [category]: nextIndex };
    });
  };

  return (
    <section className="page-section gallery-page">
      <EditablePageTitle pageKey="gallery" />

      {loading && <LoadingState />}
      {error && <ErrorState />}

      {!loading && !error && (
        <div className="gallery-story">
          {groupedItems.map((section) => {
            const activeIndex = getActiveIndex(section.value, section.items.length);
            const activeItem = section.items[activeIndex];

            return (
              <section className="gallery-section" id={`gallery-${section.value}`} key={section.value}>
                <div className="gallery-section-heading">
                  <div>
                    <span className="eyebrow">{section.items.length} фото</span>
                    <h2>{section.title}</h2>
                    <p>{section.text}</p>
                  </div>
                  {adminEditMode && (
                    <Button variant="secondary" onClick={() => addItem(section.value)}>
                      <Plus size={18} /> Добавить фото
                    </Button>
                  )}
                </div>

                {activeItem ? (
                  <div className="gallery-carousel">
                    <button className="gallery-carousel-arrow" type="button" disabled={section.items.length <= 1} onClick={() => moveCarousel(section.value, section.items.length, -1)} aria-label="Предыдущее фото">
                      <ChevronLeft size={24} />
                    </button>

                    <div className="gallery-carousel-main">
                      <div className="gallery-carousel-stage" style={getMediaStyle(activeItem.image, { fit: 'contain' })}>
                        <div className="gallery-carousel-caption">
                          <strong>{activeItem.title}</strong>
                          <span>{activeIndex + 1} / {section.items.length}</span>
                        </div>
                      </div>

                      <div className="gallery-carousel-thumbs" aria-label={`Миниатюры: ${section.title}`}>
                        {section.items.map((item, index) => (
                          <button
                            className={index === activeIndex ? 'active' : ''}
                            key={item.id}
                            type="button"
                            onClick={() => setActiveIndexes((current) => ({ ...current, [section.value]: index }))}
                            aria-label={`Открыть фото: ${item.title}`}
                          >
                            <span style={getMediaStyle(item.image, { fit: 'contain' })} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <button className="gallery-carousel-arrow" type="button" disabled={section.items.length <= 1} onClick={() => moveCarousel(section.value, section.items.length, 1)} aria-label="Следующее фото">
                      <ChevronRight size={24} />
                    </button>
                  </div>
                ) : (
                  <div className="state-box">В этом альбоме пока нет фотографий.</div>
                )}

                {adminEditMode && activeItem && (
                  <div className="inline-edit-panel gallery-inline-panel">
                    <strong>Редактирование выбранного фото</strong>
                    <label>
                      <span>Заголовок</span>
                      <EditableTextField value={activeItem.title} onCommit={(value) => updateItem(activeItem.id, 'title', value)} />
                    </label>
                    <label>
                      <span>Категория</span>
                      <select value={activeItem.category} onChange={(event) => updateItem(activeItem.id, 'category', event.target.value as GalleryItem['category'])}>
                        {gallerySections.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>URL или gradient</span>
                      <EditableTextField value={activeItem.image} onCommit={(value) => updateItem(activeItem.id, 'image', value)} />
                    </label>
                    <ImageUploadButton label="Добавить файл фото" onUpload={(dataUrl) => updateItem(activeItem.id, 'image', dataUrl)} />
                    <button className="button button-ghost danger-button" type="button" onClick={() => deleteItem(activeItem.id, section.value)}>
                      <Trash2 size={17} /> Удалить фото
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
