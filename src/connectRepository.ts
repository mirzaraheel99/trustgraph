import type { ApiClientStatus, DbApiClient, DbWebhookSubscription, WebhookSubscriptionStatus } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadApiClients(accessToken: string): Promise<DbApiClient[]> {
  return supabaseRest<DbApiClient[]>(
    "api_clients?select=*,organization:organizations!api_clients_organization_id_fkey(id,name,type)&order=created_at.desc&limit=12",
    { accessToken }
  );
}

export async function loadWebhookSubscriptions(accessToken: string): Promise<DbWebhookSubscription[]> {
  return supabaseRest<DbWebhookSubscription[]>("webhook_subscriptions?select=*&order=created_at.desc&limit=12", {
    accessToken
  });
}

export async function createSampleApiClient(accessToken: string): Promise<DbApiClient> {
  return supabaseRpc<DbApiClient>("create_sample_api_client", {}, { accessToken });
}

export async function createWebhookSubscription(input: {
  accessToken: string;
  apiClientId: string;
  eventType: string;
  targetUrl: string;
}): Promise<DbWebhookSubscription> {
  return supabaseRpc<DbWebhookSubscription>(
    "create_webhook_subscription",
    {
      target_api_client_id: input.apiClientId,
      event_type: input.eventType,
      target_url: input.targetUrl
    },
    { accessToken: input.accessToken }
  );
}

export async function markApiClientStatus(input: {
  accessToken: string;
  apiClientId: string;
  status: ApiClientStatus;
}): Promise<DbApiClient> {
  return supabaseRpc<DbApiClient>(
    "mark_api_client_status",
    {
      target_api_client_id: input.apiClientId,
      next_status: input.status
    },
    { accessToken: input.accessToken }
  );
}

export async function markWebhookSubscriptionStatus(input: {
  accessToken: string;
  subscriptionId: string;
  status: WebhookSubscriptionStatus;
}): Promise<DbWebhookSubscription> {
  return supabaseRpc<DbWebhookSubscription>(
    "mark_webhook_subscription_status",
    {
      target_subscription_id: input.subscriptionId,
      next_status: input.status
    },
    { accessToken: input.accessToken }
  );
}
