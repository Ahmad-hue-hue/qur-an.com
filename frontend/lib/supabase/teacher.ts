import { adminApi } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase/client";
import { resolveMarhalahIdByNumber } from "@/lib/supabase/marhalah";
import { formatPhoneDisplay } from "@/lib/phone-auth";
import { mapProfileRow, SupabaseApiError, throwIfError } from "@/lib/supabase/utils";
import type {
  Gender,
  TeacherOverallResultRow,
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

  getOverallResults: async (): Promise<TeacherOverallResultRow[]> => {
    const students = await teacherApi.getStudents();
    if (students.length === 0) return [];

    const supabase = getSupabase();
    const studentIds = students.map((s) => s.id);

    const exerciseRows = throwIfError(
      await supabase
        .from("exercise_submissions")
        .select("student_id, score, max_score")
        .in("student_id", studentIds)
        .not("submitted_at", "is", null)
    ) as { student_id: string; score: number; max_score: number }[];

    const examRows = throwIfError(
      await supabase
        .from("exam_submissions")
        .select("student_id, score, max_score, submitted_at")
        .in("student_id", studentIds)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
    ) as {
      student_id: string;
      score: number;
      max_score: number;
      submitted_at: string;
    }[];

    const exerciseByStudent = new Map<string, { total: number; max: number; count: number }>();
    for (const row of exerciseRows ?? []) {
      const current = exerciseByStudent.get(row.student_id) ?? {
        total: 0,
        max: 0,
        count: 0,
      };
      current.total += Number(row.score);
      current.max += Number(row.max_score);
      current.count += 1;
      exerciseByStudent.set(row.student_id, current);
    }

    const examByStudent = new Map<string, { score: number; max: number }>();
    for (const row of examRows ?? []) {
      if (examByStudent.has(row.student_id)) continue;
      examByStudent.set(row.student_id, {
        score: Number(row.score),
        max: Number(row.max_score),
      });
    }

    return students
      .map((student) => {
        const exercise = exerciseByStudent.get(student.id);
        const exam = examByStudent.get(student.id);
        const exerciseAvg =
          exercise && exercise.max > 0
            ? Math.round((exercise.total / exercise.max) * 1000) / 10
            : null;
        const examPct =
          exam && exam.max > 0
            ? Math.round((exam.score / exam.max) * 1000) / 10
            : null;

        const parts: number[] = [];
        if (exerciseAvg != null) parts.push(exerciseAvg);
        if (examPct != null) parts.push(examPct);
        const overall_average =
          parts.length > 0
            ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10
            : null;

        return {
          student_id: student.id,
          phone: formatPhoneDisplay(student.phone),
          gender: student.gender ?? null,
          registration_number: student.registration_number ?? null,
          exercise_avg: exerciseAvg,
          exam_score: exam?.score ?? null,
          exam_max_score: exam?.max ?? null,
          overall_average,
        };
      })
      .sort((a, b) => a.phone.localeCompare(b.phone));
  },

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
