import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

load_dotenv()

# Logging setup
logging.basicConfig(level=logging.INFO)
logging.getLogger("werkzeug").setLevel(logging.ERROR)
logging.getLogger('groq').setLevel(logging.WARNING)
logging.getLogger('groq._base_client').setLevel(logging.WARNING)
logging.getLogger('httpx').setLevel(logging.WARNING)
logging.getLogger('httpcore').setLevel(logging.WARNING)
logging.getLogger('langchain_groq').setLevel(logging.WARNING)


def create_app():
    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # Load config
    from backend.config import Config
    app.config.from_object(Config)

    # CORS — allow all origins for development; restrict in production
    CORS(app)

    # Initialize extensions
    from backend.extensions import db
    db.init_app(app)

    # Register blueprints
    from backend.api import (
        auth_bp, profile_bp, meals_bp, activities_bp,
        reports_bp, admin_bp, notifications_bp,
        weight_bp, body_metrics_bp, goals_bp, progress_bp,
        inventory_bp, meal_plans_bp,
    )
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(profile_bp, url_prefix='/api/v1/profile')
    app.register_blueprint(meals_bp, url_prefix='/api/v1/meals')
    app.register_blueprint(activities_bp, url_prefix='/api/v1/activities')
    app.register_blueprint(reports_bp, url_prefix='/api/v1/reports')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')
    app.register_blueprint(notifications_bp, url_prefix='/api/v1/notifications')
    app.register_blueprint(weight_bp, url_prefix='/api/v1/weight')
    app.register_blueprint(body_metrics_bp, url_prefix='/api/v1/body-metrics')
    app.register_blueprint(goals_bp, url_prefix='/api/v1/goals')
    app.register_blueprint(progress_bp, url_prefix='/api/v1/progress')
    app.register_blueprint(inventory_bp, url_prefix='/api/v1/inventory')
    app.register_blueprint(meal_plans_bp, url_prefix='/api/v1/meal-plans')

    # Request logging
    @app.after_request
    def log_api_calls(response):
        app.logger.info(
            "API %s %s %s",
            request.method,
            request.path,
            response.status_code,
        )
        return response

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found', 'code': 'NOT_FOUND'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed', 'code': 'METHOD_NOT_ALLOWED'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error', 'code': 'INTERNAL_ERROR'}), 500

    # Health check
    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'}), 200

    with app.app_context():
        # Import models so SQLAlchemy knows about them
        from backend import models  # noqa: F401
        db.create_all()

    return app
