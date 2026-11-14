

from flask import Flask, jsonify
from flask_cors import CORS

from backend.config import Config
from backend.database import get_db_connection

# Authentication
from backend.routes.auth_routes import auth_bp, bcrypt

# Application modules
from backend.routes.profile_routes import profile_bp
from backend.routes.job_routes import job_bp
from backend.routes.application_routes import application_bp
from backend.routes.resume_routes import resume_bp
from backend.routes.match_routes import match_bp
from backend.routes.recommendation_routes import recommendation_bp
from backend.routes.interview_routes import interview_bp
from backend.routes.practice_routes import practice_bp


# ==========================================
# CREATE FLASK APPLICATION
# ==========================================

app = Flask(__name__)

app.config.from_object(Config)


# ==========================================
# CORS CONFIGURATION
# ==========================================

CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ]
)


# ==========================================
# INITIALIZE EXTENSIONS
# ==========================================

bcrypt.init_app(app)


# ==========================================
# REGISTER BLUEPRINTS
# ==========================================

blueprints = [
    (auth_bp, "/api/auth"),
    (profile_bp, "/api/profile"),
    (job_bp, "/api/jobs"),
    (application_bp, "/api/applications"),
    (resume_bp, "/api/resumes"),
    (match_bp, "/api/matches"),
    (recommendation_bp, "/api/recommendations"),
    (interview_bp, "/api/interviews"),
    (practice_bp, "/api/practice")
]

for blueprint, prefix in blueprints:
    app.register_blueprint(
        blueprint,
        url_prefix=prefix
    )


# ==========================================
# HOME ROUTE
# ==========================================

@app.route("/")
def home():
    return jsonify({
        "message": "Welcome to JobPilot AI!",
        "project": "JobPilot AI",
        "status": "Backend is running successfully"
    })


# ==========================================
# HEALTH CHECK
# ==========================================

@app.route("/health")
def health():
    return jsonify({
        "status": "healthy",
        "project": "JobPilot AI"
    })


# ==========================================
# DATABASE CHECK
# ==========================================

@app.route("/api/db-check")
def database_check():

    db = get_db_connection()

    if db is None:
        return jsonify({
            "database": "disconnected",
            "status": "failed"
        }), 500

    try:
        db.close()

        return jsonify({
            "database": "connected",
            "status": "success"
        })

    except Exception as error:
        return jsonify({
            "database": "error",
            "message": str(error)
        }), 500


# ==========================================
# RUN APPLICATION
# ==========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
