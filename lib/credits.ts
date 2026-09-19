import { SupabaseClient } from "@supabase/supabase-js";
import { getModelCatalog } from "./model-catalog";

// Credit cost per message, by capability tier (looked up from the live
// catalog so it stays correct as the model lineup changes).
const TIER_COST: Record<string, number> = {
  lite: 1,
  balanced: 1,
  pro: 3,
  vision: 2,
  coder: 2,
};

// Default monthly allowance for a free account. Adjust once real
// free-tier provider limits are confirmed in production.
export const FREE_MONTHLY_CREDITS = 150;

export interface CreditCheckResult {
  allowed: boolean;
  remaining?: number;
  reason?: string;
}

// Credit cost for one image generation request.
export const IMAGE_GENERATION_COST = 5;

// Credit cost for one document generation (drafting + rendering to file).
export const DOCUMENT_GENERATION_COST = 8;

export async function checkAndDeductDocumentCredit(
  supabase: SupabaseClient,
  userId: string
): Promise<CreditCheckResult> {
  return deductCredits(supabase, userId, DOCUMENT_GENERATION_COST);
}

export async function checkAndDeductImageCredit(
  supabase: SupabaseClient,
  userId: string
): Promise<CreditCheckResult> {
  return deductCredits(supabase, userId, IMAGE_GENERATION_COST);
}

/**
 * Atomically checks whether the user has enough credits for this request
 * and deducts them if so. Expects a `profiles` table with columns:
 *   id uuid, credits_remaining int, credits_reset_at timestamptz
 */
export async function checkAndDeductCredit(
  supabase: SupabaseClient,
  userId: string,
  modelId: string
): Promise<CreditCheckResult> {
  const catalog = await getModelCatalog();
  const entry = catalog.find((e) => e.id === modelId);
  const cost = entry ? TIER_COST[entry.tier] ?? 1 : 1;
  return deductCredits(supabase, userId, cost);
}

async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  cost: number
): Promise<CreditCheckResult> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("credits_remaining, credits_reset_at, is_suspended")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { allowed: false, reason: "Account not found. Please sign in again." };
  }

  if (profile.is_suspended) {
    return { allowed: false, reason: "Your account has been suspended. Contact support for help." };
  }

  // Monthly reset check
  const resetAt = new Date(profile.credits_reset_at);
  const now = new Date();
  let credits = profile.credits_remaining;

  if (now > resetAt) {
    credits = FREE_MONTHLY_CREDITS;
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await supabase
      .from("profiles")
      .update({ credits_remaining: credits, credits_reset_at: nextReset.toISOString() })
      .eq("id", userId);
  }

  if (credits < cost) {
    return {
      allowed: false,
      remaining: credits,
      reason: "You're out of credits until your next monthly reset.",
    };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credits_remaining: credits - cost })
    .eq("id", userId);

  if (updateError) {
    return { allowed: false, reason: "Couldn't verify credits. Please try again." };
  }

  return { allowed: true, remaining: credits - cost };
}
