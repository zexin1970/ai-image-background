"use client";

interface ImageCompareProps {
  originalUrl: string;
  processedUrl: string;
  onDownload: () => void;
  onReset: () => void;
}

export default function ImageCompare({ originalUrl, processedUrl, onDownload, onReset }: ImageCompareProps) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Original</p>
          <img src={originalUrl} alt="Original" className="w-full rounded-lg shadow-lg" />
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Background Removed</p>
          <div className="relative rounded-lg shadow-lg overflow-hidden" style={{ backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 50% / 20px 20px' }}>
            <img src={processedUrl} alt="Processed" className="w-full" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button onClick={onReset} className="flex-1 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">
          Upload New
        </button>
        <button onClick={onDownload} className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          Download PNG
        </button>
      </div>
    </div>
  );
}
