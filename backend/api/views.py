from decimal import Decimal
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.core.mail import send_mail

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Expense, Split, Friendship, Group
from .serializers import (
    UserSerializer,
    ExpenseSerializer,
    FriendshipSerializer,
    GroupSerializer,
)


# -------------------------
# User Endpoints
# -------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """Return the logged-in user details."""
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users(request):
    """List all users."""
    qs = User.objects.order_by("username")
    return Response(UserSerializer(qs, many=True).data)


# -------------------------
# Summary & Balances
# -------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def summary(request):
    """
    Global summary for the logged-in user.
    Uses splits when available; falls back to naive totals.
    """
    user = request.user
    owed_by_me = Decimal("0")
    owed_to_me = Decimal("0")

    for s in Split.objects.select_related("expense", "expense__paid_by", "user"):
        payer, ower, amt = s.expense.paid_by, s.user, Decimal(s.amount)
        if payer.id == user.id and ower.id != user.id:
            owed_to_me += amt
        elif ower.id == user.id and payer.id != user.id:
            owed_by_me += amt

    if owed_by_me == 0 and owed_to_me == 0:
        for exp in Expense.objects.all():
            if exp.paid_by_id == user.id:
                owed_to_me += Decimal(exp.amount)
            else:
                owed_by_me += Decimal(exp.amount)

    return Response({
        "total_owed_by_me": round(float(owed_by_me), 2),
        "total_owed_to_me": round(float(owed_to_me), 2),
        "net_balance": round(float(owed_to_me - owed_by_me), 2),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def balances(request):
    """
    Per-friend balances using splits.
    Positive => they owe you, Negative => you owe them.
    """
    me = request.user
    net_by_user: dict[int, Decimal] = {}

    qs = Split.objects.select_related("expense", "expense__paid_by", "user")
    for s in qs:
        payer, ower, amt = s.expense.paid_by, s.user, Decimal(s.amount)
        if payer.id == me.id and ower.id != me.id:
            net_by_user[ower.id] = net_by_user.get(ower.id, Decimal("0")) + amt
        elif ower.id == me.id and payer.id != me.id:
            net_by_user[payer.id] = net_by_user.get(payer.id, Decimal("0")) - amt

    you_are_owed, you_owe = [], []
    total_to_me, total_by_me = Decimal("0"), Decimal("0")

    for uid, net in net_by_user.items():
        try:
            u = User.objects.get(pk=uid)
        except User.DoesNotExist:
            continue
        entry = {"user": UserSerializer(u).data, "amount": round(float(abs(net)), 2)}
        if net > 0:
            you_are_owed.append(entry)
            total_to_me += net
        elif net < 0:
            you_owe.append(entry)
            total_by_me += -net

    you_are_owed.sort(key=lambda x: -x["amount"])
    you_owe.sort(key=lambda x: -x["amount"])

    return Response({
        "you_are_owed": you_are_owed,
        "you_owe": you_owe,
        "totals": {
            "to_me": round(float(total_to_me), 2),
            "by_me": round(float(total_by_me), 2),
            "net": round(float(total_to_me - total_by_me), 2),
        }
    })


# -------------------------
# Expenses
# -------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recent_expenses(request):
    """Return recent expenses (paged/limited)."""
    expenses = Expense.objects.order_by("-date")[:20]
    return Response({"results": ExpenseSerializer(expenses, many=True).data})


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def expenses(request):
    """
    GET: list expenses.
    POST: create an expense with optional splits.
    """
    if request.method == "GET":
        qs = Expense.objects.order_by("-date")[:50]
        return Response({"results": ExpenseSerializer(qs, many=True).data})

    desc = (request.data.get("description") or "").strip()
    amount = request.data.get("amount", 0)
    paid_by_id = request.data.get("paid_by") or request.data.get("paid_by_id")
    splits_data = request.data.get("splits", [])

    if not desc:
        return Response({"error": "description required"}, status=400)

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return Response({"error": "amount must be a number"}, status=400)

    if paid_by_id:
        try:
            payer = User.objects.get(pk=int(paid_by_id))
        except (User.DoesNotExist, ValueError):
            return Response({"error": "paid_by must be valid"}, status=400)
    else:
        payer = request.user

    exp = Expense.objects.create(description=desc, amount=amount, paid_by=payer)

    for split in splits_data:
        try:
            split_user = User.objects.get(pk=int(split["user"]))
            Split.objects.create(expense=exp, user=split_user, amount=float(split["amount"]))
        except Exception as e:
            return Response({"error": f"invalid split: {e}"}, status=400)

    return Response(ExpenseSerializer(exp).data, status=201)


# -------------------------
# Friendships
# -------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_friend(request):
    """Send a friend request or invite by email."""
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email required"}, status=400)

    try:
        to_user = User.objects.get(email=email)
        if Friendship.objects.filter(from_user=request.user, to_user=to_user).exists():
            return Response({"error": "Friend request already sent"}, status=400)

        friendship = Friendship.objects.create(from_user=request.user, to_user=to_user)
        return Response(FriendshipSerializer(friendship).data, status=201)

    except User.DoesNotExist:
        send_mail(
            "You’ve been invited to SplitNice!",
            f"{request.user.username} invited you to join SplitNice. Sign up with {email}.",
            "noreply@splitnice.com",
            [email],
        )
        return Response({"message": "Invite sent via email"}, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_friends(request):
    """List all friendships for the logged-in user."""
    qs = Friendship.objects.filter(from_user=request.user) | Friendship.objects.filter(to_user=request.user)
    return Response(FriendshipSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_friend(request, friendship_id):
    """Accept a pending friend request."""
    try:
        friendship = Friendship.objects.get(pk=friendship_id, to_user=request.user)
    except Friendship.DoesNotExist:
        return Response({"error": "Friend request not found"}, status=404)

    friendship.accepted = True
    friendship.save()
    return Response(FriendshipSerializer(friendship).data)


# -------------------------
# Groups
# -------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_group(request):
    """
    Create a group with members.
    {
      "name": "Apartment 6307",
      "member_ids": [2, 3, 4]
    }
    """
    name = request.data.get("name")
    member_ids = request.data.get("member_ids", [])

    if not name:
        return Response({"error": "Group name required"}, status=400)

    group = Group.objects.create(name=name)
    group.members.add(request.user)

    if member_ids:
        users = User.objects.filter(id__in=member_ids)
        group.members.add(*users)

    return Response(GroupSerializer(group).data, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_groups(request):
    """List groups for the logged-in user."""
    qs = Group.objects.filter(members=request.user).order_by("name")
    return Response(GroupSerializer(qs, many=True).data)
