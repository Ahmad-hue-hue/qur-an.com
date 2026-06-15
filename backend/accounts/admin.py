from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["email", "first_name", "last_name", "role", "registration_number", "is_suspended"]
    list_filter = ["role", "is_suspended", "current_marhalah"]
    search_fields = ["email", "first_name", "last_name", "registration_number"]
    ordering = ["-date_joined"]
    fieldsets = UserAdmin.fieldsets + (
        ("Tajweed", {"fields": ("role", "phone", "registration_number", "is_suspended", "current_marhalah", "has_attempted_exercise")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Tajweed", {"fields": ("role", "phone")}),
    )
