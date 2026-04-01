"use client";

import { useState, useRef } from "react";

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return "Please upload JPG, PNG, or WebP image";
    }
    if (file.size > maxSize) {
      return "File size must be less than 10MB";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }
    onImageSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 md:p-16 text-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? "border-brand-primary bg-brand-primary/10 scale-[1.02] shadow-glow-brand" 
            : "border-border-default hover:border-brand-primary/50 bg-bg-secondary/40 backdrop-blur-sm"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
        />
        
        <div className="space-y-6">
          {/* 上传图标 */}
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isDragging ? "bg-brand-primary/20 scale-110" : "bg-bg-tertiary"
            }`}>
              <svg className={`w-8 h-8 transition-colors ${isDragging ? "text-brand-primary" : "text-text-secondary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>

          {/* 主提示 */}
          <div>
            <p className="text-text-primary text-lg font-semibold mb-2">
              {isDragging ? "释放以上传" : "拖拽图片到此处"}
            </p>
            <p className="text-text-secondary text-sm">或点击选择文件</p>
          </div>

          {/* 格式标签 */}
          <div className="flex items-center justify-center gap-3">
            {["JPG", "PNG", "WebP"].map((format) => (
              <span key={format} className="px-3 py-1 bg-bg-tertiary border border-border-default rounded-md text-text-secondary text-xs font-medium">
                {format}
              </span>
            ))}
          </div>

          {/* 限制说明 */}
          <p className="text-text-muted text-xs">最大文件大小: 10MB</p>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
        <svg className="w-4 h-4 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>提示: 人物照片效果最佳</span>
      </div>
    </div>
  );
}
