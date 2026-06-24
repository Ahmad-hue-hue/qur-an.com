export type UserRole = "student" | "admin";

export type MarhalahStatus = "open" | "locked" | "completed";

export type TopicStatus = "completed" | "active" | "locked";

export type AssessmentStatus = "open" | "upcoming" | "expired" | "completed";

export type QuestionType =
  | "mcq"
  | "fill_blank"
  | "true_false"
  | "fill_gap"
  | "written";

export type GradingStatus = "complete" | "pending_manual";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  registration_number?: string | null;
  is_suspended: boolean;
  current_marhalah?: number;
  date_joined: string;
}

export interface StudentProfile extends User {
  current_marhalah: number;
  progress_percent: number;
  topics_completed: number;
  total_topics: number;
  overall_average: number;
  has_attempted_exercise: boolean;
}

export interface Marhalah {
  id: number;
  number: number;
  title: string;
  description?: string;
  unlock_threshold: number;
  status: MarhalahStatus;
  topics_count: number;
  topics_completed: number;
  final_score?: number;
}

export interface Topic {
  id: number;
  marhalah: number;
  order: number;
  title: string;
  arabic_title?: string;
  content: string;
  arabic_content?: string;
  examples?: string;
  audio_url?: string;
  pdf_url?: string;
  is_completed: boolean;
  status: TopicStatus;
}

export interface Exercise {
  id: number;
  marhalah: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: AssessmentStatus;
  question_count: number;
  score?: number;
  max_score?: number;
  has_submitted: boolean;
  grading_status?: GradingStatus;
}

export interface Exam {
  id: number;
  marhalah: number;
  title: string;
  description?: string;
  duration_minutes: number;
  start_date: string;
  end_date: string;
  status: AssessmentStatus;
  question_count: number;
  score?: number;
  max_score?: number;
  has_submitted: boolean;
}

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  arabic_text?: string;
  options?: string[];
  order: number;
  correct_answer?: string;
  max_score?: number;
}

export interface QuestionAdmin extends Question {
  exercise?: number;
  exam?: number;
}

export interface ExerciseAnswerGrade {
  id: number;
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  answer_text: string;
  score: number | null;
  max_score: number;
  feedback?: string;
  graded_at?: string | null;
  student_name?: string;
}

export interface ExerciseSubmissionAdmin {
  id: number;
  student: string;
  student_name: string;
  exercise: number;
  answers: Record<string, string>;
  score: number;
  max_score: number;
  grading_status: GradingStatus;
  submitted_at: string;
  answer_grades: ExerciseAnswerGrade[];
}

export interface ExerciseDetail extends Exercise {
  questions?: QuestionAdmin[];
}

export interface ManualScore {
  id: number;
  type: "halaqah" | "tadreeb";
  score: number;
  max_score: number;
  marhalah: number;
  notes?: string;
}

export interface DashboardData {
  greeting: string;
  registration_number: string | null;
  current_marhalah: Marhalah;
  progress_percent: number;
  topics_completed: number;
  total_topics: number;
  next_topic?: Topic;
  marhalahs: Marhalah[];
  exercises: Exercise[];
  exams: Exam[];
  halaqah?: ManualScore;
  tadreeb?: ManualScore;
  recent_results: {
    exercises: { title: string; score: number; max_score: number }[];
    exam?: { title: string; score: number; max_score: number };
    overall_average: number;
  };
}

export interface ScoreWeights {
  exercises: number;
  exam: number;
  halaqah: number;
  tadreeb: number;
}

export interface AdminStats {
  total_students: number;
  total_marhalahs: number;
  total_topics: number;
  total_assessments: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface StudentLoginCredentials {
  email: string;
  password: string;
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface StudentRegisterCredentials {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface CreateStudentData {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface UpdateStudentData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_suspended?: boolean;
  current_marhalah?: number;
  registration_number?: string | null;
}

export interface CreateExerciseData {
  marhalah: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  question_text?: string;
  question_options?: string[];
  correct_answer?: string;
  questions?: CreateQuestionData[];
}

export interface CreateQuestionData {
  type: QuestionType;
  text: string;
  arabic_text?: string;
  options?: string[];
  correct_answer?: string;
  order?: number;
  max_score?: number;
}

export interface CreateExamData {
  marhalah: number;
  title: string;
  description?: string;
  duration_minutes?: number;
  start_date: string;
  end_date: string;
}
