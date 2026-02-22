import { useTranslation } from 'react-i18next';
import { useSessionContextStore } from '../../features/sessions/model/session-context.store';

export default function OpenSessionPage() {
  const { t } = useTranslation();
  const setActiveSessionId = useSessionContextStore((state) => state.setActiveSessionId);

  return (
    <div className="p-6">
      <div className="glass w-full max-w-md rounded-2xl p-6">
        <h1 className="text-2xl font-semibold">{t('pos.openSessionTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder open session flow.
        </p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => setActiveSessionId('session-placeholder')}
        >
          Start Session
        </button>
      </div>
    </div>
  );
}
