from decimal import Decimal


def format_vnd(value: Decimal | int | float | str) -> str:
    amount = Decimal(str(value))
    return f"{amount:,.0f} VND"
