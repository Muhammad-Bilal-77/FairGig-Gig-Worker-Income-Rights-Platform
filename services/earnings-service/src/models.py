from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class ShiftCreate(BaseModel):
    platform: str = Field(min_length=1, max_length=50)
    city_zone: str
    worker_category: Literal[
        'ride_hailing', 'food_delivery', 'freelance', 'domestic', 'other'
    ]
    shift_date: date
    hours_worked: Decimal = Field(gt=0, le=24, max_digits=5, decimal_places=2)
    gross_earned: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    platform_deduction: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    net_received: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    screenshot_url: str | None = None

    @model_validator(mode='after')
    def check_net(self):
        diff = abs(self.gross_earned - self.platform_deduction - self.net_received)
        if diff > Decimal('1.00'):
            raise ValueError(
                'net_received must equal gross_earned minus platform_deduction (within PKR 1)'
            )
        return self


class ShiftResponse(BaseModel):
    id: UUID
    worker_id: UUID
    platform: str
    city_zone: str
    worker_category: str
    shift_date: date
    hours_worked: Decimal
    gross_earned: Decimal
    platform_deduction: Decimal
    net_received: Decimal
    effective_hourly_rate: Decimal
    deduction_rate: Decimal
    verify_status: str
    screenshot_url: str | None
    import_source: str
    created_at: datetime


class VerificationUpdate(BaseModel):
    status: Literal['CONFIRMED', 'FLAGGED', 'UNVERIFIABLE']
    note: str | None = None


class MedianResponse(BaseModel):
    city_zone: str
    platform: str
    worker_category: str
    median_hourly_rate: Decimal
    median_deduction_rate: Decimal
    worker_count: int
    your_hourly_rate: Decimal | None = None
    percentile_vs_median: str | None = None
