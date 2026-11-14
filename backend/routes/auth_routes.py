
from flask import Blueprint, request, jsonify, session
from flask_bcrypt import Bcrypt
from backend.database import get_db_connection

auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Invalid request"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"message": "All fields are required"}), 400

    if len(name) > 100 or len(email) > 150:
        return jsonify({"message": "Name or email is too long"}), 400

    if len(password) < 8:
        return jsonify({
            "message": "Password must contain at least 8 characters"
        }), 400

    hashed_password = bcrypt.generate_password_hash(
        password
    ).decode("utf-8")

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_password)
        )
        db.commit()

        return jsonify({
            "message": "Registration successful",
            "user_id": cursor.lastrowid
        }), 201

    except Exception as e:
        db.rollback()

        if getattr(e, "errno", None) == 1062:
            return jsonify({
                "message": "Email already registered"
            }), 409

        return jsonify({"message": "Registration failed"}), 500

    finally:
        cursor.close()
        db.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Invalid request"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "message": "Email and password are required"
        }), 400

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, name, email, password FROM users WHERE email = %s",
            (email,)
        )
        user = cursor.fetchone()

        if user and bcrypt.check_password_hash(
            user["password"], password
        ):
            session["user_id"] = user["id"]

            return jsonify({
                "message": "Login successful",
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"]
                }
            }), 200

        return jsonify({
            "message": "Invalid email or password"
        }), 401

    finally:
        cursor.close()
        db.close()


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({
        "message": "Logout successful"
    }), 200