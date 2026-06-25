import { getSupabase } from "@/lib/supabase/client";
import { throwIfError } from "@/lib/supabase/utils";

export async function resolveMarhalahIdByNumber(number: number): Promise<number> {
  const row = throwIfError(
    await getSupabase()
      .from("marhalahs")
      .select("id")
      .eq("number", number)
      .single()
  ) as { id: number };
  return row.id;
}
