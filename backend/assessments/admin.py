from django.contrib import admin

from .models import (
    Exam,
    ExamSubmission,
    Exercise,
    ExerciseSubmission,
    ManualScore,
    Question,
    ScoreWeights,
)


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ["title", "marhalah", "start_date", "end_date"]
    list_filter = ["marhalah"]
    inlines = [QuestionInline]


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ["title", "marhalah", "duration_minutes", "start_date", "end_date"]
    list_filter = ["marhalah"]
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["text", "type", "exercise", "exam", "order"]
    list_filter = ["type"]


@admin.register(ExerciseSubmission)
class ExerciseSubmissionAdmin(admin.ModelAdmin):
    list_display = ["student", "exercise", "score", "max_score", "submitted_at"]


@admin.register(ExamSubmission)
class ExamSubmissionAdmin(admin.ModelAdmin):
    list_display = ["student", "exam", "score", "max_score", "submitted_at"]


@admin.register(ManualScore)
class ManualScoreAdmin(admin.ModelAdmin):
    list_display = ["student", "marhalah", "type", "score", "max_score"]


@admin.register(ScoreWeights)
class ScoreWeightsAdmin(admin.ModelAdmin):
    list_display = ["exercises", "exam", "halaqah", "tadreeb"]
