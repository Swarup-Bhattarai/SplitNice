from django.urls import path
from . import views
from . import views_auth

urlpatterns = [
    # Auth
    path("auth/register/", views_auth.register),
    path("auth/login/", views_auth.login),
    path("auth/me/", views_auth.me),

    path('me/', views.me),
    path('users/', views.users),
    path('summary/', views.summary),
    path('recent-expenses/', views.recent_expenses),
    path('expenses/', views.expenses),
    path("balances/", views.balances),
]