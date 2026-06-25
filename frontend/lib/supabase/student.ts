import { getSupabase } from "@/lib/supabase/client";
import {
  resolveMarhalahIdByNumber,
  resolveMarhalahNumberById,
} from "@/lib/supabase/marhalah";
import { mapProfileRow, SupabaseApiError, throwIfError } from "@/lib/supabase/utils";
import type {
  AssessmentSubmissionResults,
  DashboardData,
  Exercise,
  Exam,
  ManualScore,
  Marhalah,
  Question,
  StudentProfile,
  Topic,
} from "@/lib/types";

type DbMarhalah = {
  id: number;
  number: number;
  title: string;
  description: string;
  unlock_threshold: number;
};

type DbTopic = {
  id: number;
  marhalah_id: number;
  order: number;
  title: string;
  arabic_title: string;
  content: string;
  arabic_content: string;
  examples: string;
  audio_url: string | null;
  pdf_url: string | null;
  is_published: boolean;
};

async function getCurrentProfile() {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const profile = throwIfError(
    await supabase.from("profiles").select("*").eq("id", user.id).single()
  );
  if (profile.is_suspended) {
    throw new Error(
      "Your account has been suspended. Please contact your instructor."
    );
  }
  return { user, profile };
}

async function getMarhalahByNumber(number: number) {
  const supabase = getSupabase();
  return throwIfError(
    await supabase.from("marhalahs").select("*").eq("number", number).single()
  ) as DbMarhalah;
}

async function assertExerciseAccessible(
  exercise: Record<string, unknown>,
  marhalahId: number
) {
  if ((exercise.marhalah_id as number) !== marhalahId) {
    throw new Error(
      "This exercise belongs to a different Marḥalah than your current stage."
    );
  }
}

async function assertExamAccessible(
  exam: Record<string, unknown>,
  marhalahId: number,
  studentId: string
) {
  if ((exam.marhalah_id as number) !== marhalahId) {
    throw new Error(
      "This exam belongs to a different Marḥalah than your current stage."
    );
  }

  const completed = throwIfError(
    await getSupabase().rpc("marhalah_topics_completed", {
      p_student_id: studentId,
      p_marhalah_id: marhalahId,
    })
  ) as boolean;

  if (!completed) {
    throw new Error(
      "Complete all topics in this Marḥalah before taking the exam."
    );
  }
}

async function getStudentProgress(studentId: string, marhalahId: number) {
  const supabase = getSupabase();
  const topics = throwIfError(
    await supabase
      .from("topics")
      .select("id")
      .eq("marhalah_id", marhalahId)
      .eq("is_published", true)
  ) as { id: number }[];

  const total = topics.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };

  const topicIds = topics.map((t) => t.id);
  const completions = throwIfError(
    await supabase
      .from("topic_completions")
      .select("topic_id")
      .eq("student_id", studentId)
      .in("topic_id", topicIds)
  ) as { topic_id: number }[];

  const completed = completions.length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

async function getFinalScore(studentId: string, marhalahId: number) {
  const supabase = getSupabase();
  const score = throwIfError(
    await supabase.rpc("calculate_final_score", {
      p_student_id: studentId,
      p_marhalah_id: marhalahId,
    })
  );
  return Number(score ?? 0);
}

async function isMarhalahUnlocked(studentId: string, marhalahId: number) {
  const supabase = getSupabase();
  return Boolean(
    throwIfError(
      await supabase.rpc("is_marhalah_unlocked", {
        p_student_id: studentId,
        p_marhalah_id: marhalahId,
      })
    )
  );
}

async function getMarhalahStatus(
  studentId: string,
  marhalah: DbMarhalah,
  finalScore?: number
): Promise<Marhalah["status"]> {
  const unlocked = await isMarhalahUnlocked(studentId, marhalah.id);
  if (!unlocked) return "locked";

  const { completed, total } = await getStudentProgress(studentId, marhalah.id);
  if (total > 0 && completed >= total) {
    const score =
      finalScore ?? (await getFinalScore(studentId, marhalah.id));
    if (score > 0) return "completed";
  }
  return "open";
}

