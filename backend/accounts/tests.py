from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from assessments.models import Exam, Exercise, ScoreWeights
from courses.models import Marhalah, Topic

User = get_user_model()


class AdminStudentAPITests(TestCase):
    def setUp(self):
        self.settings = override_settings(DEBUG=True)
        self.settings.enable()
        self.client = APIClient()
        self.student = User.objects.create_user(
            username="966501111111@students.tajweed.local",
            email="966501111111@students.tajweed.local",
            password="unused",
            first_name="Test",
            last_name="Student",
            phone="966501111111",
            role=User.Role.STUDENT,
        )

    def test_list_students(self):
        response = self.client.get("/api/admin/students/")
        self.assertEqual(response.status_code, 200)

    def test_update_student_suspend_and_promote(self):
        response = self.client.patch(
            f"/api/admin/students/{self.student.id}/",
            {"is_suspended": True, "current_marhalah": 2},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_suspended)
        self.assertEqual(self.student.current_marhalah, 2)

    def test_assign_registration_number_action(self):
        response = self.client.post(
            f"/api/admin/students/{self.student.id}/assign-registration/",
        )
        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertTrue(self.student.registration_number)

    def test_update_registration_number_manually(self):
        response = self.client.patch(
            f"/api/admin/students/{self.student.id}/",
            {"registration_number": "TJW-2026-999"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertEqual(self.student.registration_number, "TJW-2026-999")

    def test_delete_student(self):
        response = self.client.delete(f"/api/admin/students/{self.student.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.student.id).exists())


class ResetPlatformCommandTests(TestCase):
    def test_reset_platform_creates_empty_structure(self):
        User.objects.create_user(
            username="old@students.tajweed.local",
            email="old@students.tajweed.local",
            password="unused",
            first_name="Old",
            last_name="User",
            phone="966500000000",
            role=User.Role.STUDENT,
        )
        marhalah = Marhalah.objects.create(
            number=99, title="Temp", unlock_threshold=0, order=99
        )
        Topic.objects.create(
            marhalah=marhalah,
            order=1,
            title="Temp Topic",
            content="Temp",
        )

        call_command("reset_platform")

        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(Topic.objects.count(), 0)
        self.assertEqual(Exercise.objects.count(), 0)
        self.assertEqual(Exam.objects.count(), 0)
        self.assertEqual(Marhalah.objects.count(), 4)
        self.assertTrue(ScoreWeights.objects.filter(pk=1).exists())

    def test_admin_stats_after_reset(self):
        call_command("reset_platform")

        client = APIClient()
        response = client.get("/api/admin/stats/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_students"], 0)
        self.assertEqual(response.json()["total_topics"], 0)
        self.assertEqual(response.json()["total_assessments"], 0)
        self.assertEqual(response.json()["total_marhalahs"], 4)
