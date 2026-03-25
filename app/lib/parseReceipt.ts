import type { ParsedReceipt, ParsedItem } from "@/types/receipt";

/**
 * Tesseract OCR の生テキストからレシート情報を抽出する
 * サーバー・クライアント両方から使用可能
 */
export function parseReceiptText(raw: string): ParsedReceipt {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // ---- 合計金額 ----
  let totalAmount = 0;
  const totalKeywords = [
    "合計", "税込合計", "総合計", "お会計", "お支払", "合  計", "ごうけい",
  ];
  for (const line of lines) {
    if (totalKeywords.some((kw) => line.includes(kw))) {
      const m = line.match(/(\d[\d,]+)/);
      if (m) {
        totalAmount = parseInt(m[1].replace(/,/g, ""), 10);
        break;
      }
    }
  }
  // フォールバック: レシート内の最大金額
  if (totalAmount === 0) {
    let max = 0;
    for (const line of lines) {
      for (const m of line.matchAll(/(\d[\d,]{2,})/g)) {
        const v = parseInt(m[1].replace(/,/g, ""), 10);
        if (v > max && v < 999_999) max = v;
      }
    }
    totalAmount = max;
  }

  // ---- 日付 ----
  let receiptDate: string | null = null;
  for (const line of lines) {
    const m1 = line.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
    if (m1) {
      receiptDate = `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;
      break;
    }
    const m2 = line.match(/^(\d{2})\/(\d{1,2})\/(\d{1,2})$/);
    if (m2) {
      receiptDate = `20${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
      break;
    }
  }

  // ---- 店舗名: 先頭の意味ある行 ----
  let storeName = "不明";
  for (const line of lines) {
    if (line.length >= 2 && !/^[\d\s\-\/年月日時:,.]+$/.test(line)) {
      storeName = line;
      break;
    }
  }

  // ---- 品目: "商品名 金額" 形式の行 ----
  const items: ParsedItem[] = [];
  const skipRe =
    /合計|小計|税|値引|割引|おつり|お預|ポイント|レシート|領収|電話|住所|TEL/;
  for (const line of lines) {
    if (skipRe.test(line)) continue;
    const m = line.match(/^(.+?)\s{1,}(\d[\d,]*)\s*$/);
    if (m) {
      const name = m[1].trim();
      const price = parseInt(m[2].replace(/,/g, ""), 10);
      if (name.length >= 1 && price > 0 && price < totalAmount * 1.5 + 1) {
        items.push({ name, price, quantity: 1 });
      }
    }
  }

  return { storeName, receiptDate, totalAmount, items };
}
