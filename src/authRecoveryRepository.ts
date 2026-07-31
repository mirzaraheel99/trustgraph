import type { AuthRecoveryReceiptAction, DbAuthRecoveryReceipt, RegistrationIntentPortal } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadAuthRecoveryReceipts(accessToken: string): Promise<DbAuthRecoveryReceipt[]> {
  return supabaseRest<DbAuthRecoveryReceipt[]>("auth_recovery_receipts?select=*&order=created_at.desc&limit=8", {
    accessToken
  });
}

export async function recordAuthRecoveryReceipt(input: {
  accessToken: string;
  email: string;
  actionType: AuthRecoveryReceiptAction;
  selectedPortal: RegistrationIntentPortal;
  redirectUrl: string;
  localhostLinkDetected: boolean;
  metadata?: Record<string, unknown>;
}): Promise<DbAuthRecoveryReceipt> {
  return supabaseRpc<DbAuthRecoveryReceipt>(
    "record_auth_recovery_receipt",
    {
      input_email: input.email,
      input_action_type: input.actionType,
      input_selected_portal: input.selectedPortal,
      input_redirect_url: input.redirectUrl,
      input_localhost_link_detected: input.localhostLinkDetected,
      input_metadata: input.metadata ?? {}
    },
    { accessToken: input.accessToken }
  );
}
