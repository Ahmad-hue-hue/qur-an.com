from rest_framework import serializers

from assessments.models import (
    Exam,
    ExamSubmission,
    Exercise,
    ExerciseAnswerGrade,
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

    def validate(self, attrs):
        question_type = attrs.get("type") or getattr(self.instance, "type", None)
        options = attrs.get("options", getattr(self.instance, "options", []))
        correct_answer = attrs.get(
            "correct_answer", getattr(self.instance, "correct_answer", "")
        )

        if question_type == Question.QuestionType.MCQ:
            if not options:
                raise serializers.ValidationError(
                    {"options": "MCQ questions require at least one option."}
                )
            if not correct_answer:
                raise serializers.ValidationError(
                    {"correct_answer": "MCQ questions require a correct answer."}
                )
        elif question_type == Question.QuestionType.FILL_BLANK:
            if not correct_answer:
                raise serializers.ValidationError(
                    {"correct_answer": "Fill-in-the-blank questions require a correct answer."}
                )
        elif question_type == Question.QuestionType.TRUE_FALSE:
            normalized = (correct_answer or "").strip().lower()
            if normalized not in {"true", "false"}:
                raise serializers.ValidationError(
                    {"correct_answer": "True/false correct answer must be 'true' or 'false'."}
                )
            attrs["correct_answer"] = normalized
        elif question_type in {
            Question.QuestionType.FILL_GAP,
            Question.QuestionType.WRITTEN,
        }:
            attrs.setdefault("correct_answer", "")

        return attrs


class QuestionCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=Question.QuestionType.choices)
    text = serializers.CharField()
    arabic_text = serializers.CharField(required=False, allow_blank=True, default="")
    options = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    correct_answer = serializers.CharField(required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, default=1)
    max_score = serializers.IntegerField(required=False, default=1)


class ExerciseSerializer(serializers.ModelSerializer):
    marhalah = serializers.IntegerField(source="marhalah_id")
    status = serializers.CharField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    score = serializers.FloatField(read_only=True, required=False)
    max_score = serializers.FloatField(read_only=True, required=False)
    has_submitted = serializers.BooleanField(read_only=True)
    grading_status = serializers.CharField(read_only=True, required=False)

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
            "grading_status",
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
    questions = QuestionCreateSerializer(many=True, required=False, write_only=True)

    class Meta(ExerciseAdminSerializer.Meta):
        fields = ExerciseAdminSerializer.Meta.fields + [
            "question_text",
            "question_options",
            "correct_answer",
            "questions",
        ]

    def _create_question(self, exercise, data, order):
        serializer = QuestionAdminSerializer(data={**data, "exercise": exercise.id, "order": order})
        serializer.is_valid(raise_exception=True)
        return serializer.save(exercise=exercise)

    def create(self, validated_data):
        legacy_text = validated_data.pop("question_text", "")
        legacy_options = validated_data.pop("question_options", [])
        legacy_correct = validated_data.pop("correct_answer", "")
        questions_data = validated_data.pop("questions", [])

        exercise = Exercise.objects.create(**validated_data)

        if legacy_text.strip() and not questions_data:
            questions_data = [
                {
                    "type": Question.QuestionType.MCQ,
                    "text": legacy_text.strip(),
                    "options": legacy_options,
                    "correct_answer": legacy_correct
                    or (legacy_options[0] if legacy_options else ""),
                    "order": 1,
                }
            ]

        for index, question_data in enumerate(questions_data, start=1):
            order = question_data.get("order") or index
            self._create_question(exercise, question_data, order)

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
        fields = [
            "id",
            "student",
            "exercise",
            "answers",
            "score",
            "max_score",
            "grading_status",
            "submitted_at",
        ]
        read_only_fields = ["score", "max_score", "grading_status", "submitted_at"]


class ExerciseAnswerGradeSerializer(serializers.ModelSerializer):
    question_id = serializers.IntegerField(source="question.id", read_only=True)
    question_text = serializers.CharField(source="question.text", read_only=True)
    question_type = serializers.CharField(source="question.type", read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = ExerciseAnswerGrade
        fields = [
            "id",
            "question_id",
            "question_text",
            "question_type",
            "answer_text",
            "score",
            "max_score",
            "feedback",
            "graded_at",
            "student_name",
        ]
        read_only_fields = ["graded_at", "student_name"]

    def get_student_name(self, obj):
        student = obj.submission.student
        return f"{student.first_name} {student.last_name}".strip()


class ExerciseSubmissionAdminSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    answer_grades = ExerciseAnswerGradeSerializer(many=True, read_only=True)

    class Meta:
        model = ExerciseSubmission
        fields = [
            "id",
            "student",
            "student_name",
            "exercise",
            "answers",
            "score",
            "max_score",
            "grading_status",
            "submitted_at",
            "answer_grades",
        ]

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip()


class GradeAnswerSerializer(serializers.Serializer):
    score = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=0)
    feedback = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_score(self, value):
        grade = self.context["grade"]
        if value > grade.max_score:
            raise serializers.ValidationError(
                f"Score cannot exceed max score of {grade.max_score}."
            )
        return value
