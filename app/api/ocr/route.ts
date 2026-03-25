import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY が設定されていません。.env.local に追加してください。" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
    }

    // ---- 画像を保存 ----
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    await writeFile(path.join(uploadsDir, fileName), buffer);
    const imageUrl = `/uploads/${fileName}`;

    // ---- Base64変換 ----
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // ---- GPT-4o-mini Vision でレシート解析 ----
    console.log("[OCR] Calling GPT-4o-mini for:", fileName);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `このレシート画像から情報を抽出し、以下のJSON形式のみで回答してください。
説明文やマークダウンは不要です。JSONだけ返してください。

{
  "storeName": "店舗名",
  "receiptDate": "YYYY-MM-DD",
  "totalAmount": 合計金額の数値,
  "items": [
    {"name": "商品名", "price": 単価, "quantity": 数量}
  ]
}

ルール:
- storeName: レシート上部の店名
- receiptDate: 日付をYYYY-MM-DD形式で。不明なら null
- totalAmount: 「合計」「税込合計」「お会計」等の金額（数値、円記号なし）
- items: 各商品の名前・単価・数量。小計/税/割引行は除外
- 金額はすべて整数（円単位）`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[OCR] OpenAI API error:", response.status, errBody);
      return NextResponse.json(
        { error: `OpenAI API エラー (${response.status})` },
        { status: 500 }
      );
    }

    const result = await response.json();
    const content: string = result.choices?.[0]?.message?.content || "";
    console.log("[OCR] GPT response:", content);

    // JSON部分を抽出（```json ... ``` でラップされている場合も対応）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "GPTからのレスポンスを解析できませんでした" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 型を正規化
    const receipt = {
      storeName: String(parsed.storeName || "不明"),
      receiptDate: parsed.receiptDate || null,
      totalAmount: Number(parsed.totalAmount) || 0,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item: { name?: string; price?: number; quantity?: number }) => ({
            name: String(item.name || ""),
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
          }))
        : [],
    };

    console.log("[OCR] Parsed receipt:", JSON.stringify(receipt));
    return NextResponse.json({ imageUrl, parsed: receipt });
  } catch (err) {
    console.error("[OCR] Error:", err);
    const msg = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: `OCR解析エラー: ${msg}` }, { status: 500 });
  }
}
