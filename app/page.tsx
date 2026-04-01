"use client";

import { useState, useEffect, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import ImageUploader from "@/components/ImageUploader";
import ImageCompare from "@/components/ImageCompare";
import UpgradeModal from "@/components/UpgradeModal";
import UsageBar from "@/components/UsageBar";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface UsageInfo {
  plan: string;
  used: number;
  limit: number | null;
  credits: number | null;
}

const GUEST_MONTHLY_LIMIT = 3;

function getGuestUsage(): { count: number; month: string } {
  try {
    const raw = localStorage.getItem("guest_usage");
    if (raw) return JSON.parse(raw) as { count: number; month: string };
  } catch {}
  return { count: 0, month: "" };
}

function incrementGuestUsage(): number {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const prev = getGuestUsage();
  const count = prev.month === currentMonth ? prev.count + 1 : 1;
  localStorage.setItem("guest_usage", JSON.stringify({ count, month: currentMonth }));
  return count;
}

function getRemainingGuestDownloads(): number {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { count, month } = getGuestUsage();
  const used = month === currentMonth ? count : 0;
  return Math.max(0, GUEST_MONTHLY_LIMIT - used);
}

export default function Home() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchUsage = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/usage?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json() as UsageInfo;
        setUsage(data);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const u = JSON.parse(savedUser) as UserInfo;
      setUser(u);
      fetchUsage(u.id);
    }
  }, [fetchUsage]);

  const login = useGoogleLogin({
    onSuccess: (response) => {
      fetch(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${response.access_token}`
      )
        .then((res) => res.json())
        .then((data: unknown) => {
          const userInfo = data as UserInfo;
          setUser(userInfo);
          localStorage.setItem("user", JSON.stringify(userInfo));
          setShowLoginPrompt(false);

          fetch("/api/save-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userInfo),
          });

          fetchUsage(userInfo.id);
        });
    },
  });

  const handleImageSelect = async (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsProcessing(true);
    setProcessedUrl("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const headers: HeadersInit = {};
      if (user?.id) {
        headers["X-User-Id"] = user.id;
      }

      const response = await fetch(
        "https://ai-image-bg-api.dlan.workers.dev/api/remove-bg",
        { method: "POST", headers, body: formData }
      );

      if (response.ok) {
        const blob = await response.blob();
        setProcessedUrl(URL.createObjectURL(blob));

        if (user?.id) {
          fetch("/api/log-usage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, action: "remove_background" }),
          });
        }
      } else {
        alert("Failed to process image. Please try again.");
      }
    } catch {
      alert("Network error. Please check your connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      const remaining = getRemainingGuestDownloads();
      if (remaining <= 0) {
        setGuestLimitReached(true);
        setShowLoginPrompt(true);
      } else {
        setGuestLimitReached(false);
        setShowLoginPrompt(true);
      }
      return;
    }

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (res.status === 402) {
        setShowUpgradeModal(true);
        return;
      }

      if (!res.ok) {
        alert("Download failed. Please try again.");
        return;
      }

      const a = document.createElement("a");
      a.href = processedUrl;
      a.download = `${selectedFile?.name.replace(/\.[^/.]+$/, "")}_removed_bg.png`;
      a.click();

      fetchUsage(user.id);
    } catch {
      alert("Download failed. Please try again.");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setProcessedUrl("");
  };

  const handleSignOut = () => {
    setUser(null);
    setUsage(null);
    localStorage.removeItem("user");
  };

  return (
    <main className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* 动态网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(48,54,61,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(48,54,61,0.3)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* 顶部光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-primary/10 blur-[120px] rounded-full" />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl relative z-10">

        {/* Header - 增强导航 */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            AI <span className="text-brand-primary">Background</span> Remover
          </h1>

          <div className="flex items-center gap-4">
            <a href="/pricing" className="text-sm text-text-secondary hover:text-brand-primary transition-colors hidden sm:block">
              Pricing
            </a>

            {user ? (
              <>
                {usage && (usage.limit !== null || usage.credits !== null) && (
                  <UsageBar
                    used={usage.used}
                    limit={usage.limit ?? 0}
                    plan={usage.plan}
                    credits={usage.credits}
                  />
                )}
                <span className="text-sm text-text-primary hidden sm:block">{user.name}</span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-sm bg-bg-secondary/60 backdrop-blur-sm text-text-primary hover:bg-bg-tertiary border border-border-default rounded-lg transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => login()}
                className="px-4 py-2 text-sm bg-brand-primary text-bg-primary hover:shadow-glow-brand rounded-lg font-bold transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-10 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4 leading-tight">
            Remove backgrounds<br />in <span className="text-brand-primary">seconds</span>
          </h2>
          <p className="text-text-secondary text-lg">
            AI-powered. No design skills needed.
          </p>
        </div>

        {/* 主功能区 */}
        {!selectedFile ? (
          <ImageUploader onImageSelect={handleImageSelect} />
        ) : isProcessing ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-text-primary text-lg font-semibold">Processing your image...</p>
              <p className="text-text-secondary text-sm mt-2">AI is removing the background</p>
            </div>
          </div>
        ) : (
          <>
            <ImageCompare
              originalUrl={previewUrl}
              processedUrl={processedUrl}
              onDownload={handleDownload}
              onReset={handleReset}
            />
            {!user && processedUrl && (
              <p className="text-center text-sm text-text-muted mt-4">
                Preview quality ·{" "}
                <button
                  onClick={() => setShowLoginPrompt(true)}
                  className="text-brand-primary hover:underline font-semibold"
                >
                  Sign in for free HD downloads
                </button>
              </p>
            )}
          </>
        )}

        {/* 登录引导弹窗 */}
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-bg-secondary/90 backdrop-blur-xl border border-border-default rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">{guestLimitReached ? "🔒" : "✨"}</div>
                <h2 className="text-2xl font-bold text-text-primary mb-3">
                  {guestLimitReached ? "Free downloads used up" : "Get free HD downloads"}
                </h2>
                <p className="text-text-secondary leading-relaxed">
                  {guestLimitReached ? (
                    <>You&apos;ve used all {GUEST_MONTHLY_LIMIT} free guest downloads this month.<br />Sign in to get <span className="text-brand-primary font-semibold">5 HD downloads/month</span> for free.</>
                  ) : (
                    <>Sign in with Google — it&apos;s free. <br />
                    Get <span className="text-brand-primary font-semibold">5 HD downloads/month</span>, no watermark.</>
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                {!guestLimitReached && (
                  <button
                    onClick={() => {
                      setShowLoginPrompt(false);
                      if (processedUrl) {
                        incrementGuestUsage();
                        const a = document.createElement("a");
                        a.href = processedUrl;
                        a.download = `${selectedFile?.name.replace(/\.[^/.]+$/, "") ?? "image"}_removed_bg.png`;
                        a.click();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-tertiary text-sm transition-all"
                  >
                    Maybe later ({getRemainingGuestDownloads()} left)
                  </button>
                )}
                {guestLimitReached && (
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="flex-1 px-4 py-2.5 border border-border-default rounded-lg text-text-secondary hover:bg-bg-tertiary text-sm transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => login()}
                  className="flex-1 px-4 py-2.5 bg-brand-primary text-bg-primary rounded-lg hover:shadow-glow-brand font-medium text-sm transition-all"
                >
                  Sign in with Google
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 超额升级弹窗 */}
        {showUpgradeModal && usage && (
          <UpgradeModal
            used={usage.used}
            limit={usage.limit ?? 20}
            onClose={() => setShowUpgradeModal(false)}
          />
        )}
      </div>
    </main>
  );
}
