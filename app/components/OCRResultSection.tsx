"use client";

import { useState } from "react";
import type { ParsedReceipt, ParsedItem } from "@/types/receipt";

interface Props {
  parsed: ParsedReceipt;
  imageUrl: string | null;
  onSave: (data: ParsedReceipt, imageUrl: string | null) => Promise<void>;
  onCancel: () => void;
}

export default function OCRResultSection({ parsed, imageUrl, onSave, onCancel }: Props) {
  const [storeName, setStoreName] = useState(parsed.storeName);
  const [receiptDate, setReceiptDate] = useState(parsed.receiptDate ?? "");
  const [totalAmount, setTotalAmount] = useState(parsed.totalAmount);
  const [items, setItems] = useState<ParsedItem[]>(parsed.items);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof ParsedItem, value: string | number) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(
        { storeName, receiptDate: receiptDate || null, totalAmount, items },
        imageUrl
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <p className="font-bold text-green-700 text-lg">保存しました！</p>
        <p className="text-sm text-green-600 mt-1">履歴に追加されました</p>
        <button onClick={onCancel} className="mt-4 text-sm text-green-600 underline">
          新しいレシートを読み取る
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">解析結果を確認</h2>
        <button onClick={onCancel} className="text-sm text-gray-400 underline">
          やり直す
        </button>
      </div>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="レシート"
          className="w-full max-h-40 object-contain rounded-xl bg-gray-100"
        />
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">店舗名</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">日付</label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">合計（円）</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">品目（タップで編集）</p>
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                />
                <span className="text-gray-300 text-xs shrink-0">×</span>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  className="w-8 bg-transparent text-sm text-center focus:outline-none shrink-0"
                />
                <span className="text-gray-300 text-xs shrink-0">¥</span>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => updateItem(i, "price", Number(e.target.value))}
                  className="w-16 bg-transparent text-sm text-right focus:outline-none shrink-0"
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-gray-300 hover:text-red-400 shrink-0 text-base leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-colors"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </div>
  );
}
