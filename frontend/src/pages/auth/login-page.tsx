import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../shared/model/ui.store';

export default function LoginPage() {
  const { t } = useTranslation();
  const locale = useUiStore((state) => state.locale);
  const setLocale = useUiStore((state) => state.setLocale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="glass w-full max-w-md rounded-2xl p-8">
        <h1 className="text-2xl font-semibold">{t('auth.loginTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('auth.loginSubtitle')}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => setLocale('ar')}
          >
            {t('actions.switchToArabic')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => setLocale('en')}
          >
            {t('actions.switchToEnglish')}
          </button>
          <span className="text-xs text-muted-foreground">{locale}</span>
        </div>
      </div>
    </div>
  );
}
