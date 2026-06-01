import { Bookmark, CalendarDays, CheckCircle2, Clock, MapPin, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { ServiceCard } from '../components/services/ServiceCard';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { ButtonLink } from '../components/ui/Button';
import { ErrorState, LoadingState } from '../components/ui/States';
import { getReviews, getServiceById, getServices } from '../services/api';
import type { Review, Service } from '../types';
import { getMediaStyle } from '../utils/media';

type ServiceTab = 'description' | 'includes' | 'requirements' | 'cancellation' | 'reviews';

const serviceTabs: { id: ServiceTab; label: string }[] = [
  { id: 'description', label: 'Описание' },
  { id: 'includes', label: 'Что входит' },
  { id: 'requirements', label: 'Условия и требования' },
  { id: 'cancellation', label: 'Отмена и перенос' },
  { id: 'reviews', label: 'Отзывы' },
];

export function ServiceDetailsPage() {
  const { id } = useParams();
  const [service, setService] = useState<Service>();
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<ServiceTab>('description');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getServiceById(id), getServices(), getReviews()])
      .then(([serviceResponse, servicesResponse, reviewsResponse]) => {
        if (!serviceResponse.data) setError(true);
        setService(serviceResponse.data);
        setServices(servicesResponse.data);
        setReviews(reviewsResponse.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const suggestedServices = useMemo(
    () => services.filter((item) => item.id !== service?.id).slice(0, 4),
    [service?.id, services],
  );

  const renderTabContent = () => {
    if (!service) return null;

    if (activeTab === 'includes') {
      return (
        <div className="service-tab-panel">
          <article>
            <h2>Что входит в услугу</h2>
            <ul className="check-list">
              <li><CheckCircle2 size={18} />Первичный инструктаж перед занятием.</li>
              <li><CheckCircle2 size={18} />Подбор формата занятия с учетом возраста и подготовки.</li>
              <li><CheckCircle2 size={18} />Работа с инструктором на протяжении всей услуги.</li>
              <li><CheckCircle2 size={18} />Подбор подходящей лошади с учетом ограничений.</li>
            </ul>
          </article>
          <aside className="lesson-flow-card">
            <h2>Как проходит занятие</h2>
            {['Знакомство и инструктаж', 'Подготовка', 'Практическая часть', 'Завершение'].map((item, index) => (
              <div className="lesson-flow-step" key={item}>
                <span>{index + 1}</span>
                <div>
                  <strong>{item}</strong>
                  <p>{index === 0 ? 'Инструктор объясняет правила поведения рядом с лошадью.' : index === 1 ? 'Подбирается лошадь и проверяется готовность участника.' : index === 2 ? 'Основная часть проходит в манеже или на маршруте.' : 'Обратная связь, рекомендации и ответы на вопросы.'}</p>
                </div>
              </div>
            ))}
          </aside>
        </div>
      );
    }

    if (activeTab === 'requirements') {
      return (
        <div className="service-tab-panel">
          <article>
            <h2>Условия и требования</h2>
            <p>{service.preparation}</p>
            <ul className="check-list">
              <li><CheckCircle2 size={18} />Возрастное ограничение: {service.ageLimit}.</li>
              <li><CheckCircle2 size={18} />Продолжительность: {service.duration}.</li>
              {service.restrictions.map((item) => <li key={item}><CheckCircle2 size={18} />{item}</li>)}
            </ul>
          </article>
          <aside className="lesson-flow-card">
            <h2>Правила безопасности</h2>
            <ul className="check-list">
              {service.safetyRules.map((item) => <li key={item}><ShieldCheck size={18} />{item}</li>)}
            </ul>
          </aside>
        </div>
      );
    }

    if (activeTab === 'cancellation') {
      return (
        <div className="service-tab-panel">
          <article>
            <h2>Отмена и перенос</h2>
            <p>Заявка не является автоматическим бронированием. Администратор связывается с клиентом, уточняет детали и подтверждает возможность проведения занятия.</p>
            <ul className="check-list">
              <li><CheckCircle2 size={18} />При плохой погоде занятие может быть перенесено на другое время.</li>
              <li><CheckCircle2 size={18} />Если подходящая лошадь или инструктор недоступны, администратор предложит альтернативный слот.</li>
              <li><CheckCircle2 size={18} />При изменении количества участников желательно сообщить об этом заранее.</li>
            </ul>
          </article>
          <aside className="info-note">
            <ShieldCheck size={20} />
            <span>Окончательное подтверждение записи выполняется сотрудником клуба после проверки расписания и ресурсов.</span>
          </aside>
        </div>
      );
    }

    if (activeTab === 'reviews') {
      return (
        <div className="service-tab-panel service-tab-panel--single">
          <article>
            <h2>Отзывы клиентов</h2>
            <p>Отзывы помогают понять атмосферу занятий и уровень сопровождения клиентов.</p>
            <div className="review-grid">
              {reviews.slice(0, 3).map((review) => <ReviewCard key={review.id} review={review} />)}
            </div>
          </article>
        </div>
      );
    }

    return (
      <div className="service-tab-panel">
        <article>
          <h2>Описание</h2>
          <p>{service.fullDescription}</p>
          <ul className="check-list">
            {service.suitableFor.map((item) => <li key={item}><CheckCircle2 size={18} />{item}</li>)}
          </ul>
          <div className="info-note">
            <ShieldCheck size={20} />
            <span>Перед первым занятием рекомендуем ознакомиться с правилами и разделом безопасности.</span>
          </div>
        </article>
        <aside className="lesson-flow-card">
          <h2>Кому подходит</h2>
          <ul className="check-list">
            {service.suitableFor.map((item) => <li key={item}><Users size={18} />{item}</li>)}
          </ul>
        </aside>
      </div>
    );
  };

  if (loading) return <section className="page-section"><LoadingState /></section>;
  if (error || !service) return <section className="page-section"><ErrorState text="Услуга не найдена. Вернитесь в каталог и выберите другой вариант." /></section>;

  return (
    <section className="page-section detail-page mockup-page service-detail-redesign">
      <Breadcrumbs items={[{ label: 'Услуги', to: '/services' }, { label: service.title }]} />

      <div className="service-detail-top">
        <div>
          <div className="service-detail-photo" style={getMediaStyle(service.image, { fit: 'contain' })} aria-label={service.title} />
          <div className="service-detail-thumbs">
            {[0, 1, 2, 3, 4].map((item) => (
              <span key={item} style={getMediaStyle(service.image, { fit: 'contain' })} />
            ))}
          </div>
        </div>

        <aside className="service-info-card">
          <div className="service-info-card__top">
            <span className="service-tag">Услуга</span>
            <Bookmark size={22} />
          </div>
          <h1>{service.title}</h1>
          <p>{service.fullDescription}</p>

          <dl className="service-detail-facts">
            <div><Clock size={19} /><dt>Продолжительность</dt><dd>{service.duration}</dd></div>
            <div><ShieldCheck size={19} /><dt>Уровень</dt><dd>Для начинающих и продолжающих</dd></div>
            <div><Users size={19} /><dt>Возраст</dt><dd>{service.ageLimit}</dd></div>
            <div><MapPin size={19} /><dt>Место проведения</dt><dd>Манеж или территория клуба</dd></div>
          </dl>

          <div className="service-detail-price">
            <span>Стоимость</span>
            <strong>{service.price}</strong>
          </div>

          <div className="service-detail-actions">
            <ButtonLink to={`/booking?service=${service.id}`} variant="primary">
              <CalendarDays size={18} /> Записаться на занятие
            </ButtonLink>
            <ButtonLink to="/contacts" variant="secondary">
              <MessageCircle size={18} /> Задать вопрос
            </ButtonLink>
          </div>
        </aside>
      </div>

      <div className="service-tabs" aria-label="Разделы карточки услуги">
        {serviceTabs.map((item) => (
          <button
            className={activeTab === item.id ? 'active' : ''}
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="service-detail-content" id="service-description">
        {renderTabContent()}
      </div>

      <div className="service-benefit-row">
        <article><ShieldCheck size={28} /><strong>Безопасность</strong><span>Инструктаж перед занятием</span></article>
        <article><Users size={28} /><strong>Опытные инструкторы</strong><span>Спокойная работа с новичками</span></article>
        <article><CheckCircle2 size={28} /><strong>Индивидуальный подход</strong><span>Учитываем возраст и опыт</span></article>
        <article><MapPin size={28} /><strong>Удобное расположение</strong><span>пгт. Шерегеш и природная территория</span></article>
      </div>

      {suggestedServices.length > 0 && (
        <section className="related-services">
          <h2>Вам может понравиться</h2>
          <div className="cards-grid catalog-grid related-grid">
            {suggestedServices.map((item) => <ServiceCard key={item.id} service={item} />)}
          </div>
        </section>
      )}

      <Link className="back-link" to="/services">Вернуться в каталог услуг</Link>
    </section>
  );
}
