from datetime import datetime

from django.utils import timezone

from assessments.models import (
    ExamSubmission,
    ExerciseSubmission,
    ManualScore,
    ScoreWeights,
)
from courses.models import Marhalah, Topic, TopicCompletion


def get_assessment_status(start_date, end_date, has_submitted=False):
    now = timezone.now()
    if has_submitted:
        return "completed"
    if now < start_date:
        return "upcoming"
    if now > end_date:
        return "expired"
    return "open"


def get_completed_topic_ids(student):
    return set(
        TopicCompletion.objects.filter(student=student).values_list("topic_id", flat=True)
    )


def get_marhalah_final_score(student, marhalah):
    """Calculate weighted final score for a marhalah."""
    weights, _ = ScoreWeights.objects.get_or_create(pk=1)

    # Exercise scores
    ex_subs = ExerciseSubmission.objects.filter(
        student=student, exercise__marhalah=marhalah
    )
    ex_score = sum(float(s.score) for s in ex_subs)
    ex_max = sum(float(s.max_score) for s in ex_subs) or 1
    ex_pct = (ex_score / ex_max) * 100 if ex_max else 0

    # Exam score
    exam_sub = ExamSubmission.objects.filter(
        student=student, exam__marhalah=marhalah, submitted_at__isnull=False
    ).first()
    exam_pct = 0
    if exam_sub and exam_sub.max_score:
        exam_pct = (float(exam_sub.score) / float(exam_sub.max_score)) * 100

    # Manual scores
    halaqah = ManualScore.objects.filter(
        student=student, marhalah=marhalah, type=ManualScore.ScoreType.HALAQAH
    ).first()
    tadreeb = ManualScore.objects.filter(
        student=student, marhalah=marhalah, type=ManualScore.ScoreType.TADREEB
    ).first()

    h_pct = (
        (float(halaqah.score) / float(halaqah.max_score)) * 100
        if halaqah and halaqah.max_score
        else 0
    )
    t_pct = (
        (float(tadreeb.score) / float(tadreeb.max_score)) * 100
        if tadreeb and tadreeb.max_score
        else 0
    )

    total_weight = weights.exercises + weights.exam + weights.halaqah + weights.tadreeb
    if total_weight == 0:
        return 0

    final = (
        ex_pct * weights.exercises
        + exam_pct * weights.exam
        + h_pct * weights.halaqah
        + t_pct * weights.tadreeb
    ) / total_weight

    return round(final, 1)


def is_marhalah_unlocked(student, marhalah):
    if marhalah.number == 1:
        return True
    prev = Marhalah.objects.filter(number=marhalah.number - 1).first()
    if not prev:
        return False
    final = get_marhalah_final_score(student, prev)
    return final >= marhalah.unlock_threshold


def get_marhalah_status(student, marhalah):
    if not is_marhalah_unlocked(student, marhalah):
        return "locked"
    topics = Topic.objects.filter(marhalah=marhalah, is_published=True)
    completed = TopicCompletion.objects.filter(
        student=student, topic__in=topics
    ).count()
    if topics.count() > 0 and completed >= topics.count():
        return "completed"
    return "open"


def get_topic_status(student, topic, completed_ids):
    if topic.id in completed_ids:
        return "completed"
    marhalah = topic.marhalah
    if not is_marhalah_unlocked(student, marhalah):
        return "locked"
    # First incomplete topic in order is active
    topics = Topic.objects.filter(marhalah=marhalah, is_published=True).order_by("order")
    for t in topics:
        if t.id not in completed_ids:
            return "active" if t.id == topic.id else "locked"
    return "locked"


def get_student_progress(student, marhalah):
    topics = Topic.objects.filter(marhalah=marhalah, is_published=True)
    total = topics.count()
    completed = TopicCompletion.objects.filter(
        student=student, topic__in=topics
    ).count()
    pct = round((completed / total) * 100) if total else 0
    return completed, total, pct


def get_overall_average(student):
    marhalahs = Marhalah.objects.all()
    scores = []
    for m in marhalahs:
        if is_marhalah_unlocked(student, m):
            s = get_marhalah_final_score(student, m)
            if s > 0:
                scores.append(s)
    return round(sum(scores) / len(scores), 1) if scores else 0


def assign_registration_number(student):
    """Assign reg number on first exercise attempt."""
    if student.registration_number:
        return
    year = datetime.now().year
    count = (
        type(student)
        .objects.filter(registration_number__isnull=False)
        .count()
        + 1
    )
    student.registration_number = f"TJW-{year}-{count:03d}"
    student.save(update_fields=["registration_number"])
