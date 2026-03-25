import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const receipts = await prisma.receipt.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ receipts });
  } catch (error) {
    console.error("[GET /api/receipts] Error:", error);
    return NextResponse.json(
      { error: "データ取得に失敗しました。npx prisma db push を実行しましたか？" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeName, receiptDate, totalAmount, imageUrl, items, rawJson } = body;

    const receipt = await prisma.receipt.create({
      data: {
        storeName: storeName || "不明",
        receiptDate: receiptDate || null,
        totalAmount: Number(totalAmount) || 0,
        imageUrl: imageUrl || null,
        rawJson: rawJson || "{}",
        items: {
          create: (items ?? []).map(
            (item: { name: string; price: number; quantity: number }) => ({
              name: item.name,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
            })
          ),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ receipt });
  } catch (error) {
    console.error("[POST /api/receipts] Error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
