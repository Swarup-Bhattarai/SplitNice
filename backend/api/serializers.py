# api/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Expense, Split


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class SplitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Split
        fields = ["id", "expense", "user", "amount"]


class ExpenseSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)  # expand to show username/email
    splits = SplitSerializer(many=True, read_only=True)  # ✅ include splits

    class Meta:
        model = Expense
        fields = ["id", "description", "amount", "date", "paid_by", "splits"]
