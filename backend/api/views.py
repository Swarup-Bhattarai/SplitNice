# backend/api/views.py
from decimal import Decimal
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Expense, Split
from .serializers import UserSerializer, ExpenseSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """Return the logged-in user details."""
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users(request):
    """List all users (simple directory for now)."""
    qs = User.objects.order_by("username")
    return Response(UserSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def summary(request):
    """
    Simple global summary for the logged-in user.
    Uses Split rows when available; falls back to a naive total otherwise.
    """
    user = request.user
    owed_by_me = Decimal("0")
    owed_to_me = Decimal("0")

    # Prefer splits: each split represents "user owes payer <amount>"
    for s in Split.objects.select_related("expense", "expense__paid_by", "user"):
        payer = s.expense.paid_by
        ower = s.user
        amt = Decimal(s.amount)

        if payer.id == user.id and ower.id != user.id:
            owed_to_me += amt
        elif ower.id == user.id and payer.id != user.id:
            owed_by_me += amt

    # If there are *no* splits yet, fall back to "who paid" (your early demo logic)
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
    POST: create an expense. JSON:
      {
        "description": "Dinner",
        "amount": 60,
        "splits": [ { "user_id": 2, "amount": 30 }, { "user_id": 3, "amount": 30 } ]   # optional
      }
    """
    if request.method == "GET":
        qs = Expense.objects.order_by("-date")[:50]
        return Response({"results": ExpenseSerializer(qs, many=True).data})

    # POST path
    desc = (request.data.get("description") or "").strip()
    amount = request.data.get("amount", 0)
    splits_data = request.data.get("splits", [])

    if not desc:
        return Response({"error": "description required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = Decimal(str(amount))
    except Exception:
        return Response({"error": "amount must be a number"}, status=status.HTTP_400_BAD_REQUEST)

    exp = Expense.objects.create(description=desc, amount=amount, paid_by=request.user)

    # Optional splits
    total_split = Decimal("0")
    if isinstance(splits_data, list):
        for s in splits_data:
            try:
                uid = int(s.get("user_id"))
                split_amount = Decimal(str(s.get("amount")))
                split_user = User.objects.get(pk=uid)
            except Exception:
                continue
            exp.splits.create(user=split_user, amount=split_amount)
            total_split += split_amount

    # We still return the expense even if splits don't sum perfectly,
    # but we include a 'warning' key to help the client.
    payload = ExpenseSerializer(exp).data
    if total_split and total_split != amount:
        payload = {**payload, "warning": "Split amounts do not match total expense"}

    return Response(payload, status=status.HTTP_201_CREATED)


# NEW: per-friend balances, like Splitwise "you owe" / "you are owed"
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def balances(request):
    """
    Compute per-counterparty net balances using Split rows.
    Positive amount => they owe *you*; negative => you owe *them*.
    Response:
    {
      "you_are_owed": [ { "user": {...}, "amount": 55.2 }, ... ],
      "you_owe":      [ { "user": {...}, "amount": 12.0 }, ... ],
      "totals": { "to_me": 123.45, "by_me": 67.89, "net": 55.56 }
    }
    """
    me = request.user
    net_by_user: dict[int, Decimal] = {}

    qs = Split.objects.select_related("expense", "expense__paid_by", "user")
    for s in qs:
        payer = s.expense.paid_by
        ower = s.user
        amt = Decimal(s.amount)

        # If I'm the payer, other users owe me their split amounts
        if payer_id := payer.id == me.id and ower.id != me.id:
            net_by_user[ower.id] = net_by_user.get(ower.id, Decimal("0")) + amt

        # If I'm the one who owes, I owe the payer
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
            total_by_me += -net  # store as positive

    # sort largest first
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
