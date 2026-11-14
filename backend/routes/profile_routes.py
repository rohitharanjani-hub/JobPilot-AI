
from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection

profile_bp = Blueprint("profile", __name__)


# Get the logged-in user's profile
@profile_bp.route("/", methods=["GET"])
def get_profile():
    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id, name, email, created_at
            FROM users
            WHERE id = %s
            """,
            (session["user_id"],)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "User not found"}), 404

        return jsonify({
            "message": "Profile retrieved successfully",
            "profile": user
        }), 200

    finally:
        cursor.close()
        db.close()


# Update the logged-in user's name
@profile_bp.route("/", methods=["PUT"])
def update_profile():
    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    data = request.get_json()

    if not data:
        return jsonify({"message": "Invalid request"}), 400

    name = data.get("name", "").strip()

    if not name:
        return jsonify({"message": "Name is required"}), 400

    if len(name) > 100:
        return jsonify({"message": "Name is too long"}), 400

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor()

    try:
        cursor.execute(
            "UPDATE users SET name = %s WHERE id = %s",
            (name, session["user_id"])
        )

        db.commit()

        return jsonify({
            "message": "Profile updated successfully",
            "name": name
        }), 200

    finally:
        cursor.close()
        db.close()
