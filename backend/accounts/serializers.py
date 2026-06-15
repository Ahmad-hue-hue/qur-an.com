from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "registration_number",
            "is_suspended",
            "date_joined",
        ]
        read_only_fields = ["id", "role", "registration_number", "date_joined"]


class StudentProfileSerializer(UserSerializer):
    current_marhalah = serializers.IntegerField()
    progress_percent = serializers.IntegerField()
    topics_completed = serializers.IntegerField()
    total_topics = serializers.IntegerField()
    overall_average = serializers.FloatField()
    has_attempted_exercise = serializers.BooleanField()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + [
            "current_marhalah",
            "progress_percent",
            "topics_completed",
            "total_topics",
            "overall_average",
            "has_attempted_exercise",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "phone"]

    def create(self, validated_data):
        email = validated_data["email"]
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data.get("phone", ""),
            role=User.Role.STUDENT,
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["access"] = data.pop("access")
        data["refresh"] = data.pop("refresh")
        return data
