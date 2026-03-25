"use client";

import { useRef, useState } from "react";

interface Props {
  onAnalyze: (file: File) => void;
  analyzing: boolean;
  progress: number;
  error: string | null;
}

export default function ReceiptInputSection({ onAnalyze, analyzing, progress, error }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
  };

  const clearSelection = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    onAnalyze(selectedFile);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-lg font-bold text-gray-800 mb-4">レシートを読み取る</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col items-center justify-center gap-1 border-2 border-blue-200 bg-blue-50 rounded-xl py-5 text-blue-700 font-medium active:bg-blue-100 transition-colors cursor-pointer">
            <span className="text-3xl">📷</span>
            <span className="text-sm">カメラで撮影</span>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <label className="flex flex-col items-center justify-center gap-1 border-2 border-gray-200 bg-gray-50 rounded-xl py-5 text-gray-600 font-medium active:bg-gray-100 transition-colors cursor-pointer">
            <span className="text-3xl">🖼️</span>
            <span className="text-sm">画像を選択</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {preview && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="プレビュー"
              className="w-full max-h-56 object-contain rounded-xl bg-gray-100"
            />
            {!analyzing && (
              <button
                type="button"
                onClick={clearSelection}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 text-sm leading-none"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* プログレスバー */}
        {analyzing && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>iPhone上でOCR解析中...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center">
              初回は言語データの読み込みで1〜2分かかります
            </p>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="font-medium">エラーが発生しました</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={analyzing || !selectedFile}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {analyzing ? `解析中... ${progress}%` : "OCR解析"}
        </button>
      </form>
    </div>
  );
}
