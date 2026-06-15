from django.conf import settings
from django.db import models


class Marhalah(models.Model):
    number = models.PositiveSmallIntegerField(unique=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    unlock_threshold = models.PositiveSmallIntegerField(
        default=0,
        help_text="Minimum final score % on previous marhalah to unlock",
    )
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["number"]
        verbose_name_plural = "marhalahs"

    def __str__(self):
        return self.title


class Topic(models.Model):
    marhalah = models.ForeignKey(Marhalah, on_delete=models.CASCADE, related_name="topics")
    order = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200)
    arabic_title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    arabic_content = models.TextField(blank=True)
    examples = models.TextField(blank=True)
    audio = models.FileField(upload_to="audio/", blank=True, null=True)
    pdf = models.FileField(upload_to="pdfs/", blank=True, null=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["marhalah", "order"]
        unique_together = [["marhalah", "order"]]

    def __str__(self):
        return f"{self.marhalah.title} - {self.title}"


class TopicCompletion(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="topic_completions",
    )
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="completions")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["student", "topic"]]
