from backend.api.auth import auth_bp
from backend.api.profile import profile_bp
from backend.api.meals import meals_bp
from backend.api.activities import activities_bp
from backend.api.reports import reports_bp
from backend.api.admin import admin_bp
from backend.api.notifications import notifications_bp
from backend.api.weight import weight_bp
from backend.api.body_metrics import body_metrics_bp
from backend.api.goals import goals_bp
from backend.api.progress import progress_bp

__all__ = [
    'auth_bp', 'profile_bp', 'meals_bp', 'activities_bp',
    'reports_bp', 'admin_bp', 'notifications_bp',
    'weight_bp', 'body_metrics_bp', 'goals_bp', 'progress_bp',
]
