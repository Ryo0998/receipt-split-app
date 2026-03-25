import type {
  SplitParticipant,
  SplitBillItem,
  SplitResult,
  SplitBillConfig,
} from "@/types/receipt";

export function calculateSplit(config: SplitBillConfig, total: number): SplitResult[] {
  const { mode, participants, items } = config;
  if (participants.length === 0) return [];

  switch (mode) {
    case "equal":
      return calcEqual(total, participants);
    case "ratio":
      return calcRatio(total, participants);
    case "item":
      return calcItem(items, participants);
    default:
      return calcEqual(total, participants);
  }
}

function calcEqual(total: number, participants: SplitParticipant[]): SplitResult[] {
  const base = Math.floor(total / participants.length);
  const remainder = total - base * participants.length;
  return participants.map((p, i) => ({
    participantId: p.id,
    name: p.name,
    amount: i === 0 ? base + remainder : base,
  }));
}

function calcRatio(total: number, participants: SplitParticipant[]): SplitResult[] {
  const totalRatio = participants.reduce((s, p) => s + p.ratio, 0);
  if (totalRatio === 0) {
    return participants.map((p) => ({ participantId: p.id, name: p.name, amount: 0 }));
  }
  let remaining = total;
  return participants.map((p, i) => {
    if (i === participants.length - 1) {
      return { participantId: p.id, name: p.name, amount: remaining };
    }
    const amount = Math.floor((total * p.ratio) / totalRatio);
    remaining -= amount;
    return { participantId: p.id, name: p.name, amount };
  });
}

function calcItem(items: SplitBillItem[], participants: SplitParticipant[]): SplitResult[] {
  const totals: Record<string, number> = {};
  participants.forEach((p) => { totals[p.id] = 0; });

  items.forEach((item) => {
    if (item.assignedTo.length === 0) return;
    const itemTotal = item.price * item.quantity;
    const base = Math.floor(itemTotal / item.assignedTo.length);
    const remainder = itemTotal - base * item.assignedTo.length;
    item.assignedTo.forEach((pid, i) => {
      totals[pid] = (totals[pid] ?? 0) + base + (i === 0 ? remainder : 0);
    });
  });

  return participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    amount: totals[p.id] ?? 0,
  }));
}

export function validateSplitConfig(config: SplitBillConfig): string | null {
  if (config.participants.length === 0) return "参加者を1人以上設定してください";

  if (config.mode === "ratio") {
    const totalRatio = config.participants.reduce((s, p) => s + p.ratio, 0);
    if (totalRatio === 0) return "比率の合計が0になっています";
  }

  if (config.mode === "item") {
    const unassigned = config.items.find((item) => item.assignedTo.length === 0);
    if (unassigned) return `「${unassigned.name}」の担当者が設定されていません`;
  }

  return null;
}