function mapTopic(
  topic: DbTopic,
  completedIds: Set<number>,
  activeTopicId: number | null
): Topic {
  const isCompleted = completedIds.has(topic.id);
  let status: Topic["status"] = "locked";
  if (isCompleted) status = "completed";
  else if (topic.id === activeTopicId) status = "active";

  return {
    id: topic.id,
    marhalah: topic.marhalah_id,
    order: topic.order,
    title: topic.title,
    arabic_title: topic.arabic_title || undefined,
    content: topic.content,
    arabic_content: topic.arabic_content || undefined,
    examples: topic.examples || undefined,
    audio_url: topic.audio_url ?? undefined,
    pdf_url: topic.pdf_url ?? undefined,
    is_completed: isCompleted,
    status,
  };
}

async function buildExerciseRow(
  exercise: Record<string, unknown>,
  studentId: string
): Promise<Exercise> {
  const supabase = getSupabase();
  const exerciseId = exercise.id as number;

  const submission = throwIfError(
    await supabase
      .from("exercise_submissions")
      .select("*")
      .eq("student_id", studentId)
      .eq("exercise_id", exerciseId)
      .maybeSingle()
  );

  const { count: questionCount, error: countError } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);
  if (countError) throw new SupabaseApiError(countError.message);

  const status = throwIfError(
    await supabase.rpc("get_assessment_status", {
      p_start: exercise.start_date,
      p_end: exercise.end_date,
      p_has_submitted: Boolean(submission),
    })
  ) as Exercise["status"];

  const marhalahNumber = await resolveMarhalahNumberById(exercise.marhalah_id as number);

  return {
    id: exerciseId,
    marhalah: marhalahNumber,
    title: exercise.title as string,
    description: (exercise.description as string) || undefined,
    start_date: exercise.start_date as string,
    end_date: exercise.end_date as string,
    status,
    question_count: questionCount ?? 0,
    score: submission ? Number(submission.score) : undefined,
    max_score: submission ? Number(submission.max_score) : undefined,
    has_submitted: Boolean(submission),
    grading_status: submission?.grading_status as Exercise["grading_status"],
  };
}

async function buildExamRow(
  exam: Record<string, unknown>,
  studentId: string
): Promise<Exam> {
  const supabase = getSupabase();
  const examId = exam.id as number;

  const submission = throwIfError(
    await supabase
      .from("exam_submissions")
      .select("*")
      .eq("student_id", studentId)
      .eq("exam_id", examId)
      .maybeSingle()
  );

  const { count: questionCount, error: countError } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);
  if (countError) throw new SupabaseApiError(countError.message);

  const hasSubmitted = Boolean(submission?.submitted_at);
  const status = throwIfError(
    await supabase.rpc("get_assessment_status", {
      p_start: exam.start_date,
      p_end: exam.end_date,
      p_has_submitted: hasSubmitted,
    })
  ) as Exam["status"];

  const marhalahNumber = await resolveMarhalahNumberById(exam.marhalah_id as number);

  return {
    id: examId,
    marhalah: marhalahNumber,
    title: exam.title as string,
    description: (exam.description as string) || undefined,
    duration_minutes: Number(exam.duration_minutes),
    start_date: exam.start_date as string,
    end_date: exam.end_date as string,
    status,
    question_count: questionCount ?? 0,
    score: submission ? Number(submission.score) : undefined,
    max_score: submission ? Number(submission.max_score) : undefined,
    has_submitted: hasSubmitted,
    grading_status: submission?.grading_status as Exam["grading_status"],
  };
}

function mapAnswerGrades(
  grades: Record<string, unknown>[]
): AssessmentSubmissionResults["answer_grades"] {
  return grades.map((g) => {
    const question = g.questions as {
      text: string;
      type: string;
      correct_answer?: string;
    };
    return {
      id: g.id as number,
      question_id: g.question_id as number,
      question_text: question?.text ?? "",
      question_type: question?.type as AssessmentSubmissionResults["answer_grades"][0]["question_type"],
      answer_text: g.answer_text as string,
      correct_answer: question?.correct_answer || undefined,
      score: g.score != null ? Number(g.score) : null,
      max_score: Number(g.max_score),
      feedback: (g.feedback as string) || undefined,
      graded_at: (g.graded_at as string) ?? null,
    };
  });
}

