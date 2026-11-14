
import json
from flask import Blueprint, request, jsonify, session

from backend.database import get_db_connection
from ml.resume_matcher import match_resume_with_job

match_bp = Blueprint("matches", __name__)


@match_bp.route("/", methods=["POST"])
def create_match():

    # Check login
    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    data = request.get_json(silent=True) or {}
    job_id = data.get("job_id")

    if not job_id:
        return jsonify({"message": "Please provide a job ID"}), 400

    try:
        job_id = int(job_id)
        if job_id <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid job ID"}), 400

    user_id = session["user_id"]

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        # Get the user's latest uploaded resume
        cursor.execute(
            """
            SELECT id, extracted_text
            FROM resumes
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id,)
        )

        resume = cursor.fetchone()

        if not resume or not resume["extracted_text"]:
            return jsonify({
                "message": "Please upload a resume with readable text first"
            }), 404

        # Get job details
        cursor.execute(
            """
            SELECT id, job_title, company_name,
                   job_description, required_skills
            FROM jobs
            WHERE id = %s
            """,
            (job_id,)
        )

        job = cursor.fetchone()

        if not job:
            return jsonify({"message": "Job not found"}), 404

        # Combine job description and required skills
        job_text = " ".join([
            job.get("job_description") or "",
            job.get("required_skills") or ""
        ])

        if not job_text.strip():
            return jsonify({
                "message": "This job does not have enough information for matching"
            }), 400

        # Run AI resume matching
        result = match_resume_with_job(
            resume["extracted_text"],
            job_text
        )

        matched_skills = json.dumps(result["matched_skills"])
        missing_skills = json.dumps(result["missing_skills"])

        recommendations = []

        if result["missing_skills"]:
            recommendations.append(
                "Learn these missing skills: "
                + ", ".join(result["missing_skills"])
            )

        if result["match_percentage"] < 50:
            recommendations.append(
                "Improve your resume by adding relevant projects and skills."
            )
        elif result["match_percentage"] < 75:
            recommendations.append(
                "Your resume has a moderate match. Improve the missing skills."
            )
        else:
            recommendations.append(
                "Your resume is a strong match for this job."
            )

        recommendations_text = json.dumps(recommendations)

        # Save matching result in MySQL
        cursor.execute(
            """
            INSERT INTO job_matches
            (user_id, resume_id, job_id, match_score,
             matched_skills, missing_skills, recommendations)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                resume["id"],
                job["id"],
                result["match_percentage"],
                matched_skills,
                missing_skills,
                recommendations_text
            )
        )

        db.commit()

        return jsonify({
            "message": "Resume matching completed successfully",
            "match_id": cursor.lastrowid,
            "job_title": job["job_title"],
            "company_name": job["company_name"],
            "match_percentage": result["match_percentage"],
            "similarity_score": result["similarity_score"],
            "skill_match_score": result["skill_match_score"],
            "resume_skills": result["resume_skills"],
            "required_skills": result["required_skills"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "recommendations": recommendations
        }), 201

    except Exception as e:
        db.rollback()
        print("Resume matching error:", e)
        return jsonify({"message": "Resume matching failed"}), 500

    finally:
        cursor.close()
        db.close()


@match_bp.route("/", methods=["GET"])
def get_matches():

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
                jm.id,
                jm.resume_id,
                jm.job_id,
                jm.match_score,
                jm.matched_skills,
                jm.missing_skills,
                jm.recommendations,
                jm.created_at,
                j.job_title,
                j.company_name
            FROM job_matches jm
            JOIN jobs j ON jm.job_id = j.id
            WHERE jm.user_id = %s
            ORDER BY jm.id DESC
            """,
            (session["user_id"],)
        )

        matches = cursor.fetchall()

        for match in matches:
            match["matched_skills"] = json.loads(
                match["matched_skills"] or "[]"
            )
            match["missing_skills"] = json.loads(
                match["missing_skills"] or "[]"
            )
            match["recommendations"] = json.loads(
                match["recommendations"] or "[]"
            )

            if match.get("created_at"):
                match["created_at"] = match["created_at"].isoformat()

        return jsonify({
            "message": "Resume matches retrieved successfully",
            "matches": matches
        }), 200

    except Exception as e:
        print("Get matches error:", e)
        return jsonify({"message": "Failed to retrieve matches"}), 500

    finally:
        cursor.close()
        db.close()
