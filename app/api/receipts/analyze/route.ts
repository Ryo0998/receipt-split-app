import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import type { ParsedReceipt } from "@/types/receipt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
    }

    // Save uploaded image
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(process.cwd(), "public", "uploads", fileName);
    await writeFile(filePath, buffer);
    const imageUrl = `/uploads/${fileName}`;

    // Send to Claude Vision for OCR analysis
    const base64Image = buffer.toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `このレシート画像を解析して、以下のJSON形式で情報を抽出してください。
必ずJSONのみを返してください（説明文は不要です）。

{
  "storeName": "店名",
  "receiptDate": "YYYY-MM-DD形式の日付（不明な場合はnull）",
  "totalAmount": 合計金額（数値、円単位）,
  "items": [
    {
      "name": "商品名",
      "price": 単価（数値）,
      "quantity": 数量（数値、デフォルト1）
    }
  ]
}`,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "OCR解析に失敗しました" }, { status: 500 });
    }

    const parsed: ParsedReceipt = JSON.parse(jsonMatch[0]);

    // Save to DB
    const receipt = await prisma.receipt.create({
      data: {
        storeName: parsed.storeName,
        receiptDate: parsed.receiptDate ?? null,
        totalAmount: parsed.totalAmount,
        imageUrl,
        rawJson: JSON.stringify(parsed),
        items: {
          create: parsed.items.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity ?? 1,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ receipt, parsed });
  } catch (error) {
    console.error("Receipt analysis error:", error);
    return NextResponse.json(
      { error: "レシートの解析中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
