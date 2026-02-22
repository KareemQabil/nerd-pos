import { useTranslation } from 'react-i18next';

export default function KdsPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('kitchen.shellTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Foundation layout only. No business logic yet.
      </p>
    </div>
  );
}
