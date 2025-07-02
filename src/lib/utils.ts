import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LineItem } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "UGX",
  }).format(amount);
};

export const calculateTotal = (items: LineItem[] | { quantity: number; unitPrice: number }[]) => {
  return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
};
