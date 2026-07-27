import type { DbOrganizationSubscription, DbSubscriptionPlan } from "./database";
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
