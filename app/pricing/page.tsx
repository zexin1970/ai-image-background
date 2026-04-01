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
      "Preview quality for guests",
    ],
    cta: "Get Started",
    ctaHref: "/",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    paypalId: null,
    note: "Google sign-in required",
  },
  {
    name: "Credits Pack",
    price: "$2.9",
    period: "起",
    highlight: true,
    badge: "MOST POPULAR",
    features: [
      "Never expires",
      "No subscription needed",
    ],
    cta: "Buy Credits",
    ctaHref: "#credits",
    ctaStyle: "bg-blue-600 text-white hover:bg-blue-700",
    paypalId: "credits",
    note: null,
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
      setSdkLoaded(true);
    };
    script.onerror = () => {
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
    if (!sdkLoaded || !window.paypal) return;

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
          try {
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order_id: data.orderID, user_id: user!.id, pack: selectedPack }),
            });
            const result = await res.json() as { success: boolean; credits_added: number };
            if (result.success) {
              setPayStatus("success");
              setPayMessage(`✅ ${result.credits_added} credits added! Redirecting...`);
              setTimeout(() => {
                window.location.href = "/";
              }, 2000);
            } else {
              setPayStatus("error");
              setPayMessage("Payment failed. Please try again.");
            }
          } catch (error) {
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
        setPayStatus("error");
        setPayMessage("Failed to load payment button");
      }
    }
  }, [sdkLoaded, selectedPack, user]);

  return (
    <main className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* 动态网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(48,54,61,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(48,54,61,0.3)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* 顶部光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-primary/10 blur-[120px] rounded-full" />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10">

        {/* Header - 压缩版 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold text-text-primary">Choose Your Plan</h1>
              <span className="text-text-secondary text-sm">Simple pricing. No hidden fees.</span>
            </div>
            <Link href="/" className="p-2 bg-bg-secondary/60 backdrop-blur-sm border border-border-default rounded-lg hover:border-brand-primary/50 transition-all group">
              <svg className="w-5 h-5 text-text-secondary group-hover:text-brand-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
          
          {/* 警告条 - 右上角浮动 toast */}
          {!user && (
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/30 rounded-lg text-warning backdrop-blur-sm text-sm shadow-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Please <Link href="/" className="underline font-semibold hover:text-text-primary">sign in</Link> first</span>
            </div>
          )}
        </div>

        {/* 支付状态提示 - 行内显示 */}
        {payStatus !== "idle" && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium backdrop-blur-sm border ${
            payStatus === "success" ? "bg-success/10 text-success border-success/30" :
            payStatus === "error" ? "bg-error/10 text-error border-error/30" :
            "bg-bg-secondary/60 text-text-secondary border-border-default"
          }`}>
            {payStatus === "processing" ? "⏳ Processing..." : payMessage}
          </div>
        )}

        {/* Plans - 双卡片并排 */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-bg-secondary/60 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover group
                ${plan.highlight ? "border-brand-primary/50 shadow-glow-brand" : "border-border-default hover:border-brand-primary/30"}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-primary to-brand-light text-bg-primary text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                  🔥 {plan.badge}
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-xl font-bold text-text-primary mb-2">{plan.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                  <span className="text-text-secondary text-base">{plan.period}</span>
                </div>
              </div>

              <div className="border-t border-border-default my-4"></div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-text-secondary text-sm group-hover:text-text-primary transition-colors">
                    <svg className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Credits 套餐：选择数量 */}
              {plan.paypalId === "credits" && (
                <div className="mb-4">
                  <p className="text-text-secondary text-sm mb-2">选择数量:</p>
                  <div className="space-y-2">
                    {(["20", "50"] as Pack[]).map((pack) => (
                      <label key={pack} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pack"
                          value={pack}
                          checked={selectedPack === pack}
                          onChange={() => setSelectedPack(pack)}
                          className="w-4 h-4 text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="text-text-primary text-sm">
                          {pack === "20" ? "20次 - $2.9" : "50次 - $5.9"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Free 套餐：普通按钮 */}
              {plan.paypalId === null && (
                <a
                  href={plan.ctaHref}
                  className="block w-full text-center py-3 rounded-lg font-semibold text-text-primary border-2 border-border-default hover:border-brand-primary hover:bg-brand-primary/10 transition-all duration-200 text-sm"
                >
                  {plan.cta}
                </a>
              )}

              {/* Credits 套餐：PayPal 按钮 */}
              {plan.paypalId === "credits" && (
                <div ref={creditsBtnRef} className="min-h-[45px]">
                  {!sdkLoaded && <div className="text-center text-text-muted text-xs py-3">Loading payment...</div>}
                </div>
              )}

              {/* 底部备注 */}
              {plan.note && (
                <p className="text-text-muted text-xs text-center mt-3">{plan.note}</p>
              )}

              {/* 信任标识 */}
              {plan.paypalId === "credits" && (
                <p className="text-text-muted text-xs text-center mt-3 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  安全支付
                </p>
              )}
            </div>
          ))}
        </div>

        {/* FAQ - 紧凑版 */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">FAQ</h2>
          <div className="space-y-3">
            {[
              { q: "Do credits expire?", a: "No. Credits never expire." },
              { q: "What counts as one download?", a: "Each HD download counts as one." },
              { q: "Preview vs HD?", a: "Guests get ~500px preview. Signed-in users get full HD." },
              { q: "Need more downloads?", a: "Free: 5/month. Buy credits for unlimited." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-bg-secondary/60 backdrop-blur-xl rounded-lg p-4 border border-border-default hover:border-brand-primary/30 transition-all duration-200">
                <p className="font-semibold text-text-primary mb-1 text-sm">{q}</p>
                <p className="text-text-secondary text-xs leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
