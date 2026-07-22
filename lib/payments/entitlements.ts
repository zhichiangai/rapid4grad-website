import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
} from "@/types/database-v2.generated";
import type { VerifyWebhookResult } from "./types";

type V2SupabaseClient = SupabaseClient<Database>;

export type PaymentEventProcessingResult = {
  duplicate: boolean;
  order_id: string;
  order_status: string;
  payment_id?: string;
  payment_status?: string;
  entitlement_id?: string | null;
  requires_manual_review?: boolean;
};

export async function processVerifiedOneTimePayment(
  supabase: V2SupabaseClient,
  provider: Database["public"]["Enums"]["payment_provider"],
  event: VerifyWebhookResult,
) {
  const { data, error } = await supabase.rpc(
    "process_one_time_payment_event",
    {
      target_provider: provider,
      target_event_id: event.eventId,
      target_event_type: event.eventType,
      target_provider_order_id: event.providerOrderId,
      target_provider_payment_id: event.providerPaymentId,
      target_outcome: event.outcome,
      target_amount: event.amount,
      target_currency: event.currency.toUpperCase(),
      target_paid_at: event.paidAt ?? new Date().toISOString(),
      target_payload: event.rawPayload as Json,
    },
  );

  if (error) {
    throw new Error("Verified payment could not be finalized", {
      cause: error,
    });
  }

  return data as PaymentEventProcessingResult;
}
