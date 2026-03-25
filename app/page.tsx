"use client";

import { useEffect, useState } from "react";
import ReceiptUploader from "./components/ReceiptUploader";
import ReceiptCard from "./components/ReceiptCard";
import InstallBanner from "./components/InstallBanner";
import type { ReceiptWithItems } from "@/types/receipt";

export default function Home() {
  const [receipts, setReceipts] = useState<ReceiptWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/receipts")
      .then((r) => r.json())
      .then(({ receipts }) => setReceipts(receipts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleUploadSuccess = (receipt: ReceiptWithItems) => {
    setReceipts((prev) => [receipt, ...prev]);
  };

  const handleDelete = (id: number) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  const totalSpending = receipts.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-safe">
      <InstallBanner />
      <header className="bg-white shadow-sm sticky top-0 z-10 pt-safe">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">レシート管理</h1>
            <p className="text-xs text-gray-400">OCRで自動解析・記録</p>
          </div>
          {receipts.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">合計支出</p>
              <p className="text-lg font-bold text-gray-800">
                ¥{totalSpending.toLocaleString("ja-JP")}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <ReceiptUploader onUploadSuccess={handleUploadSuccess} />

        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">
            履歴
            {receipts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {receipts.length}件
              </span>
            )}
          </h2>

          {loading ? (
            <div className="text-center py-12 text-gray-400">読み込み中...</div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-sm">
              <p className="text-4xl mb-3">🧾</p>
              <p>まだレシートがありません</p>
              <p className="text-sm mt-1">上からアップロードして始めましょう</p>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <ReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
