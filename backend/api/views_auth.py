from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new user.
    Expects: {username, email, password}
    """
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "username and password required"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"error": "username already taken"}, status=status.HTTP_400_BAD_REQUEST)

    if email and User.objects.filter(email=email).exists():
        return Response({"error": "email already taken"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create(
        username=username,
        email=email,
        password=make_password(password)
    )

    return Response({"message": "user created"}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Login user with username OR email.
    Expects: {username, password} or {email, password}
    """
    from django.contrib.auth import authenticate

    username_or_email = request.data.get("username")
    password = request.data.get("password")

    if not username_or_email or not password:
        return Response({"error": "username/email and password required"}, status=status.HTTP_400_BAD_REQUEST)

    # If input looks like an email, resolve to username
    if "@" in username_or_email:
        try:
            user_obj = User.objects.get(email=username_or_email)
            username = user_obj.username
        except User.DoesNotExist:
            return Response({"error": "invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    else:
        username = username_or_email

    user = authenticate(username=username, password=password)

    if user is None:
        return Response({"error": "invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Return details of the logged-in user.
    """
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
    })
