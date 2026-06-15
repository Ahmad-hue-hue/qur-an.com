from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from assessments.models import Exercise
from courses.models import Marhalah

User = get_user_model()


class AdminAssessmentAPITests(TestCase):
    def setUp(self):
        from django.test import override_settings

        self.settings = override_settings(DEBUG=True)
        self.settings.enable()
        self.client = APIClient()
        self.marhalah = Marhalah.objects.create(
            number=1, title="Marhalah 1", unlock_threshold=0, order=1
        )
        now = timezone.now()
        self.exercise = Exercise.objects.create(
            marhalah=self.marhalah,
            title="Sample Exercise",
            start_date=now,
            end_date=now + timedelta(days=7),
        )

    def test_list_exercises(self):
        response = self.client.get("/api/admin/exercises/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 1)

    def test_create_exercise(self):
        now = timezone.now()
        response = self.client.post(
            "/api/admin/exercises/",
            {
                "marhalah": self.marhalah.id,
                "title": "New Exercise",
                "description": "Practice",
                "start_date": now.isoformat(),
                "end_date": (now + timedelta(days=3)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Exercise.objects.filter(title="New Exercise").count(), 1)
