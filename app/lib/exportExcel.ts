import type { ReceiptWithItems } from "@/types/receipt";

export async function exportToExcel(
  receipts: ReceiptWithItems[],
  from: string,
  to: string
) {
  // Dynamic import (client-side only)
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // ---- シート1: レシート一覧 ----
  const receiptRows = receipts.map((r) => ({
    日付: r.receiptDate ?? "不明",
    店舗名: r.storeName,
    "合計金額（円）": r.totalAmount,
    品目数: r.items.length,
    登録日時: new Date(r.createdAt).toLocaleString("ja-JP"),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(receiptRows),
    "レシート一覧"
  );

  // ---- シート2: 品目一覧 ----
  const itemRows = receipts.flatMap((r) =>
    r.items.map((item) => ({
      日付: r.receiptDate ?? "不明",
      店舗名: r.storeName,
      品目名: item.name,
      数量: item.quantity,
      "単価（円）": item.price,
      "小計（円）": item.price * item.quantity,
    }))
  );
  if (itemRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(itemRows),
      "品目一覧"
    );
  }

  // ---- シート3: 月別集計 ----
  const monthly: Record<string, { count: number; total: number }> = {};
  for (const r of receipts) {
    const m = r.receiptDate?.slice(0, 7) ?? "不明";
    if (!monthly[m]) monthly[m] = { count: 0, total: 0 };
    monthly[m].count++;
    monthly[m].total += r.totalAmount;
  }
  const summaryRows = Object.entries(monthly)
    .sort()
    .map(([month, { count, total }]) => ({
      年月: month,
      件数: count,
      "合計金額（円）": total,
    }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows),
    "月別集計"
  );

  XLSX.writeFile(wb, `レシート集計_${from}_${to}.xlsx`);
}
