"use client";

import { useState, useEffect } from "react";
import type { ReceiptWithItems, ParsedItem } from "@/types/receipt";

interface SaveParams {
  storeName: string;
  receiptDate: string | null;
  totalAmount: number;
  imageUrl: string | null;
  items: ParsedItem[];
  rawJson?: string;
}

export function useReceiptHistory() {
  const [receipts, setReceipts] = useState<ReceiptWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/receipts")
      .then((r) => r.json())
      .then(({ receipts }) => setReceipts(receipts ?? []))
      .catch((e) => console.error("[useReceiptHistory] Fetch error:", e))
      .finally(() => setLoading(false));
  }, []);

  const save = async (params: SaveParams): Promise<ReceiptWithItems> => {
    console.log("[useReceiptHistory] Saving:", params.storeName);
    const res = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
    setReceipts((prev) => [data.receipt, ...prev]);
    return data.receipt;
  };

  const remove = async (id: number) => {
    const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("削除に失敗しました");
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  return { receipts, loading, save, remove };
}
