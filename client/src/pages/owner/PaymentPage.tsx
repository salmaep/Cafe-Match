import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsApi } from '../../api/payments.api';
import { openSnapPopup } from '../../utils/midtrans';

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const promotionId = searchParams.get('promotionId');

  useEffect(() => {
    if (!promotionId) {
      navigate('/owner/promotion');
      return;
    }

    paymentsApi.createPayment(Number(promotionId)).then((res) => {
      openSnapPopup(res.data.token, {
        onSuccess: () => navigate('/owner/payment/success'),
        onPending: () => navigate('/owner/payment/success'),
        onError: () => navigate('/owner/payment/failed'),
        onClose: () => navigate('/owner/promotion'),
      });
    }).catch(() => {
      navigate('/owner/payment/failed');
    });
  }, [promotionId, navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4" />
        <p className="text-gray-500">Preparing payment...</p>
      </div>
    </div>
  );
}
