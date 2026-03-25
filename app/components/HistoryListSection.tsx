"use client";

import type { ReceiptWithItems } from "@/types/receipt";
import ReceiptCard from "./ReceiptCard";

interface Props {
  receipts: ReceiptWithItems[];
  loading: boolean;
  onDelete: (id: number) => void;
}

export default function HistoryListSection({ receipts, loading, onDelete }: Props) {
  return (
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
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin text-3xl mb-2">⏳</div>
          読み込み中...
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-sm">
          <p className="text-4xl mb-3">🧾</p>
          <p className="font-medium">まだ履歴がありません</p>
          <p className="text-sm mt-1">レシートを読み取って始めましょう</p>
        </div>
      ) : (
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <ReceiptCard key={receipt.id} receipt={receipt} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
