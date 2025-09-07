import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

load_dotenv()

# Set up logging: keep general info but silence very noisy libraries
logging.basicConfig(level=logging.INFO)
# Quiet noisy HTTP/LLM libraries that log debug-level internals
logging.getLogger('groq').setLevel(logging.WARNING)
logging.getLogger('groq._base_client').setLevel(logging.WARNING)
logging.getLogger('httpx').setLevel(logging.WARNING)
logging.getLogger('httpcore').setLevel(logging.WARNING)
logging.getLogger('langchain_groq').setLevel(logging.WARNING)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

def create_app():
    # Create the app
    app = Flask(__name__)
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    
    # Configure the database
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "postgresql://localhost/calorie_tracker")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Initialize the app with the extension
    db.init_app(app)
    
    with app.app_context():
        # Import models and routes
        import models  # noqa: F401
        from routes import main_bp
        
        # Register blueprints
        app.register_blueprint(main_bp)
        
        # Create all tables
        db.create_all()
    
    return app

app = create_app()
