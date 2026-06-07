import { getSupabaseServer } from "@/lib/supabase";

type AccountingMetricRow = {
  type: string;
  sale_price: number | string | null;
  purchase_price: number | string | null;
  quantity: number | string | null;
  profit: number | string | null;
  created_at: string;
};

export async function getDashboardMetrics(storeId: string) {
  const supabase = await getSupabaseServer();
  const { data: rows } = await supabase
    .from("accounting_records")
    .select("type, sale_price, purchase_price, quantity, profit, created_at")
    .eq("store_id", storeId);

  const now = new Date();
  const day = new Date(now); day.setHours(0, 0, 0, 0);
  const month = new Date(now); month.setDate(now.getDate() - 30);
  const records = (rows ?? []) as AccountingMetricRow[];
  const sales = records.filter((r) => r.type === "sale");
  const expenses = records.filter((r) => r.type === "expense" || r.type === "stock_entry");

  const revenueFrom = (from: Date) => sales.filter((r) => new Date(r.created_at) >= from).reduce((a, r) => a + Number(r.sale_price) * Number(r.quantity), 0);
  const expensesFrom = (from: Date) => expenses.filter((r) => new Date(r.created_at) >= from).reduce((a, r) => a + Number(r.purchase_price) * Number(r.quantity || 1), 0);
  const productsSold = sales.reduce((a, r) => a + Number(r.quantity), 0);
  const grossProfit = sales.reduce((a, r) => a + Number(r.profit), 0);
  const totalExpenses = expensesFrom(new Date(0));
  const netProfit = grossProfit - totalExpenses;

  return [
    { label: "Ingresos diarios", value: `$${revenueFrom(day).toFixed(2)}` },
    { label: "Gastos diarios", value: `$${expensesFrom(day).toFixed(2)}` },
    { label: "Ingresos mensuales", value: `$${revenueFrom(month).toFixed(2)}` },
    { label: "Productos vendidos", value: `${productsSold}` },
    { label: "Ganancia neta", value: `$${netProfit.toFixed(2)}` }
  ];
}
