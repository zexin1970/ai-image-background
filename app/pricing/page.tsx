"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// PayPal JS SDK 类型声明
interface PayPalButtonConfig {
  style?: object;
  createOrder?: () => Promise<string>;
  createSubscription?: (data: unknown, actions: { subscription: { create: (opts: object) => Promise<string> } }) => Promise<string>;
  onApprove?: (data: { orderID: string; subscriptionID?: string }) => Promise<void>;
  onError?: (err: unknown) => void;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: PayPalButtonConfig) => { render: (el: HTMLElement) => void };
    };
  }
}

const PAYPAL_CLIENT_ID = "ASg9dZKDij_mPgJlatUTNiR8C1cavToO_8nGbN8KkFVP6MYZU5c1XRArdRIBLG80IzocYAIPs49tbO4W";
const PRO_PLAN_ID = "P-6GU035748K5678354NHESEXI";

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

type Pack = "20" | "50";

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
    paypalId: null,
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
    paypalId: "credits",
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
    paypalId: "pro",
  },
];

export default function PricingPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [selectedPack, setSelectedPack] = useState<Pack>("20");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [payStatus, setPayStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [payMessage, setPayMessage] = useState("");
  const creditsBtnRef = useRef<HTMLDivElement>(null);
  const proBtnRef = useRef<HTMLDivElement>(null);

  // 读取已登录用户
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) setUser(JSON.parse(saved) as UserInfo);
    } catch {}
  }, []);

  // 加载 PayPal SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.onload = () => {
      console.log("PayPal SDK loaded");
      setSdkLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load PayPal SDK");
      setPayStatus("error");
      setPayMessage("Failed to load payment system");
    };
    document.body.appendChild(script);
    return () => { 
      try { document.body.removeChild(script); } catch {}
    };
  }, []);

  // 渲染 PayPal 按钮
  useEffect(() => {
    if (!sdkLoaded || !window.paypal) {
      console.log("SDK not ready:", { sdkLoaded, hasPaypal: !!window.paypal });
      return;
    }

    console.log("Rendering PayPal buttons");

    // --- Credits 按钮 ---
    if (creditsBtnRef.current) {
      creditsBtnRef.current.innerHTML = "";
      try {
        window.paypal.Buttons({
        style: { layout: "vertical", color: "blue", shape: "rect", label: "pay" },
        createOrder: async () => {
          if (!user) { alert("Please sign in first to purchase credits."); throw new Error("Not signed in"); }
          setPayStatus("processing");
          const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pack: selectedPack, user_id: user.id }),
          });
          const data = await res.json() as { order_id: string };
          return data.order_id;
        },
        onApprove: async (data: { orderID: string }) => {
          console.log("Payment approved, orderID:", data.orderID);
          try {
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order_id: data.orderID, user_id: user!.id, pack: selectedPack }),
            });
            console.log("Capture response status:", res.status);
            const result = await res.json() as { success: boolean; credits_added: number };
            console.log("Capture result:", result);
            if (result.success) {
              setPayStatus("success");
              setPayMessage(`✅ ${result.credits_added} credits added! Check your email for confirmation.`);
            } else {
              setPayStatus("error");
              setPayMessage("Payment failed. Please try again.");
            }
          } catch (error) {
            console.error("Capture error:", error);
            setPayStatus("error");
            setPayMessage("Payment processing failed: " + String(error));
          }
        },
        onError: () => {
          setPayStatus("error");
          setPayMessage("Payment error. Please try again.");
        },
      }).render(creditsBtnRef.current);
      } catch (error) {
        console.error("Failed to render Credits button:", error);
        setPayStatus("error");
        setPayMessage("Failed to load payment button");
      }
    }

    // --- Pro 订阅按钮 ---
    if (proBtnRef.current) {
      proBtnRef.current.innerHTML = "";
      try {
        window.paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "subscribe" },
        createSubscription: async (_data: unknown, actions: { subscription: { create: (opts: object) => Promise<string> } }) => {
          if (!user) { alert("Please sign in first to subscribe."); throw new Error("Not signed in"); }
          return actions.subscription.create({
            plan_id: PRO_PLAN_ID,
            custom_id: user.id,
          });
        },
        onApprove: async (_data: { subscriptionID?: string }) => {
          setPayStatus("success");
          setPayMessage("🎉 Pro subscription activated! Check your email for confirmation.");
        },
        onError: () => {
          setPayStatus("error");
          setPayMessage("Subscription error. Please try again.");
        },
      }).render(proBtnRef.current);
      } catch (error) {
        console.error("Failed to render Pro button:", error);
      }
    }
  }, [sdkLoaded, selectedPack, user]);

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
          {!user && (
            <p className="text-sm text-amber-600 mt-3 bg-amber-50 inline-block px-4 py-2 rounded-lg">
              ⚠️ Please <Link href="/" className="underline font-medium">sign in</Link> before purchasing
            </p>
          )}
        </div>

        {/* 支付状态提示 */}
        {payStatus !== "idle" && (
          <div className={`mb-8 p-4 rounded-xl text-center font-medium ${
            payStatus === "success" ? "bg-green-50 text-green-700 border border-green-200" :
            payStatus === "error" ? "bg-red-50 text-red-700 border border-red-200" :
            "bg-blue-50 text-blue-700 border border-blue-200"
          }`}>
            {payStatus === "processing" ? "⏳ Processing payment..." : payMessage}
          </div>
        )}

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

              {/* Free 套餐：普通链接按钮 */}
              {plan.paypalId === null && (
                <a
                  href={plan.ctaHref}
                  className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </a>
              )}

              {/* Credits 套餐：档位选择 + PayPal 按钮 */}
              {plan.paypalId === "credits" && (
                <div>
                  <div className="flex gap-2 mb-4">
                    {(["20", "50"] as Pack[]).map((pack) => (
                      <button
                        key={pack}
                        onClick={() => setSelectedPack(pack)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                          selectedPack === pack
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {pack === "20" ? "20 for $2.9" : "50 for $5.9"}
                      </button>
                    ))}
                  </div>
                  <div ref={creditsBtnRef} className="min-h-[45px]">
                    {!sdkLoaded && <div className="text-center text-gray-400 text-sm py-3">Loading payment...</div>}
                  </div>
                </div>
              )}

              {/* Pro 套餐：PayPal 订阅按钮 */}
              {plan.paypalId === "pro" && (
                <div ref={proBtnRef} className="min-h-[45px]">
                  {!sdkLoaded && <div className="text-center text-gray-400 text-sm py-3">Loading payment...</div>}
                </div>
              )}
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
