import { NextRequest, NextResponse } from "next/server";
import { createV2AdminClient } from "@/lib/supabase/server";
import { createMuxClient } from "@/lib/course/mux-server";

type MuxEvent = {
  type?: string;
  object?: { id?: unknown };
  data?: { id?: unknown; asset_id?: unknown; upload_id?: unknown; meta?: { external_id?: unknown }; playback_ids?: Array<{ id?: unknown; policy?: unknown }> };
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  let event: MuxEvent;
  try {
    event = (await createMuxClient().webhooks.unwrap(body, Object.fromEntries(request.headers.entries()))) as MuxEvent;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 401 });
  }
  const admin = createV2AdminClient();
  const type = stringValue(event.type);
  const uploadId = stringValue(event.object?.id) ?? stringValue(event.data?.upload_id);
  if (!type) return NextResponse.json({ success: true });
  if (type === "video.upload.asset_created") {
    const assetId = stringValue(event.data?.asset_id) ?? stringValue(event.data?.id);
    if (!assetId || !uploadId) return NextResponse.json({ success: true });
    const { error } = await admin.from("course_lessons").update({ video_asset_id: assetId, video_status: "processing" }).eq("video_upload_id", uploadId).eq("video_provider", "mux");
    if (error) console.error("[mux-webhook] asset-created update failed", { operation: type, code: error.code });
    return NextResponse.json({ success: true });
  }
  if (type === "video.asset.ready") {
    const assetId = stringValue(event.data?.id) ?? stringValue(event.object?.id);
    const lessonId = stringValue(event.data?.meta?.external_id);
    const playbackId = stringValue(event.data?.playback_ids?.find((item) => item.policy === "signed")?.id) ?? stringValue(event.data?.playback_ids?.[0]?.id);
    if (!assetId || !lessonId || !playbackId) return NextResponse.json({ success: true });
    const { error } = await admin.from("course_lessons").update({ video_asset_id: assetId, video_external_id: playbackId, video_status: "ready" }).eq("id", lessonId).eq("video_provider", "mux").eq("video_asset_id", assetId);
    if (error) console.error("[mux-webhook] asset-ready update failed", { operation: type, code: error.code });
    return NextResponse.json({ success: true });
  }
  if (type === "video.asset.errored") {
    const assetId = stringValue(event.data?.id) ?? stringValue(event.object?.id);
    if (assetId) {
      const { error } = await admin.from("course_lessons").update({ video_status: "errored" }).eq("video_asset_id", assetId).eq("video_provider", "mux");
      if (error) console.error("[mux-webhook] asset-error update failed", { operation: type, code: error.code });
    }
  }
  return NextResponse.json({ success: true });
}
