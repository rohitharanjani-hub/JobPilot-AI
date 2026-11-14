
import os
import uuid

import fitz
from flask import Blueprint, request, jsonify, session
from werkzeug.utils import secure_filename

from backend.database import get_db_connection


resume_bp = Blueprint("resumes", __name__)

# Project's main uploads folder
BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

ALLOWED_EXTENSIONS = {"pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# Upload resume and extract PDF text
@resume_bp.route("/", methods=["POST"])
def upload_resume():

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    if "resume" not in request.files:
        return jsonify({"message": "Please select a PDF resume"}), 400

    file = request.files["resume"]

    if file.filename == "":
        return jsonify({"message": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": "Only PDF files are allowed"}), 400

    pdf_bytes = file.read()

    if len(pdf_bytes) > MAX_FILE_SIZE:
        return jsonify({"message": "File size must be below 10 MB"}), 400

    if not pdf_bytes:
        return jsonify({"message": "The uploaded file is empty"}), 400

    original_filename = secure_filename(file.filename)

    stored_filename = str(uuid.uuid4()) + ".pdf"
    file_path = os.path.join(UPLOAD_FOLDER, stored_filename)

    try:
        # Extract text from PDF
        pdf_document = fitz.open(
            stream=pdf_bytes,
            filetype="pdf"
        )

        extracted_text = "\n".join(
            page.get_text() for page in pdf_document
        )

        pdf_document.close()

        # Save uploaded PDF
        with open(file_path, "wb") as uploaded_file:
            uploaded_file.write(pdf_bytes)

        # Save resume details in MySQL
        db = get_db_connection()

        if not db:
            os.remove(file_path)
            return jsonify({
                "message": "Database connection failed"
            }), 500

        cursor = db.cursor()

        try:
            relative_path = os.path.join(
                "uploads", stored_filename
            )

            cursor.execute(
                """
                INSERT INTO resumes
                (user_id, file_name, file_path, extracted_text)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    session["user_id"],
                    original_filename,
                    relative_path,
                    extracted_text
                )
            )

            db.commit()

            return jsonify({
                "message": "Resume uploaded successfully",
                "resume_id": cursor.lastrowid,
                "file_name": original_filename,
                "extracted_text": extracted_text
            }), 201

        except Exception as e:
            db.rollback()
            print("Resume database error:", e)

            if os.path.exists(file_path):
                os.remove(file_path)

            return jsonify({
                "message": "Failed to save resume details"
            }), 500

        finally:
            cursor.close()
            db.close()

    except Exception as e:
        print("Resume upload error:", e)

        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "message": "Invalid or unreadable PDF file"
        }), 400


# Get resumes of logged-in user
@resume_bp.route("/", methods=["GET"])
def get_resumes():

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    db = get_db_connection()

    if not db:
        return jsonify({
            "message": "Database connection failed"
        }), 500

    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id, file_name, file_path, uploaded_at
            FROM resumes
            WHERE user_id = %s
            ORDER BY id DESC
            """,
            (session["user_id"],)
        )

        resumes = cursor.fetchall()

        return jsonify({
            "message": "Resumes retrieved successfully",
            "resumes": resumes
        }), 200

    finally:
        cursor.close()
        db.close()
