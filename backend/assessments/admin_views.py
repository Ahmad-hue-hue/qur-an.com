from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from assessments.models import Exam, Exercise, Question
from assessments.serializers import (
    ExamAdminSerializer,
    ExamSerializer,
    ExerciseAdminSerializer,
    ExerciseCreateSerializer,
    ExerciseSerializer,
    QuestionAdminSerializer,
)
from assessments.services import get_assessment_status


def serialize_exercise(exercise):
    return {
        **ExerciseSerializer(exercise).data,
        "status": get_assessment_status(exercise.start_date, exercise.end_date),
        "question_count": exercise.questions.count(),
        "has_submitted": exercise.submissions.exists(),
    }


def serialize_exam(exam):
    return {
        **ExamSerializer(exam).data,
        "status": get_assessment_status(exam.start_date, exam.end_date),
        "question_count": exam.questions.count(),
        "has_submitted": exam.submissions.filter(submitted_at__isnull=False).exists(),
    }


class AdminExerciseListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = Exercise.objects.all().order_by("-start_date")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ExerciseCreateSerializer
        return ExerciseAdminSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        marhalah = self.request.query_params.get("marhalah")
        if marhalah:
            qs = qs.filter(marhalah_id=marhalah)
        return qs

    def list(self, request, *args, **kwargs):
        exercises = self.filter_queryset(self.get_queryset())
        return Response([serialize_exercise(exercise) for exercise in exercises])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exercise = serializer.save()
        return Response(serialize_exercise(exercise), status=status.HTTP_201_CREATED)


class AdminExerciseDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Exercise.objects.all()
    serializer_class = ExerciseAdminSerializer

    def retrieve(self, request, *args, **kwargs):
        exercise = self.get_object()
        data = serialize_exercise(exercise)
        data["questions"] = QuestionAdminSerializer(
            exercise.questions.all(), many=True
        ).data
        return Response(data)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        exercise = self.get_object()
        return Response(serialize_exercise(exercise))

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        exercise = self.get_object()
        return Response(serialize_exercise(exercise))


class AdminExamListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = Exam.objects.all().order_by("-start_date")
    serializer_class = ExamAdminSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        marhalah = self.request.query_params.get("marhalah")
        if marhalah:
            qs = qs.filter(marhalah_id=marhalah)
        return qs

    def list(self, request, *args, **kwargs):
        exams = self.filter_queryset(self.get_queryset())
        return Response([serialize_exam(exam) for exam in exams])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exam = serializer.save()
        return Response(serialize_exam(exam), status=status.HTTP_201_CREATED)


class AdminExamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Exam.objects.all()
    serializer_class = ExamAdminSerializer

    def retrieve(self, request, *args, **kwargs):
        exam = self.get_object()
        data = serialize_exam(exam)
        data["questions"] = QuestionAdminSerializer(exam.questions.all(), many=True).data
        return Response(data)

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return Response(serialize_exam(self.get_object()))

    def partial_update(self, request, *args, **kwargs):
        super().partial_update(request, *args, **kwargs)
        return Response(serialize_exam(self.get_object()))


class AdminExerciseQuestionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = QuestionAdminSerializer

    def get_queryset(self):
        return Question.objects.filter(exercise_id=self.kwargs["exercise_id"]).order_by(
            "order"
        )

    def perform_create(self, serializer):
        exercise = Exercise.objects.filter(pk=self.kwargs["exercise_id"]).first()
        serializer.save(exercise=exercise)


class AdminExamQuestionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = QuestionAdminSerializer

    def get_queryset(self):
        return Question.objects.filter(exam_id=self.kwargs["exam_id"]).order_by("order")

    def perform_create(self, serializer):
        exam = Exam.objects.filter(pk=self.kwargs["exam_id"]).first()
        serializer.save(exam=exam)
