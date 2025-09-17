from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User, Expense
from .serializers import UserSerializer, ExpenseSerializer

@api_view(["GET"])
def me(request):
    user = User.objects.first()
    return Response(UserSerializer(user).data)

@api_view(["GET"])
def summary(request):
    user = User.objects.first()
    owed_by_me = 0
    owed_to_me = 0
    # Placeholder: just use expenses paid by user
    for exp in Expense.objects.all():
        if exp.paid_by == user:
            owed_to_me += float(exp.amount)
        else:
            owed_by_me += float(exp.amount)

    return Response({
        "total_owed_by_me": owed_by_me,
        "total_owed_to_me": owed_to_me,
        "net_balance": owed_to_me - owed_by_me,
    })

@api_view(["GET"])
def recent_expenses(request):
    expenses = Expense.objects.order_by("-date")[:5]
    return Response({"results": ExpenseSerializer(expenses, many=True).data})
