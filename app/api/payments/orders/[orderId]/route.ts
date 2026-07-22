import { NextResponse } from "next/server";
import { createV2Client } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  if (!UUID_PATTERN.test(orderId)) {
    return NextResponse.json(
      { success: false, error: "無效的訂單編號。" },
      { status: 400 },
    );
  }

  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "請先登入。" },
      { status: 401 },
    );
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("id,status,amount,currency,paid_at,created_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Payment order status query failed", { code: error.code });
    return NextResponse.json(
      { success: false, error: "目前無法讀取訂單狀態。" },
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json(
      { success: false, error: "找不到這筆訂單。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, order });
}
