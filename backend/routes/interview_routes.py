
import requests

from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection

interview_bp = Blueprint("interviews", __name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.1:latest"


@interview_bp.route("/generate", methods=["POST"])
def generate_interview():

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    data = request.get_json(silent=True) or {}

    job_id = data.get("job_id")
    interview_type = data.get("interview_type", "technical")

    if not job_id:
        return jsonify({"message": "Please provide a job ID"}), 400

    if interview_type not in ["technical", "hr", "mixed"]:
        return jsonify({"message": "Invalid interview type"}), 400

    try:
        job_id = int(job_id)
        if job_id <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid job ID"}), 400

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        # Get latest uploaded resume
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

        # Get selected job details
        cursor.execute(
            """
            SELECT job_title, company_name,
                   job_description, required_skills
            FROM jobs
            WHERE id = %s
            """,
            (job_id,)
        )

        job = cursor.fetchone()

        if not job:
            return jsonify({"message": "Job not found"}), 404

        # Prepare AI prompt
        prompt = f"""
You are an expert technical interviewer and career coach.

Generate 10 interview questions with short, clear sample answers.

Job Title: {job['job_title']}
Company: {job['company_name']}
Job Description: {job['job_description'] or 'Not provided'}
Required Skills: {job['required_skills'] or 'Not provided'}

Candidate Resume:
{resume['extracted_text'][:3000]}

Interview Type: {interview_type}

Instructions:
1. Personalize questions using the candidate's resume.
2. Include relevant job skills.
3. For technical interviews, focus on technical concepts.
4. For HR interviews, focus on communication and behavioral questions.
5. For mixed interviews, include both technical and HR questions.
6. Give a short sample answer for every question.
7. Number each question clearly.
8. Use simple English.
"""

        # Generate questions using Ollama
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=600
        )

        response.raise_for_status()

        ai_result = response.json()
        generated_content = ai_result.get("response", "").strip()

        if not generated_content:
            return jsonify({
                "message": "AI did not generate interview questions"
            }), 502

        # Save generated interview into MySQL
        cursor.execute(
            """
            INSERT INTO ai_interview_sessions
            (
                user_id,
                resume_id,
                job_id,
                interview_type,
                ai_model,
                questions_and_answers
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                session["user_id"],
                resume["id"],
                job_id,
                interview_type,
                OLLAMA_MODEL,
                generated_content
            )
        )

        db.commit()

        interview_session_id = cursor.lastrowid

        return jsonify({
            "message": "Interview generated and saved successfully",
            "interview_session_id": interview_session_id,
            "job_title": job["job_title"],
            "company_name": job["company_name"],
            "interview_type": interview_type,
            "model": OLLAMA_MODEL,
            "questions_and_answers": generated_content
        }), 201

    except requests.exceptions.ConnectionError:
        return jsonify({
            "message": "Cannot connect to Ollama. Please start Ollama."
        }), 503

    except requests.exceptions.Timeout:
        return jsonify({
            "message": "AI response timed out. Please try again."
        }), 504

    except requests.exceptions.RequestException as e:
        print("Ollama API error:", e)
        return jsonify({
            "message": "Failed to generate interview questions"
        }), 502

    except Exception as e:
        db.rollback()
        print("Interview generation error:", e)
        return jsonify({
            "message": "Interview generation failed"
        }), 500

    finally:
        cursor.close()
        db.close()


# Retrieve previous AI interview sessions
@interview_bp.route("/history", methods=["GET"])
def get_interview_history():

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
                s.id,
                s.job_id,
                j.job_title,
                j.company_name,
                s.resume_id,
                s.interview_type,
                s.ai_model,
                s.questions_and_answers,
                s.created_at
            FROM ai_interview_sessions s
            JOIN jobs j ON s.job_id = j.id
            WHERE s.user_id = %s
            ORDER BY s.created_at DESC
            """,
            (session["user_id"],)
        )

        interviews = cursor.fetchall()

        return jsonify({
            "message": "Interview history retrieved successfully",
            "total_interviews": len(interviews),
            "interviews": interviews
        }), 200

    except Exception as e:
        print("Interview history error:", e)
        return jsonify({
            "message": "Failed to retrieve interview history"
        }), 500

    finally:
        cursor.close()
        db.close()
