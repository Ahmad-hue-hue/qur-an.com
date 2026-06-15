from courses.models import Marhalah, Topic
from courses.serializers import MarhalahSerializer, TopicSerializer
from assessments.models import Exam, Exercise, ManualScore
from assessments.serializers import ExamSerializer, ExerciseSerializer, ManualScoreSerializer
from assessments.services import (
    calculate_final_score,
    get_active_topic,
    get_assessment_status,
    get_completed_topic_ids,
    get_marhalah_status,
    get_student_progress,
    get_topic_status,
)


def build_topic_payload(topic, student, completed_ids, active_topic_id, request):
    return {
        **TopicSerializer(topic, context={"request": request}).data,
        "is_completed": topic.id in completed_ids,
        "status": get_topic_status(topic, student, completed_ids, active_topic_id),
    }


def build_student_profile(student):
    marhalah = Marhalah.objects.filter(number=student.current_marhalah).first()
    completed, total, percent = get_student_progress(student, marhalah) if marhalah else (0, 0, 0)
    averages = []
    for m in Marhalah.objects.all():
        score = calculate_final_score(student, m)
        if score > 0:
            averages.append(score)
    overall = round(sum(averages) / len(averages), 1) if averages else 0

    return {
        "id": student.id,
        "email": student.email,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "phone": student.phone,
        "role": student.role,
        "registration_number": student.registration_number,
        "is_suspended": student.is_suspended,
        "date_joined": student.date_joined.isoformat(),
        "current_marhalah": student.current_marhalah,
        "progress_percent": percent,
        "topics_completed": completed,
        "total_topics": total,
        "overall_average": overall,
        "has_attempted_exercise": student.has_attempted_exercise,
    }


def build_dashboard_data(student, request):
    marhalah = Marhalah.objects.filter(number=student.current_marhalah).first()
    completed, total, percent = get_student_progress(student, marhalah) if marhalah else (0, 0, 0)
    completed_ids = get_completed_topic_ids(student, marhalah) if marhalah else set()
    next_topic_obj = get_active_topic(marhalah, completed_ids) if marhalah else None
    next_topic = (
        build_topic_payload(
            next_topic_obj, student, completed_ids, next_topic_obj.id, request
        )
        if next_topic_obj
        else None
    )

    marhalahs_data = []
    for m in Marhalah.objects.all():
        m_completed, m_total, _ = get_student_progress(student, m)
        final_score = calculate_final_score(student, m)
        marhalahs_data.append(
            {
                **MarhalahSerializer(m).data,
                "status": get_marhalah_status(student, m, final_score),
                "topics_count": m_total,
                "topics_completed": m_completed,
                "final_score": final_score if final_score > 0 else None,
            }
        )

    exercises = Exercise.objects.filter(marhalah__number=student.current_marhalah)
    exercises_data = []
    for ex in exercises:
        submission = ex.submissions.filter(student=student).first()
        exercises_data.append(
            {
                **ExerciseSerializer(ex).data,
                "status": get_assessment_status(
                    ex.start_date, ex.end_date, bool(submission)
                ),
                "question_count": ex.questions.count(),
                "score": float(submission.score) if submission else None,
                "max_score": float(submission.max_score) if submission else None,
                "has_submitted": bool(submission),
            }
        )

    exams = Exam.objects.filter(marhalah__number=student.current_marhalah)
    exams_data = []
    for exam in exams:
        submission = exam.submissions.filter(student=student).first()
        exams_data.append(
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

    halaqah = ManualScore.objects.filter(
        student=student, marhalah=marhalah, type=ManualScore.ScoreType.HALAQAH
    ).first()
    tadreeb = ManualScore.objects.filter(
        student=student, marhalah=marhalah, type=ManualScore.ScoreType.TADREEB
    ).first()

    exercise_results = [
        {"title": ex["title"], "score": ex["score"], "max_score": ex["max_score"]}
        for ex in exercises_data
        if ex["score"] is not None
    ]
    exam_result = next(
        (
            {"title": e["title"], "score": e["score"], "max_score": e["max_score"]}
            for e in exams_data
            if e["score"] is not None
        ),
        None,
    )
    profile = build_student_profile(student)
    current_marhalah_data = next(
        (m for m in marhalahs_data if m["number"] == student.current_marhalah),
        marhalahs_data[0] if marhalahs_data else None,
    )

    return {
        "greeting": f"السلام عليكم {student.first_name}",
        "registration_number": student.registration_number,
        "current_marhalah": current_marhalah_data,
        "progress_percent": percent,
        "topics_completed": completed,
        "total_topics": total,
        "next_topic": next_topic,
        "marhalahs": marhalahs_data,
        "exercises": exercises_data,
        "exams": exams_data,
        "halaqah": ManualScoreSerializer(halaqah).data if halaqah else None,
        "tadreeb": ManualScoreSerializer(tadreeb).data if tadreeb else None,
        "recent_results": {
            "exercises": exercise_results,
            "exam": exam_result,
            "overall_average": profile["overall_average"],
        },
    }
