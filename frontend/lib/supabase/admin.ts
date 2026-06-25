import { getSupabase, getSupabaseUrl } from "@/lib/supabase/client";
import { resolveMarhalahIdByNumber, resolveMarhalahNumberById } from "@/lib/supabase/marhalah";
import {
  mapProfileRow,
  normalizePhone,
  SupabaseApiError,
  throwIfError,
} from "@/lib/supabase/utils";
import type {
  AdminStats,
  CreateExamData,
  CreateExerciseData,
  CreateQuestionData,
  CreateStudentData,
  Exam,
  ExamDetail,
  ExamSubmissionAdmin,
  Exercise,
  ExerciseDetail,
  ExerciseSubmissionAdmin,
  Question,
  QuestionAdmin,
  StudentProfile,
  Topic,
  UpdateStudentData,
  User,
} from "@/lib/types";

export interface CreateTopicData {
  marhalah: number;
  order: number;
  title: string;
  arabic_title?: string;
  content: string;
  arabic_content?: string;
  examples?: string;
  audio?: File | null;
  pdf?: File | null;
}

async function uploadLessonFile(
  bucket: "lesson-audio" | "lesson-pdfs",
  file: File,
  topicId: number
) {
  const supabase = getSupabase();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `topics/${topicId}/${Date.now()}.${ext}`;
  const contentType =
    bucket === "lesson-audio"
      ? file.type || "audio/mpeg"
      : file.type || "application/pdf";

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType,
  });
  if (error) throw new SupabaseApiError(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function mapQuestionRow(q: Record<string, unknown>): QuestionAdmin {
  return {
    id: q.id as number,
    type: q.type as QuestionAdmin["type"],
    text: q.text as string,
    arabic_text: (q.arabic_text as string) || undefined,
    options: (q.options as string[]) ?? [],
    correct_answer: (q.correct_answer as string) || undefined,
    order: q.order as number,
    max_score: q.max_score as number,
    exercise: (q.exercise_id as number) ?? undefined,
    exam: (q.exam_id as number) ?? undefined,
  };
}

async function buildStudentProfile(studentId: string): Promise<StudentProfile> {
  const supabase = getSupabase();
  const profile = throwIfError(
    await supabase.from("profiles").select("*").eq("id", studentId).single()
  );

  const marhalah = throwIfError(
    await supabase
      .from("marhalahs")
      .select("id")
      .eq("number", profile.current_marhalah)
      .single()
  ) as { id: number };

  const topics = throwIfError(
    await supabase
      .from("topics")
      .select("id")
      .eq("marhalah_id", marhalah.id)
      .eq("is_published", true)
  ) as { id: number }[];

  const completions = throwIfError(
    await supabase
      .from("topic_completions")
      .select("topic_id")
      .eq("student_id", studentId)
      .in(
        "topic_id",
        topics.map((t) => t.id)
      )
  ) as { topic_id: number }[];

  const total = topics.length;
  const completed = completions.length;

  const marhalahs = throwIfError(
    await supabase.from("marhalahs").select("id")
  ) as { id: number }[];

  const averages: number[] = [];
  for (const m of marhalahs) {
    const score = throwIfError(
      await supabase.rpc("calculate_final_score", {
        p_student_id: studentId,
        p_marhalah_id: m.id,
      })
    );
    if (Number(score) > 0) averages.push(Number(score));
  }

  return {
    ...mapProfileRow(profile),
    current_marhalah: profile.current_marhalah,
    progress_percent: total ? Math.round((completed / total) * 100) : 0,
    topics_completed: completed,
    total_topics: total,
    overall_average:
      averages.length > 0
        ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) /
          10
        : 0,
    has_attempted_exercise: profile.has_attempted_exercise,
  };
}

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const supabase = getSupabase();
    const [students, marhalahs, topics, exercises, exams] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student"),
      supabase.from("marhalahs").select("id", { count: "exact", head: true }),
      supabase.from("topics").select("id", { count: "exact", head: true }),
      supabase.from("exercises").select("id", { count: "exact", head: true }),
      supabase.from("exams").select("id", { count: "exact", head: true }),
    ]);

    return {
      total_students: students.count ?? 0,
      total_marhalahs: marhalahs.count ?? 0,
      total_topics: topics.count ?? 0,
      total_assessments: (exercises.count ?? 0) + (exams.count ?? 0),
    };
  },

  getStudents: async (): Promise<User[]> => {
    const rows = throwIfError(
      await getSupabase()
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("created_at", { ascending: false })
    );
    return (rows ?? []).map((row) => mapProfileRow(row));
  },

  createStudent: async (
    data: CreateStudentData
  ): Promise<User & { login_email?: string; temporary_password?: string }> => {
    const supabase = getSupabase();
    const phone = normalizePhone(data.phone);
    const { data: result, error } = await supabase.functions.invoke(
      "create-student",
      {
        body: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone,
        },
      }
    );
    if (error) throw new SupabaseApiError(error.message);
    if (result?.error) throw new SupabaseApiError(result.error);
    return {
      ...mapProfileRow(result.profile),
      login_email: result.login_email,
      temporary_password: result.temporary_password,
    };
  },

  getStudent: async (id: string): Promise<StudentProfile> => buildStudentProfile(id),

  updateStudent: async (
    id: string,
    data: UpdateStudentData
  ): Promise<StudentProfile> => {
    const payload: Record<string, unknown> = { ...data };
    if (data.phone) payload.phone = normalizePhone(data.phone);
    throwIfError(
      await getSupabase().from("profiles").update(payload).eq("id", id)
    );
    return buildStudentProfile(id);
  },

  deleteStudent: async (id: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.functions.invoke("delete-student", {
      body: { student_id: id },
    });
    if (error) throw new SupabaseApiError(error.message);
  },

  assignRegistrationNumber: async (id: string): Promise<StudentProfile> => {
    throwIfError(
      await getSupabase().rpc("assign_registration_number", {
        p_student_id: id,
      })
    );
    return buildStudentProfile(id);
  },

  getTopics: async (marhalahNumber?: number): Promise<Topic[]> => {
    let query = getSupabase().from("topics").select("*").order("order");
    if (marhalahNumber != null) {
      const marhalahId = await resolveMarhalahIdByNumber(marhalahNumber);
      query = query.eq("marhalah_id", marhalahId);
    }
    const rows = throwIfError(await query) as Record<string, unknown>[];
    const topics: Topic[] = [];
    for (const t of rows) {
      const marhalahNumberValue = await resolveMarhalahNumberById(t.marhalah_id as number);
      topics.push({
        id: t.id as number,
        marhalah: marhalahNumberValue,
        order: t.order as number,
        title: t.title as string,
        arabic_title: (t.arabic_title as string) || undefined,
        content: t.content as string,
        arabic_content: (t.arabic_content as string) || undefined,
        examples: (t.examples as string) || undefined,
        audio_url: (t.audio_url as string) ?? undefined,
        pdf_url: (t.pdf_url as string) ?? undefined,
        is_completed: false,
        status: "active",
      });
    }
    return topics;
  },

  createTopic: async (data: CreateTopicData): Promise<Topic> => {
    const supabase = getSupabase();
    const marhalahId = await resolveMarhalahIdByNumber(data.marhalah);

    let audio_url: string | null = null;
    let pdf_url: string | null = null;

    const inserted = throwIfError(
      await supabase.rpc("admin_create_topic", {
        p_marhalah_id: marhalahId,
        p_order: data.order,
        p_title: data.title,
        p_arabic_title: data.arabic_title ?? "",
        p_content: data.content,
        p_arabic_content: data.arabic_content ?? "",
        p_examples: data.examples ?? "",
      })
    ) as Record<string, unknown>;

    const topicId = inserted.id as number;

    if (data.audio) {
      audio_url = await uploadLessonFile("lesson-audio", data.audio, topicId);
    }
    if (data.pdf) {
      pdf_url = await uploadLessonFile("lesson-pdfs", data.pdf, topicId);
    }

    if (audio_url || pdf_url) {
      throwIfError(
        await supabase.rpc("admin_update_topic", {
          p_id: topicId,
          p_marhalah_id: marhalahId,
          p_order: data.order,
          p_title: data.title,
          p_arabic_title: data.arabic_title ?? "",
          p_content: data.content,
          p_arabic_content: data.arabic_content ?? "",
          p_examples: data.examples ?? "",
          p_audio_url: audio_url,
          p_pdf_url: pdf_url,
        })
      );
    }

    return adminApi.getTopic(topicId);
  },

  getTopic: async (id: number): Promise<Topic> => {
    const row = throwIfError(
      await getSupabase().from("topics").select("*").eq("id", id).single()
    ) as Record<string, unknown>;
    const marhalahNumber = await resolveMarhalahNumberById(row.marhalah_id as number);
    return {
      id: row.id as number,
      marhalah: marhalahNumber,
      order: row.order as number,
      title: row.title as string,
      arabic_title: (row.arabic_title as string) || undefined,
      content: row.content as string,
      arabic_content: (row.arabic_content as string) || undefined,
      examples: (row.examples as string) || undefined,
      audio_url: (row.audio_url as string) ?? undefined,
      pdf_url: (row.pdf_url as string) ?? undefined,
      is_completed: false,
      status: "active",
    };
  },

  updateTopic: async (data: CreateTopicData & { id: number }): Promise<Topic> => {
    const supabase = getSupabase();
    const marhalahId = await resolveMarhalahIdByNumber(data.marhalah);
    const existing = await adminApi.getTopic(data.id);
    let audio_url = existing.audio_url ?? null;
    let pdf_url = existing.pdf_url ?? null;

    if (data.audio) {
      audio_url = await uploadLessonFile("lesson-audio", data.audio, data.id);
    }
    if (data.pdf) {
      pdf_url = await uploadLessonFile("lesson-pdfs", data.pdf, data.id);
    }

    throwIfError(
      await supabase.rpc("admin_update_topic", {
        p_id: data.id,
        p_marhalah_id: marhalahId,
        p_order: data.order,
        p_title: data.title,
        p_arabic_title: data.arabic_title ?? "",
        p_content: data.content,
        p_arabic_content: data.arabic_content ?? "",
        p_examples: data.examples ?? "",
        p_audio_url: audio_url,
        p_pdf_url: pdf_url,
      })
    );

    return adminApi.getTopic(data.id);
  },

  deleteTopic: async (id: number): Promise<void> => {
    throwIfError(await getSupabase().rpc("admin_delete_topic", { p_id: id }));
  },

  getExercises: async (marhalahNumber?: number): Promise<Exercise[]> => {
    const supabase = getSupabase();
    let query = supabase.from("exercises").select("*").order("start_date");
    if (marhalahNumber != null) {
      const marhalahId = await resolveMarhalahIdByNumber(marhalahNumber);
      query = query.eq("marhalah_id", marhalahId);
    }
    const rows = throwIfError(await query) as Record<string, unknown>[];

    const exercises: Exercise[] = [];
    for (const e of rows) {
      const exerciseId = e.id as number;
      const questionCount = (
        await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("exercise_id", exerciseId)
      ).count;

      exercises.push({
        id: exerciseId,
        marhalah: e.marhalah_id as number,
        title: e.title as string,
        description: (e.description as string) || undefined,
        start_date: e.start_date as string,
        end_date: e.end_date as string,
        status: "open",
        question_count: questionCount ?? 0,
        has_submitted: false,
      });
    }
    return exercises;
  },

  createExercise: async (data: CreateExerciseData): Promise<Exercise> => {
    const supabase = getSupabase();
    const marhalahId = await resolveMarhalahIdByNumber(data.marhalah);
    const inserted = throwIfError(
      await supabase
        .from("exercises")
        .insert({
          marhalah_id: marhalahId,
          title: data.title,
          description: data.description ?? "",
          start_date: data.start_date,
          end_date: data.end_date,
        })
        .select("*")
        .single()
    ) as Record<string, unknown>;

    if (data.question_text?.trim()) {
      const qType = data.question_type ?? "mcq";
      throwIfError(
        await supabase.from("questions").insert({
          exercise_id: inserted.id,
          type: qType,
          text: data.question_text.trim(),
          options: qType === "mcq" ? (data.question_options ?? []) : [],
          correct_answer:
            qType === "true_false"
              ? data.correct_answer || "true"
              : (data.correct_answer ?? data.question_options?.[0] ?? ""),
          order: 1,
          max_score: 1,
        })
      );
    }

    return {
      id: inserted.id as number,
      marhalah: inserted.marhalah_id as number,
      title: inserted.title as string,
      description: (inserted.description as string) || undefined,
      start_date: inserted.start_date as string,
      end_date: inserted.end_date as string,
      status: "open",
      question_count: data.question_text ? 1 : 0,
      has_submitted: false,
    };
  },

  updateExercise: async (
    id: number,
    data: Partial<CreateExerciseData>
  ): Promise<Exercise> => {
    const payload: Record<string, unknown> = {};
    if (data.marhalah != null) {
      payload.marhalah_id = await resolveMarhalahIdByNumber(data.marhalah);
    }
    if (data.title != null) payload.title = data.title;
    if (data.description != null) payload.description = data.description;
    if (data.start_date != null) payload.start_date = data.start_date;
    if (data.end_date != null) payload.end_date = data.end_date;
    throwIfError(
      await getSupabase().from("exercises").update(payload).eq("id", id)
    );
    const rows = await adminApi.getExercises();
    return rows.find((e) => e.id === id)!;
  },

  deleteExercise: async (id: number): Promise<void> => {
    throwIfError(await getSupabase().from("exercises").delete().eq("id", id));
  },

  getExercise: async (id: number): Promise<ExerciseDetail> => {
    const exercise = throwIfError(
      await getSupabase().from("exercises").select("*").eq("id", id).single()
    ) as Record<string, unknown>;
    const questions = throwIfError(
      await getSupabase()
        .from("questions")
        .select("*")
        .eq("exercise_id", id)
        .order("order")
    ) as Record<string, unknown>[];
    const marhalahNumber = await resolveMarhalahNumberById(exercise.marhalah_id as number);

    return {
      id: exercise.id as number,
      marhalah: marhalahNumber,
      title: exercise.title as string,
      description: (exercise.description as string) || undefined,
      start_date: exercise.start_date as string,
      end_date: exercise.end_date as string,
      status: "open",
      question_count: questions.length,
      has_submitted: false,
      questions: questions.map(mapQuestionRow),
    };
  },

  addExerciseQuestion: async (
    exerciseId: number,
    data: CreateQuestionData
  ): Promise<Question> => {
    const supabase = getSupabase();
    let order = data.order;
    if (order == null) {
      const last = (
        await supabase
          .from("questions")
          .select("order")
          .eq("exercise_id", exerciseId)
          .order("order", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;
      order = last ? Number(last.order) + 1 : 1;
    }

    const row = throwIfError(
      await supabase
        .from("questions")
        .insert({
          exercise_id: exerciseId,
          type: data.type,
          text: data.text,
          arabic_text: data.arabic_text ?? "",
          options: data.options ?? [],
          correct_answer: data.correct_answer ?? "",
          order,
          max_score: data.max_score ?? 1,
        })
        .select("*")
        .single()
    );
    return mapQuestionRow(row);
  },

  updateExerciseQuestion: async (
    exerciseId: number,
    questionId: number,
    data: Partial<CreateQuestionData>
  ): Promise<Question> => {
    const payload: Record<string, unknown> = {};
    if (data.type != null) payload.type = data.type;
    if (data.text != null) payload.text = data.text;
    if (data.arabic_text != null) payload.arabic_text = data.arabic_text;
    if (data.options != null) payload.options = data.options;
    if (data.correct_answer != null) payload.correct_answer = data.correct_answer;
    if (data.order != null) payload.order = data.order;
    if (data.max_score != null) payload.max_score = data.max_score;

    const row = throwIfError(
      await getSupabase()
        .from("questions")
        .update(payload)
        .eq("id", questionId)
        .eq("exercise_id", exerciseId)
        .select("*")
        .single()
    );
    return mapQuestionRow(row);
  },

  deleteExerciseQuestion: async (
    exerciseId: number,
    questionId: number
  ): Promise<void> => {
    throwIfError(
      await getSupabase()
        .from("questions")
        .delete()
        .eq("id", questionId)
        .eq("exercise_id", exerciseId)
    );
  },

  getExerciseSubmissions: async (
    exerciseId: number,
    pendingOnly?: boolean
  ): Promise<ExerciseSubmissionAdmin[]> => {
    const supabase = getSupabase();
    let query = supabase
      .from("exercise_submissions")
      .select(
        `
        *,
        profiles:student_id ( first_name, last_name ),
        exercise_answer_grades (
          id, question_id, answer_text, score, max_score, feedback, graded_at,
          questions:question_id ( text, type, correct_answer )
        )
      `
      )
      .eq("exercise_id", exerciseId)
      .order("submitted_at", { ascending: false });

    if (pendingOnly) {
      query = query.eq("grading_status", "pending_manual");
    }

    const rows = throwIfError(await query) as Record<string, unknown>[];

    return rows.map((row) => {
      const profile = row.profiles as { first_name: string; last_name: string };
      const grades = (row.exercise_answer_grades as Record<string, unknown>[]) ?? [];
      return {
        id: row.id as number,
        student: row.student_id as string,
        student_name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
        exercise: row.exercise_id as number,
        answers: row.answers as Record<string, string>,
        score: Number(row.score),
        max_score: Number(row.max_score),
        grading_status: row.grading_status as ExerciseSubmissionAdmin["grading_status"],
        submitted_at: row.submitted_at as string,
        answer_grades: grades.map((g) => {
          const question = g.questions as {
            text: string;
            type: string;
            correct_answer?: string;
          };
          return {
            id: g.id as number,
            question_id: g.question_id as number,
            question_text: question?.text ?? "",
            question_type: question?.type as ExerciseSubmissionAdmin["answer_grades"][0]["question_type"],
            answer_text: g.answer_text as string,
            correct_answer: question?.correct_answer || undefined,
            score: g.score != null ? Number(g.score) : null,
            max_score: Number(g.max_score),
            feedback: (g.feedback as string) || undefined,
            graded_at: (g.graded_at as string) ?? null,
          };
        }),
      };
    });
  },

  gradeExerciseAnswer: async (
    gradeId: number,
    data: { score: number; feedback?: string }
  ) => {
    const result = throwIfError(
      await getSupabase().rpc("grade_exercise_answer", {
        p_grade_id: gradeId,
        p_score: data.score,
        p_feedback: data.feedback ?? "",
      })
    );
    return result;
  },

  getExams: async (marhalahNumber?: number): Promise<Exam[]> => {
    let query = getSupabase().from("exams").select("*").order("start_date");
    if (marhalahNumber != null) {
      const marhalahId = await resolveMarhalahIdByNumber(marhalahNumber);
      query = query.eq("marhalah_id", marhalahId);
    }
    const rows = throwIfError(await query) as Record<string, unknown>[];
    const supabase = getSupabase();
    const exams: Exam[] = [];
    for (const e of rows) {
      const examId = e.id as number;
      const { count, error } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", examId);
      if (error) throw new SupabaseApiError(error.message);
      const marhalahNumber = await resolveMarhalahNumberById(e.marhalah_id as number);
      exams.push({
        id: examId,
        marhalah: marhalahNumber,
        title: e.title as string,
        description: (e.description as string) || undefined,
        duration_minutes: Number(e.duration_minutes),
        start_date: e.start_date as string,
        end_date: e.end_date as string,
        status: "open",
        question_count: count ?? 0,
        has_submitted: false,
      });
    }
    return exams;
  },

  createExam: async (data: CreateExamData): Promise<Exam> => {
    const marhalahId = await resolveMarhalahIdByNumber(data.marhalah);
    const row = throwIfError(
      await getSupabase()
        .from("exams")
        .insert({
          marhalah_id: marhalahId,
          title: data.title,
          description: data.description ?? "",
          duration_minutes: data.duration_minutes ?? 60,
          start_date: data.start_date,
          end_date: data.end_date,
        })
        .select("*")
        .single()
    ) as Record<string, unknown>;
    const marhalahNumber = await resolveMarhalahNumberById(row.marhalah_id as number);
    return {
      id: row.id as number,
      marhalah: marhalahNumber,
      title: row.title as string,
      description: (row.description as string) || undefined,
      duration_minutes: Number(row.duration_minutes),
      start_date: row.start_date as string,
      end_date: row.end_date as string,
      status: "open",
      question_count: 0,
      has_submitted: false,
    };
  },

  updateExam: async (
    id: number,
    data: Partial<CreateExamData>
  ): Promise<Exam> => {
    const payload: Record<string, unknown> = {};
    if (data.marhalah != null) {
      payload.marhalah_id = await resolveMarhalahIdByNumber(data.marhalah);
    }
    if (data.title != null) payload.title = data.title;
    if (data.description != null) payload.description = data.description;
    if (data.duration_minutes != null) payload.duration_minutes = data.duration_minutes;
    if (data.start_date != null) payload.start_date = data.start_date;
    if (data.end_date != null) payload.end_date = data.end_date;
    throwIfError(await getSupabase().from("exams").update(payload).eq("id", id));
    const rows = await adminApi.getExams();
    return rows.find((e) => e.id === id)!;
  },

  deleteExam: async (id: number): Promise<void> => {
    throwIfError(await getSupabase().from("exams").delete().eq("id", id));
  },

  getExam: async (id: number): Promise<ExamDetail> => {
    const exam = throwIfError(
      await getSupabase().from("exams").select("*").eq("id", id).single()
    ) as Record<string, unknown>;
    const questions = throwIfError(
      await getSupabase()
        .from("questions")
        .select("*")
        .eq("exam_id", id)
        .order("order")
    ) as Record<string, unknown>[];
    const marhalahNumber = await resolveMarhalahNumberById(exam.marhalah_id as number);

    return {
      id: exam.id as number,
      marhalah: marhalahNumber,
      title: exam.title as string,
      description: (exam.description as string) || undefined,
      duration_minutes: Number(exam.duration_minutes),
      start_date: exam.start_date as string,
      end_date: exam.end_date as string,
      status: "open",
      question_count: questions.length,
      has_submitted: false,
      questions: questions.map(mapQuestionRow),
    };
  },

  addExamQuestion: async (
    examId: number,
    data: CreateQuestionData
  ): Promise<Question> => {
    const supabase = getSupabase();
    let order = data.order;
    if (order == null) {
      const last = (
        await supabase
          .from("questions")
          .select("order")
          .eq("exam_id", examId)
          .order("order", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;
      order = last ? Number(last.order) + 1 : 1;
    }

    const row = throwIfError(
      await supabase
        .from("questions")
        .insert({
          exam_id: examId,
          type: data.type,
          text: data.text,
          arabic_text: data.arabic_text ?? "",
          options: data.options ?? [],
          correct_answer: data.correct_answer ?? "",
          order,
          max_score: data.max_score ?? 1,
        })
        .select("*")
        .single()
    );
    return mapQuestionRow(row);
  },

  updateExamQuestion: async (
    examId: number,
    questionId: number,
    data: Partial<CreateQuestionData>
  ): Promise<Question> => {
    const payload: Record<string, unknown> = {};
    if (data.type != null) payload.type = data.type;
    if (data.text != null) payload.text = data.text;
    if (data.arabic_text != null) payload.arabic_text = data.arabic_text;
    if (data.options != null) payload.options = data.options;
    if (data.correct_answer != null) payload.correct_answer = data.correct_answer;
    if (data.order != null) payload.order = data.order;
    if (data.max_score != null) payload.max_score = data.max_score;

    const row = throwIfError(
      await getSupabase()
        .from("questions")
        .update(payload)
        .eq("id", questionId)
        .eq("exam_id", examId)
        .select("*")
        .single()
    );
    return mapQuestionRow(row);
  },

  deleteExamQuestion: async (examId: number, questionId: number): Promise<void> => {
    throwIfError(
      await getSupabase()
        .from("questions")
        .delete()
        .eq("id", questionId)
        .eq("exam_id", examId)
    );
  },

  getExamSubmissions: async (examId: number): Promise<ExamSubmissionAdmin[]> => {
    const rows = throwIfError(
      await getSupabase()
        .from("exam_submissions")
        .select(
          `
          *,
          profiles:student_id ( first_name, last_name )
        `
        )
        .eq("exam_id", examId)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
    ) as Record<string, unknown>[];

    return rows.map((row) => {
      const profile = row.profiles as { first_name: string; last_name: string };
      return {
        id: row.id as number,
        student_name: `${profile.first_name} ${profile.last_name}`,
        score: Number(row.score),
        max_score: Number(row.max_score),
        submitted_at: row.submitted_at as string,
        answers: (row.answers as Record<string, string>) ?? {},
      };
    });
  },
};

export { getSupabaseUrl };
