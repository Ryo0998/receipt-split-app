"use client";

import { useState, useEffect } from "react";
import { getAllReceipts, saveReceipt, deleteReceipt } from "@/app/lib/db";
import type { ReceiptWithItems, ParsedItem } from "@/types/receipt";

interface SaveParams {
  storeName: string;
  receiptDate: string | null;
  totalAmount: number;
  imageUrl: string | null;
  items: ParsedItem[];
  rawJson?: string;
}

/**
 * iPhone の IndexedDB を使ってレシート履歴を管理する
 * サーバー不要・オフライン動作
 */
export function useReceiptHistory() {
  const [receipts, setReceipts] = useState<ReceiptWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllReceipts()
      .then(setReceipts)
      .catch((e) => console.error("[useReceiptHistory] Load error:", e))
      .finally(() => setLoading(false));
  }, []);

  const save = async (params: SaveParams): Promise<ReceiptWithItems> => {
    const receipt = await saveReceipt({
      ...params,
      rawJson: params.rawJson ?? "{}",
    });
    setReceipts((prev) => [receipt, ...prev]);
    return receipt;
  };

  const remove = async (id: number) => {
    await deleteReceipt(id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  return { receipts, loading, save, remove };
}
