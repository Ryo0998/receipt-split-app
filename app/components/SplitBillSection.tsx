"use client";

import { useState, useMemo } from "react";
import type {
  ParsedReceipt,
  SplitParticipant,
  SplitBillItem,
  SplitMode,
} from "@/types/receipt";
import { calculateSplit, validateSplitConfig } from "@/lib/splitBillCalculator";

interface Props {
  parsed: ParsedReceipt;
  imageUrl: string | null;
  onSaveWithSplit: (
    data: ParsedReceipt,
    imageUrl: string | null,
    splitData: object
  ) => Promise<void>;
}

export default function SplitBillSection({ parsed, imageUrl, onSaveWithSplit }: Props) {
  const [mode, setMode] = useState<SplitMode>("equal");
  const [participants, setParticipants] = useState<SplitParticipant[]>([
    { id: "1", name: "Aさん", ratio: 1 },
    { id: "2", name: "Bさん", ratio: 1 },
  ]);
  const [items, setItems] = useState<SplitBillItem[]>(
    parsed.items.map((item) => ({ ...item, assignedTo: [] }))
  );
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = { mode, participants, items };
  const validationError = validateSplitConfig(config);

  const results = useMemo(() => {
    if (validationError) return [];
    return calculateSplit(config, parsed.totalAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, participants, items, parsed.totalAmount, validationError]);

  const addParticipant = () => {
    const name =
      newName.trim() ||
      `${String.fromCharCode(65 + (participants.length % 26))}さん`;
    setParticipants((prev) => [
      ...prev,
      { id: Date.now().toString(), name, ratio: 1 },
    ]);
    setNewName("");
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 1) return;
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((pid) => pid !== id),
      }))
    );
  };

  const toggleItemAssignment = (itemIndex: number, participantId: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const assigned = item.assignedTo.includes(participantId);
        return {
          ...item,
          assignedTo: assigned
            ? item.assignedTo.filter((id) => id !== participantId)
            : [...item.assignedTo, participantId],
        };
      })
    );
  };

  const handleSave = async () => {
    if (validationError) return;
    setSaving(true);
    setError(null);
    try {
      await onSaveWithSplit(parsed, imageUrl, { mode, participants, items, results });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存エラー");
    } finally {
      setSaving(false);
    }
  };

  const MODES: [SplitMode, string][] = [
    ["equal", "均等割り"],
    ["ratio", "比率割り"],
    ["item", "商品割り"],
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">割り勘計算</h2>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Participants */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">参加者</p>
        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                type="text"
                value={p.name}
                onChange={(e) =>
                  setParticipants((prev) =>
                    prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x))
                  )
                }
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {mode === "ratio" && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-gray-400">比率</span>
                  <input
                    type="number"
                    min={0}
                    value={p.ratio}
                    onChange={(e) =>
                      setParticipants((prev) =>
                        prev.map((x) =>
                          x.id === p.id ? { ...x, ratio: Number(e.target.value) } : x
                        )
                      )
                    }
                    className="w-14 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none"
                  />
                </div>
              )}
              <button
                onClick={() => removeParticipant(p.id)}
                disabled={participants.length <= 1}
                className="text-gray-300 hover:text-red-400 disabled:opacity-30 text-lg leading-none shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newName}
            placeholder="名前を入力..."
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            className="flex-1 border border-dashed border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={addParticipant}
            className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium active:bg-blue-200"
          >
            追加
          </button>
        </div>
      </div>

      {/* Item assignment */}
      {mode === "item" && (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">商品の担当者を選択</p>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-3">
              OCR結果に品目がありません
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    <span className="text-sm text-gray-500">
                      ¥{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => toggleItemAssignment(i, p.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          item.assignedTo.includes(p.id)
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-200 text-gray-600"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">計算結果</p>
        {validationError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
            {validationError}
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.participantId}
                className="flex justify-between items-center bg-blue-50 rounded-xl px-4 py-3"
              >
                <span className="font-medium text-gray-800">{r.name}</span>
                <span className="text-lg font-bold text-blue-700">
                  ¥{r.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {saved ? (
        <div className="text-center text-green-600 font-medium py-2">
          ✅ 割り勘結果を履歴に保存しました
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={saving || !!validationError}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-base disabled:opacity-40 transition-colors"
        >
          {saving ? "保存中..." : "割り勘結果を保存"}
        </button>
      )}
    </div>
  );
}
