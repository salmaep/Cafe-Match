import { Link } from 'react-router-dom';

export default function PaymentSuccessPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-green-600">&#10003;</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
        <p className="text-gray-500 mb-6">
          Your promotion is now active! Your cafe will be highlighted to users immediately.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/owner/dashboard"
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/owner/promotion"
            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:border-amber-400"
          >
            View Promotions
          </Link>
        </div>
      </div>
    </div>
  );
}
