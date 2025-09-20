from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Expense, Split, Friendship, Group


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class SplitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )

    class Meta:
        model = Split
        fields = ["id", "expense", "user", "user_id", "amount"]


class ExpenseSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    paid_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="paid_by", write_only=True
    )
    splits = SplitSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = ["id", "description", "amount", "date", "paid_by", "paid_by_id", "splits"]


class FriendshipSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)
    to_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="to_user", write_only=True
    )

    class Meta:
        model = Friendship
        fields = ["id", "from_user", "to_user", "to_user_id", "created_at", "accepted"]


class GroupSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), source="members", write_only=True
    )

    class Meta:
        model = Group
        fields = ["id", "name", "members", "member_ids", "created_at"]
