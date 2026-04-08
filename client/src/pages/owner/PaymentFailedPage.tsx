import { Link } from 'react-router-dom';

export default function PaymentFailedPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-red-600">&#10007;</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h1>
        <p className="text-gray-500 mb-6">
          Something went wrong with your payment. Don't worry — no charges were made. You can try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/owner/promotion"
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Try Again
          </Link>
          <Link
            to="/owner/dashboard"
            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:border-amber-400"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
