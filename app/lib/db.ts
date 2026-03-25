"use client";

/**
 * iPhone のブラウザ（IndexedDB）にデータを保存する
 * サーバー不要・オフライン動作
 */
import { openDB } from "idb";
import type { ReceiptWithItems, ParsedItem } from "@/types/receipt";

const DB_NAME = "receipt-app";
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore("receipts", {
        keyPath: "id",
        autoIncrement: true,
      });
      store.createIndex("createdAt", "createdAt");
    },
  });
}

export async function getAllReceipts(): Promise<ReceiptWithItems[]> {
  const db = await getDB();
  const records = await db.getAll("receipts");
  return records
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
}

export async function saveReceipt(params: {
  storeName: string;
  receiptDate: string | null;
  totalAmount: number;
  imageUrl: string | null;
  items: ParsedItem[];
  rawJson: string;
}): Promise<ReceiptWithItems> {
  const db = await getDB();
  const record = {
    ...params,
    createdAt: new Date().toISOString(),
    items: params.items.map((item, i) => ({ ...item, id: i + 1 })),
  };
  const id = (await db.add("receipts", record)) as number;
  return { ...record, id, createdAt: new Date(record.createdAt) };
}

export async function deleteReceipt(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("receipts", id);
}
