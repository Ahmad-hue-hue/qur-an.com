from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.utils import (
    full_name_matches,
    normalize_phone,
    student_email_from_phone,
)

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
    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone"]

    def validate_phone(self, value):
        digits = normalize_phone(value)
        if len(digits) < 8:
            raise serializers.ValidationError("Enter a valid phone number.")
        if User.objects.filter(phone=digits).exists():
            raise serializers.ValidationError("This phone number is already registered.")
        return digits

    def create(self, validated_data):
        phone = validated_data["phone"]
        email = student_email_from_phone(phone)
        user = User.objects.create_user(
            username=email,
            email=email,
            password=phone,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=phone,
            role=User.Role.STUDENT,
        )
        return user


class StudentLoginSerializer(serializers.Serializer):
    name = serializers.CharField()
    phone = serializers.CharField()

    def validate(self, attrs):
        phone = normalize_phone(attrs["phone"])
        name = attrs["name"]

        if len(phone) < 8:
            raise serializers.ValidationError("Enter a valid phone number.")

        user = User.objects.filter(phone=phone, role=User.Role.STUDENT).first()
        if not user:
            raise serializers.ValidationError("No account found with this phone number.")
        if user.is_suspended:
            raise serializers.ValidationError("This account has been suspended.")
        if not full_name_matches(user, name):
            raise serializers.ValidationError("Name does not match our records.")

        attrs["user"] = user
        return attrs


class AdminLoginSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not user.is_admin:
            raise serializers.ValidationError("Admin access only.")
        data["access"] = data.pop("access")
        data["refresh"] = data.pop("refresh")
        return data


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
