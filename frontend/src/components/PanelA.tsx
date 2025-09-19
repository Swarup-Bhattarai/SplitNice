// src/components/PanelA.tsx
import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";

type Expense = {
  id: number;
  description: string;
  amount: string;
  date: string; // ISO
};

type BalanceEntry = {
  user: { id: number; username: string };
  amount: number; // positive number
};
type BalancesPayload = {
  you_are_owed: BalanceEntry[];
  you_owe: BalanceEntry[];
  totals: { to_me: number; by_me: number; net: number };
};

function formatMonth(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  // yyyy-mm
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export default function PanelA({
  expenses,
  balances,
}: {
  expenses: Expense[];
  balances: BalancesPayload | null;
}) {
  // ---- Monthly total (from expenses) ----
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const key = formatMonth(e.date);
      map.set(key, (map.get(key) || 0) + parseFloat(e.amount));
    }
    const rows = Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }));
    return rows;
  }, [expenses]);

  // ---- Per-friend net (from balances) ----
  // We’ll show two bars: what you owe them (negative), what they owe you (positive)
  const byFriend = useMemo(() => {
    if (!balances) return [];
    const owe = balances.you_owe.map((x) => ({
      name: x.user.username,
      owe: Number((-x.amount).toFixed(2)), // negative
      owed: 0,
    }));
    const owed = balances.you_are_owed.map((x) => ({
      name: x.user.username,
      owe: 0,
      owed: Number(x.amount.toFixed(2)), // positive
    }));
    // merge by name
    const map = new Map<string, { name: string; owe: number; owed: number }>();
    for (const r of [...owe, ...owed]) {
      const cur = map.get(r.name) || { name: r.name, owe: 0, owed: 0 };
      cur.owe += r.owe;
      cur.owed += r.owed;
      map.set(r.name, cur);
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.owed + b.owe) - Math.abs(a.owed + a.owe));
  }, [balances]);

  return (
    <div className="space-y-6">
      <div className="border rounded-lg bg-white shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-2">Monthly spending</h2>
        <p className="text-sm text-gray-500 mb-3">Sum of all expenses you recorded per month.</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border rounded-lg bg-white shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-2">Per-friend balance</h2>
        <p className="text-sm text-gray-500 mb-3">
          Positive bars = they owe you. Negative bars = you owe them.
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byFriend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="owed" name="They owe you" />
              <Bar dataKey="owe" name="You owe them" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
