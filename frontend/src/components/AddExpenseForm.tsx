// src/components/AddExpenseForm.tsx
import { useEffect, useMemo, useState } from "react";
import { createExpense } from "../api/expenses";
import { fetchUsers } from "../api/users";
import { fetchMe } from "../api/auth";

type User = { id: number; username: string; email: string };

export default function AddExpenseForm({
  onCreated,
}: {
  onCreated: (expense: any) => void;
}) {
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [selected, setSelected] = useState<number[]>([]);
  const [equalSplit, setEqualSplit] = useState(true);
  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [meData, usersData] = await Promise.all([fetchMe(), fetchUsers()]);
        setMe(meData);
        // exclude me from the “friends to split with” list
        setUsers((usersData || []).filter((u: User) => u.id !== meData.id));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Equal-split preview per friend (excluding me)
  const equalPreview = useMemo(() => {
    const total = parseFloat(amount || "0");
    const n = selected.length || 0;
    if (!equalSplit || !total || n === 0) return {};
    // split in cents to avoid float drift
    const cents = Math.round(total * 100);
    const base = Math.floor(cents / n);
    const remainder = cents - base * n;
    const arr = Array(n).fill(base);
    for (let i = 0; i < remainder; i++) arr[i] += 1;
    const out: Record<number, string> = {};
    selected.forEach((uid, idx) => (out[uid] = (arr[idx] / 100).toFixed(2)));
    return out;
  }, [equalSplit, amount, selected]);

  // Build splits payload
  function buildSplits(): Array<{ user_id: number; amount: number }> {
    if (equalSplit) {
      return selected.map((uid) => ({
        user_id: uid,
        amount: parseFloat(equalPreview[uid] || "0"),
      }));
    }
    // custom mode
    return selected
      .map((uid) => ({
        user_id: uid,
        amount: parseFloat(customAmounts[uid] || "0"),
      }))
      .filter((s) => s.amount > 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const total = parseFloat(amount || "0");
    if (!description.trim()) return setError("Description required");
    if (!total || total <= 0) return setError("Amount must be > 0");
    if (selected.length === 0) return setError("Choose at least one friend to split with");

    const splits = buildSplits();
    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    // Warn if mismatch > 1 cent
    if (Math.abs(sum - total) > 0.01) {
      setError(
        `Split totals ($${sum.toFixed(2)}) do not match expense amount ($${total.toFixed(2)}).`
      );
      return;
    }

    try {
      const exp = await createExpense(description.trim(), total, splits);
      onCreated(exp);
      setDescription("");
      setAmount("");
      setSelected([]);
      setCustomAmounts({});
      setEqualSplit(true);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to create expense");
    }
  }

  function toggleSelected(uid: number) {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading add form…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg bg-white shadow-sm p-4 space-y-3">
      <h2 className="text-lg font-semibold">Add New Expense</h2>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Description"
          className="border p-2 rounded flex-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Amount"
          className="border p-2 rounded w-40"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.01"
          min="0"
          required
        />
      </div>

      <div className="text-sm text-gray-600">
        Paid by: <span className="font-medium">{me?.username ?? "you"}</span>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Split with</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(u.id)}
                onChange={() => toggleSelected(u.id)}
              />
              {u.username}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={equalSplit}
            onChange={() => setEqualSplit(true)}
          />
          Split equally
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!equalSplit}
            onChange={() => setEqualSplit(false)}
          />
          Custom amounts
        </label>
      </div>

      {/* amounts per friend */}
      <div className="space-y-2">
        {(equalSplit ? selected : selected).map((uid) => {
          const user = users.find((u) => u.id === uid);
          const val = equalSplit ? (equalPreview[uid] ?? "0.00") : (customAmounts[uid] ?? "");
          return (
            <div key={uid} className="flex items-center gap-3">
              <div className="w-40 text-sm">{user?.username}</div>
              <input
                type="number"
                className="border p-2 rounded w-36"
                value={val}
                onChange={(e) =>
                  setCustomAmounts((m) => ({ ...m, [uid]: e.target.value }))
                }
                step="0.01"
                min="0"
                disabled={equalSplit}
                placeholder="0.00"
              />
              {equalSplit && <span className="text-xs text-gray-500">(auto)</span>}
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="pt-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={selected.length === 0}
        >
          Add
        </button>
      </div>
    </form>
  );
}
