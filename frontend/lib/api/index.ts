import { apiClient, apiUpload, unwrapList } from "./client";
import { clearTokens, setTokens } from "@/lib/auth/token";
import type {
  AdminLoginCredentials,
  AdminStats,
  AuthTokens,
  CreateStudentData,
  DashboardData,
  Exam,
  Exercise,
  Marhalah,
  Question,
  StudentLoginCredentials,
  StudentProfile,
  Topic,
  User,
} from "@/lib/types";

export const authApi = {
  loginStudent: async (credentials: StudentLoginCredentials): Promise<AuthTokens> => {
    const tokens = await apiClient<AuthTokens>("/auth/student/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setTokens(tokens.access, tokens.refresh);
    return tokens;
  },

  loginAdmin: async (credentials: AdminLoginCredentials): Promise<AuthTokens> => {
    const tokens = await apiClient<AuthTokens>("/auth/admin/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setTokens(tokens.access, tokens.refresh);
    return tokens;
  },

  logout: () => {
    clearTokens();
  },
};

export const studentApi = {
  getDashboard: (): Promise<DashboardData> =>
    apiClient<DashboardData>("/student/dashboard/"),

  getProfile: (): Promise<StudentProfile> =>
    apiClient<StudentProfile>("/student/profile/"),

  getMarhalahs: (): Promise<Marhalah[]> =>
    apiClient<Marhalah[]>("/student/marhalahs/"),

  getTopics: (marhalahId: number): Promise<Topic[]> =>
    apiClient<Topic[]>(`/student/marhalahs/${marhalahId}/topics/`),

  getTopic: (topicId: number): Promise<Topic> =>
    apiClient<Topic>(`/student/topics/${topicId}/`),

  completeTopic: (topicId: number): Promise<Topic> =>
    apiClient<Topic>(`/student/topics/${topicId}/complete/`, { method: "POST" }),

  getExercises: (): Promise<Exercise[]> =>
    apiClient<Exercise[]>("/student/exercises/"),

  getExercise: (id: number): Promise<Exercise> =>
    apiClient<Exercise>(`/student/exercises/${id}/`),

  getExerciseQuestions: (id: number): Promise<Question[]> =>
    apiClient<Question[]>(`/student/exercises/${id}/questions/`),

  submitExercise: (
    id: number,
    answers: Record<number, string>
  ): Promise<{ score: number; max_score: number }> =>
    apiClient(`/student/exercises/${id}/submit/`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),

  getExams: (): Promise<Exam[]> => apiClient<Exam[]>("/student/exams/"),
};

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

export const adminApi = {
  getStats: (): Promise<AdminStats> => apiClient<AdminStats>("/admin/stats/"),

  getStudents: async (): Promise<User[]> => {
    const data = await apiClient<User[] | { results: User[] }>("/admin/students/");
    return unwrapList(data);
  },

  createStudent: (data: CreateStudentData): Promise<User> =>
    apiClient<User>("/admin/students/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getStudent: (id: number): Promise<StudentProfile> =>
    apiClient<StudentProfile>(`/admin/students/${id}/`),

  getTopics: async (marhalahId?: number): Promise<Topic[]> => {
    const query = marhalahId ? `?marhalah=${marhalahId}` : "";
    const data = await apiClient<Topic[] | { results: Topic[] }>(
      `/admin/topics/${query}`
    );
    return unwrapList(data);
  },

  createTopic: async (data: CreateTopicData): Promise<Topic> => {
    const formData = new FormData();
    formData.append("marhalah", String(data.marhalah));
    formData.append("order", String(data.order));
    formData.append("title", data.title);
    formData.append("content", data.content);
    if (data.arabic_title) formData.append("arabic_title", data.arabic_title);
    if (data.arabic_content) formData.append("arabic_content", data.arabic_content);
    if (data.examples) formData.append("examples", data.examples);
    if (data.audio) formData.append("audio", data.audio);
    if (data.pdf) formData.append("pdf", data.pdf);
    return apiUpload<Topic>("/admin/topics/", formData);
  },

  deleteTopic: (id: number): Promise<void> =>
    apiClient(`/admin/topics/${id}/`, { method: "DELETE" }),
};
