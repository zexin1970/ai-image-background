"use client";

import { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import ImageUploader from "@/components/ImageUploader";
import ImageCompare from "@/components/ImageCompare";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: (response) => {
      fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${response.access_token}`)
        .then((res) => res.json())
        .then((data) => {
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
          setShowLoginPrompt(false);
          
          // 保存到数据库
          fetch('/api/save-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        });
    },
  });

  const handleImageSelect = async (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("https://ai-image-bg-api.dlan.workers.dev/api/remove-bg", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        setProcessedUrl(URL.createObjectURL(blob));
        
        // 记录使用日志
        if (user?.id) {
          fetch('/api/log-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, action: 'remove_background' })
          });
        }
      } else {
        alert("Failed to process image");
      }
    } catch (error) {
      alert("Error processing image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${selectedFile?.name.replace(/\.[^/.]+$/, "")}_removed_bg.png`;
    a.click();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setProcessedUrl("");
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">
            AI Background Remover
          </h1>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.name}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => login()}
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
            >
              Sign In
            </button>
          )}
        </div>

        <p className="text-center text-gray-600 mb-8 md:mb-12 text-sm md:text-base">
          Remove background from your images in seconds
        </p>

            {!selectedFile ? (
              <ImageUploader onImageSelect={handleImageSelect} />
            ) : isProcessing ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing your image...</p>
              </div>
            ) : (
              <ImageCompare
                originalUrl={previewUrl}
                processedUrl={processedUrl}
                onDownload={handleDownload}
                onReset={handleReset}
              />
            )}

        {/* 登录提示弹窗 */}
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Sign in to download</h2>
              <p className="text-gray-600 mb-6">Please sign in with Google to download your processed image.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => login()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
