import { useTranslation } from 'react-i18next';
import { useNetwork } from '../../hooks/use-network';

export function OfflineBanner() {
  const online = useNetwork();
  const { t } = useTranslation();

  if (online) return null;

  return (
    <div className="glass-strong mx-4 mt-4 rounded-xl px-4 py-2 text-sm text-foreground">
      {t('offline.banner')}
    </div>
  );
}
