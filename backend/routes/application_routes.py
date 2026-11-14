
from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection

application_bp = Blueprint("applications", __name__)

VALID_STATUSES = [
    "Saved",
    "Applied",
    "Interview",
    "Selected",
    "Rejected"
]


# Add a new application
@application_bp.route("/", methods=["POST"])
def add_application():

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    data = request.get_json()

    if not data:
        return jsonify({"message": "Invalid request"}), 400

    job_id = data.get("job_id")
    status = data.get("status", "Saved")
    notes = data.get("notes", "")

    if not job_id:
        return jsonify({"message": "Job ID is required"}), 400

    if status not in VALID_STATUSES:
        return jsonify({"message": "Invalid application status"}), 400

    if not isinstance(notes, str):
        return jsonify({"message": "Notes must be text"}), 400

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT id FROM jobs WHERE id = %s",
            (job_id,)
        )

        if not cursor.fetchone():
            return jsonify({"message": "Job not found"}), 404

        cursor.execute(
            """
            INSERT INTO applications
            (user_id, job_id, status, notes)
            VALUES (%s, %s, %s, %s)
            """,
            (session["user_id"], job_id, status, notes)
        )

        db.commit()

        return jsonify({
            "message": "Application added successfully",
            "application_id": cursor.lastrowid
        }), 201

    except Exception as e:
        db.rollback()
        print("Application insertion error:", e)

        return jsonify({
            "message": "Failed to add application"
        }), 500

    finally:
        cursor.close()
        db.close()


# Get all applications of logged-in user
@application_bp.route("/", methods=["GET"])
def get_applications():

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                a.id AS application_id,
                a.user_id,
                a.job_id,
                a.status,
                a.applied_date,
                a.notes,
                a.created_at,
                a.updated_at,
                j.job_title,
                j.company_name,
                j.location
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            WHERE a.user_id = %s
            ORDER BY a.id DESC
            """,
            (session["user_id"],)
        )

        applications = cursor.fetchall()

        return jsonify({
            "message": "Applications retrieved successfully",
            "applications": applications
        }), 200

    finally:
        cursor.close()
        db.close()


# Update an application
@application_bp.route("/<int:application_id>", methods=["PUT"])
def update_application(application_id):

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    data = request.get_json()

    if not data:
        return jsonify({"message": "Invalid request"}), 400

    status = data.get("status")
    notes = data.get("notes")
    applied_date = data.get("applied_date")

    if status is None and notes is None and applied_date is None:
        return jsonify({"message": "No update details provided"}), 400

    if status is not None and status not in VALID_STATUSES:
        return jsonify({"message": "Invalid application status"}), 400

    if notes is not None and not isinstance(notes, str):
        return jsonify({"message": "Notes must be text"}), 400

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor()

    try:
        cursor.execute(
            """
            SELECT id FROM applications
            WHERE id = %s AND user_id = %s
            """,
            (application_id, session["user_id"])
        )

        if not cursor.fetchone():
            return jsonify({"message": "Application not found"}), 404

        updates = []
        values = []

        if status is not None:
            updates.append("status = %s")
            values.append(status)

        if notes is not None:
            updates.append("notes = %s")
            values.append(notes)

        if applied_date is not None:
            updates.append("applied_date = %s")
            values.append(applied_date)

        values.extend([application_id, session["user_id"]])

        query = f"""
            UPDATE applications
            SET {", ".join(updates)}
            WHERE id = %s AND user_id = %s
        """

        cursor.execute(query, tuple(values))
        db.commit()

        return jsonify({
            "message": "Application updated successfully"
        }), 200

    except Exception as e:
        db.rollback()
        print("Application update error:", e)

        return jsonify({
            "message": "Failed to update application"
        }), 500

    finally:
        cursor.close()
        db.close()


# Delete an application
@application_bp.route("/<int:application_id>", methods=["DELETE"])
def delete_application(application_id):

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor()

    try:
        cursor.execute(
            """
            DELETE FROM applications
            WHERE id = %s AND user_id = %s
            """,
            (application_id, session["user_id"])
        )

        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Application not found"}), 404

        return jsonify({
            "message": "Application deleted successfully"
        }), 200

    finally:
        cursor.close()
        db.close()
