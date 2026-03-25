"use client";

import { useState } from "react";
import type { ReceiptWithItems } from "@/types/receipt";

interface Props {
  receipt: ReceiptWithItems;
  onDelete: (id: number) => void;
}

export default function ReceiptCard({ receipt, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("このレシートを削除しますか？")) return;
    setDeleting(true);
    try {
      await fetch(`/api/receipts/${receipt.id}`, { method: "DELETE" });
      onDelete(receipt.id);
    } finally {
      setDeleting(false);
    }
  };

  const formattedDate = receipt.receiptDate ?? "日付不明";
  const formattedAmount = receipt.totalAmount.toLocaleString("ja-JP");

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{receipt.storeName}</h3>
            <p className="text-sm text-gray-500">{formattedDate}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-blue-600">¥{formattedAmount}</p>
            <p className="text-xs text-gray-400">{receipt.items.length}品目</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-sm text-blue-600 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
          >
            {expanded ? "▲ 閉じる" : "▼ 品目を見る"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-400 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? "..." : "削除"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="px-5 py-3">
            {receipt.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={receipt.imageUrl}
                alt="レシート画像"
                className="w-full max-h-48 object-contain rounded-lg mb-3"
              />
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-200">
                  <th className="text-left pb-1">品目</th>
                  <th className="text-center pb-1">数量</th>
                  <th className="text-right pb-1">金額</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 text-gray-700">{item.name}</td>
                    <td className="py-1.5 text-center text-gray-500">×{item.quantity}</td>
                    <td className="py-1.5 text-right font-medium text-gray-800">
                      ¥{(item.price * item.quantity).toLocaleString("ja-JP")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-2 text-sm font-bold text-gray-600">合計</td>
                  <td className="pt-2 text-right font-bold text-blue-600">¥{formattedAmount}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
