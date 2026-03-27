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
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.name}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {!user ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-6">Sign in to remove backgrounds from your images</p>
            <button
              onClick={() => login()}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-3 mx-auto shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </main>
  );
}
