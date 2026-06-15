from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class AdminStudentAPITests(TestCase):
    def setUp(self):
        from django.test import override_settings

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
