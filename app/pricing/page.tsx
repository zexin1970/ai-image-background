"use client";

import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    highlight: false,
    badge: null,
    features: [
      "20 HD downloads / month",
      "No watermark",
      "Google sign-in required",
      "Preview quality for guests",
    ],
    cta: "Get Started",
    ctaHref: "/",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  },
  {
    name: "Credits Pack",
    price: "from $2.9",
    period: "one-time",
    highlight: false,
    badge: null,
    features: [
      "20 downloads — $2.9",
      "50 downloads — $5.9",
      "Never expires",
      "No subscription needed",
    ],
    cta: "Buy Credits",
    ctaHref: "#credits",
    ctaStyle: "bg-blue-600 text-white hover:bg-blue-700",
  },
  {
    name: "Pro",
    price: "$9.9",
    period: "/ month",
    highlight: true,
    badge: "Popular",
    features: [
      "100 HD downloads / month",
      "No watermark",
      "Cancel anytime",
      "Priority support",
    ],
    cta: "Subscribe",
    ctaHref: "#pro",
    ctaStyle: "bg-purple-600 text-white hover:bg-purple-700",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-5xl">

        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 mb-6 inline-block">
            ← Back to app
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-500 text-lg">Start free. Upgrade when you need more.</p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 transition
                ${plan.highlight ? "border-purple-400 shadow-purple-100 shadow-md" : "border-gray-100"}`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition ${plan.ctaStyle}`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: "Do credits expire?",
                a: "No. Credits you purchase never expire — use them at your own pace.",
              },
              {
                q: "What counts as one download?",
                a: "Each time you download a processed image (HD, no watermark) counts as one.",
              },
              {
                q: "Can I cancel my Pro subscription anytime?",
                a: "Yes, cancel anytime from your account. You keep access until the end of the billing period.",
              },
              {
                q: "What's the difference between preview and HD?",
                a: "Guests get a small preview image (~500px). Signed-in users get full-resolution HD output.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl p-5 border border-gray-100">
                <p className="font-medium text-gray-900 mb-1">{q}</p>
                <p className="text-gray-500 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
