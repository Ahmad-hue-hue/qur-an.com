from rest_framework import serializers

from assessments.models import (
    Exam,
    ExamSubmission,
    Exercise,
    ExerciseSubmission,
    ManualScore,
    Question,
)
from courses.models import Marhalah


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


class ExerciseAdminSerializer(serializers.ModelSerializer):
    marhalah = serializers.PrimaryKeyRelatedField(queryset=Marhalah.objects.all())

    class Meta:
        model = Exercise
        fields = ["id", "marhalah", "title", "description", "start_date", "end_date"]


class ExamAdminSerializer(serializers.ModelSerializer):
    marhalah = serializers.PrimaryKeyRelatedField(queryset=Marhalah.objects.all())

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
        ]


class ExerciseCreateSerializer(ExerciseAdminSerializer):
    question_text = serializers.CharField(required=False, allow_blank=True, write_only=True)
    question_options = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )
    correct_answer = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta(ExerciseAdminSerializer.Meta):
        fields = ExerciseAdminSerializer.Meta.fields + [
            "question_text",
            "question_options",
            "correct_answer",
        ]

    def create(self, validated_data):
        question_text = validated_data.pop("question_text", "")
        question_options = validated_data.pop("question_options", [])
        correct_answer = validated_data.pop("correct_answer", "")
        exercise = Exercise.objects.create(**validated_data)
        if question_text.strip():
            Question.objects.create(
                exercise=exercise,
                type=Question.QuestionType.MCQ,
                text=question_text.strip(),
                options=question_options,
                correct_answer=correct_answer or (question_options[0] if question_options else ""),
                order=1,
            )
        return exercise


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
