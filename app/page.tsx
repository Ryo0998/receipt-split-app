"use client";

import { useState } from "react";
import InstallBanner from "./components/InstallBanner";
import ReceiptInputSection from "./components/ReceiptInputSection";
import OCRResultSection from "./components/OCRResultSection";
import SplitBillSection from "./components/SplitBillSection";
import HistoryListSection from "./components/HistoryListSection";
import { useOCR } from "./hooks/useOCR";
import { useReceiptHistory } from "./hooks/useReceiptHistory";
import type { ParsedReceipt } from "@/types/receipt";

export default function Home() {
  const ocr = useOCR();
  const history = useReceiptHistory();
  // Track whether the OCR result has been saved (to keep SplitBillSection alive)
  const [savedParsed, setSavedParsed] = useState<{
    parsed: ParsedReceipt;
    imageUrl: string | null;
  } | null>(null);

  const totalSpending = history.receipts.reduce((sum, r) => sum + r.totalAmount, 0);

  // Called from OCRResultSection "保存する"
  const handleSave = async (parsed: ParsedReceipt, imageUrl: string | null) => {
    await history.save({
      storeName: parsed.storeName,
      receiptDate: parsed.receiptDate,
      totalAmount: parsed.totalAmount,
      imageUrl,
      items: parsed.items,
      rawJson: JSON.stringify(parsed),
    });
    setSavedParsed({ parsed, imageUrl });
  };

  // Called from SplitBillSection "割り勘結果を保存"
  const handleSaveWithSplit = async (
    parsed: ParsedReceipt,
    imageUrl: string | null,
    splitData: object
  ) => {
    await history.save({
      storeName: `${parsed.storeName}（割り勘）`,
      receiptDate: parsed.receiptDate,
      totalAmount: parsed.totalAmount,
      imageUrl,
      items: parsed.items,
      rawJson: JSON.stringify({ ...parsed, splitData }),
    });
  };

  const handleCancel = () => {
    ocr.reset();
    setSavedParsed(null);
  };

  // The parsed data to show in SplitBillSection
  // After save, use the confirmed data so SplitBillSection stays in sync
  const splitParsed = savedParsed?.parsed ?? ocr.parsed;
  const splitImageUrl = savedParsed?.imageUrl ?? ocr.imageUrl;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-safe">
      <InstallBanner />

      <header className="bg-white shadow-sm sticky top-0 z-10 pt-safe">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">レシート管理</h1>
            <p className="text-xs text-gray-400">OCRで自動解析・記録</p>
          </div>
          {history.receipts.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">合計支出</p>
              <p className="text-lg font-bold text-gray-800">
                ¥{totalSpending.toLocaleString("ja-JP")}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Phase 1 + 2: Input → Analyze → Confirm → Save */}
        {ocr.status !== "done" ? (
          <ReceiptInputSection
            onAnalyze={ocr.analyze}
            analyzing={ocr.status === "analyzing"}
            error={ocr.error}
          />
        ) : (
          <OCRResultSection
            parsed={ocr.parsed!}
            imageUrl={ocr.imageUrl}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {/* Phase 3: Split bill — appears as soon as OCR is done */}
        {ocr.status === "done" && splitParsed && (
          <SplitBillSection
            parsed={splitParsed}
            imageUrl={splitImageUrl}
            onSaveWithSplit={handleSaveWithSplit}
          />
        )}

        {/* History */}
        <HistoryListSection
          receipts={history.receipts}
          loading={history.loading}
          onDelete={history.remove}
        />
      </main>
    </div>
  );
}
