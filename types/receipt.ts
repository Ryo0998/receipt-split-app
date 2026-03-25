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
