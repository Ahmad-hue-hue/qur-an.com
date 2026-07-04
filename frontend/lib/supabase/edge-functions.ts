import { FunctionsHttpError } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { SupabaseApiError } from "@/lib/supabase/utils";

async function parseFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // Response body was not JSON.
    }
  }
  if (error instanceof Error && error.message) {
    if (error.message.includes("non-2xx")) {
      return "Request failed. Sign in again as an admin and retry.";
    }
    return error.message;
  }
  return "Request failed";
}

export async function invokeEdgeFunction<T>(
  name: string,
  body?: Record<string, unknown>
): Promise<T> {
  const supabase = getSupabase();

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new SupabaseApiError(
      "Your session expired. Please sign in again.",
      401
    );
  }

  const { data: refreshed } = await supabase.auth.refreshSession();
  const session = refreshed.session ?? sessionData.session;

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new SupabaseApiError(await parseFunctionError(error));
  }

  const result = data as { error?: string } | null;
  if (result?.error) {
    throw new SupabaseApiError(result.error);
  }

  return data as T;
}
