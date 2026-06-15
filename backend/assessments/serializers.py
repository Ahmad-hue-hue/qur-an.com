from rest_framework import serializers

from assessments.models import (
    Exam,
    ExamSubmission,
    Exercise,
    ExerciseSubmission,
    ManualScore,
    Question,
)


class QuestionSerializer(serializers.ModelSerializer):
    options = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = Question
        fields = ["id", "type", "text", "arabic_text", "options", "order"]
        read_only_fields = fields


class QuestionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id",
            "exercise",
            "exam",
            "type",
            "text",
            "arabic_text",
            "options",
            "correct_answer",
            "order",
            "max_score",
        ]


class ExerciseSerializer(serializers.ModelSerializer):
    marhalah = serializers.IntegerField(source="marhalah_id")
    status = serializers.CharField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    score = serializers.FloatField(read_only=True, required=False)
    max_score = serializers.FloatField(read_only=True, required=False)
    has_submitted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Exercise
        fields = [
            "id",
            "marhalah",
            "title",
            "description",
            "start_date",
            "end_date",
            "status",
            "question_count",
            "score",
            "max_score",
            "has_submitted",
        ]


class ExamSerializer(serializers.ModelSerializer):
    marhalah = serializers.IntegerField(source="marhalah_id")
    status = serializers.CharField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    score = serializers.FloatField(read_only=True, required=False)
    max_score = serializers.FloatField(read_only=True, required=False)
    has_submitted = serializers.BooleanField(read_only=True)

    class Meta:
        model = Exam
        fields = [
            "id",
            "marhalah",
            "title",
            "description",
            "duration_minutes",
            "start_date",
            "end_date",
            "status",
            "question_count",
            "score",
            "max_score",
            "has_submitted",
        ]


class ManualScoreSerializer(serializers.ModelSerializer):
    marhalah = serializers.IntegerField(source="marhalah_id")
    type = serializers.CharField()

    class Meta:
        model = ManualScore
        fields = ["id", "type", "score", "max_score", "marhalah", "notes"]


class ExerciseSubmitSerializer(serializers.Serializer):
    answers = serializers.DictField(child=serializers.CharField())


class ExerciseSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseSubmission
        fields = ["id", "student", "exercise", "answers", "score", "max_score", "submitted_at"]
        read_only_fields = ["score", "max_score", "submitted_at"]
