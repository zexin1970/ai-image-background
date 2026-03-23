"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ImageCompare from "@/components/ImageCompare";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-3 md:mb-4">
          AI Background Remover
        </h1>
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
      </div>
    </main>
  );
}
