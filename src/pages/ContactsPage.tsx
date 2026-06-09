import { ExternalLink, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EditablePageTitle } from '../components/admin/EditablePageTitle';
import { ButtonLink } from '../components/ui/Button';
import { ErrorState, LoadingState } from '../components/ui/States';
import { getContacts } from '../services/api';
import type { ContactInfo } from '../types';

const yandexMapUrl = 'https://yandex.com/maps/org/konno_turisticheskiy_klub_sivka_burka/39445099145/?ll=88.071922%2C52.945509&z=12&utm_source=share';
const yandexMapEmbedUrl = 'https://yandex.com/map-widget/v1/?ll=88.071922%2C52.945509&mode=search&oid=39445099145&ol=biz&z=12';
const yandexRouteUrl = 'https://yandex.com/maps/?rtext=~52.945509%2C88.071922&rtt=auto';

export function ContactsPage() {
  const [contacts, setContacts] = useState<ContactInfo>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getContacts()
      .then((response) => setContacts(response.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page-section">
      <EditablePageTitle pageKey="contacts" />
      {loading && <LoadingState />}
      {error && <ErrorState />}
      {contacts && (
        <div className="contacts-layout">
          <div className="contact-card">
            <h2>КТК "Сивка-Бурка"</h2>
            <p><MapPin size={18} /> {contacts.address}</p>
            <p><Phone size={18} /> <a href={`tel:${contacts.phone.replace(/\D/g, '')}`}>{contacts.phone}</a></p>
            <p><Mail size={18} /> <a href={`mailto:${contacts.email}`}>{contacts.email}</a></p>
            <p><MessageCircle size={18} /> {contacts.requestSchedule}</p>
            <div className="contact-actions">
              <ButtonLink to="/booking" variant="primary">Записаться</ButtonLink>
              <a className="button button-secondary" href={yandexRouteUrl} target="_blank" rel="noreferrer">
                <Navigation size={17} /> Маршрут
              </a>
              {contacts.messengers.map((link) => <a className="button button-secondary" key={link.title} href={link.url}>{link.title}</a>)}
            </div>
          </div>
          <div className="interactive-map">
            <iframe
              src={yandexMapEmbedUrl}
              title="КТК Сивка-Бурка на Яндекс.Картах"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="interactive-map-actions">
              <a className="button button-primary" href={yandexMapUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={17} /> Открыть карту
              </a>
              <a className="button button-secondary" href={yandexRouteUrl} target="_blank" rel="noreferrer">
                <Navigation size={17} /> Построить маршрут
              </a>
            </div>
          </div>
        </div>
      )}
      {contacts && (
        <div className="mobile-quick-actions">
          <a href={`tel:${contacts.phone.replace(/\D/g, '')}`}><Phone size={18} /> Позвонить</a>
          <a href={contacts.messengers[0]?.url}><MessageCircle size={18} /> Написать</a>
          <a href={yandexRouteUrl}><Navigation size={18} /> Маршрут</a>
        </div>
      )}
    </section>
  );
}
