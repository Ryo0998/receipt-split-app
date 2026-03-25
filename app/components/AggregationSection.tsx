"use client";

import { useState, useMemo } from "react";
import type { ReceiptWithItems } from "@/types/receipt";
import { exportToExcel } from "@/app/lib/exportExcel";

interface Props {
  receipts: ReceiptWithItems[];
}

export default function AggregationSection({ receipts }: Props) {
  const now = new Date();
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const fromStr = `${fromYear}-${String(fromMonth).padStart(2, "0")}`;
  const toStr = `${toYear}-${String(toMonth).padStart(2, "0")}`;

  const filtered = useMemo(
    () =>
      receipts.filter((r) => {
        if (!r.receiptDate) return false;
        const m = r.receiptDate.slice(0, 7);
        return m >= fromStr && m <= toStr;
      }),
    [receipts, fromStr, toStr]
  );

  const total = filtered.reduce((s, r) => s + r.totalAmount, 0);

  const monthly = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const m = r.receiptDate?.slice(0, 7) ?? "不明";
      map[m] = (map[m] ?? 0) + r.totalAmount;
    });
    return Object.entries(map).sort();
  }, [filtered]);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleExport = async () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      await exportToExcel(filtered, fromStr, toStr);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-5">
      <h2 className="text-lg font-bold text-gray-800">集計・Excel出力</h2>

      {/* 期間指定 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">期間指定</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "開始", year: fromYear, month: fromMonth, setYear: setFromYear, setMonth: setFromMonth },
            { label: "終了", year: toYear, month: toMonth, setYear: setToYear, setMonth: setToMonth },
          ].map(({ label, year, month, setYear, setMonth }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <div className="flex gap-1">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* サマリー */}
      <div className="bg-blue-50 rounded-xl p-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500">期間合計</p>
          <p className="text-2xl font-bold text-blue-700">¥{total.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">件数</p>
          <p className="text-xl font-bold text-gray-700">{filtered.length}件</p>
        </div>
      </div>

      {/* 月別内訳 */}
      {monthly.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">月別内訳</p>
          <div className="space-y-1.5">
            {monthly.map(([month, amount]) => (
              <div
                key={month}
                className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm text-gray-600">{month}</span>
                <span className="text-sm font-semibold text-gray-800">
                  ¥{amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">
          この期間にレシートがありません
        </p>
      )}

      {/* Excel出力ボタン */}
      <button
        onClick={handleExport}
        disabled={filtered.length === 0 || exporting}
        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-base disabled:opacity-40 transition-colors active:bg-green-700"
      >
        {exporting ? "作成中..." : `📊 Excelで出力（${filtered.length}件）`}
      </button>
    </div>
  );
}
