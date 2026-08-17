import { adminApi } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase/client";
import { resolveMarhalahIdByNumber } from "@/lib/supabase/marhalah";
import { mapProfileRow, SupabaseApiError, throwIfError } from "@/lib/supabase/utils";
import type {
  Gender,
  MarhalahResultsRoster,
  TeacherProfile,
  UpdateStudentData,
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

  getStudents: async (marhalah?: number): Promise<User[]> => {
    let query = getSupabase()
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("phone");
    if (marhalah != null) {
      query = query.eq("current_marhalah", marhalah);
    }
    const rows = throwIfError(await query);
    return (rows ?? []).map((row) => mapProfileRow(row));
  },

  getStudent: adminApi.getStudent,

  createStudent: adminApi.createStudent,

  updateStudent: async (id: string, data: UpdateStudentData) =>
    adminApi.updateStudent(id, data),

  deleteStudent: adminApi.deleteStudent,

  assignRegistrationNumber: async (id: string) => {
    throwIfError(
      await getSupabase().rpc("staff_assign_registration_number", {
        p_student_id: id,
      })
    );
    return adminApi.getStudent(id);
  },

  getMarhalahResultsRoster: async (
    marhalahNumber: number
  ): Promise<MarhalahResultsRoster> =>
    throwIfError(
      await getSupabase().rpc("get_teacher_marhalah_results_roster", {
        p_marhalah_number: marhalahNumber,
      })
    ) as MarhalahResultsRoster,

  getMarhalahResultsRosterForPdf: async (
    marhalahNumber: number
  ): Promise<MarhalahResultsRoster> =>
    throwIfError(
      await getSupabase().rpc("get_teacher_marhalah_results_roster_pdf", {
        p_marhalah_number: marhalahNumber,
      })
    ) as MarhalahResultsRoster,

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
      await getSupabase().rpc("upsert_manual_score", {
        p_student_id: data.student_id,
        p_marhalah_id: marhalahId,
        p_type: data.type,
        p_score: data.score,
        p_max_score: data.max_score ?? 20,
        p_notes: data.notes ?? "",
      })
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
        .eq("is_current", true)
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
