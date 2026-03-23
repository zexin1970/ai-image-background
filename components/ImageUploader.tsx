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
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 md:p-12 text-center cursor-pointer transition ${
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
      <div className="text-gray-600">
        <p className="text-base md:text-lg mb-2">Click or drag image here</p>
        <p className="text-xs md:text-sm">JPG, PNG, WebP (max 10MB)</p>
      </div>
    </div>
  );
}