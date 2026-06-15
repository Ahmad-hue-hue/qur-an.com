from django.conf import settings
from django.db import models


class ScoreWeights(models.Model):
    """Configurable weights for final score calculation (singleton)."""

    exercises = models.PositiveSmallIntegerField(default=30)
    exam = models.PositiveSmallIntegerField(default=40)
    halaqah = models.PositiveSmallIntegerField(default=15)
    tadreeb = models.PositiveSmallIntegerField(default=15)

    class Meta:
        verbose_name_plural = "score weights"

    def __str__(self):
        return f"Weights: E{self.exercises} X{self.exam} H{self.halaqah} T{self.tadreeb}"


class Exercise(models.Model):
    marhalah = models.ForeignKey(
        "courses.Marhalah", on_delete=models.CASCADE, related_name="exercises"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    class Meta:
        ordering = ["start_date"]

    def __str__(self):
        return self.title


class Exam(models.Model):
    marhalah = models.ForeignKey(
        "courses.Marhalah", on_delete=models.CASCADE, related_name="exams"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveSmallIntegerField(default=60)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    class Meta:
        ordering = ["start_date"]

    def __str__(self):
        return self.title


class Question(models.Model):
    class QuestionType(models.TextChoices):
        MCQ = "mcq", "Multiple Choice"
        WRITTEN = "written", "Written"

    exercise = models.ForeignKey(
        Exercise, on_delete=models.CASCADE, null=True, blank=True, related_name="questions"
    )
    exam = models.ForeignKey(
        Exam, on_delete=models.CASCADE, null=True, blank=True, related_name="questions"
    )
    type = models.CharField(max_length=10, choices=QuestionType.choices)
    text = models.TextField()
    arabic_text = models.TextField(blank=True)
    options = models.JSONField(default=list, blank=True)
    correct_answer = models.CharField(max_length=500, blank=True)
    order = models.PositiveSmallIntegerField(default=1)
    max_score = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Q{self.order}: {self.text[:50]}"


class ExerciseSubmission(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="exercise_submissions",
    )
    exercise = models.ForeignKey(
        Exercise, on_delete=models.CASCADE, related_name="submissions"
    )
    answers = models.JSONField(default=dict)
    score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["student", "exercise"]]


class ExamSubmission(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="exam_submissions",
    )
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="submissions")
    answers = models.JSONField(default=dict)
    score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [["student", "exam"]]


class ManualScore(models.Model):
    class ScoreType(models.TextChoices):
        HALAQAH = "halaqah", "Halaqah"
        TADREEB = "tadreeb", "Tadreeb"

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="manual_scores",
    )
    marhalah = models.ForeignKey(
        "courses.Marhalah", on_delete=models.CASCADE, related_name="manual_scores"
    )
    type = models.CharField(max_length=10, choices=ScoreType.choices)
    score = models.DecimalField(max_digits=6, decimal_places=2)
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=20)
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["student", "marhalah", "type"]]
