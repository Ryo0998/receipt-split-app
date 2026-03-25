export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ParsedReceipt {
  storeName: string;
  receiptDate: string | null;
  totalAmount: number;
  items: ParsedItem[];
}

export interface ReceiptWithItems {
  id: number;
  storeName: string;
  receiptDate: string | null;
  totalAmount: number;
  imageUrl: string | null;
  rawJson: string;
  createdAt: Date;
  items: {
    id: number;
    name: string;
    price: number;
    quantity: number;
  }[];
}

// ---- Split bill types ----

export interface SplitParticipant {
  id: string;
  name: string;
  ratio: number;
}

export interface SplitBillItem extends ParsedItem {
  assignedTo: string[]; // participant IDs
}

export type SplitMode = "equal" | "ratio" | "item";

export interface SplitBillConfig {
  mode: SplitMode;
  participants: SplitParticipant[];
  items: SplitBillItem[];
}

export interface SplitResult {
  participantId: string;
  name: string;
  amount: number;
}
