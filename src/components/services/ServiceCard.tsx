import { CalendarDays, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ImagePositionControl } from '../admin/ImagePositionControl';
import { ImageUploadButton } from '../admin/ImageUploadButton';
import { isAdminAuthorized, isAdminEditMode as getAdminEditMode } from '../../services/adminContent';
import { updateService as saveServicePatch } from '../../services/api';
import type { Service } from '../../types';
import { getPhotoMediaStyle } from '../../utils/media';
import { ButtonLink } from '../ui/Button';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [editableService, setEditableService] = useState(service);
  const [adminEditMode, setAdminEditMode] = useState(isAdminAuthorized() && getAdminEditMode());

  useEffect(() => {
    setEditableService(service);
  }, [service]);

  useEffect(() => {
    const syncAdminState = () => setAdminEditMode(isAdminAuthorized() && getAdminEditMode());
    window.addEventListener('orlov-admin-state-updated', syncAdminState);
    return () => window.removeEventListener('orlov-admin-state-updated', syncAdminState);
  }, []);

  const updateService = <K extends keyof Service>(field: K, value: Service[K]) => {
    const nextService = { ...editableService, [field]: value };
    setEditableService(nextService);
    void saveServicePatch(nextService.id, { [field]: value } as Partial<Service>)
      .then((response) => {
        if (response.data) setEditableService(response.data);
        window.dispatchEvent(new Event('orlov-content-updated'));
      })
      .catch(() => setEditableService(service));
  };

  return (
    <article className="service-card service-card--catalog">
      <div className="service-card-image" style={getPhotoMediaStyle(editableService.image, editableService.imagePosition, editableService.imageScale)} aria-hidden="true" />
      <div className="service-card-body">
        <h3>{editableService.title}</h3>
        <p>{editableService.shortDescription}</p>
        <div className="service-card-facts">
          <span><Clock size={15} /> {editableService.duration}</span>
          <span><Users size={15} /> {editableService.ageLimit}</span>
        </div>
        <strong className="service-card-price">{editableService.price}</strong>
        <div className="card-actions service-card-actions">
          <ButtonLink to={`/services/${editableService.id}`} variant="primary">
            Подробнее
          </ButtonLink>
          <ButtonLink to={`/booking?service=${editableService.id}`} variant="secondary" aria-label={`Записаться на ${editableService.title}`}>
            <CalendarDays size={17} />
          </ButtonLink>
        </div>
        {adminEditMode && (
          <div className="inline-edit-panel service-inline-panel">
            <strong>Быстрое редактирование</strong>
            <label>
              <span>Название</span>
              <input value={editableService.title} onChange={(event) => updateService('title', event.target.value)} />
            </label>
            <label>
              <span>Цена</span>
              <input value={editableService.price} onChange={(event) => updateService('price', event.target.value)} />
            </label>
            <ImageUploadButton label="Добавить файл фото" onUpload={(dataUrl) => updateService('image', dataUrl)} />
            <ImagePositionControl
              compact
              image={editableService.image}
              value={editableService.imagePosition}
              scale={editableService.imageScale}
              onChange={(position) => updateService('imagePosition', position)}
              onScaleChange={(nextScale) => updateService('imageScale', nextScale)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
