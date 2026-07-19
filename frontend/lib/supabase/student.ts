import { getSupabase } from "@/lib/supabase/client";
import {
  resolveMarhalahIdByNumber,
  resolveMarhalahNumberById,
} from "@/lib/supabase/marhalah";
import { mapProfileRow, SupabaseApiError, throwIfError } from "@/lib/supabase/utils";
import { marhalahHasOralAssessments } from "@/lib/marhalah-scores";
import { isLastLessonOrder } from "@/lib/topic-assessment";
import type {
  AssessmentSubmissionResults,
  DashboardData,
  Exercise,
  Exam,
  ManualScore,
  Marhalah,
  Question,
  StudentProfile,
  StudentSubmissionSummary,
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

async function hasExerciseSubmission(studentId: string, exerciseId: number) {
  const row = throwIfError(
    await getSupabase()
      .from("exercise_submissions")
      .select("id")
      .eq("student_id", studentId)
      .eq("exercise_id", exerciseId)
      .not("submitted_at", "is", null)
      .maybeSingle()
  );
  return Boolean(row);
}

async function assertExerciseAccessible(
  exercise: Record<string, unknown>,
  studentId: string
) {
  const exerciseMarhalahId = exercise.marhalah_id as number;
  if (await isMarhalahUnlocked(studentId, exerciseMarhalahId)) return;

  if (await hasExerciseSubmission(studentId, exercise.id as number)) {
    return;
  }

  throw new Error(
    "This exercise is locked. Finish earlier stages or wait until an admin unlocks this content."
  );
}

async function assertExamAccessible(
  exam: Record<string, unknown>,
  studentId: string
) {
  const examMarhalahId = exam.marhalah_id as number;
  if (!(await isMarhalahUnlocked(studentId, examMarhalahId))) {
    throw new Error(
      "This exam is locked. Finish earlier stages or wait until an admin unlocks this content."
    );
  }

  const completed = throwIfError(
    await getSupabase().rpc("marhalah_topics_completed", {
      p_student_id: studentId,
      p_marhalah_id: examMarhalahId,
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
  options?: {
    /** Previous marḥalah: every lesson open. Current: only admin-unlocked lessons. */
    unlockAllIncomplete?: boolean;
  }
): Topic {
  const isCompleted = completedIds.has(topic.id);
  const isUnlocked =
    Boolean(options?.unlockAllIncomplete) || Boolean(topic.is_published);

  let status: Topic["status"] = "locked";
  if (isCompleted && isUnlocked) status = "completed";
  else if (isUnlocked) status = "active";

  return {
    id: topic.id,
    marhalah: topic.marhalah_id,
    order: topic.order,
    title: topic.title,
    arabic_title: topic.arabic_title || undefined,
    content: isUnlocked ? topic.content || undefined : undefined,
    arabic_content: isUnlocked ? topic.arabic_content : "",
    examples: isUnlocked ? topic.examples || undefined : undefined,
    audio_url: isUnlocked ? topic.audio_url ?? undefined : undefined,
    pdf_url: isUnlocked ? topic.pdf_url ?? undefined : undefined,
    is_completed: isCompleted,
    status,
    is_unlocked: isUnlocked,
  };
}

/** Previous stages unlock all lessons; current stage waits for admin lesson unlock. */
function unlockAllLessonsInMarhalah(
  assignedMarhalahNumber: number,
  marhalahNumber: number
): boolean {
  return marhalahNumber < assignedMarhalahNumber;
}

async function countAnswerGrades(
  supabase: ReturnType<typeof getSupabase>,
  table: "exercise_answer_grades" | "exam_answer_grades",
  submissionId: number
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);
  if (error) throw new SupabaseApiError(error.message);
  return count ?? 0;
}

async function isExerciseSubmissionCurrent(
  supabase: ReturnType<typeof getSupabase>,
  submission: { id: number } | null | undefined,
  questionCount: number
): Promise<boolean> {
  if (!submission || questionCount === 0) return false;
  const gradeCount = await countAnswerGrades(
    supabase,
    "exercise_answer_grades",
    submission.id
  );
  return gradeCount >= questionCount;
}

async function isExamSubmissionCurrent(
  supabase: ReturnType<typeof getSupabase>,
  submission: { id: number; submitted_at?: string | null } | null | undefined,
  questionCount: number
): Promise<boolean> {
  if (!submission?.submitted_at || questionCount === 0) return false;
  const gradeCount = await countAnswerGrades(
    supabase,
    "exam_answer_grades",
    submission.id
  );
  return gradeCount >= questionCount;
}

async function enrichStudentTopic(
  topic: Topic,
  studentId: string
): Promise<Topic> {
  const supabase = getSupabase();
  const siblings = throwIfError(
    await supabase
      .from("topics")
      .select("order")
      .eq("marhalah_id", topic.marhalah)
      .eq("is_published", true)
  ) as { order: number }[];
  const is_last_lesson = isLastLessonOrder(
    topic.order,
    siblings.map((row) => row.order)
  );

  const exercise = (
    await supabase
      .from("exercises")
      .select("id")
      .eq("topic_id", topic.id)
      .maybeSingle()
  ).data;

  if (!exercise?.id) {
    return { ...topic, is_last_lesson };
  }

  const exercise_question_count =
    (
      await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("exercise_id", exercise.id)
    ).count ?? 0;

  const submission = (
    await supabase
      .from("exercise_submissions")
      .select("id")
      .eq("student_id", studentId)
      .eq("exercise_id", exercise.id)
      .maybeSingle()
  ).data;

  const exercise_submitted = await isExerciseSubmissionCurrent(
    supabase,
    submission,
    exercise_question_count
  );

  return {
    ...topic,
    is_last_lesson,
    exercise_id: exercise.id,
    exercise_question_count,
    exercise_submitted,
  };
}

async function buildExerciseRow(
  exercise: Record<string, unknown>,
  studentId: string,
  marhalahNumber?: number
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

  const has_submitted = await isExerciseSubmissionCurrent(
    supabase,
    submission,
    questionCount ?? 0
  );

  const status = throwIfError(
    await supabase.rpc("get_assessment_status", {
      p_start: exercise.start_date,
      p_end: exercise.end_date,
      p_has_submitted: has_submitted,
    })
  ) as Exercise["status"];

  const marhalah =
    marhalahNumber ??
    (await resolveMarhalahNumberById(exercise.marhalah_id as number));

  return {
    id: exerciseId,
    marhalah,
    title: exercise.title as string,
    description: (exercise.description as string) || undefined,
    start_date: exercise.start_date as string,
    end_date: exercise.end_date as string,
    status,
    question_count: questionCount ?? 0,
    score: has_submitted && submission ? Number(submission.score) : undefined,
    max_score: has_submitted && submission ? Number(submission.max_score) : undefined,
    has_submitted,
    grading_status: has_submitted
      ? (submission?.grading_status as Exercise["grading_status"])
      : undefined,
  };
}

async function buildExamRow(
  exam: Record<string, unknown>,
  studentId: string,
  marhalahNumber?: number
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

  const has_submitted = await isExamSubmissionCurrent(
    supabase,
    submission,
    questionCount ?? 0
  );

  const status = throwIfError(
    await supabase.rpc("get_assessment_status", {
      p_start: exam.start_date,
      p_end: exam.end_date,
      p_has_submitted: has_submitted,
    })
  ) as Exam["status"];

  const marhalah =
    marhalahNumber ??
    (await resolveMarhalahNumberById(exam.marhalah_id as number));

  return {
    id: examId,
    marhalah,
    title: exam.title as string,
    description: (exam.description as string) || undefined,
    duration_minutes: Number(exam.duration_minutes),
    start_date: exam.start_date as string,
    end_date: exam.end_date as string,
    status,
    question_count: questionCount ?? 0,
    score: has_submitted && submission ? Number(submission.score) : undefined,
    max_score: has_submitted && submission ? Number(submission.max_score) : undefined,
    has_submitted,
    grading_status: has_submitted
      ? (submission?.grading_status as Exam["grading_status"])
      : undefined,
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
      options?: string[];
      order?: number;
    };
    return {
      id: g.id as number,
      question_id: g.question_id as number,
      question_text: question?.text ?? "",
      question_type: question?.type as AssessmentSubmissionResults["answer_grades"][0]["question_type"],
      answer_text: g.answer_text as string,
      correct_answer: question?.correct_answer || undefined,
      question_options: question?.options ?? undefined,
      question_order: question?.order ?? undefined,
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
  getNavigationContext: async (): Promise<{ current_marhalah_id: number }> => {
    const { profile } = await getCurrentProfile();
    const marhalah = throwIfError(
      await getSupabase()
        .from("marhalahs")
        .select("id")
        .eq("number", profile.current_marhalah)
        .single()
    ) as { id: number };

    return { current_marhalah_id: marhalah.id };
  },

  getDashboard: async (): Promise<DashboardData> => {
    const { user, profile } = await getCurrentProfile();
    const supabase = getSupabase();
    const allMarhalahs = throwIfError(
      await supabase.from("marhalahs").select("*").order("number")
    ) as DbMarhalah[];

    const marhalahs = await Promise.all(
      allMarhalahs.map(async (m): Promise<Marhalah> => {
        const [progress, finalScore, unlocked] = await Promise.all([
          getStudentProgress(user.id, m.id),
          getFinalScore(user.id, m.id),
          isMarhalahUnlocked(user.id, m.id),
        ]);

        return {
          id: m.id,
          number: m.number,
          title: m.title,
          description: m.description,
          unlock_threshold: m.unlock_threshold,
          status: !unlocked
            ? "locked"
            : progress.total > 0 &&
                progress.completed >= progress.total &&
                finalScore > 0
              ? "completed"
              : "open",
          topics_count: progress.total,
          topics_completed: progress.completed,
          final_score: finalScore > 0 ? finalScore : undefined,
        };
      })
    );
    const currentMarhalah =
      marhalahs.find((m) => m.number === profile.current_marhalah) ?? marhalahs[0];
    if (!currentMarhalah) {
      throw new Error("No Marḥalahs are configured.");
    }

    const [topics, exercisesRaw, examsRaw] = await Promise.all([
      supabase
        .from("topics")
        .select("*")
        .eq("marhalah_id", currentMarhalah.id)
        .eq("is_published", true)
        .order("order"),
      supabase
        .from("exercises")
        .select("*")
        .eq("marhalah_id", currentMarhalah.id)
        .order("start_date"),
      supabase
        .from("exams")
        .select("*")
        .eq("marhalah_id", currentMarhalah.id)
        .order("start_date"),
    ]);
    const currentTopics = throwIfError(topics) as DbTopic[];

    const completedRows = throwIfError(
      await supabase
        .from("topic_completions")
        .select("topic_id")
        .eq("student_id", user.id)
        .in(
          "topic_id",
          currentTopics.map((t) => t.id)
        )
    ) as { topic_id: number }[];
    const completedIds = new Set(completedRows.map((r) => r.topic_id));
    const activeTopic = currentTopics.find((t) => !completedIds.has(t.id));
    const exercises = await Promise.all(
      (throwIfError(exercisesRaw) as Record<string, unknown>[]).map((exercise) =>
        buildExerciseRow(exercise, user.id, currentMarhalah.number)
      )
    );
    const exams = await Promise.all(
      (throwIfError(examsRaw) as Record<string, unknown>[]).map((exam) =>
        buildExamRow(exam, user.id, currentMarhalah.number)
      )
    );

    const includeOralAssessments = marhalahHasOralAssessments(currentMarhalah.number);

    let halaqahRow: Record<string, unknown> | null = null;
    let tadreebRow: Record<string, unknown> | null = null;
    if (includeOralAssessments) {
      const [halaqah, tadreeb] = await Promise.all([
        supabase
          .from("manual_scores")
          .select("*")
          .eq("student_id", user.id)
          .eq("marhalah_id", currentMarhalah.id)
          .eq("type", "halaqah")
          .maybeSingle(),
        supabase
          .from("manual_scores")
          .select("*")
          .eq("student_id", user.id)
          .eq("marhalah_id", currentMarhalah.id)
          .eq("type", "tadreeb")
          .maybeSingle(),
      ]);
      halaqahRow = halaqah.data;
      tadreebRow = tadreeb.data;
    }

    const scores = marhalahs
      .map((marhalah) => marhalah.final_score)
      .filter((score): score is number => score != null);
    const overallAverage =
      scores.length > 0
        ? Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) /
          10
        : 0;

    return {
      greeting: `السلام عليكم ${profile.first_name}`,
      registration_number: profile.registration_number,
      current_marhalah: currentMarhalah,
      progress_percent: currentMarhalah.topics_count
        ? Math.round(
            (currentMarhalah.topics_completed / currentMarhalah.topics_count) * 100
          )
        : 0,
      topics_completed: currentMarhalah.topics_completed,
      total_topics: currentMarhalah.topics_count,
      next_topic: activeTopic
        ? mapTopic(activeTopic, completedIds)
        : undefined,
      marhalahs,
      exercises,
      exams,
      halaqah: halaqahRow
        ? ({
            id: Number(halaqahRow.id),
            type: "halaqah",
            score: Number(halaqahRow.score),
            max_score: Number(halaqahRow.max_score),
            marhalah: currentMarhalah.id,
            notes:
              typeof halaqahRow.notes === "string"
                ? halaqahRow.notes
                : undefined,
          } satisfies ManualScore)
        : undefined,
      tadreeb: tadreebRow
        ? ({
            id: Number(tadreebRow.id),
            type: "tadreeb",
            score: Number(tadreebRow.score),
            max_score: Number(tadreebRow.max_score),
            marhalah: currentMarhalah.id,
            notes:
              typeof tadreebRow.notes === "string"
                ? tadreebRow.notes
                : undefined,
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
        overall_average: overallAverage,
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
      current_marhalah_title: marhalah.title,
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
    const { user, profile } = await getCurrentProfile();
    const supabase = getSupabase();

    const marhalahNumber = await resolveMarhalahNumberById(marhalahId);
    const unlockAll = unlockAllLessonsInMarhalah(
      Number(profile.current_marhalah),
      marhalahNumber
    );

    const topics = throwIfError(
      await supabase.rpc("student_list_topics", {
        p_marhalah_id: marhalahId,
      })
    ) as DbTopic[];

    const topicIds = (topics ?? []).map((t) => t.id);
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

    return (topics ?? []).map((t) =>
      mapTopic(t, completedIds, { unlockAllIncomplete: unlockAll })
    );
  },

  getTopic: async (topicId: number): Promise<Topic> => {
    const { user, profile } = await getCurrentProfile();
    const supabase = getSupabase();
    const topic = throwIfError(
      await supabase.rpc("student_get_topic", { p_topic_id: topicId })
    ) as DbTopic;

    const marhalahNumber = await resolveMarhalahNumberById(topic.marhalah_id);
    const unlockAll = unlockAllLessonsInMarhalah(
      Number(profile.current_marhalah),
      marhalahNumber
    );

    const marhalahTopics = throwIfError(
      await supabase.rpc("student_list_topics", {
        p_marhalah_id: topic.marhalah_id,
      })
    ) as DbTopic[];

    const topicIds = (marhalahTopics ?? []).map((t) => t.id);
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

    const mapped = mapTopic(topic, completedIds, {
      unlockAllIncomplete: unlockAll,
    });
    if (mapped.status === "locked") {
      throw new Error(
        "This lesson is locked until an admin unlocks it."
      );
    }
    return enrichStudentTopic(mapped, user.id);
  },

  completeTopic: async (topicId: number): Promise<Topic> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();
    const topic = await studentApi.getTopic(topicId);
    if (topic.status === "locked") {
      throw new Error("This lesson is locked until an admin unlocks it.");
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
    const supabase = getSupabase();
    const marhalah = await getMarhalahByNumber(profile.current_marhalah);
    const rows = throwIfError(
      await supabase
        .from("exercises")
        .select("*")
        .eq("marhalah_id", marhalah.id)
        .order("start_date")
    );
    const result: Exercise[] = [];
    const seen = new Set<number>();
    for (const row of rows ?? []) {
      result.push(await buildExerciseRow(row, user.id));
      seen.add(row.id as number);
    }

    const pastRows = throwIfError(
      await supabase
        .from("exercise_submissions")
        .select("exercise_id, exercises(*)")
        .eq("student_id", user.id)
        .not("submitted_at", "is", null)
    ) as unknown as {
      exercise_id: number;
      exercises: Record<string, unknown> | null;
    }[];

    for (const entry of pastRows ?? []) {
      const exercise = entry.exercises;
      if (!exercise || seen.has(exercise.id as number)) continue;
      seen.add(exercise.id as number);
      result.push(await buildExerciseRow(exercise, user.id));
    }

    return result.sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
  },

  getExercise: async (id: number): Promise<Exercise> => {
    const { user } = await getCurrentProfile();
    const row = throwIfError(
      await getSupabase().from("exercises").select("*").eq("id", id).single()
    );
    await assertExerciseAccessible(row, user.id);
    return buildExerciseRow(row, user.id);
  },

  getExerciseQuestions: async (id: number): Promise<Question[]> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();
    const exercise = throwIfError(
      await supabase.from("exercises").select("*").eq("id", id).single()
    );
    await assertExerciseAccessible(exercise, user.id);

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
            questions:question_id ( text, type, correct_answer, options, order )
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

    answer_grades.sort((a, b) => {
      const orderA = a.question_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.question_order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

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
    const { user } = await getCurrentProfile();
    const row = throwIfError(
      await getSupabase().from("exams").select("*").eq("id", id).single()
    );
    await assertExamAccessible(row, user.id);
    return buildExamRow(row, user.id);
  },

  getExamQuestions: async (id: number): Promise<Question[]> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();
    const exam = throwIfError(
      await supabase.from("exams").select("*").eq("id", id).single()
    );
    await assertExamAccessible(exam, user.id);

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
            questions:question_id ( text, type, correct_answer, options, order )
          )
        `
        )
        .eq("student_id", user.id)
        .eq("exam_id", id)
        .not("submitted_at", "is", null)
        .single()
    ) as Record<string, unknown>;

    const grades = (submission.exam_answer_grades as Record<string, unknown>[]) ?? [];
    const answer_grades = mapAnswerGrades(grades).sort((a, b) => {
      const orderA = a.question_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.question_order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    return {
      score: Number(submission.score),
      max_score: Number(submission.max_score),
      grading_status: submission.grading_status as AssessmentSubmissionResults["grading_status"],
      submitted_at: submission.submitted_at as string,
      answer_grades,
    };
  },

  getMarhalahExam: async (marhalahNumber: number): Promise<Exam | null> => {
    const { user } = await getCurrentProfile();
    const marhalahId = await resolveMarhalahIdByNumber(marhalahNumber);
    const row = (
      await getSupabase()
        .from("exams")
        .select("*")
        .eq("marhalah_id", marhalahId)
        .maybeSingle()
    ).data;
    if (!row) return null;
    return buildExamRow(row, user.id);
  },

  getMySubmissions: async (): Promise<StudentSubmissionSummary[]> => {
    const { user } = await getCurrentProfile();
    const supabase = getSupabase();

    const exerciseRows = throwIfError(
      await supabase
        .from("exercise_submissions")
        .select("id, score, max_score, grading_status, submitted_at, exercise_id, exercises(title)")
        .eq("student_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
    ) as unknown as {
      id: number;
      score: number;
      max_score: number;
      grading_status: StudentSubmissionSummary["grading_status"];
      submitted_at: string;
      exercise_id: number;
      exercises: { title: string } | null;
    }[];

    const examRows = throwIfError(
      await supabase
        .from("exam_submissions")
        .select("id, score, max_score, grading_status, submitted_at, exam_id, exams(title)")
        .eq("student_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
    ) as unknown as {
      id: number;
      score: number;
      max_score: number;
      grading_status: StudentSubmissionSummary["grading_status"];
      submitted_at: string;
      exam_id: number;
      exams: { title: string } | null;
    }[];

    const exerciseItems: StudentSubmissionSummary[] = (exerciseRows ?? []).map(
      (row) => ({
        id: row.id,
        kind: "exercise",
        title: row.exercises?.title ?? "Exercise",
        score: Number(row.score),
        max_score: Number(row.max_score),
        grading_status: row.grading_status,
        submitted_at: row.submitted_at,
        href: `/exercises/${row.exercise_id}/results`,
      })
    );

    const examItems: StudentSubmissionSummary[] = (examRows ?? []).map((row) => ({
      id: row.id,
      kind: "exam",
      title: row.exams?.title ?? "Exam",
      score: Number(row.score),
      max_score: Number(row.max_score),
      grading_status: row.grading_status,
      submitted_at: row.submitted_at,
      href: `/exams/${row.exam_id}/results`,
    }));

    return [...exerciseItems, ...examItems].sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
  },
};
