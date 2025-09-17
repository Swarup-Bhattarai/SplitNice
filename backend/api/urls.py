from django.urls import path
from . import views

urlpatterns = [
path('me/', views.me),
path('summary/', views.summary),
path('recent-expenses/', views.recent_expenses),
]