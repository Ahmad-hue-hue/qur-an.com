from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    AdminLoginView,
    AdminStatsView,
    AdminStudentAssignRegistrationView,
    AdminStudentDetailView,
    AdminStudentListCreateView,
    AdminTopicDetailView,
    AdminTopicListCreateView,
    StudentDashboardView,
    StudentLoginView,
    StudentRegisterView,
    StudentMarhalahListView,
    StudentProfileView,
    StudentTopicCompleteView,
    StudentTopicDetailView,
    StudentTopicListView,
)
from assessments.admin_views import (
    AdminExamDetailView,
    AdminExamListCreateView,
    AdminExamQuestionListCreateView,
    AdminExerciseAnswerGradeView,
    AdminExerciseDetailView,
    AdminExerciseListCreateView,
    AdminExerciseQuestionDetailView,
    AdminExerciseQuestionListCreateView,
    AdminExerciseSubmissionListView,
)
from assessments.views import (
    StudentExamListView,
    StudentExerciseDetailView,
    StudentExerciseListView,
    StudentExerciseQuestionsView,
    StudentExerciseSubmitView,
)

urlpatterns = [
    path("auth/student/register/", StudentRegisterView.as_view(), name="student-register"),
    path("auth/student/login/", StudentLoginView.as_view(), name="student-login"),
    path("auth/admin/login/", AdminLoginView.as_view(), name="admin-login"),
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
    path("admin/students/", AdminStudentListCreateView.as_view(), name="admin-students"),
    path(
        "admin/students/<int:pk>/",
        AdminStudentDetailView.as_view(),
        name="admin-student-detail",
    ),
    path(
        "admin/students/<int:pk>/assign-registration/",
        AdminStudentAssignRegistrationView.as_view(),
        name="admin-student-assign-registration",
    ),
    path("admin/topics/", AdminTopicListCreateView.as_view(), name="admin-topics"),
    path(
        "admin/topics/<int:pk>/",
        AdminTopicDetailView.as_view(),
        name="admin-topic-detail",
    ),
    path("admin/exercises/", AdminExerciseListCreateView.as_view(), name="admin-exercises"),
    path(
        "admin/exercises/<int:pk>/",
        AdminExerciseDetailView.as_view(),
        name="admin-exercise-detail",
    ),
    path(
        "admin/exercises/<int:exercise_id>/questions/",
        AdminExerciseQuestionListCreateView.as_view(),
        name="admin-exercise-questions",
    ),
    path(
        "admin/exercises/<int:exercise_id>/questions/<int:pk>/",
        AdminExerciseQuestionDetailView.as_view(),
        name="admin-exercise-question-detail",
    ),
    path(
        "admin/exercises/<int:exercise_id>/submissions/",
        AdminExerciseSubmissionListView.as_view(),
        name="admin-exercise-submissions",
    ),
    path(
        "admin/exercise-grades/<int:pk>/",
        AdminExerciseAnswerGradeView.as_view(),
        name="admin-exercise-grade",
    ),
    path("admin/exams/", AdminExamListCreateView.as_view(), name="admin-exams"),
    path(
        "admin/exams/<int:pk>/",
        AdminExamDetailView.as_view(),
        name="admin-exam-detail",
    ),
    path(
        "admin/exams/<int:exam_id>/questions/",
        AdminExamQuestionListCreateView.as_view(),
        name="admin-exam-questions",
    ),
]
