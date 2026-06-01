import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { SectionTitle } from '../components/ui/SectionTitle';
import { isAdminAuthorized, loginAdmin } from '../services/adminContent';
import { isManagerAuthorized, loginManager } from '../services/managerAuth';
import { getTrainers } from '../services/trainerRepository';
import { isTrainerAuthorized, loginTrainer } from '../services/trainerAuth';
import type { Trainer } from '../types';

type StaffRole = 'admin' | 'manager' | 'trainer';

export function StaffLoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<StaffRole>('trainer');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const loadTrainers = async () => {
      try {
        const response = await getTrainers();
        const activeTrainers = response.data.filter((trainer) => trainer.isActive);
        setTrainers(activeTrainers);
        setSelectedTrainerId(activeTrainers[0]?.id || '');
      } finally {
        setLoading(false);
      }
    };
    void loadTrainers();
  }, []);

  useEffect(() => {
    setErrorText('');
    if (role === 'admin') {
      setLogin('admin');
      setPassword('');
      return;
    }
    if (role === 'manager') {
      setLogin('manager');
      setPassword('');
      return;
    }
    setLogin('');
    setPassword('');
  }, [role]);

  if (isAdminAuthorized()) {
    return <Navigate to="/admin" replace />;
  }

  if (isManagerAuthorized()) {
    return <Navigate to="/manager/dashboard" replace />;
  }

  if (isTrainerAuthorized()) {
    return <Navigate to="/trainer/schedule" replace />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrorText('');

    if (role === 'admin') {
      const ok = loginAdmin(login, password);
      if (!ok) {
        setErrorText('Проверьте логин и пароль администратора.');
        return;
      }
      navigate('/admin', { replace: true });
      return;
    }

    if (role === 'manager') {
      const ok = loginManager(login, password);
      if (!ok) {
        setErrorText('Проверьте логин и пароль управляющего.');
        return;
      }
      navigate('/manager/dashboard', { replace: true });
      return;
    }

    if (!selectedTrainerId) {
      setErrorText('Выберите тренера для входа.');
      return;
    }

    const ok = loginTrainer(selectedTrainerId, password);
    if (!ok) {
      setErrorText('Проверьте пароль тренера.');
      return;
    }
    navigate('/trainer/schedule', { replace: true });
  };

  return (
    <section className="page-section trainer-page">
      <SectionTitle
        eyebrow="Служебный вход"
        title="Вход для сотрудников"
        text="Клиентам авторизация не требуется. Доступ к рабочим разделам открыт только после выбора роли и проверки учетных данных."
      />

      <form className="form-card trainer-login" onSubmit={handleSubmit}>
        <div className="staff-role-switch staff-role-switch--three">
          <Button type="button" variant={role === 'trainer' ? 'primary' : 'secondary'} onClick={() => setRole('trainer')}>
            Тренер
          </Button>
          <Button type="button" variant={role === 'manager' ? 'primary' : 'secondary'} onClick={() => setRole('manager')}>
            Управляющий
          </Button>
          <Button type="button" variant={role === 'admin' ? 'primary' : 'secondary'} onClick={() => setRole('admin')}>
            Администратор
          </Button>
        </div>

        {role === 'trainer' ? (
          <label>
            <span>Тренер</span>
            <select value={selectedTrainerId} onChange={(event) => setSelectedTrainerId(event.target.value)} disabled={loading}>
              {trainers.length === 0 && <option value="">{loading ? 'Загрузка...' : 'Нет доступных тренеров'}</option>}
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.fullName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            <span>Логин</span>
            <input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" />
          </label>
        )}

        <label>
          <span>Пароль</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>

        {errorText && <small className="standalone-error">{errorText}</small>}
        <Button type="submit" disabled={loading && role === 'trainer'}>
          Войти
        </Button>
        <p className="form-note">
          Демо-доступ: администратор admin / admin123, управляющий manager / manager123, тренер - выбрать тренера и ввести trainer123.
        </p>
      </form>
    </section>
  );
}
