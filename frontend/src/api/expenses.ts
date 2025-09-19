// src/api/expenses.ts
import { getToken } from "./auth";

const API_URL = "http://localhost:8000/api"; // change if backend runs elsewhere

export async function fetchSummary() {
  const token = getToken();
  const res = await fetch(`${API_URL}/summary/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function fetchRecentExpenses() {
  const token = getToken();
  const res = await fetch(`${API_URL}/recent-expenses/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json(); // { results: [...] }
}

export async function createExpense(description: string, amount: number, splits?: Array<{user_id:number, amount:number}>) {
  const token = getToken();
  const res = await fetch(`${API_URL}/expenses/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ description, amount, splits }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to create expense");
  }
  return res.json();
}

export async function fetchBalances() {
  const token = getToken();
  const res = await fetch(`${API_URL}/balances/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch balances");
  return res.json(); // { you_are_owed: [...], you_owe: [...], totals: {...} }
}
