"use client";

interface UpgradeModalProps {
  used: number;
  limit: number;
  onClose: () => void;
}

export default function UpgradeModal({ used, limit, onClose }: UpgradeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-xl font-bold text-gray-900">Monthly limit reached</h2>
          <p className="text-gray-500 mt-2 text-sm">
            You&apos;ve used all {limit} free HD downloads this month.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {/* Credits Pack */}
          <div className="border-2 border-blue-100 rounded-lg p-4 hover:border-blue-400 transition cursor-pointer"
            onClick={() => window.location.href = '/pricing'}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">Credits Pack</p>
                <p className="text-xs text-gray-500 mt-0.5">Never expires · Pay as you go</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600">from $2.9</p>
                <p className="text-xs text-gray-500">20 downloads</p>
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-purple-100 rounded-lg p-4 hover:border-purple-400 transition cursor-pointer bg-purple-50"
            onClick={() => window.location.href = '/pricing'}>
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">Pro</p>
                  <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Popular</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">100 downloads/month · Cancel anytime</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-purple-600">$9.9<span className="text-xs font-normal">/mo</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
          >
            Maybe later
          </button>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            See all plans
          </button>
        </div>
      </div>
    </div>
  );
}
