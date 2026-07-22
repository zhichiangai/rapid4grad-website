import { requireAdminContext } from "@/lib/admin/authorization";

type OrderRow = { id: string; user_id: string; product_id: string; amount: number; currency: string; status: string; provider: string; provider_order_id: string | null; paid_at: string | null; created_at: string };
type PaymentRow = { order_id: string; provider: string; provider_payment_id: string | null; status: string; paid_at: string | null };
type ProfileRow = { id: string; email: string; full_name: string | null };
type ProductRow = { id: string; name: string; slug: string };

function shorten(value: string | null) {
  if (!value) return "-";
  return value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export default async function AdminOrdersPage() {
  const { admin } = await requireAdminContext("/admin/orders");
  const { data, error } = await admin.from("orders").select("id,user_id,product_id,amount,currency,status,provider,provider_order_id,paid_at,created_at").order("created_at", { ascending: false }).limit(100).returns<OrderRow[]>();
  const orders = data ?? [];
  const [paymentsResult, profilesResult, productsResult] = await Promise.all([
    orders.length ? admin.from("payments").select("order_id,provider,provider_payment_id,status,paid_at").in("order_id", orders.map((order) => order.id)).returns<PaymentRow[]>() : Promise.resolve({ data: [] as PaymentRow[], error: null }),
    orders.length ? admin.from("profiles").select("id,email,full_name").in("id", [...new Set(orders.map((order) => order.user_id))]).returns<ProfileRow[]>() : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    orders.length ? admin.from("products").select("id,name,slug").in("id", [...new Set(orders.map((order) => order.product_id))]).returns<ProductRow[]>() : Promise.resolve({ data: [] as ProductRow[], error: null }),
  ]);
  const loadFailed = Boolean(error || paymentsResult.error || profilesResult.error || productsResult.error);
  if (loadFailed) console.error("[admin-orders] Safe order summary lookup failed");
  const payments = new Map((paymentsResult.data ?? []).map((row) => [row.order_id, row]));
  const profiles = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  const products = new Map((productsResult.data ?? []).map((row) => [row.id, row]));
  return (
    <section>
      <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Commerce Observation</p><h2 className="mt-2 text-2xl font-semibold">訂單與付款摘要</h2><p className="mt-2 text-sm text-slate-400">唯讀頁面，不顯示 checkout payload、webhook payload、付款 Email 或其他敏感原始資料。</p>{loadFailed ? <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取訂單摘要，請稍後再試。</p> : null}</header>
      <div className="mt-5 overflow-x-auto rounded-[2rem] border border-white/10"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-400"><tr><th className="px-4 py-3">建立時間</th><th className="px-4 py-3">使用者</th><th className="px-4 py-3">商品</th><th className="px-4 py-3">金額</th><th className="px-4 py-3">訂單</th><th className="px-4 py-3">付款</th><th className="px-4 py-3">Provider reference</th></tr></thead><tbody className="divide-y divide-white/10">{orders.map((order) => { const profile = profiles.get(order.user_id); const product = products.get(order.product_id); const payment = payments.get(order.id); return <tr key={order.id}><td className="px-4 py-4 text-xs text-slate-500">{new Date(order.created_at).toLocaleString("zh-TW")}</td><td className="px-4 py-4"><p className="text-slate-200">{profile?.full_name ?? "未填姓名"}</p><p className="font-mono text-xs text-cyan-100">{profile?.email ?? order.user_id}</p></td><td className="px-4 py-4 text-slate-300">{product?.name ?? order.product_id}</td><td className="px-4 py-4 text-slate-200">{order.currency} {order.amount.toLocaleString("zh-TW")}</td><td className="px-4 py-4 text-slate-300">{order.status}</td><td className="px-4 py-4 text-slate-300">{payment?.status ?? "尚無付款紀錄"}</td><td className="px-4 py-4 font-mono text-xs text-slate-500">{order.provider}: {shorten(order.provider_order_id)}<br />payment: {shorten(payment?.provider_payment_id ?? null)}</td></tr>; })}{orders.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">目前沒有訂單。</td></tr> : null}</tbody></table></div>
    </section>
  );
}
