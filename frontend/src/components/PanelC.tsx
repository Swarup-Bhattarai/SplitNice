// src/components/PanelC.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchUsers } from "../api/users";

type User = { id: number; username: string; email: string };

export default function PanelC() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchUsers();
        setUsers(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [query, users]);

  return (
    <aside className="border rounded-lg bg-white shadow-sm p-3 h-full max-h-[calc(100vh-3rem)] overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-semibold">Dashboard</span>
      </div>

      <div className="space-y-2 mb-4">
        <a href="#" className="block text-sm text-gray-700 hover:underline">
          Recent activity
        </a>
        <div className="relative">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Filter by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <a href="#" className="block text-sm text-gray-700 hover:underline">
          All expenses
        </a>
      </div>

      <SectionHeader title="GROUPS" actionLabel="+ add" />
      <ul className="mb-4 space-y-1 text-sm">
        {/* stub groups; wire to real groups later */}
        {["Apartment 6307", "NYC trip", "Walmart+"].map((g) => (
          <li key={g} className="flex items-center gap-2 text-gray-700">
            <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
            {g}
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-400 mb-4">
        Hiding accounts settled for more than 30 days. <a href="#" className="underline">Show »</a>
      </p>

      <SectionHeader title="FRIENDS" actionLabel="+ add" />
      {loading ? (
        <p className="text-sm text-gray-500">Loading friends…</p>
      ) : filtered.length ? (
        <ul className="space-y-1 text-sm">
          {filtered.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-gray-800">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-[10px]">
                👤
              </span>
              <span className="truncate">{u.username}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No friends match “{query}”.</p>
      )}
    </aside>
  );
}

function SectionHeader({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return (
    <div className="flex items-center justify-between text-xs text-gray-500 font-semibold mb-2 mt-3">
      <span>{title}</span>
      {actionLabel && <button className="text-gray-400 hover:text-gray-600">{actionLabel}</button>}
    </div>
  );
}
