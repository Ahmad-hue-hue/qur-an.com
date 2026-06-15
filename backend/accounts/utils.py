import re


def normalize_phone(phone: str) -> str:
    """Keep digits only for consistent phone matching."""
    return re.sub(r"\D", "", phone or "")


def normalize_name(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


def full_name_matches(user, name: str) -> bool:
    user_name = normalize_name(f"{user.first_name} {user.last_name}")
    return user_name == normalize_name(name)


def student_email_from_phone(phone: str) -> str:
    digits = normalize_phone(phone)
    return f"{digits}@students.tajweed.local"
