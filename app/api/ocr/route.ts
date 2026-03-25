import { NextRequest, NextResponse } from "next/server";
import Tesseract from "tesseract.js";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { ParsedReceipt, ParsedItem } from "@/types/receipt";

// ----------------------------------------------------------------
// Parse raw OCR text into structured receipt data
// ----------------------------------------------------------------
function parseReceiptText(raw: string): ParsedReceipt {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // --- Total amount ---
  let totalAmount = 0;
  const totalKeywords = ["合計", "税込合計", "総合計", "お会計", "お支払", "合  計", "ごうけい"];
  for (const line of lines) {
    if (totalKeywords.some((kw) => line.includes(kw))) {
      const m = line.match(/(\d[\d,]+)/);
      if (m) {
        totalAmount = parseInt(m[1].replace(/,/g, ""), 10);
        break;
      }
    }
  }
  // Fallback: largest plausible number on the receipt
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

  // --- Date ---
  let receiptDate: string | null = null;
  for (const line of lines) {
    // 2024年12月31日 / 2024/12/31 / 2024-12-31
    const m1 = line.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
    if (m1) {
      receiptDate = `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;
      break;
    }
    // 24/12/31
    const m2 = line.match(/^(\d{2})\/(\d{1,2})\/(\d{1,2})$/);
    if (m2) {
      receiptDate = `20${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
      break;
    }
  }

  // --- Store name: first line that isn't purely digits / dates ---
  let storeName = "不明";
  for (const line of lines) {
    if (line.length >= 2 && !/^[\d\s\-\/年月日時:,.]+$/.test(line)) {
      storeName = line;
      break;
    }
  }

  // --- Items: lines matching "<name>  <price>" ---
  const items: ParsedItem[] = [];
  const skipRe = /合計|小計|税|値引|割引|おつり|お預|ポイント|レシート|領収|電話|住所|TEL/;
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

// ----------------------------------------------------------------
// API route
// ----------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
    }

    // Save uploaded image
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    await writeFile(path.join(uploadsDir, fileName), buffer);
    const imageUrl = `/uploads/${fileName}`;

    // Tesseract OCR (Japanese + English for numbers)
    console.log("[OCR] Starting Tesseract for:", fileName);
    const langCachePath = path.join(process.cwd(), ".tesseract-cache");

    const { data } = await Tesseract.recognize(buffer, "jpn", {
      cachePath: langCachePath,
      logger: (m) => {
        if (m.status === "recognizing text") {
          process.stdout.write(`\r[OCR] ${Math.round(m.progress * 100)}%`);
        }
      },
    } as Parameters<typeof Tesseract.recognize>[2]);

    console.log("\n[OCR] Raw text:\n", data.text.slice(0, 600));

    const parsed: ParsedReceipt = parseReceiptText(data.text);
    console.log("[OCR] Parsed:", JSON.stringify(parsed));

    return NextResponse.json({ imageUrl, parsed });
  } catch (err) {
    console.error("[OCR] Error:", err);
    const msg = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: `OCR解析エラー: ${msg}` }, { status: 500 });
  }
}
