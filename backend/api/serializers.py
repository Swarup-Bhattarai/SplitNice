from rest_framework import serializers
from .models import User, Expense, Split

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email"]


class ExpenseSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    amount = serializers.FloatField()  

    class Meta:
        model = Expense
        fields = ["id", "description", "amount", "paid_by", "date"]


class SplitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    amount = serializers.FloatField()   

    class Meta:
        model = Split
        fields = ["id", "expense", "user", "amount"]
