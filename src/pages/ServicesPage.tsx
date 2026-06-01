import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ServiceCard } from '../components/services/ServiceCard';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { ErrorState, LoadingState } from '../components/ui/States';
import { getServices } from '../services/api';
import type { Service } from '../types';

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadServices = () => {
      getServices()
        .then((response) => setServices(response.data))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    };

    loadServices();
    window.addEventListener('orlov-content-updated', loadServices);
    return () => window.removeEventListener('orlov-content-updated', loadServices);
  }, []);

  return (
    <section className="page-section services-catalog-page mockup-page">
      <Breadcrumbs items={[{ label: 'Услуги' }, { label: 'Каталог услуг' }]} />

      <div className="catalog-hero">
        <div>
          <span className="eyebrow">Каталог</span>
          <h1>Каталог услуг</h1>
          <p>Выберите подходящую услугу и проведите время с пользой в компании лошадей и инструкторов.</p>
        </div>
        <aside className="catalog-help-card">
          <h2>Как выбрать услугу?</h2>
          <ul className="check-list">
            <li><CheckCircle2 size={18} />Определите цель: обучение, отдых или знакомство.</li>
            <li><CheckCircle2 size={18} />Учитывайте возраст и уровень подготовки.</li>
            <li><CheckCircle2 size={18} />Выберите удобную длительность занятия.</li>
            <li><CheckCircle2 size={18} />При сомнениях оставьте комментарий к заявке.</li>
          </ul>
        </aside>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState />}
      {!loading && !error && (
        <>
          <div className="catalog-count-row">
            <span>Доступно услуг: {services.length}</span>
          </div>
          <div className="cards-grid catalog-grid">
            {services.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        </>
      )}
    </section>
  );
}
