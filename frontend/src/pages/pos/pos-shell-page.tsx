import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberText, PriceDisplay } from '../../shared/ui/atoms';

const ModifierPicker = lazy(() => import('../../widgets/pos-terminal/ui/modifier-picker.organism'));
const PaymentModal = lazy(() => import('../../widgets/pos-terminal/ui/payment-modal.organism'));

export default function PosShellPage() {
  const { t } = useTranslation();
  const [showModifiers, setShowModifiers] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('pos.shellTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Foundation layout only. No business logic yet.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Qty:</span>
        <NumberText value={3} />
        <span className="text-sm text-muted-foreground">Total:</span>
        <PriceDisplay amount="129.50" currency="SAR" />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="rounded-xl border border-border px-4 py-2 text-sm"
          onClick={() => setShowModifiers(true)}
        >
          Open Modifiers
        </button>
        <button
          type="button"
          className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => setShowPayment(true)}
        >
          Open Payment
        </button>
      </div>

      {showModifiers && (
        <Suspense fallback={<div className="mt-4 text-sm">Loading...</div>}>
          <ModifierPicker onClose={() => setShowModifiers(false)} />
        </Suspense>
      )}

      {showPayment && (
        <Suspense fallback={<div className="mt-4 text-sm">Loading...</div>}>
          <PaymentModal onClose={() => setShowPayment(false)} />
        </Suspense>
      )}
    </div>
  );
}
