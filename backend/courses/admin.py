from django.contrib import admin

from .models import Marhalah, Topic, TopicCompletion


@admin.register(Marhalah)
class MarhalahAdmin(admin.ModelAdmin):
    list_display = ["number", "title", "unlock_threshold", "order"]
    ordering = ["number"]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["title", "marhalah", "order", "is_published"]
    list_filter = ["marhalah", "is_published"]
    search_fields = ["title", "arabic_title"]
    ordering = ["marhalah", "order"]


@admin.register(TopicCompletion)
class TopicCompletionAdmin(admin.ModelAdmin):
    list_display = ["student", "topic", "completed_at"]
    list_filter = ["topic__marhalah"]
