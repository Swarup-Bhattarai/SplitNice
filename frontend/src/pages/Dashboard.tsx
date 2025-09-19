// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSummary, fetchRecentExpenses, fetchBalances } from "../api/expenses";
import { getToken } from "../api/auth";
import PanelC from "../components/PanelC";
import PanelA from "../components/PanelA";
import AddExpenseForm from "../components/AddExpenseForm";

interface User { id: number; username: string; email: string; }
interface Split { id: number; expense: number; user: User; amount: string; }
interface Expense { id: number; description: string; amount: string; date: string; paid_by: User; splits: Split[]; }
interface BalanceEntry { user: User; amount: number; }
interface BalancesPayload { you_are_owed: BalanceEntry[]; you_owe: BalanceEntry[]; totals: { to_me: number; by_me: number; net: number }; }

export default function Dashboard() {
  const [summary, setSummary] = useState<{ total_owed_by_me: number; total_owed_to_me: number; net_balance: number } | null>(null);
  const [balances, setBalances] = useState<BalancesPayload | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function refreshAll() {
    const [s, e, b] = await Promise.all([fetchSummary(), fetchRecentExpenses(), fetchBalances()]);
    setSummary(s); setExpenses(e.results || []); setBalances(b);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { navigate("/"); return; }
    (async () => {
      try {
        await refreshAll();
      } catch (err) {
        console.error(err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) return <p className="p-4">Loading dashboard…</p>;

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A — charts */}
        <section className="lg:col-span-1">
          <PanelA expenses={expenses} balances={balances} />
        </section>

        {/* B — middle */}
        <section className="lg:col-span-1">
          <h1 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h1>

          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="border rounded-lg p-4 shadow-sm bg-white"><p className="font-semibold text-gray-600">You owe</p><p className="text-xl">${summary.total_owed_by_me.toFixed(2)}</p></div>
              <div className="border rounded-lg p-4 shadow-sm bg-white"><p className="font-semibold text-gray-600">You are owed</p><p className="text-xl">${summary.total_owed_to_me.toFixed(2)}</p></div>
              <div className="border rounded-lg p-4 shadow-sm bg-white"><p className="font-semibold text-gray-600">Net balance</p><p className={`text-xl ${summary.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>${summary.net_balance.toFixed(2)}</p></div>
            </div>
          )}

          {/* NEW: add expense with splits */}
          <AddExpenseForm
            onCreated={async (newExp) => {
              setExpenses((cur) => [newExp, ...cur]);
              await refreshAll(); // refresh summary/balances too
            }}
          />

          {/* Recent expenses */}
          <h2 className="text-lg font-semibold mb-2 mt-6">Recent Expenses</h2>
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <table className="min-w-full">
              <thead><tr className="bg-gray-100"><th className="p-3 text-left">Date</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Paid By</th><th className="p-3 text-left">Amount</th></tr></thead>
              <tbody>
                {expenses.length ? expenses.map((exp) => (
                  <tr key={exp.id} className="border-t align-top">
                    <td className="p-3">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="p-3">{exp.description}</td>
                    <td className="p-3">{exp.paid_by?.username || "—"}</td>
                    <td className="p-3">${parseFloat(exp.amount).toFixed(2)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="p-3 text-center text-gray-500">No expenses found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* C — sidebar */}
        <section className="lg:col-span-1">
          <PanelC />
        </section>
      </div>
    </div>
  );
}
