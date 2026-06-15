from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from accounts.serializers import (
    AdminCreateStudentSerializer,
    AdminLoginSerializer,
    StudentLoginSerializer,
    StudentRegisterSerializer,
    UserSerializer,
    tokens_for_user,
)
from courses.models import Marhalah, Topic, TopicCompletion
from courses.serializers import MarhalahSerializer, TopicSerializer
from courses.services import (
    build_dashboard_data,
    build_student_profile,
    build_topic_payload,
)
from assessments.services import get_marhalah_status

User = get_user_model()


class StudentRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StudentRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(tokens_for_user(user), status=status.HTTP_201_CREATED)


class StudentLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StudentLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(tokens_for_user(serializer.validated_data["user"]))


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            {
                "access": serializer.validated_data["access"],
                "refresh": serializer.validated_data["refresh"],
            }
        )


class StudentDashboardView(APIView):
    def get(self, request):
        return Response(build_dashboard_data(request.user, request))


class StudentProfileView(APIView):
    def get(self, request):
        return Response(build_student_profile(request.user))


class StudentMarhalahListView(APIView):
    def get(self, request):
        from assessments.services import calculate_final_score, get_student_progress

        data = []
        for marhalah in Marhalah.objects.all():
            completed, total, _ = get_student_progress(request.user, marhalah)
            final_score = calculate_final_score(request.user, marhalah)
            data.append(
                {
                    **MarhalahSerializer(marhalah).data,
                    "status": get_marhalah_status(request.user, marhalah, final_score),
                    "topics_count": total,
                    "topics_completed": completed,
                    "final_score": final_score if final_score > 0 else None,
                }
            )
        return Response(data)


class StudentTopicListView(APIView):
    def get(self, request, marhalah_id):
        marhalah = Marhalah.objects.filter(pk=marhalah_id).first()
        if not marhalah:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if get_marhalah_status(request.user, marhalah) == "locked":
            return Response({"detail": "Marhalah is locked."}, status=status.HTTP_403_FORBIDDEN)

        topics = marhalah.topics.filter(is_published=True).order_by("order")
        completed_ids = set(
            request.user.topic_completions.filter(topic__marhalah=marhalah).values_list(
                "topic_id", flat=True
            )
        )
        active = topics.exclude(id__in=completed_ids).first()
        active_id = active.id if active else None
        return Response(
            [
                build_topic_payload(t, request.user, completed_ids, active_id, request)
                for t in topics
            ]
        )


class StudentTopicDetailView(APIView):
    def get(self, request, topic_id):
        topic = Topic.objects.filter(pk=topic_id, is_published=True).first()
        if not topic:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if get_marhalah_status(request.user, topic.marhalah) == "locked":
            return Response({"detail": "Marhalah is locked."}, status=status.HTTP_403_FORBIDDEN)

        completed_ids = set(
            request.user.topic_completions.filter(topic__marhalah=topic.marhalah).values_list(
                "topic_id", flat=True
            )
        )
        active = (
            topic.marhalah.topics.filter(is_published=True)
            .order_by("order")
            .exclude(id__in=completed_ids)
            .first()
        )
        active_id = active.id if active else None
        return Response(
            build_topic_payload(topic, request.user, completed_ids, active_id, request)
        )


class StudentTopicCompleteView(APIView):
    def post(self, request, topic_id):
        topic = Topic.objects.filter(pk=topic_id, is_published=True).first()
        if not topic:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if get_marhalah_status(request.user, topic.marhalah) == "locked":
            return Response({"detail": "Marhalah is locked."}, status=status.HTTP_403_FORBIDDEN)

        TopicCompletion.objects.get_or_create(student=request.user, topic=topic)
        completed_ids = set(
            request.user.topic_completions.filter(topic__marhalah=topic.marhalah).values_list(
                "topic_id", flat=True
            )
        )
        active = (
            topic.marhalah.topics.filter(is_published=True)
            .order_by("order")
            .exclude(id__in=completed_ids)
            .first()
        )
        active_id = active.id if active else None
        return Response(
            build_topic_payload(topic, request.user, completed_ids, active_id, request)
        )


class AdminStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from assessments.models import Exam, Exercise
        from courses.models import Topic

        return Response(
            {
                "total_students": User.objects.filter(role=User.Role.STUDENT).count(),
                "total_marhalahs": Marhalah.objects.count(),
                "total_topics": Topic.objects.count(),
                "total_assessments": Exercise.objects.count() + Exam.objects.count(),
            }
        )


class AdminStudentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.STUDENT).order_by("-date_joined")
    filterset_fields = ["current_marhalah", "is_suspended"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminCreateStudentSerializer
        return UserSerializer


class AdminStudentDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        student = User.objects.filter(pk=pk, role=User.Role.STUDENT).first()
        if not student:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(build_student_profile(student))


class AdminTopicListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = Topic.objects.all().order_by("marhalah", "order")

    def get_serializer_class(self):
        if self.request.method == "POST":
            from courses.serializers import TopicAdminSerializer
            return TopicAdminSerializer
        return TopicSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        marhalah = self.request.query_params.get("marhalah")
        if marhalah:
            qs = qs.filter(marhalah_id=marhalah)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class AdminTopicDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Topic.objects.all()

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH", "POST"):
            from courses.serializers import TopicAdminSerializer
            return TopicAdminSerializer
        return TopicSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
