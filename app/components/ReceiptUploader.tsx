"use client";

import { useState, useRef } from "react";
import type { ReceiptWithItems } from "@/types/receipt";

interface Props {
  onUploadSuccess: (receipt: ReceiptWithItems) => void;
}

export default function ReceiptUploader({ onUploadSuccess }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setError(null);
  };

  const getSelectedFile = () =>
    fileInputRef.current?.files?.[0] ?? cameraInputRef.current?.files?.[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = getSelectedFile();
    if (!file) {
      setError("画像を選択してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/receipts/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "解析に失敗しました");
      }

      const { receipt } = await res.json();
      onUploadSuccess(receipt);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-lg font-bold text-gray-800 mb-4">レシートを読み取る</h2>
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Camera / file buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 border-2 border-blue-200 bg-blue-50 rounded-xl py-5 text-blue-700 font-medium active:bg-blue-100 transition-colors"
          >
            <span className="text-3xl">📷</span>
            <span className="text-sm">カメラで撮影</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 border-2 border-gray-200 bg-gray-50 rounded-xl py-5 text-gray-600 font-medium active:bg-gray-100 transition-colors"
          >
            <span className="text-3xl">🖼️</span>
            <span className="text-sm">画像を選択</span>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Preview */}
        {preview && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="プレビュー"
              className="w-full max-h-56 object-contain rounded-xl bg-gray-100"
            />
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                if (cameraInputRef.current) cameraInputRef.current.value = "";
              }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 text-sm leading-none"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !preview}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block">⏳</span> 解析中...
            </span>
          ) : (
            "OCR解析・保存"
          )}
        </button>
      </form>
    </div>
  );
}
