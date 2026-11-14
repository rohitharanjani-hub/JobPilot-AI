
from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection

job_bp = Blueprint("jobs", __name__)


# Add a new job
@job_bp.route("/", methods=["POST"])
def add_job():
    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    data = request.get_json()

    if not data:
        return jsonify({"message": "Invalid request"}), 400

    title = data.get("title", "").strip()
    company = data.get("company", "").strip()
    location = data.get("location", "").strip()
    description = data.get("description", "").strip()
    required_skills = data.get("required_skills", "").strip()
    job_type = data.get("job_type", "").strip()
    experience_level = data.get("experience_level", "").strip()
    salary = data.get("salary", "").strip()
    job_url = data.get("job_url", "").strip()

    if not title or not company:
        return jsonify({
            "message": "Job title and company are required"
        }), 400

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO jobs
            (
                job_title,
                company_name,
                location,
                job_description,
                required_skills,
                job_type,
                experience_level,
                salary,
                job_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                title,
                company,
                location,
                description,
                required_skills,
                job_type,
                experience_level,
                salary,
                job_url
            )
        )

        db.commit()

        return jsonify({
            "message": "Job added successfully",
            "job_id": cursor.lastrowid
        }), 201

    except Exception as e:
        db.rollback()
        print("Job insertion error:", e)

        return jsonify({
            "message": "Failed to add job"
        }), 500

    finally:
        cursor.close()
        db.close()


# Get all jobs
@job_bp.route("/", methods=["GET"])
def get_jobs():
    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM jobs ORDER BY id DESC")
        jobs = cursor.fetchall()

        return jsonify({
            "message": "Jobs retrieved successfully",
            "jobs": jobs
        }), 200

    finally:
        cursor.close()
        db.close()


# Get one job by ID
@job_bp.route("/<int:job_id>", methods=["GET"])
def get_job(job_id):
    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM jobs WHERE id = %s",
            (job_id,)
        )

        job = cursor.fetchone()

        if not job:
            return jsonify({"message": "Job not found"}), 404

        return jsonify({
            "message": "Job retrieved successfully",
            "job": job
        }), 200

    finally:
        cursor.close()
        db.close()


# Update a job
@job_bp.route("/<int:job_id>", methods=["PUT"])
def update_job(job_id):
    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    data = request.get_json()

    if not data:
        return jsonify({"message": "Invalid request"}), 400

    title = data.get("title", "").strip()
    company = data.get("company", "").strip()
    location = data.get("location", "").strip()
    description = data.get("description", "").strip()
    required_skills = data.get("required_skills", "").strip()
    job_type = data.get("job_type", "").strip()
    experience_level = data.get("experience_level", "").strip()
    salary = data.get("salary", "").strip()
    job_url = data.get("job_url", "").strip()

    if not title or not company:
        return jsonify({
            "message": "Job title and company are required"
        }), 400

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor()

    try:
        cursor.execute(
            """
            UPDATE jobs
            SET job_title = %s,
                company_name = %s,
                location = %s,
                job_description = %s,
                required_skills = %s,
                job_type = %s,
                experience_level = %s,
                salary = %s,
                job_url = %s
            WHERE id = %s
            """,
            (
                title,
                company,
                location,
                description,
                required_skills,
                job_type,
                experience_level,
                salary,
                job_url,
                job_id
            )
        )

        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Job not found or unchanged"}), 404

        return jsonify({
            "message": "Job updated successfully"
        }), 200

    finally:
        cursor.close()
        db.close()


# Delete a job
@job_bp.route("/<int:job_id>", methods=["DELETE"])
def delete_job(job_id):
    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor()

    try:
        cursor.execute(
            "DELETE FROM jobs WHERE id = %s",
            (job_id,)
        )

        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Job not found"}), 404

        return jsonify({
            "message": "Job deleted successfully"
        }), 200

    finally:
        cursor.close()
        db.close()
