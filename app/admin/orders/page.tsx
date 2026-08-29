import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { requireAdminContext } from "@/lib/admin/authorization";

type SearchParams = Promise<{ q?: string; status?: string; product?: string; range?: string }>;
type OrderRow = { id: string; user_id: string; product_id: string; amount: number; currency: string; status: string; provider: string; provider_order_id: string | null; paid_at: string | null; created_at: string };
type PaymentRow = { order_id: string; provider_payment_id: string | null; status: string; paid_at: string | null };
type ProfileRow = { id: string; email: string; full_name: string | null };
type ProductRow = { id: string; name: string; slug: string };

function shorten(value: string | null) {
  if (!value) return "-";
  return value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const selectedStatus = params.status?.trim().slice(0, 40) ?? "";
  const selectedProduct = params.product?.trim().slice(0, 80) ?? "";
  const selectedRange = ["7", "30", "90"].includes(params.range ?? "") ? params.range ?? "" : "";
  const { admin } = await requireAdminContext("/admin/orders");
  const { data, error } = await admin.from("orders").select("id,user_id,product_id,amount,currency,status,provider,provider_order_id,paid_at,created_at").order("created_at", { ascending: false }).limit(100).returns<OrderRow[]>();
  const orders = data ?? [];
  const [paymentsResult, profilesResult, productsResult] = await Promise.all([
    orders.length ? admin.from("payments").select("order_id,provider_payment_id,status,paid_at").in("order_id", orders.map((order) => order.id)).returns<PaymentRow[]>() : Promise.resolve({ data: [] as PaymentRow[], error: null }),
    orders.length ? admin.from("profiles").select("id,email,full_name").in("id", [...new Set(orders.map((order) => order.user_id))]).returns<ProfileRow[]>() : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    orders.length ? admin.from("products").select("id,name,slug").in("id", [...new Set(orders.map((order) => order.product_id))]).returns<ProductRow[]>() : Promise.resolve({ data: [] as ProductRow[], error: null }),
  ]);
  const loadFailed = Boolean(error || paymentsResult.error || profilesResult.error || productsResult.error);
  if (loadFailed) console.error("[admin-orders] Safe order summary lookup failed");
  const payments = new Map((paymentsResult.data ?? []).map((row) => [row.order_id, row]));
  const profiles = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  const products = new Map((productsResult.data ?? []).map((row) => [row.id, row]));
  const cutoff = selectedRange ? Date.now() - Number(selectedRange) * 86400000 : null;
  const filteredOrders = orders.filter((order) => {
    const profile = profiles.get(order.user_id);
    const product = products.get(order.product_id);
    const haystack = `${profile?.full_name ?? ""} ${profile?.email ?? ""} ${product?.name ?? ""} ${product?.slug ?? ""} ${order.id}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (!selectedStatus || order.status === selectedStatus) && (!selectedProduct || product?.slug === selectedProduct || product?.id === selectedProduct) && (!cutoff || new Date(order.created_at).getTime() >= cutoff);
  });
  const statuses = [...new Set(orders.map((order) => order.status))].sort();
  const productOptions = [...new Set([...products.values()].map((product) => product.slug))].sort();
  return (
    <section>
      <AdminPageHeader eyebrow="Operations & Revenue" title="訂單" description="唯讀查看最近 100 筆訂單摘要；篩選在 server 端完成，不顯示 checkout 或 webhook raw payload。" />
      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"><input name="q" defaultValue={query} placeholder="搜尋姓名、Email、商品或訂單 ID" className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" /><select name="status" defaultValue={selectedStatus} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">全部訂單狀態</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><select name="product" defaultValue={selectedProduct} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">全部商品</option>{productOptions.map((product) => <option key={product} value={product}>{product}</option>)}</select><select name="range" defaultValue={selectedRange} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">全部日期</option><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="90">近 90 天</option></select><button className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">篩選</button></form>
      {loadFailed ? <p className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取訂單摘要，請稍後再試。</p> : null}
      <div className="mb-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">最近 100 筆中符合條件：{filteredOrders.length} 筆。</div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">建立時間</th><th className="px-4 py-3">使用者</th><th className="px-4 py-3">商品</th><th className="px-4 py-3">金額</th><th className="px-4 py-3">訂單</th><th className="px-4 py-3">付款</th><th className="px-4 py-3">Provider reference</th></tr></thead><tbody className="divide-y divide-white/10">{filteredOrders.map((order) => { const profile = profiles.get(order.user_id); const product = products.get(order.product_id); const payment = payments.get(order.id); return <tr key={order.id}><td className="px-4 py-4 text-xs text-slate-500">{new Date(order.created_at).toLocaleString("zh-TW")}</td><td className="px-4 py-4"><p className="text-slate-200">{profile?.full_name ?? "未填姓名"}</p><p className="text-xs text-slate-500">{profile?.email ?? order.user_id}</p></td><td className="px-4 py-4 text-slate-300">{product?.name ?? order.product_id}</td><td className="px-4 py-4 text-slate-200">{order.currency} {order.amount.toLocaleString("zh-TW")}</td><td className="px-4 py-4"><AdminStatusBadge status={order.status} /></td><td className="px-4 py-4"><AdminStatusBadge status={payment?.status ?? "unknown"} label={payment?.status ?? "尚無付款紀錄"} /></td><td className="px-4 py-4 font-mono text-xs text-slate-500">{order.provider}: {shorten(order.provider_order_id)}<br />payment: {shorten(payment?.provider_payment_id ?? null)}</td></tr>; })}{filteredOrders.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">目前沒有符合條件的訂單。</td></tr> : null}</tbody></table></div>
    </section>
  );
}
