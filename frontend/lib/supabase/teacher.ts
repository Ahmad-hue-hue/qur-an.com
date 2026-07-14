import { adminApi } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase/client";
import { resolveMarhalahIdByNumber } from "@/lib/supabase/marhalah";
import { mapProfileRow, SupabaseApiError, throwIfError } from "@/lib/supabase/utils";
import type {
  Gender,
  MarhalahResultsRoster,
  TeacherProfile,
  User,
} from "@/lib/types";

export const teacherApi = {
  getProfile: async (): Promise<TeacherProfile> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new SupabaseApiError("Not signed in", 401);

    const row = throwIfError(
      await supabase.from("profiles").select("*").eq("id", user.id).single()
    );

    if (row.role !== "teacher") {
      throw new SupabaseApiError("Teacher access required", 403);
    }
    if (row.managed_marhalah == null) {
      throw new SupabaseApiError("Teacher profile is incomplete. Contact admin.");
    }

    return {
      ...mapProfileRow(row),
      gender: (row.gender as Gender) ?? "male",
      managed_marhalah: Number(row.managed_marhalah),
      email: user.email ?? "",
    };
  },

  setManagedMarhalah: async (marhalah: number): Promise<void> => {
    throwIfError(
      await getSupabase().rpc("set_managed_marhalah", {
        p_marhalah: marhalah,
      })
    );
  },

  getMarhalahs: adminApi.getMarhalahs,

  getStudents: async (): Promise<User[]> => {
    const rows = throwIfError(
      await getSupabase()
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("phone")
    );
    return (rows ?? []).map((row) => mapProfileRow(row));
  },

  getMarhalahResultsRoster: (
    marhalahNumber: number
  ): Promise<MarhalahResultsRoster> =>
    adminApi.getMarhalahResultsRoster(marhalahNumber),

  upsertManualScore: async (data: {
    student_id: string;
    marhalah: number;
    type: "halaqah" | "tadreeb";
    score: number;
    max_score?: number;
    notes?: string;
  }) => {
    const marhalahId = await resolveMarhalahIdByNumber(data.marhalah);
    throwIfError(
      await getSupabase()
        .from("manual_scores")
        .upsert(
          {
            student_id: data.student_id,
            marhalah_id: marhalahId,
            type: data.type,
            score: data.score,
            max_score: data.max_score ?? 20,
            notes: data.notes ?? "",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,marhalah_id,type" }
        )
    );
  },

  getManualScores: async (studentId: string, marhalah: number) => {
    const marhalahId = await resolveMarhalahIdByNumber(marhalah);
    const rows = throwIfError(
      await getSupabase()
        .from("manual_scores")
        .select("*")
        .eq("student_id", studentId)
        .eq("marhalah_id", marhalahId)
    );
    return rows ?? [];
  },

  getExercises: adminApi.getExercises,
  createExercise: adminApi.createExercise,
  updateExercise: adminApi.updateExercise,
  deleteExercise: adminApi.deleteExercise,
  getExercise: adminApi.getExercise,
  addExerciseQuestion: adminApi.addExerciseQuestion,
  updateExerciseQuestion: adminApi.updateExerciseQuestion,
  deleteExerciseQuestion: adminApi.deleteExerciseQuestion,
  getExerciseSubmissions: adminApi.getExerciseSubmissions,
  gradeExerciseAnswer: adminApi.gradeExerciseAnswer,

  getExams: adminApi.getExams,
  createExam: adminApi.createExam,
  updateExam: adminApi.updateExam,
  deleteExam: adminApi.deleteExam,
  getExam: adminApi.getExam,
  addExamQuestion: adminApi.addExamQuestion,
  updateExamQuestion: adminApi.updateExamQuestion,
  deleteExamQuestion: adminApi.deleteExamQuestion,
  getExamSubmissions: adminApi.getExamSubmissions,
  gradeExamAnswer: adminApi.gradeExamAnswer,
};
