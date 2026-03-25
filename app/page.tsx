"use client";

import { useState } from "react";
import InstallBanner from "./components/InstallBanner";
import ReceiptInputSection from "./components/ReceiptInputSection";
import OCRResultSection from "./components/OCRResultSection";
import SplitBillSection from "./components/SplitBillSection";
import HistoryListSection from "./components/HistoryListSection";
import AggregationSection from "./components/AggregationSection";
import { useOCR } from "./hooks/useOCR";
import { useReceiptHistory } from "./hooks/useReceiptHistory";
import type { ParsedReceipt } from "@/types/receipt";

type Tab = "scan" | "history" | "summary";

export default function Home() {
  const ocr = useOCR();
  const history = useReceiptHistory();
  const [tab, setTab] = useState<Tab>("scan");
  const [savedParsed, setSavedParsed] = useState<{
    parsed: ParsedReceipt;
    imageUrl: string | null;
  } | null>(null);

  const totalSpending = history.receipts.reduce((s, r) => s + r.totalAmount, 0);

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

  const splitParsed = savedParsed?.parsed ?? ocr.parsed;
  const splitImageUrl = savedParsed?.imageUrl ?? ocr.imageUrl;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "scan", label: "📷 読み取り" },
    { id: "history", label: "📋 履歴", badge: history.receipts.length },
    { id: "summary", label: "📊 集計" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-safe">
      <InstallBanner />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 pt-safe">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-700">レシート管理</h1>
            <p className="text-xs text-gray-400">APIキー不要・無料</p>
          </div>
          {history.receipts.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">総支出</p>
              <p className="text-base font-bold text-gray-800">
                ¥{totalSpending.toLocaleString("ja-JP")}
              </p>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto flex border-t border-gray-100">
          {TABS.map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                tab === id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500"
              }`}
            >
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-600 text-xs rounded-full px-1.5">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* 読み取りタブ */}
        {tab === "scan" && (
          <>
            {ocr.status !== "done" ? (
              <ReceiptInputSection
                onAnalyze={ocr.analyze}
                analyzing={ocr.status === "analyzing"}
                progress={ocr.progress}
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

            {ocr.status === "done" && splitParsed && (
              <SplitBillSection
                parsed={splitParsed}
                imageUrl={splitImageUrl}
                onSaveWithSplit={handleSaveWithSplit}
              />
            )}
          </>
        )}

        {/* 履歴タブ */}
        {tab === "history" && (
          <HistoryListSection
            receipts={history.receipts}
            loading={history.loading}
            onDelete={history.remove}
          />
        )}

        {/* 集計タブ */}
        {tab === "summary" && (
          <AggregationSection receipts={history.receipts} />
        )}
      </main>
    </div>
  );
}
