
from flask import Blueprint, jsonify, session

from backend.database import get_db_connection
from ml.resume_matcher import match_resume_with_job

recommendation_bp = Blueprint("recommendations", __name__)


@recommendation_bp.route("/", methods=["GET"])
def get_recommendations():

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        # Get the user's latest resume
        cursor.execute(
            """
            SELECT id, extracted_text
            FROM resumes
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (session["user_id"],)
        )

        resume = cursor.fetchone()

        if not resume or not resume["extracted_text"]:
            return jsonify({
                "message": "Please upload a readable resume first"
            }), 404

        # Get all available jobs
        cursor.execute(
            """
            SELECT id, job_title, company_name, location,
                   job_description, required_skills,
                   job_type, experience_level, salary, job_url
            FROM jobs
            ORDER BY id DESC
            """
        )

        jobs = cursor.fetchall()

        if not jobs:
            return jsonify({
                "message": "No jobs available",
                "recommendations": []
            }), 200

        recommendations = []

        # Match resume with every job
        for job in jobs:

            job_text = " ".join([
                job.get("job_description") or "",
                job.get("required_skills") or ""
            ])

            if not job_text.strip():
                continue

            result = match_resume_with_job(
                resume["extracted_text"],
                job_text
            )

            recommendations.append({
                "job_id": job["id"],
                "job_title": job["job_title"],
                "company_name": job["company_name"],
                "location": job["location"],
                "job_type": job["job_type"],
                "experience_level": job["experience_level"],
                "salary": job["salary"],
                "job_url": job["job_url"],
                "match_percentage": result["match_percentage"],
                "matched_skills": result["matched_skills"],
                "missing_skills": result["missing_skills"]
            })

        # Highest match first
        recommendations.sort(
            key=lambda item: item["match_percentage"],
            reverse=True
        )

        return jsonify({
            "message": "Job recommendations generated successfully",
            "total_jobs_analyzed": len(recommendations),
            "recommendations": recommendations
        }), 200

    except Exception as e:
        print("Job recommendation error:", e)
        return jsonify({
            "message": "Failed to generate job recommendations"
        }), 500

    finally:
        cursor.close()
        db.close()
