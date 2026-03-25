import type { ParsedReceipt, ParsedItem } from "@/types/receipt";

/**
 * 全角英数字・記号を半角に正規化する
 * OCR が全角文字を出力することがあるため
 */
function normalizeFullWidth(text: string): string {
  return text
    .replace(/[Ａ-Ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[　]/g, " ") // 全角スペース → 半角
    .replace(/[￥¥]/g, "¥"); // 円記号の統一
}

/**
 * OCR でよくある誤読を補正する
 * 数字文脈での O→0, l/I→1 など
 */
function fixOcrNumbers(text: string): string {
  // 数字っぽい文字列内の誤読文字を補正
  return text
    .replace(/(\d)[Oo](\d)/g, "$10$2") // 数字に挟まれたO→0
    .replace(/(\d)[lI](\d)/g, "$11$2") // 数字に挟まれたl/I→1
    .replace(/¥\s*([Oo])(\d)/g, "¥0$2") // ¥の後のO→0
    .replace(/(\d)\s{0,1},\s{0,1}(\d{3})/g, "$1,$2"); // 数字区切りのスペース除去
}

/**
 * Tesseract OCR の生テキストからレシート情報を抽出する
 * サーバー・クライアント両方から使用可能
 */
export function parseReceiptText(raw: string): ParsedReceipt {
  // 全角→半角 + OCR誤読補正
  const normalized = fixOcrNumbers(normalizeFullWidth(raw));

  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // ---- 合計金額 ----
  let totalAmount = 0;
  const totalKeywords = [
    "合計", "税込合計", "総合計", "お会計", "お支払", "合  計",
    "ごうけい", "お買上", "請求金額", "お客様合計", "税込",
  ];
  for (const line of lines) {
    if (totalKeywords.some((kw) => line.includes(kw))) {
      // ¥マーク付きも対応: ¥1,234 または 1234 または 1,234
      const m = line.match(/[¥￥]?\s*(\d[\d,\s]*\d|\d)/);
      if (m) {
        const v = parseInt(m[1].replace(/[,\s]/g, ""), 10);
        if (v > totalAmount) totalAmount = v;
      }
    }
  }

  // フォールバック: レシート内の最大金額（999円以上）
  if (totalAmount === 0) {
    let max = 0;
    for (const line of lines) {
      for (const m of line.matchAll(/(\d[\d,]{2,})/g)) {
        const v = parseInt(m[1].replace(/,/g, ""), 10);
        if (v > max && v >= 100 && v < 999_999) max = v;
      }
    }
    totalAmount = max;
  }

  // ---- 日付 ----
  let receiptDate: string | null = null;
  for (const line of lines) {
    // YYYY年MM月DD日 / YYYY/MM/DD / YYYY-MM-DD
    const m1 = line.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
    if (m1) {
      receiptDate = `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;
      break;
    }
    // YY/MM/DD (26/03/25 など)
    const m2 = line.match(/^(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m2) {
      receiptDate = `20${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
      break;
    }
    // MM/DD (月/日 だけの場合、現在年を補完)
    const m3 = line.match(/^(\d{1,2})\/(\d{1,2})\s/);
    if (m3 && !receiptDate) {
      const year = new Date().getFullYear();
      receiptDate = `${year}-${m3[1].padStart(2, "0")}-${m3[2].padStart(2, "0")}`;
      // breakしない（より正確な日付が後に出る可能性あり）
    }
  }

  // ---- 店舗名: 先頭の意味ある行 ----
  let storeName = "不明";
  for (const line of lines) {
    // 数字・記号だけの行はスキップ
    if (line.length >= 2 && !/^[\d\s\-\/年月日時:,.()\[\]＊*#\|]+$/.test(line)) {
      storeName = line.replace(/^[　\s]+|[　\s]+$/g, ""); // 前後の空白除去
      break;
    }
  }

  // ---- 品目: "商品名 金額" 形式の行 ----
  const items: ParsedItem[] = [];
  const skipRe =
    /合計|小計|税|値引|割引|おつり|お預|ポイント|レシート|領収|電話|住所|TEL|FAX|営業|ありがとう|またのお越し|担当|レジ|会員/;

  for (const line of lines) {
    if (skipRe.test(line)) continue;

    // パターン1: "商品名    1,234" (末尾に金額)
    const m1 = line.match(/^(.+?)\s{1,}(\d[\d,]*)\s*$/);
    if (m1) {
      const name = m1[1].trim();
      const price = parseInt(m1[2].replace(/,/g, ""), 10);
      if (
        name.length >= 1 &&
        price >= 10 &&
        (totalAmount === 0 || price <= totalAmount * 1.5 + 1)
      ) {
        items.push({ name, price, quantity: 1 });
        continue;
      }
    }

    // パターン2: "1 商品名    1,234" (先頭に数量)
    const m2 = line.match(/^(\d+)\s+(.+?)\s{1,}(\d[\d,]*)\s*$/);
    if (m2) {
      const qty = parseInt(m2[1], 10);
      const name = m2[2].trim();
      const price = parseInt(m2[3].replace(/,/g, ""), 10);
      if (
        name.length >= 1 &&
        price >= 10 &&
        qty >= 1 &&
        qty <= 99 &&
        (totalAmount === 0 || price <= totalAmount * 1.5 + 1)
      ) {
        items.push({ name, price, quantity: qty });
      }
    }
  }

  return { storeName, receiptDate, totalAmount, items };
}
