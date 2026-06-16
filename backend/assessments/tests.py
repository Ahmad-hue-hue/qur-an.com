from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from assessments.models import Exercise, ExerciseAnswerGrade, ExerciseSubmission, Question
from assessments.services import grade_exercise_submission, recalculate_submission_score
from courses.models import Marhalah

User = get_user_model()


@override_settings(DEBUG=True)
class AdminAssessmentAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.marhalah = Marhalah.objects.create(
            number=1, title="Marhalah 1", unlock_threshold=0, order=1
        )
        now = timezone.now()
        self.exercise = Exercise.objects.create(
            marhalah=self.marhalah,
            title="Sample Exercise",
            start_date=now,
            end_date=now + timedelta(days=7),
        )

    def test_list_exercises(self):
        response = self.client.get("/api/admin/exercises/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 1)

    def test_create_exercise(self):
        now = timezone.now()
        response = self.client.post(
            "/api/admin/exercises/",
            {
                "marhalah": self.marhalah.id,
                "title": "New Exercise",
                "description": "Practice",
                "start_date": now.isoformat(),
                "end_date": (now + timedelta(days=3)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Exercise.objects.filter(title="New Exercise").count(), 1)

    def test_create_exercise_with_multiple_question_types(self):
        now = timezone.now()
        response = self.client.post(
            "/api/admin/exercises/",
            {
                "marhalah": self.marhalah.id,
                "title": "Mixed Exercise",
                "start_date": now.isoformat(),
                "end_date": (now + timedelta(days=3)).isoformat(),
                "questions": [
                    {
                        "type": "mcq",
                        "text": "Pick one",
                        "options": ["A", "B"],
                        "correct_answer": "A",
                    },
                    {
                        "type": "fill_blank",
                        "text": "The rule is ___",
                        "correct_answer": "idgham",
                    },
                    {
                        "type": "true_false",
                        "text": "Ghunnah is nasalization",
                        "correct_answer": "true",
                    },
                    {"type": "fill_gap", "text": "Explain idgham", "max_score": 5},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        exercise = Exercise.objects.get(title="Mixed Exercise")
        self.assertEqual(exercise.questions.count(), 4)


@override_settings(DEBUG=True)
class ExerciseGradingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.marhalah = Marhalah.objects.create(
            number=1, title="Marhalah 1", unlock_threshold=0, order=1
        )
        now = timezone.now()
        self.exercise = Exercise.objects.create(
            marhalah=self.marhalah,
            title="Graded Exercise",
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(days=7),
        )
        self.mcq = Question.objects.create(
            exercise=self.exercise,
            type=Question.QuestionType.MCQ,
            text="MCQ",
            options=["A", "B"],
            correct_answer="A",
            order=1,
            max_score=2,
        )
        self.blank = Question.objects.create(
            exercise=self.exercise,
            type=Question.QuestionType.FILL_BLANK,
            text="Blank",
            correct_answer="answer",
            order=2,
            max_score=1,
        )
        self.tf = Question.objects.create(
            exercise=self.exercise,
            type=Question.QuestionType.TRUE_FALSE,
            text="TF",
            correct_answer="true",
            order=3,
            max_score=1,
        )
        self.gap = Question.objects.create(
            exercise=self.exercise,
            type=Question.QuestionType.FILL_GAP,
            text="Gap",
            order=4,
            max_score=5,
        )
        self.student = User.objects.create_user(
            username="966500000001@students.tajweed.local",
            email="student@test.com",
            password="pass",
            first_name="Test",
            last_name="Student",
            phone="966500000001",
            role=User.Role.STUDENT,
            current_marhalah=1,
        )
        self.client.force_authenticate(user=self.student)

    def test_grade_exercise_submission_auto_and_manual(self):
        answers = {
            str(self.mcq.id): "A",
            str(self.blank.id): "Answer",
            str(self.tf.id): "true",
            str(self.gap.id): "Long explanation here",
        }
        auto_score, max_score, manual_items = grade_exercise_submission(
            list(self.exercise.questions.all()), answers
        )
        self.assertEqual(auto_score, Decimal("4"))
        self.assertEqual(max_score, Decimal("9"))
        self.assertEqual(len(manual_items), 1)
        self.assertEqual(manual_items[0]["question"].id, self.gap.id)

    def test_submit_exercise_pending_manual_grading(self):
        response = self.client.post(
            f"/api/student/exercises/{self.exercise.id}/submit/",
            {
                "answers": {
                    str(self.mcq.id): "A",
                    str(self.blank.id): "answer",
                    str(self.tf.id): "true",
                    str(self.gap.id): "My answer",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["score"], 4)
        self.assertEqual(data["max_score"], 9)
        self.assertEqual(data["grading_status"], "pending_manual")

        submission = ExerciseSubmission.objects.get(
            student=self.student, exercise=self.exercise
        )
        self.assertEqual(submission.answer_grades.count(), 1)

    def test_admin_grades_fill_gap_answer(self):
        submission = ExerciseSubmission.objects.create(
            student=self.student,
            exercise=self.exercise,
            answers={
                str(self.mcq.id): "A",
                str(self.blank.id): "answer",
                str(self.tf.id): "true",
                str(self.gap.id): "My answer",
            },
            score=Decimal("4"),
            max_score=Decimal("9"),
            grading_status=ExerciseSubmission.GradingStatus.PENDING_MANUAL,
        )
        grade = ExerciseAnswerGrade.objects.create(
            submission=submission,
            question=self.gap,
            answer_text="My answer",
            max_score=Decimal("5"),
        )

        response = self.client.patch(
            f"/api/admin/exercise-grades/{grade.id}/",
            {"score": 4, "feedback": "Good work"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        submission.refresh_from_db()
        grade.refresh_from_db()
        self.assertEqual(float(grade.score), 4)
        self.assertEqual(float(submission.score), 8)
        self.assertEqual(submission.grading_status, "complete")
