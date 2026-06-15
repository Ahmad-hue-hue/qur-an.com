from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from assessments.models import Exam, Exercise, ManualScore, Question, ScoreWeights
from courses.models import Marhalah, Topic

User = get_user_model()

MARHALAHS = [
    {"number": 1, "title": "Marḥalah 1", "unlock_threshold": 0, "order": 1},
    {"number": 2, "title": "Marḥalah 2", "unlock_threshold": 50, "order": 2},
    {"number": 3, "title": "Marḥalah 3", "unlock_threshold": 60, "order": 3},
    {"number": 4, "title": "Marḥalah 4", "unlock_threshold": 60, "order": 4},
]

TOPICS_M1 = [
    ("Al-Isti'adhah", "الاستعاذة", "Seeking refuge with Allah from Satan before recitation."),
    ("Al-Basmalah", "البسملة", "Saying Bismillah before beginning recitation."),
    ("Introduction to Tajweed", "مقدمة في التجويد", "Overview of Tajweed rules and their importance."),
    ("Al-Lahnu Al-Jali wa Al-Khafi", "اللحن الجلي والخفي", "Clear and hidden errors in Quranic recitation."),
    (
        "Idh-har Al-Halqi",
        "الإظهار الحلقي",
        "When Noon Sakinah or Tanween is followed by one of the six throat letters, the sound is pronounced clearly.",
    ),
    ("Idgham + Iqlab", "الإدغام والإقلاب", "Rules of assimilation and conversion."),
    ("Ikhfa'", "الإخفاء", "Hiding the noon sound with ghunnah."),
    ("Mim Sakinah", "الميم الساكنة", "Rules of the silent meem."),
    ("Idgham Mithlayn + Ikhfa'", "إدغام المثلين والإخفاء", "Combined rules of similar letter assimilation."),
]


class Command(BaseCommand):
    help = "Seed database with initial Tajweed Academy data"

    def handle(self, *args, **options):
        ScoreWeights.objects.get_or_create(
            pk=1,
            defaults={"exercises": 30, "exam": 40, "halaqah": 15, "tadreeb": 15},
        )

        admin, created = User.objects.get_or_create(
            email="admin@tajweed.academy",
            defaults={
                "username": "admin@tajweed.academy",
                "first_name": "Admin",
                "last_name": "User",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("admin12345")
            admin.save()
            self.stdout.write("Created admin: admin@tajweed.academy / admin12345")

        student, created = User.objects.get_or_create(
            email="ahmad@example.com",
            defaults={
                "username": "ahmad@example.com",
                "first_name": "Ahmad",
                "last_name": "Hassan",
                "phone": "966501234567",
                "role": User.Role.STUDENT,
                "registration_number": "TJW-2026-001",
                "has_attempted_exercise": True,
            },
        )
        if created:
            student.set_password("Student@123")
            student.save()
            self.stdout.write("Created student: Ahmad Hassan / 966501234567")
        elif not student.phone:
            student.phone = "966501234567"
            student.save(update_fields=["phone"])

        for m in MARHALAHS:
            Marhalah.objects.get_or_create(number=m["number"], defaults=m)

        m1 = Marhalah.objects.get(number=1)
        for i, (title, arabic, content) in enumerate(TOPICS_M1, start=1):
            Topic.objects.get_or_create(
                marhalah=m1,
                order=i,
                defaults={
                    "title": title,
                    "arabic_title": arabic,
                    "content": content,
                    "arabic_content": arabic if i == 5 else "",
                    "examples": "مِنْ عِلْمٍ — مِنْ هَادٍ — أَنْعَمْتَ" if i == 5 else "",
                },
            )

        now = timezone.now()
        exercise, _ = Exercise.objects.get_or_create(
            marhalah=m1,
            title="Exercise 1",
            defaults={
                "description": "Marhalah 1 practice exercise",
                "start_date": now - timedelta(days=7),
                "end_date": now + timedelta(days=30),
            },
        )
        questions_data = [
            (
                "Which of the following is an example of Idh-har Al-Halqi?",
                ["مِنْ عِلْمٍ", "مِنْ رَبِّهِمْ", "مِنْ يَعْمَلُ", "مِنْ وَلِيٍّ"],
                "مِنْ عِلْمٍ",
            ),
            (
                "How many throat letters are involved in Idh-har Al-Halqi?",
                ["4", "5", "6", "7"],
                "6",
            ),
            (
                "Which letter is NOT a throat letter?",
                ["ء", "ه", "ع", "ق"],
                "ق",
            ),
        ]
        for i, (text, options, answer) in enumerate(questions_data, start=1):
            Question.objects.get_or_create(
                exercise=exercise,
                order=i,
                defaults={
                    "type": Question.QuestionType.MCQ,
                    "text": text,
                    "options": options,
                    "correct_answer": answer,
                    "max_score": 1,
                },
            )

        Exam.objects.get_or_create(
            marhalah=m1,
            title="Marḥalah 1 Final Exam",
            defaults={
                "duration_minutes": 60,
                "start_date": now + timedelta(days=14),
                "end_date": now + timedelta(days=30),
            },
        )

        ManualScore.objects.get_or_create(
            student=student,
            marhalah=m1,
            type=ManualScore.ScoreType.HALAQAH,
            defaults={"score": 15, "max_score": 20},
        )
        ManualScore.objects.get_or_create(
            student=student,
            marhalah=m1,
            type=ManualScore.ScoreType.TADREEB,
            defaults={"score": 18, "max_score": 20},
        )

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
