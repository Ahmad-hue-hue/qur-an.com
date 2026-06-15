from rest_framework import serializers

from courses.models import Marhalah, Topic, TopicCompletion


class MarhalahSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    topics_count = serializers.IntegerField(read_only=True)
    topics_completed = serializers.IntegerField(read_only=True)
    final_score = serializers.FloatField(read_only=True, required=False)

    class Meta:
        model = Marhalah
        fields = [
            "id",
            "number",
            "title",
            "description",
            "unlock_threshold",
            "status",
            "topics_count",
            "topics_completed",
            "final_score",
        ]


class TopicSerializer(serializers.ModelSerializer):
    marhalah = serializers.IntegerField(source="marhalah_id")
    audio_url = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    is_completed = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Topic
        fields = [
            "id",
            "marhalah",
            "order",
            "title",
            "arabic_title",
            "content",
            "arabic_content",
            "examples",
            "audio_url",
            "pdf_url",
            "is_completed",
            "status",
        ]

    def get_audio_url(self, obj):
        request = self.context.get("request")
        if obj.audio and request:
            return request.build_absolute_uri(obj.audio.url)
        return None

    def get_pdf_url(self, obj):
        request = self.context.get("request")
        if obj.pdf and request:
            return request.build_absolute_uri(obj.pdf.url)
        return None


class TopicAdminSerializer(serializers.ModelSerializer):
    marhalah = serializers.PrimaryKeyRelatedField(queryset=Marhalah.objects.all())

    class Meta:
        model = Topic
        fields = [
            "id",
            "marhalah",
            "order",
            "title",
            "arabic_title",
            "content",
            "arabic_content",
            "examples",
            "audio",
            "pdf",
            "is_published",
        ]


class TopicCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicCompletion
        fields = ["id", "student", "topic", "completed_at"]
        read_only_fields = ["completed_at"]
