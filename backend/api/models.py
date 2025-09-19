from django.db import models
from django.conf import settings  # to refer to the auth user model


class Expense(models.Model):
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # built-in User
        on_delete=models.CASCADE,
        related_name="expenses_paid"
    )
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} - {self.amount}"


class Split(models.Model):
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name="splits")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="splits"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.user.username} owes {self.amount} for {self.expense.description}"
