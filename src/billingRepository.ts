import type { DbBillingArchitectureDecisionReceipt, DbOrganizationSubscription, DbSubscriptionPlan } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadSubscriptionPlans(accessToken?: string): Promise<DbSubscriptionPlan[]> {
  return supabaseRest<DbSubscriptionPlan[]>("subscription_plans?select=*&status=eq.active&order=monthly_price_usd.asc", {
    accessToken
  });
}

export async function loadOrganizationSubscriptions(accessToken: string): Promise<DbOrganizationSubscription[]> {
  return supabaseRest<DbOrganizationSubscription[]>(
    "organization_subscriptions?select=*,plan:subscription_plans!organization_subscriptions_plan_id_fkey(*)&order=created_at.desc&limit=8",
    { accessToken }
  );
}

export async function activateOrganizationSubscription(input: {
  accessToken: string;
  planId: string;
  seats: number;
}): Promise<DbOrganizationSubscription> {
  return supabaseRpc<DbOrganizationSubscription>(
    "activate_organization_subscription",
    {
      target_plan_id: input.planId,
      seat_count: input.seats
    },
    { accessToken: input.accessToken }
  );
}

export async function loadBillingArchitectureDecisionReceipts(accessToken: string): Promise<DbBillingArchitectureDecisionReceipt[]> {
  return supabaseRest<DbBillingArchitectureDecisionReceipt[]>(
    "billing_architecture_decision_receipts?select=*&order=created_at.desc&limit=5",
    { accessToken }
  );
}

export async function recordBillingArchitectureDecisionReceipt(input: {
  accessToken: string;
  selectedSeats: number;
  activeSubscriptionCount: number;
  status: DbBillingArchitectureDecisionReceipt["status"];
  metadata: Record<string, unknown>;
}): Promise<DbBillingArchitectureDecisionReceipt> {
  return supabaseRpc<DbBillingArchitectureDecisionReceipt>(
    "record_billing_architecture_decision_receipt",
    {
      input_selected_seats: input.selectedSeats,
      input_active_subscription_count: input.activeSubscriptionCount,
      input_status: input.status,
      input_metadata: input.metadata
    },
    { accessToken: input.accessToken }
  );
}
