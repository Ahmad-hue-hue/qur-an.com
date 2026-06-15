from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.utils import (
    full_name_matches,
    normalize_phone,
    split_full_name,
    student_email_from_phone,
)

User = get_user_model()


def random_student_password() -> str:
    return get_random_string(32)


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
            "current_marhalah",
            "date_joined",
        ]
        read_only_fields = ["id", "role", "registration_number", "date_joined", "email"]


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


class StudentRegisterSerializer(serializers.Serializer):
    name = serializers.CharField()
    phone = serializers.CharField()

    def validate_phone(self, value):
        digits = normalize_phone(value)
        if len(digits) < 8:
            raise serializers.ValidationError("Enter a valid phone number.")
        if User.objects.filter(phone=digits).exists():
            raise serializers.ValidationError("This phone number is already registered.")
        return digits

    def validate_name(self, value):
        first_name, last_name = split_full_name(value)
        if not first_name:
            raise serializers.ValidationError("Enter your full name.")
        return value.strip()

    def create(self, validated_data):
        first_name, last_name = split_full_name(validated_data["name"])
        phone = validated_data["phone"]
        email = student_email_from_phone(phone)
        return User.objects.create_user(
            username=email,
            email=email,
            password=random_student_password(),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=User.Role.STUDENT,
        )


class AdminCreateStudentSerializer(serializers.ModelSerializer):
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
        return User.objects.create_user(
            username=email,
            email=email,
            password=random_student_password(),
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=phone,
            role=User.Role.STUDENT,
        )


class AdminUpdateStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "phone",
            "is_suspended",
            "current_marhalah",
            "registration_number",
        ]

    def validate_phone(self, value):
        digits = normalize_phone(value)
        if len(digits) < 8:
            raise serializers.ValidationError("Enter a valid phone number.")
        qs = User.objects.filter(phone=digits)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This phone number is already registered.")
        return digits

    def validate_current_marhalah(self, value):
        if value < 1 or value > 4:
            raise serializers.ValidationError("Marhalah must be between 1 and 4.")
        return value


class StudentLoginSerializer(serializers.Serializer):
    name = serializers.CharField()
    phone = serializers.CharField()

    def validate(self, attrs):
        phone = normalize_phone(attrs["phone"])
        name = attrs["name"]

        if len(phone) < 8:
            raise serializers.ValidationError("Invalid name or phone number.")

        user = User.objects.filter(phone=phone, role=User.Role.STUDENT).first()
        if not user or not full_name_matches(user, name):
            raise serializers.ValidationError("Invalid name or phone number.")
        if user.is_suspended:
            raise serializers.ValidationError("This account has been suspended.")

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
        if not self.user.is_admin:
            raise serializers.ValidationError("Invalid email or password.")
        data["access"] = data.pop("access")
        data["refresh"] = data.pop("refresh")
        return data


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
