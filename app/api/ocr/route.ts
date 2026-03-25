import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { ParsedReceipt } from "@/types/receipt";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            ".envファイルにANTHROPIC_API_KEYが設定されていません。設定後にサーバーを再起動してください。",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
    }

    // Save image to public/uploads/
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    await writeFile(path.join(uploadsDir, fileName), buffer);
    const imageUrl = `/uploads/${fileName}`;

    // Claude Vision OCR
    const base64Image = buffer.toString("base64");
    const mediaType = (file.type || "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    console.log("[OCR] Analyzing:", fileName);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Image },
            },
            {
              type: "text",
              text: `このレシート画像を解析して、以下のJSON形式で情報を抽出してください。
必ずJSONのみを返してください（説明文は不要です）。

{
  "storeName": "店名（不明な場合は「不明」）",
  "receiptDate": "YYYY-MM-DD形式の日付（不明な場合はnull）",
  "totalAmount": 合計金額（数値、円単位、不明な場合は0）,
  "items": [
    { "name": "商品名", "price": 単価（数値）, "quantity": 数量（数値、デフォルト1） }
  ]
}

「合計」「税込合計」「総合計」「お会計」「お支払い」を優先して合計金額として使用してください。`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    console.log("[OCR] Raw response:", responseText.slice(0, 300));

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "OCR解析結果の取得に失敗しました。別の画像でお試しください。" },
        { status: 500 }
      );
    }

    const parsed: ParsedReceipt = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.items)) parsed.items = [];

    console.log("[OCR] Parsed result:", JSON.stringify(parsed));

    return NextResponse.json({ imageUrl, parsed });
  } catch (err) {
    console.error("[OCR] Error:", err);
    const msg = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: `OCR解析エラー: ${msg}` }, { status: 500 });
  }
}
