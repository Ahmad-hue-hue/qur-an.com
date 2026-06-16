from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from assessments.models import Exercise, ExerciseAnswerGrade, ExerciseSubmission
from assessments.serializers import ExamSerializer, ExerciseSerializer, QuestionSerializer
from assessments.services import (
    assign_registration_number,
    get_assessment_status,
    grade_exercise_submission,
    recalculate_submission_score,
)


class StudentExerciseListView(APIView):
    def get(self, request):
        exercises = Exercise.objects.filter(
            marhalah__number=request.user.current_marhalah
        )
        data = []
        for exercise in exercises:
            submission = exercise.submissions.filter(student=request.user).first()
            data.append(
                {
                    **ExerciseSerializer(exercise).data,
                    "status": get_assessment_status(
                        exercise.start_date, exercise.end_date, bool(submission)
                    ),
                    "question_count": exercise.questions.count(),
                    "score": float(submission.score) if submission else None,
                    "max_score": float(submission.max_score) if submission else None,
                    "has_submitted": bool(submission),
                    "grading_status": submission.grading_status if submission else None,
                }
            )
        return Response(data)


class StudentExerciseDetailView(APIView):
    def get(self, request, pk):
        exercise = Exercise.objects.filter(pk=pk).first()
        if not exercise:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        submission = exercise.submissions.filter(student=request.user).first()
        return Response(
            {
                **ExerciseSerializer(exercise).data,
                "status": get_assessment_status(
                    exercise.start_date, exercise.end_date, bool(submission)
                ),
                "question_count": exercise.questions.count(),
                "score": float(submission.score) if submission else None,
                "max_score": float(submission.max_score) if submission else None,
                "has_submitted": bool(submission),
                "grading_status": submission.grading_status if submission else None,
            }
        )


class StudentExerciseQuestionsView(APIView):
    def get(self, request, pk):
        exercise = Exercise.objects.filter(pk=pk).first()
        if not exercise:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        status_val = get_assessment_status(exercise.start_date, exercise.end_date)
        if status_val != "open":
            return Response(
                {"detail": f"Exercise is {status_val}."},
                status=status.HTTP_403_FORBIDDEN,
            )
        questions = exercise.questions.all()
        return Response(QuestionSerializer(questions, many=True).data)


class StudentExerciseSubmitView(APIView):
    def post(self, request, pk):
        exercise = Exercise.objects.filter(pk=pk).first()
        if not exercise:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        status_val = get_assessment_status(exercise.start_date, exercise.end_date)
        if status_val != "open":
            return Response(
                {"detail": f"Exercise is {status_val}."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ExerciseSubmission.objects.filter(
            student=request.user, exercise=exercise
        ).exists():
            return Response(
                {"detail": "Already submitted."}, status=status.HTTP_400_BAD_REQUEST
            )

        answers = request.data.get("answers", {})
        questions = list(exercise.questions.all())
        auto_score, max_score, manual_items = grade_exercise_submission(questions, answers)

        grading_status = (
            ExerciseSubmission.GradingStatus.PENDING_MANUAL
            if manual_items
            else ExerciseSubmission.GradingStatus.COMPLETE
        )

        submission = ExerciseSubmission.objects.create(
            student=request.user,
            exercise=exercise,
            answers=answers,
            score=auto_score,
            max_score=max_score,
            grading_status=grading_status,
        )

        for item in manual_items:
            ExerciseAnswerGrade.objects.create(
                submission=submission,
                question=item["question"],
                answer_text=item["answer_text"],
                max_score=item["max_score"],
            )

        if not request.user.has_attempted_exercise:
            request.user.has_attempted_exercise = True
            request.user.save(update_fields=["has_attempted_exercise"])
            assign_registration_number(request.user)

        return Response(
            {
                "score": float(submission.score),
                "max_score": float(max_score),
                "grading_status": submission.grading_status,
            }
        )


class StudentExamListView(APIView):
    def get(self, request):
        exams = Exam.objects.filter(marhalah__number=request.user.current_marhalah)
        data = []
        for exam in exams:
            submission = exam.submissions.filter(student=request.user).first()
            data.append(
                {
                    **ExamSerializer(exam).data,
                    "status": get_assessment_status(
                        exam.start_date,
                        exam.end_date,
                        bool(submission and submission.submitted_at),
                    ),
                    "question_count": exam.questions.count(),
                    "score": float(submission.score) if submission else None,
                    "max_score": float(submission.max_score) if submission else None,
                    "has_submitted": bool(submission and submission.submitted_at),
                }
            )
        return Response(data)
