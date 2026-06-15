import { apiClient } from "./client";
import {
  mockAdminStats,
  mockDashboard,
  mockExams,
  mockExercises,
  mockMarhalahs,
  mockQuestions,
  mockStudents,
  mockTopics,
  mockUser,
} from "./mock-data";
import type {
  AdminStats,
  AuthTokens,
  DashboardData,
  Exam,
  Exercise,
  LoginCredentials,
  Marhalah,
  Question,
  RegisterData,
  StudentProfile,
  Topic,
  User,
} from "@/lib/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    if (USE_MOCK) {
      localStorage.setItem("access_token", "mock-token");
      localStorage.setItem("refresh_token", "mock-refresh");
      return { access: "mock-token", refresh: "mock-refresh" };
    }
    const tokens = await apiClient<AuthTokens>("/auth/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    return tokens;
  },

  register: async (data: RegisterData): Promise<AuthTokens> => {
    if (USE_MOCK) {
      localStorage.setItem("access_token", "mock-token");
      localStorage.setItem("refresh_token", "mock-refresh");
      return { access: "mock-token", refresh: "mock-refresh" };
    }
    const tokens = await apiClient<AuthTokens>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    return tokens;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

export const studentApi = {
  getDashboard: async (): Promise<DashboardData> => {
    if (USE_MOCK) return mockDashboard;
    return apiClient<DashboardData>("/student/dashboard/");
  },

  getProfile: async (): Promise<StudentProfile> => {
    if (USE_MOCK) return mockUser;
    return apiClient<StudentProfile>("/student/profile/");
  },

  getMarhalahs: async (): Promise<Marhalah[]> => {
    if (USE_MOCK) return mockMarhalahs;
    return apiClient<Marhalah[]>("/student/marhalahs/");
  },

  getTopics: async (marhalahId: number): Promise<Topic[]> => {
    if (USE_MOCK) return mockTopics.filter((t) => t.marhalah === marhalahId);
    return apiClient<Topic[]>(`/student/marhalahs/${marhalahId}/topics/`);
  },

  getTopic: async (topicId: number): Promise<Topic> => {
    if (USE_MOCK) {
      const topic = mockTopics.find((t) => t.id === topicId);
      if (!topic) throw new Error("Topic not found");
      return topic;
    }
    return apiClient<Topic>(`/student/topics/${topicId}/`);
  },

  completeTopic: async (topicId: number): Promise<Topic> => {
    if (USE_MOCK) {
      const topic = mockTopics.find((t) => t.id === topicId);
      if (!topic) throw new Error("Topic not found");
      return { ...topic, is_completed: true, status: "completed" };
    }
    return apiClient<Topic>(`/student/topics/${topicId}/complete/`, {
      method: "POST",
    });
  },

  getExercises: async (): Promise<Exercise[]> => {
    if (USE_MOCK) return mockExercises;
    return apiClient<Exercise[]>("/student/exercises/");
  },

  getExercise: async (id: number): Promise<Exercise> => {
    if (USE_MOCK) {
      const ex = mockExercises.find((e) => e.id === id);
      if (!ex) throw new Error("Exercise not found");
      return ex;
    }
    return apiClient<Exercise>(`/student/exercises/${id}/`);
  },

  getExerciseQuestions: async (id: number): Promise<Question[]> => {
    if (USE_MOCK) return mockQuestions;
    return apiClient<Question[]>(`/student/exercises/${id}/questions/`);
  },

  submitExercise: async (
    id: number,
    answers: Record<number, string>
  ): Promise<{ score: number; max_score: number }> => {
    if (USE_MOCK) return { score: 16, max_score: 20 };
    return apiClient(`/student/exercises/${id}/submit/`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  getExams: async (): Promise<Exam[]> => {
    if (USE_MOCK) return mockExams;
    return apiClient<Exam[]>("/student/exams/");
  },
};

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    if (USE_MOCK) return mockAdminStats;
    return apiClient<AdminStats>("/admin/stats/");
  },

  getStudents: async (): Promise<User[]> => {
    if (USE_MOCK) return mockStudents;
    return apiClient<User[]>("/admin/students/");
  },

  getStudent: async (id: number): Promise<StudentProfile> => {
    if (USE_MOCK) {
      const student = mockStudents.find((s) => s.id === id);
      if (!student) throw new Error("Student not found");
      return { ...mockUser, ...student };
    }
    return apiClient<StudentProfile>(`/admin/students/${id}/`);
  },

  getTopics: async (marhalahId?: number): Promise<Topic[]> => {
    if (USE_MOCK) {
      if (marhalahId) return mockTopics.filter((t) => t.marhalah === marhalahId);
      return mockTopics;
    }
    const query = marhalahId ? `?marhalah=${marhalahId}` : "";
    return apiClient<Topic[]>(`/admin/topics/${query}`);
  },
};
