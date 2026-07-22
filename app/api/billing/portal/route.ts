import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "綠界定期定額不提供 Customer Portal，請改用 RAPID4GRAD 的 /billing 管理訂閱。",
    },
    { status: 410 },
  );
}
