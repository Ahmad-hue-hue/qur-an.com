import { apiClient, apiUpload, unwrapList } from "./client";
import { clearTokens, setTokens } from "@/lib/auth/token";
import type {
  AdminLoginCredentials,
  AdminStats,
  AuthTokens,
  CreateStudentData,
  CreateExerciseData,
  CreateExamData,
  UpdateStudentData,
  DashboardData,
  Exam,
  Exercise,
  Marhalah,
  Question,
  StudentLoginCredentials,
  StudentRegisterCredentials,
  StudentProfile,
  Topic,
  User,
} from "@/lib/types";

export const authApi = {
  registerStudent: async (credentials: StudentRegisterCredentials): Promise<AuthTokens> => {
    const tokens = await apiClient<AuthTokens>("/auth/student/register/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setTokens(tokens.access, tokens.refresh);
    return tokens;
  },

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

  updateStudent: (id: number, data: UpdateStudentData): Promise<StudentProfile> =>
    apiClient<StudentProfile>(`/admin/students/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteStudent: (id: number): Promise<void> =>
    apiClient(`/admin/students/${id}/`, { method: "DELETE" }),

  assignRegistrationNumber: (id: number): Promise<StudentProfile> =>
    apiClient<StudentProfile>(`/admin/students/${id}/assign-registration/`, {
      method: "POST",
    }),

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

  getTopic: (id: number): Promise<Topic> => apiClient<Topic>(`/admin/topics/${id}/`),

  updateTopic: async (data: CreateTopicData & { id: number }): Promise<Topic> => {
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
    return apiUpload<Topic>(`/admin/topics/${data.id}/`, formData, "PATCH");
  },

  deleteTopic: (id: number): Promise<void> =>
    apiClient(`/admin/topics/${id}/`, { method: "DELETE" }),

  getExercises: async (marhalahId?: number): Promise<Exercise[]> => {
    const query = marhalahId ? `?marhalah=${marhalahId}` : "";
    return apiClient<Exercise[]>(`/admin/exercises/${query}`);
  },

  createExercise: (data: CreateExerciseData): Promise<Exercise> =>
    apiClient<Exercise>("/admin/exercises/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateExercise: (
    id: number,
    data: Partial<CreateExerciseData>
  ): Promise<Exercise> =>
    apiClient<Exercise>(`/admin/exercises/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteExercise: (id: number): Promise<void> =>
    apiClient(`/admin/exercises/${id}/`, { method: "DELETE" }),

  getExams: async (marhalahId?: number): Promise<Exam[]> => {
    const query = marhalahId ? `?marhalah=${marhalahId}` : "";
    return apiClient<Exam[]>(`/admin/exams/${query}`);
  },

  createExam: (data: CreateExamData): Promise<Exam> =>
    apiClient<Exam>("/admin/exams/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateExam: (id: number, data: Partial<CreateExamData>): Promise<Exam> =>
    apiClient<Exam>(`/admin/exams/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteExam: (id: number): Promise<void> =>
    apiClient(`/admin/exams/${id}/`, { method: "DELETE" }),
};
