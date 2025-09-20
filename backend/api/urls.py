from django.urls import path
from . import views
from . import views_auth

urlpatterns = [
    # -------------------------
    # Auth
    # -------------------------
    path("auth/register/", views_auth.register, name="register"),
    path("auth/login/", views_auth.login, name="login"),
    path("auth/me/", views_auth.me, name="auth-me"),

    # -------------------------
    # Users
    # -------------------------
    path("me/", views.me, name="me"),
    path("users/", views.users, name="users"),

    # -------------------------
    # Expenses & Balances
    # -------------------------
    path("summary/", views.summary, name="summary"),
    path("recent-expenses/", views.recent_expenses, name="recent-expenses"),
    path("expenses/", views.expenses, name="expenses"),
    path("balances/", views.balances, name="balances"),

    # -------------------------
    # Friendships
    # -------------------------
    path("friends/add/", views.add_friend, name="add-friend"),
    path("friends/", views.list_friends, name="list-friends"),
    path("friends/accept/<int:friendship_id>/", views.accept_friend, name="accept-friend"),

    # -------------------------
    # Groups
    # -------------------------
    path("groups/create/", views.create_group, name="create-group"),
    path("groups/", views.list_groups, name="list-groups"),
]
