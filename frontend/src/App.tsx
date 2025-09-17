import { useEffect, useState } from "react";
import { api } from "./lib/api";

type Me = { id: number; name: string; email: string };
type User = { id: number; name: string; email: string };
type Summary = {
  total_owed_by_me: number;
  total_owed_to_me: number;
  net_balance: number;
};
type Expense = {
  id: number;
  description: string;
  amount: number;
  paid_by: User;
  date: string;
};

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">{props.title}</h2>
      {props.children}
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, sumRes, expRes] = await Promise.all([
          api.get<Me>("/me/"),
          api.get<Summary>("/summary/"),
          api.get<{ results: Expense[] }>("/recent-expenses/"),
        ]);
        setMe(meRes.data);
        setSummary(sumRes.data);
        setRecent(expRes.data.results);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8">Loading dashboard…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl p-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold">SplitNice</h1>
          <div className="text-sm text-gray-600">
            {me?.name} • {me?.email}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-5 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card title="You owe">
            <div className="text-2xl">
              ${summary?.total_owed_by_me.toFixed(2)}
            </div>
          </Card>
          <Card title="You are owed">
            <div className="text-2xl">
              ${summary?.total_owed_to_me.toFixed(2)}
            </div>
          </Card>
          <Card title="Net balance">
            <div
              className={`text-2xl ${
                Number(summary?.net_balance) < 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              ${summary?.net_balance.toFixed(2)}
            </div>
          </Card>
        </section>

        <section>
          <Card title="Recent expenses">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Date</th>
                    <th>Description</th>
                    <th>Paid by</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="py-2">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td>{e.description}</td>
                      <td>{e.paid_by?.name}</td> 
                      <td className="text-right">
                        ${Number(e.amount).toFixed(2)}{" "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
