import { CalendarDays, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EditableTextField } from '../admin/EditableTextField';
import { ImageUploadButton } from '../admin/ImageUploadButton';
import { getEditableServices, isAdminAuthorized, isAdminEditMode as getAdminEditMode, saveEditableServices } from '../../services/adminContent';
import type { Service } from '../../types';
import { getMediaStyle } from '../../utils/media';
import { ButtonLink } from '../ui/Button';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [adminEditMode, setAdminEditMode] = useState(isAdminAuthorized() && getAdminEditMode());
  const [editableService, setEditableService] = useState(service);

  useEffect(() => {
    const syncAdminState = () => setAdminEditMode(isAdminAuthorized() && getAdminEditMode());
    window.addEventListener('orlov-admin-state-updated', syncAdminState);
    return () => window.removeEventListener('orlov-admin-state-updated', syncAdminState);
  }, []);

  useEffect(() => {
    setEditableService(service);
  }, [service]);

  const updateService = <K extends keyof Service>(field: K, value: Service[K]) => {
    setEditableService((current) => {
      const nextService = { ...current, [field]: value };
      const updatedServices = getEditableServices().map((item) => (item.id === service.id ? { ...item, ...nextService } : item));
      saveEditableServices(updatedServices);
      return nextService;
    });
  };

  const visibleService = adminEditMode ? editableService : service;

  return (
    <article className="service-card service-card--catalog">
      <div className="service-card-image" style={getMediaStyle(visibleService.image, { fit: 'contain' })} aria-hidden="true" />
      <div className="service-card-body">
        <h3>{visibleService.title}</h3>
        <p>{visibleService.shortDescription}</p>
        <div className="service-card-facts">
          <span><Clock size={15} /> {visibleService.duration}</span>
          <span><Users size={15} /> {visibleService.ageLimit}</span>
        </div>
        <strong className="service-card-price">{visibleService.price}</strong>
        <div className="card-actions service-card-actions">
          <ButtonLink to={`/services/${visibleService.id}`} variant="primary">
            Подробнее
          </ButtonLink>
          <ButtonLink to={`/booking?service=${visibleService.id}`} variant="secondary" aria-label={`Записаться на ${visibleService.title}`}>
            <CalendarDays size={17} />
          </ButtonLink>
        </div>
        {adminEditMode && (
          <div className="inline-edit-panel service-inline-panel">
            <strong>Быстрое редактирование</strong>
            <label>
              <span>Название</span>
              <EditableTextField value={editableService.title} onCommit={(value) => updateService('title', value)} />
            </label>
            <label>
              <span>Цена</span>
              <EditableTextField value={editableService.price} onCommit={(value) => updateService('price', value)} />
            </label>
            <label>
              <span>URL или gradient</span>
              <EditableTextField value={editableService.image} onCommit={(value) => updateService('image', value)} />
            </label>
            <ImageUploadButton label="Добавить файл фото" onUpload={(dataUrl) => updateService('image', dataUrl)} />
          </div>
        )}
      </div>
    </article>
  );
}
