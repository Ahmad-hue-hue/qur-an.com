from datetime import datetime
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from assessments.models import (
    ExamSubmission,
    ExerciseSubmission,
    ManualScore,
    ScoreWeights,
)
from courses.models import Marhalah, Topic, TopicCompletion


def get_score_weights():
    weights, _ = ScoreWeights.objects.get_or_create(pk=1)
    return weights


def get_assessment_status(start_date, end_date, has_submitted=False):
    now = timezone.now()
    if has_submitted:
        return "completed"
    if now < start_date:
        return "upcoming"
    if now > end_date:
        return "expired"
    return "open"


def get_completed_topic_ids(student, marhalah=None):
    qs = TopicCompletion.objects.filter(student=student)
    if marhalah:
        qs = qs.filter(topic__marhalah=marhalah)
    return set(qs.values_list("topic_id", flat=True))


def get_topic_status(topic, student, completed_ids, active_topic_id):
    if topic.id in completed_ids:
        return "completed"
    if topic.id == active_topic_id:
        return "active"
    return "locked"


def get_active_topic(marhalah, completed_ids):
    topics = list(marhalah.topics.filter(is_published=True).order_by("order"))
    for topic in topics:
        if topic.id not in completed_ids:
            return topic
    return None


def is_marhalah_unlocked(student, marhalah):
    if marhalah.number == 1:
        return True
    prev = Marhalah.objects.filter(number=marhalah.number - 1).first()
    if not prev:
        return False
    final = calculate_final_score(student, prev)
    return final >= marhalah.unlock_threshold


def get_marhalah_status(student, marhalah, final_score=None):
    if not is_marhalah_unlocked(student, marhalah):
        return "locked"
    topics = marhalah.topics.filter(is_published=True)
    total = topics.count()
    completed = TopicCompletion.objects.filter(
        student=student, topic__marhalah=marhalah
    ).count()
    if total > 0 and completed >= total:
        score = final_score if final_score is not None else calculate_final_score(student, marhalah)
        if score > 0:
            return "completed"
    return "open"


def calculate_exercise_percent(student, marhalah):
    submissions = ExerciseSubmission.objects.filter(
        student=student, exercise__marhalah=marhalah
    )
    if not submissions.exists():
        return Decimal("0")
    total_score = submissions.aggregate(s=Sum("score"))["s"] or Decimal("0")
    total_max = submissions.aggregate(s=Sum("max_score"))["s"] or Decimal("0")
    if total_max == 0:
        return Decimal("0")
    return (total_score / total_max) * 100


def calculate_exam_percent(student, marhalah):
    submission = (
        ExamSubmission.objects.filter(student=student, exam__marhalah=marhalah)
        .order_by("-submitted_at")
        .first()
    )
    if not submission or submission.max_score == 0:
        return Decimal("0")
    return (submission.score / submission.max_score) * 100


def calculate_manual_percent(student, marhalah, score_type):
    score = ManualScore.objects.filter(
        student=student, marhalah=marhalah, type=score_type
    ).first()
    if not score or score.max_score == 0:
        return Decimal("0")
    return (score.score / score.max_score) * 100


def calculate_final_score(student, marhalah):
    weights = get_score_weights()
    total_weight = weights.exercises + weights.exam + weights.halaqah + weights.tadreeb
    if total_weight == 0:
        return 0

    exercise_pct = calculate_exercise_percent(student, marhalah)
    exam_pct = calculate_exam_percent(student, marhalah)
    halaqah_pct = calculate_manual_percent(student, marhalah, ManualScore.ScoreType.HALAQAH)
    tadreeb_pct = calculate_manual_percent(student, marhalah, ManualScore.ScoreType.TADREEB)

    weighted = (
        exercise_pct * weights.exercises
        + exam_pct * weights.exam
        + halaqah_pct * weights.halaqah
        + tadreeb_pct * weights.tadreeb
    ) / total_weight
    return round(float(weighted), 1)


def get_student_progress(student, marhalah):
    topics = marhalah.topics.filter(is_published=True)
    total = topics.count()
    completed = TopicCompletion.objects.filter(
        student=student, topic__in=topics
    ).count()
    percent = round((completed / total) * 100) if total else 0
    return completed, total, percent


def assign_registration_number(student):
    if student.registration_number:
        return student.registration_number
    year = datetime.now().year
    count = (
        type(student).objects.filter(registration_number__isnull=False).count() + 1
    )
    reg_no = f"TJW-{year}-{count:03d}"
    student.registration_number = reg_no
    student.save(update_fields=["registration_number"])
    return reg_no


def grade_mcq_submission(questions, answers):
    score = Decimal("0")
    max_score = Decimal("0")
    for question in questions:
        max_score += Decimal(str(question.max_score))
        if question.type == "mcq":
            answer = answers.get(str(question.id)) or answers.get(question.id)
            if answer and answer == question.correct_answer:
                score += Decimal(str(question.max_score))
    return score, max_score
