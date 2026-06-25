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

export async function resolveMarhalahNumberById(id: number): Promise<number> {
  const row = throwIfError(
    await getSupabase()
      .from("marhalahs")
      .select("number")
      .eq("id", id)
      .single()
  ) as { number: number };
  return row.number;
}
