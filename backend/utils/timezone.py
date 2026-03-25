from datetime import datetime, timedelta, timezone

try:
    from zoneinfo import ZoneInfo
    IST_ZONE = ZoneInfo('Asia/Kolkata')
except Exception:
    IST_ZONE = None


def get_ist_now():
    if IST_ZONE:
        return datetime.now(IST_ZONE)
    return datetime.utcnow() + timedelta(hours=5, minutes=30)


def get_ist_today():
    return get_ist_now().date()


def get_day_boundaries_utc(date):
    """Convert an IST date to UTC start/end datetimes for DB queries."""
    if IST_ZONE:
        ist_start = datetime.combine(date, datetime.min.time()).replace(tzinfo=IST_ZONE)
        ist_end = ist_start + timedelta(days=1)
        start_utc = ist_start.astimezone(timezone.utc).replace(tzinfo=None)
        end_utc = ist_end.astimezone(timezone.utc).replace(tzinfo=None)
    else:
        start_utc = datetime.combine(date, datetime.min.time())
        end_utc = start_utc + timedelta(days=1)
    return start_utc, end_utc
