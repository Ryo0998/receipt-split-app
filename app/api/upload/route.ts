import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/** 画像のみ保存する。OCRはクライアント側で実行済み。 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ imageUrl: null });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    await writeFile(path.join(uploadsDir, fileName), buffer);

    return NextResponse.json({ imageUrl: `/uploads/${fileName}` });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json({ imageUrl: null });
  }
}