async function buildFallbackAnswerGrades(
  supabase: ReturnType<typeof getSupabase>,
  assessmentKind: "exercise" | "exam",
  assessmentId: number,
  answers: Record<string, string>
): Promise<AssessmentSubmissionResults["answer_grades"]> {
  const column = assessmentKind === "exercise" ? "exercise_id" : "exam_id";
  const questions = throwIfError(
    await supabase
      .from("questions")
      .select("*")
      .eq(column, assessmentId)
      .order("order")
  );

  return (questions ?? []).map((q) => ({
    id: q.id as number,
    question_id: q.id as number,
    question_text: q.text as string,
    question_type: q.type as AssessmentSubmissionResults["answer_grades"][0]["question_type"],
    answer_text: answers[String(q.id)] ?? "",
    correct_answer: (q.correct_answer as string) || undefined,
    score: null,
    max_score: Number(q.max_score ?? 1),
    graded_at: null,
  }));
}

export const studentApi = {
  getDashboard: async (): Promise<DashboardData> => {
    const { user, profile } = await getCurrentProfile();
    const supabase = getSupabase();
    const marhalah = await getMarhalahByNumber(profile.current_marhalah);
    const progress = await getStudentProgress(user.id, marhalah.id);

    const allMarhalahs = throwIfError(
      await supabase.from("marhalahs").select("*").order("number")
    ) as DbMarhalah[];

    const marhalahs: Marhalah[] = [];
    for (const m of allMarhalahs) {
      const mProgress = await getStudentProgress(user.id, m.id);
      const finalScore = await getFinalScore(user.id, m.id);
      marhalahs.push({
        id: m.id,
        number: m.number,
        title: m.title,
        description: m.description,
        unlock_threshold: m.unlock_threshold,
        status: await getMarhalahStatus(user.id, m, finalScore),
        topics_count: mProgress.total,
        topics_completed: mProgress.completed,
        final_score: finalScore > 0 ? finalScore : undefined,
      });
    }

    const topics = throwIfError(
      await supabase
        .from("topics")
        .select("*")
        .eq("marhalah_id", marhalah.id)
        .eq("is_published", true)
        .order("order")
    ) as DbTopic[];

    const completedRows = throwIfError(
      await supabase
        .from("topic_completions")
        .select("topic_id")
        .eq("student_id", user.id)
        .in(
          "topic_id",
          topics.map((t) => t.id)
        )
    ) as { topic_id: number }[];
    const completedIds = new Set(completedRows.map((r) => r.topic_id));
    const activeTopic = topics.find((t) => !completedIds.has(t.id));

    const exercisesRaw = throwIfError(
      await supabase
        .from("exercises")
        .select("*")
        .eq("marhalah_id", marhalah.id)
        .order("start_date")
    );
    const exercises: Exercise[] = [];
    for (const ex of exercisesRaw ?? []) {
      exercises.push(await buildExerciseRow(ex, user.id));
    }

    const examsRaw = throwIfError(
      await supabase
        .from("exams")
        .select("*")
        .eq("marhalah_id", marhalah.id)
        .order("start_date")
    );
    const exams: Exam[] = [];
    for (const exam of examsRaw ?? []) {
      exams.push(await buildExamRow(exam, user.id));
    }

    const halaqahRow = (
      await supabase
        .from("manual_scores")
        .select("*")
        .eq("student_id", user.id)
        .eq("marhalah_id", marhalah.id)
        .eq("type", "halaqah")
        .maybeSingle()
    ).data;
    const tadreebRow = (
      await supabase
        .from("manual_scores")
        .select("*")
        .eq("student_id", user.id)
        .eq("marhalah_id", marhalah.id)
        .eq("type", "tadreeb")
        .maybeSingle()
    ).data;

    const profileData = await studentApi.getProfile();

    const currentMarhalah =
      marhalahs.find((m) => m.number === profile.current_marhalah) ?? marhalahs[0];

    return {
      greeting: `السلام عليكم ${profile.first_name}`,
      registration_number: profile.registration_number,
      current_marhalah: currentMarhalah,
      progress_percent: progress.percent,
      topics_completed: progress.completed,
      total_topics: progress.total,
      next_topic: activeTopic
        ? mapTopic(activeTopic, completedIds, activeTopic.id)
        : undefined,
      marhalahs,
      exercises,
      exams,
      halaqah: halaqahRow
        ? ({
            id: halaqahRow.id,
            type: "halaqah",
            score: Number(halaqahRow.score),
            max_score: Number(halaqahRow.max_score),
            marhalah: marhalah.id,
            notes: halaqahRow.notes,
          } satisfies ManualScore)
        : undefined,
      tadreeb: tadreebRow
        ? ({
            id: tadreebRow.id,
            type: "tadreeb",
            score: Number(tadreebRow.score),
            max_score: Number(tadreebRow.max_score),
            marhalah: marhalah.id,
            notes: tadreebRow.notes,
          } satisfies ManualScore)
        : undefined,
      recent_results: {
        exercises: exercises
          .filter((e) => e.score != null)
          .map((e) => ({
            title: e.title,
            score: e.score!,
            max_score: e.max_score!,
          })),
        exam: exams.find((e) => e.score != null)
          ? {
              title: exams.find((e) => e.score != null)!.title,
              score: exams.find((e) => e.score != null)!.score!,
              max_score: exams.find((e) => e.score != null)!.max_score!,
            }
          : undefined,
        overall_average: profileData.overall_average,
      },
    };
  },

  getProfile: async (): Promise<StudentProfile> => {
    const { user, profile } = await getCurrentProfile();
    const marhalah = await getMarhalahByNumber(profile.current_marhalah);
    const progress = await getStudentProgress(user.id, marhalah.id);

    const allMarhalahs = throwIfError(
      await getSupabase().from("marhalahs").select("id")
    ) as { id: number }[];

    const averages: number[] = [];
    for (const m of allMarhalahs) {
      const score = await getFinalScore(user.id, m.id);
      if (score > 0) averages.push(score);
    }

    return {
      ...mapProfileRow({ ...profile, email: profile.email ?? user.email ?? "" }),
      current_marhalah: profile.current_marhalah,
      progress_percent: progress.percent,
      topics_completed: progress.completed,
      total_topics: progress.total,
      overall_average:
        averages.length > 0
          ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) /
            10
          : 0,
      has_attempted_exercise: profile.has_attempted_exercise,
    };
  },

  getMarhalahs: async (): Promise<Marhalah[]> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();
    const rows = throwIfError(
      await supabase.from("marhalahs").select("*").order("number")
    ) as DbMarhalah[];

    const result: Marhalah[] = [];
    for (const m of rows) {
      const progress = await getStudentProgress(user.id, m.id);
      const finalScore = await getFinalScore(user.id, m.id);
      result.push({
        id: m.id,
        number: m.number,
        title: m.title,
        description: m.description,
        unlock_threshold: m.unlock_threshold,
        status: await getMarhalahStatus(user.id, m, finalScore),
        topics_count: progress.total,
        topics_completed: progress.completed,
        final_score: finalScore > 0 ? finalScore : undefined,
      });
    }
    return result;
  },

  getTopics: async (marhalahId: number): Promise<Topic[]> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();

    const unlocked = await isMarhalahUnlocked(user.id, marhalahId);
    if (!unlocked) throw new Error("Marhalah is locked.");

    const topics = throwIfError(
      await supabase
        .from("topics")
        .select("*")
        .eq("marhalah_id", marhalahId)
        .eq("is_published", true)
        .order("order")
    ) as DbTopic[];

    const completedRows = throwIfError(
      await supabase
        .from("topic_completions")
        .select("topic_id")
        .eq("student_id", user.id)
        .in(
          "topic_id",
          topics.map((t) => t.id)
        )
    ) as { topic_id: number }[];
    const completedIds = new Set(completedRows.map((r) => r.topic_id));
    const activeTopic = topics.find((t) => !completedIds.has(t.id));

    return topics.map((t) =>
      mapTopic(t, completedIds, activeTopic?.id ?? null)
    );
  },

  getTopic: async (topicId: number): Promise<Topic> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();
    const topic = throwIfError(
      await supabase
        .from("topics")
        .select("*")
        .eq("id", topicId)
        .eq("is_published", true)
        .single()
    ) as DbTopic;

    const unlocked = await isMarhalahUnlocked(user.id, topic.marhalah_id);
    if (!unlocked) throw new Error("This Marḥalah is locked.");

    const marhalahTopics = throwIfError(
      await supabase
        .from("topics")
        .select("id")
        .eq("marhalah_id", topic.marhalah_id)
        .eq("is_published", true)
        .order("order")
    ) as { id: number }[];

    const topicIds = marhalahTopics.map((t) => t.id);
    let completedIds = new Set<number>();
    if (topicIds.length > 0) {
      const completedRows = throwIfError(
        await supabase
          .from("topic_completions")
          .select("topic_id")
          .eq("student_id", user.id)
          .in("topic_id", topicIds)
      ) as { topic_id: number }[];
      completedIds = new Set(completedRows.map((r) => r.topic_id));
    }

    const activeTopic = marhalahTopics.find((t) => !completedIds.has(t.id));
    return mapTopic(topic, completedIds, activeTopic?.id ?? null);
  },

  completeTopic: async (topicId: number): Promise<Topic> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();
    const topic = await studentApi.getTopic(topicId);
    if (topic.status === "locked") {
      throw new Error("Complete the previous topics first.");
    }
    if (topic.is_completed) {
      return topic;
    }

    const { error } = await supabase.from("topic_completions").insert({
      student_id: user.id,
      topic_id: topicId,
    });
    if (error && error.code !== "23505") {
      throw new SupabaseApiError(error.message);
    }
    return studentApi.getTopic(topicId);
  },

  getExercises: async (): Promise<Exercise[]> => {
    const { user, profile } = await getCurrentProfile();
    const marhalah = await getMarhalahByNumber(profile.current_marhalah);
    const rows = throwIfError(
      await getSupabase()
        .from("exercises")
        .select("*")
        .eq("marhalah_id", marhalah.id)
        .order("start_date")
    );
    const result: Exercise[] = [];
    for (const row of rows ?? []) {
      result.push(await buildExerciseRow(row, user.id));
    }
    return result;
  },

  getExercise: async (id: number): Promise<Exercise> => {
    const { user, profile } = await getCurrentProfile();
    const marhalahId = await resolveMarhalahIdByNumber(profile.current_marhalah);
    const row = throwIfError(
      await getSupabase().from("exercises").select("*").eq("id", id).single()
    );
    await assertExerciseAccessible(row, marhalahId);
    return buildExerciseRow(row, user.id);
  },

  getExerciseQuestions: async (id: number): Promise<Question[]> => {
    const { profile } = await getCurrentProfile();
    const supabase = getSupabase();
    const marhalahId = await resolveMarhalahIdByNumber(profile.current_marhalah);
    const exercise = throwIfError(
      await supabase.from("exercises").select("*").eq("id", id).single()
    );
    await assertExerciseAccessible(exercise, marhalahId);

    const rows = throwIfError(
      await supabase
        .from("questions")
        .select("*")
        .eq("exercise_id", id)
        .order("order")
    );

    return (rows ?? []).map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      arabic_text: q.arabic_text || undefined,
      options: (q.options as string[]) ?? [],
      order: q.order,
      max_score: q.max_score,
    }));
  },

  submitExercise: async (id: number, answers: Record<number, string>) => {
    const supabase = getSupabase();
    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      payload[String(key)] = value;
    }
    const result = throwIfError(
      await supabase.rpc("submit_exercise", {
        p_exercise_id: id,
        p_answers: payload,
      })
    ) as { score: number; max_score: number; grading_status: string };
    return {
      score: Number(result.score),
      max_score: Number(result.max_score),
      grading_status: result.grading_status,
    };
  },

  getExerciseResults: async (id: number): Promise<AssessmentSubmissionResults> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();
    const submission = throwIfError(
      await supabase
        .from("exercise_submissions")
        .select(
          `
          *,
          exercise_answer_grades (
            id, question_id, answer_text, score, max_score, feedback, graded_at,
            questions:question_id ( text, type, correct_answer )
          )
        `
        )
        .eq("student_id", user.id)
        .eq("exercise_id", id)
        .single()
    ) as Record<string, unknown>;

    const grades =
      (submission.exercise_answer_grades as Record<string, unknown>[]) ?? [];
    const answers = (submission.answers as Record<string, string>) ?? {};
    let answer_grades = mapAnswerGrades(grades);
    if (answer_grades.length === 0) {
      answer_grades = await buildFallbackAnswerGrades(supabase, "exercise", id, answers);
    }

    return {
      score: Number(submission.score),
      max_score: Number(submission.max_score),
      grading_status: submission.grading_status as AssessmentSubmissionResults["grading_status"],
      submitted_at: submission.submitted_at as string,
      answer_grades,
    };
  },

  getExams: async (): Promise<Exam[]> => {
    const { user, profile } = await getCurrentProfile();
    const marhalah = await getMarhalahByNumber(profile.current_marhalah);
    const rows = throwIfError(
      await getSupabase()
        .from("exams")
        .select("*")
        .eq("marhalah_id", marhalah.id)
        .order("start_date")
    );
    const result: Exam[] = [];
    for (const row of rows ?? []) {
      result.push(await buildExamRow(row, user.id));
    }
    return result;
  },

  getExam: async (id: number): Promise<Exam> => {
    const { user, profile } = await getCurrentProfile();
    const marhalahId = await resolveMarhalahIdByNumber(profile.current_marhalah);
    const row = throwIfError(
      await getSupabase().from("exams").select("*").eq("id", id).single()
    );
    await assertExamAccessible(row, marhalahId, user.id);
    return buildExamRow(row, user.id);
  },

  getExamQuestions: async (id: number): Promise<Question[]> => {
    const { user, profile } = await getCurrentProfile();
    const supabase = getSupabase();
    const marhalahId = await resolveMarhalahIdByNumber(profile.current_marhalah);
    const exam = throwIfError(
      await supabase.from("exams").select("*").eq("id", id).single()
    );
    await assertExamAccessible(exam, marhalahId, user.id);

    const rows = throwIfError(
      await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", id)
        .order("order")
    );

    return (rows ?? []).map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      arabic_text: q.arabic_text || undefined,
      options: (q.options as string[]) ?? [],
      order: q.order,
      max_score: q.max_score,
    }));
  },

  startExam: async (id: number) => {
    const result = throwIfError(
      await getSupabase().rpc("start_exam", { p_exam_id: id })
    ) as {
      started_at: string;
      deadline_at: string;
      remaining_seconds: number;
    };
    return {
      started_at: result.started_at,
      deadline_at: result.deadline_at,
      remaining_seconds: Number(result.remaining_seconds),
    };
  },

  submitExam: async (id: number, answers: Record<number, string>) => {
    const supabase = getSupabase();
    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      payload[String(key)] = value;
    }
    const result = throwIfError(
      await supabase.rpc("submit_exam", {
        p_exam_id: id,
        p_answers: payload,
      })
    ) as { score: number; max_score: number; grading_status: string };
    return {
      score: Number(result.score),
      max_score: Number(result.max_score),
      grading_status: result.grading_status,
    };
  },

  getExamResults: async (id: number): Promise<AssessmentSubmissionResults> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();
    const submission = throwIfError(
      await supabase
        .from("exam_submissions")
        .select(
          `
          *,
          exam_answer_grades (
            id, question_id, answer_text, score, max_score, feedback, graded_at,
            questions:question_id ( text, type, correct_answer )
          )
        `
        )
        .eq("student_id", user.id)
        .eq("exam_id", id)
        .not("submitted_at", "is", null)
        .single()
    ) as Record<string, unknown>;

    const grades = (submission.exam_answer_grades as Record<string, unknown>[]) ?? [];

    return {
      score: Number(submission.score),
      max_score: Number(submission.max_score),
      grading_status: submission.grading_status as AssessmentSubmissionResults["grading_status"],
      submitted_at: submission.submitted_at as string,
      answer_grades: mapAnswerGrades(grades),
    };
  },
};
