from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        ADMIN = "admin", "Admin"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    registration_number = models.CharField(max_length=30, blank=True, null=True, unique=True)
    is_suspended = models.BooleanField(default=False)
    current_marhalah = models.PositiveSmallIntegerField(default=1)
    has_attempted_exercise = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    def __str__(self):
        return self.email

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser
