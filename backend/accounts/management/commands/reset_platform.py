from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

from assessments.models import ScoreWeights
from courses.models import Marhalah

User = get_user_model()

MARHALAHS = [
    {"number": 1, "title": "Marḥalah 1", "unlock_threshold": 0, "order": 1},
    {"number": 2, "title": "Marḥalah 2", "unlock_threshold": 50, "order": 2},
    {"number": 3, "title": "Marḥalah 3", "unlock_threshold": 60, "order": 3},
    {"number": 4, "title": "Marḥalah 4", "unlock_threshold": 60, "order": 4},
]


class Command(BaseCommand):
    help = "Reset the platform to a fresh empty state (structure only, no users or content)"

    def handle(self, *args, **options):
        call_command("flush", interactive=False, verbosity=0)

        ScoreWeights.objects.create(
            pk=1,
            exercises=30,
            exam=40,
            halaqah=15,
            tadreeb=15,
        )

        for marhalah in MARHALAHS:
            Marhalah.objects.create(**marhalah)

        self.stdout.write(
            self.style.SUCCESS(
                "Platform reset complete. Marḥalah structure is ready; "
                "no students, lessons, exercises, or exams exist yet."
            )
        )
        self.stdout.write(
            "Next: start the servers, open /admin, and add your content."
        )
        self.stdout.write(
            "Optional demo data: uv run python manage.py seed_data"
        )
