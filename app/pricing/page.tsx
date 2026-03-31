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
      "5 HD downloads / month",
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
    highlight: true,
    badge: "Popular",
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
];

export default function PricingPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [selectedPack, setSelectedPack] = useState<Pack>("20");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [payStatus, setPayStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [payMessage, setPayMessage] = useState("");
  const creditsBtnRef = useRef<HTMLDivElement>(null);

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
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&currency=USD`;
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
              setPayMessage(`✅ ${result.credits_added} credits added! Redirecting to home...`);
              setTimeout(() => {
                window.location.href = "/";
              }, 2000);
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
  }, [sdkLoaded, selectedPack, user]);

  return (
    <main className="min-h-screen bg-tech-black relative overflow-hidden">
      {/* 动态网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(42,42,56,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(42,42,56,0.3)_1px,transparent_1px)] bg-[size:50px_50px] animate-[grid_60s_linear_infinite]" />
      
      {/* 顶部光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-green/10 blur-[120px] rounded-full" />
      
      <div className="container mx-auto px-4 py-16 max-w-6xl relative z-10">

        {/* Header */}
        <div className="text-center mb-20">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-neon-green mb-12 transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to app
          </Link>
          <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">
            Choose <span className="text-neon-green">Your</span> Plan
          </h1>
          <p className="text-gray-400 text-xl">Simple pricing. No hidden fees.</p>
          {!user && (
            <div className="mt-8 inline-flex items-center gap-3 px-6 py-3 bg-electric-orange/10 border border-electric-orange/30 rounded-full text-electric-orange backdrop-blur-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Please <Link href="/" className="underline font-bold hover:text-white transition-colors">sign in</Link> before purchasing</span>
            </div>
          )}
        </div>

        {/* 支付状态提示 */}
        {payStatus !== "idle" && (
          <div className={`mb-10 p-5 rounded-2xl text-center font-semibold backdrop-blur-sm border ${
            payStatus === "success" ? "bg-neon-green/10 text-neon-green border-neon-green/30" :
            payStatus === "error" ? "bg-electric-orange/10 text-electric-orange border-electric-orange/30" :
            "bg-tech-gray/60 text-gray-300 border-border-gray"
          }`}>
            {payStatus === "processing" ? "⏳ Processing payment..." : payMessage}
          </div>
        )}

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 mb-24 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-tech-gray/60 backdrop-blur-xl rounded-3xl p-8 border transition-all duration-300 hover:-translate-y-2 group
                ${plan.highlight ? "border-neon-green/50 shadow-[0_0_40px_rgba(0,255,136,0.2)]" : "border-border-gray hover:border-neon-green/30"}`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-neon-green to-green-400 text-tech-black text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                  🔥 {plan.badge}
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-3">{plan.name}</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 text-lg">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-gray-300 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5 text-neon-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Free 套餐：普通链接按钮 */}
              {plan.paypalId === null && (
                <a
                  href={plan.ctaHref}
                  className="block w-full text-center py-4 rounded-xl font-bold text-white border-2 border-white/20 hover:border-neon-green hover:bg-neon-green/10 transition-all duration-200"
                >
                  {plan.cta}
                </a>
              )}

              {/* Credits 套餐：档位选择 + PayPal 按钮 */}
              {plan.paypalId === "credits" && (
                <div>
                  <div className="flex gap-3 mb-6">
                    {(["20", "50"] as Pack[]).map((pack) => (
                      <button
                        key={pack}
                        onClick={() => setSelectedPack(pack)}
                        className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all duration-200 ${
                          selectedPack === pack
                            ? "border-neon-green bg-neon-green text-tech-black shadow-[0_0_20px_rgba(0,255,136,0.4)]"
                            : "border-border-gray text-gray-400 hover:border-neon-green/50 hover:text-white"
                        }`}
                      >
                        {pack === "20" ? "20 for $2.9" : "50 for $5.9"}
                      </button>
                    ))}
                  </div>
                  <div ref={creditsBtnRef} className="min-h-[45px]">
                    {!sdkLoaded && <div className="text-center text-gray-500 text-sm py-3">Loading payment...</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>
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
                q: "What's the difference between preview and HD?",
                a: "Guests get a small preview image (~500px). Signed-in users get full-resolution HD output.",
              },
              {
                q: "How do I get more downloads?",
                a: "Free users get 5 downloads per month. Need more? Purchase a credits pack that never expires.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-tech-gray/60 backdrop-blur-xl rounded-2xl p-6 border border-border-gray hover:border-neon-green/30 transition-all duration-200">
                <p className="font-bold text-white mb-2 text-lg">{q}</p>
                <p className="text-gray-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
