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

export default function Home() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 拉取用量信息
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

          // 保存用户到数据库
          fetch("/api/save-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userInfo),
          });

          // 拉取用量
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
      // T02: 登录用户携带 X-User-Id，游客不传 → worker 据此决定返回质量
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

  // T06: 下载前调 /api/download 检查额度
  const handleDownload = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (res.status === 402) {
        // 超额 → 弹升级弹窗
        setShowUpgradeModal(true);
        return;
      }

      if (!res.ok) {
        alert("Download failed. Please try again.");
        return;
      }

      // 通过额度检查，触发下载
      const a = document.createElement("a");
      a.href = processedUrl;
      a.download = `${selectedFile?.name.replace(/\.[^/.]+$/, "")}_removed_bg.png`;
      a.click();

      // 刷新用量显示
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">AI Background Remover</h1>

          <div className="flex items-center gap-3">
            {/* T13: Pricing 链接 */}
            <a href="/pricing" className="text-sm text-gray-500 hover:text-blue-600 hidden sm:block">
              Pricing
            </a>

            {user ? (
              <>
                {/* T09: 用量进度条 */}
                {usage && usage.limit !== null && (
                  <UsageBar
                    used={usage.used}
                    limit={usage.limit}
                    plan={usage.plan}
                    credits={usage.credits}
                  />
                )}
                <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => login()}
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-gray-600 mb-8 md:mb-12 text-sm md:text-base">
          Remove background from your images in seconds
        </p>

        {/* 主功能区 */}
        {!selectedFile ? (
          <ImageUploader onImageSelect={handleImageSelect} />
        ) : isProcessing ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Processing your image...</p>
          </div>
        ) : (
          <>
            <ImageCompare
              originalUrl={previewUrl}
              processedUrl={processedUrl}
              onDownload={handleDownload}
              onReset={handleReset}
            />
            {/* 游客提示：结果为预览图 */}
            {!user && processedUrl && (
              <p className="text-center text-xs text-gray-400 mt-3">
                Preview quality ·{" "}
                <button
                  onClick={() => setShowLoginPrompt(true)}
                  className="text-blue-500 hover:underline"
                >
                  Sign in for free HD downloads
                </button>
              </p>
            )}
          </>
        )}

        {/* T11: 游客登录引导弹窗（优化版文案） */}
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md mx-4 shadow-xl">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">✨</div>
                <h2 className="text-xl font-bold text-gray-900">Get free HD downloads</h2>
                <p className="text-gray-500 mt-2 text-sm">
                  Sign in with Google — it&apos;s free. <br />
                  Get <span className="font-semibold text-blue-600">20 HD downloads/month</span>, no watermark.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLoginPrompt(false);
                    // 游客选择跳过登录，直接下载预览图（低清）
                    if (processedUrl) {
                      const a = document.createElement("a");
                      a.href = processedUrl;
                      a.download = `${selectedFile?.name.replace(/\.[^/.]+$/, "") ?? "image"}_removed_bg.png`;
                      a.click();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                >
                  Maybe later
                </button>
                <button
                  onClick={() => login()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Sign in with Google
                </button>
              </div>
            </div>
          </div>
        )}

        {/* T07: 超额升级弹窗 */}
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
