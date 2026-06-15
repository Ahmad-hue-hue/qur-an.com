from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    AdminStatsView,
    AdminStudentDetailView,
    AdminStudentListView,
    AdminTopicListCreateView,
    LoginView,
    RegisterView,
    StudentDashboardView,
    StudentMarhalahListView,
    StudentProfileView,
    StudentTopicCompleteView,
    StudentTopicDetailView,
    StudentTopicListView,
)
from assessments.views import (
    StudentExamListView,
    StudentExerciseDetailView,
    StudentExerciseListView,
    StudentExerciseQuestionsView,
    StudentExerciseSubmitView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("student/dashboard/", StudentDashboardView.as_view(), name="student-dashboard"),
    path("student/profile/", StudentProfileView.as_view(), name="student-profile"),
    path("student/marhalahs/", StudentMarhalahListView.as_view(), name="student-marhalahs"),
    path(
        "student/marhalahs/<int:marhalah_id>/topics/",
        StudentTopicListView.as_view(),
        name="student-topics",
    ),
    path("student/topics/<int:topic_id>/", StudentTopicDetailView.as_view(), name="student-topic"),
    path(
        "student/topics/<int:topic_id>/complete/",
        StudentTopicCompleteView.as_view(),
        name="student-topic-complete",
    ),
    path("student/exercises/", StudentExerciseListView.as_view(), name="student-exercises"),
    path(
        "student/exercises/<int:pk>/",
        StudentExerciseDetailView.as_view(),
        name="student-exercise-detail",
    ),
    path(
        "student/exercises/<int:pk>/questions/",
        StudentExerciseQuestionsView.as_view(),
        name="student-exercise-questions",
    ),
    path(
        "student/exercises/<int:pk>/submit/",
        StudentExerciseSubmitView.as_view(),
        name="student-exercise-submit",
    ),
    path("student/exams/", StudentExamListView.as_view(), name="student-exams"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("admin/students/", AdminStudentListView.as_view(), name="admin-students"),
    path(
        "admin/students/<int:pk>/",
        AdminStudentDetailView.as_view(),
        name="admin-student-detail",
    ),
    path("admin/topics/", AdminTopicListCreateView.as_view(), name="admin-topics"),
]
