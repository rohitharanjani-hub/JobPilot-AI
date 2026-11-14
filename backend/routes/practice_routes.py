
import re
import requests

from flask import Blueprint, request, jsonify, session
from backend.database import get_db_connection

practice_bp = Blueprint("practice", __name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.1:latest"


# ==========================================
# 1. AI INTERVIEW ANSWER EVALUATION
# ==========================================

@practice_bp.route("/evaluate", methods=["POST"])
def evaluate_answer():

    if "user_id" not in session:
        return jsonify({"message": "Please login first"}), 401

    data = request.get_json(silent=True) or {}

    interview_session_id = data.get("interview_session_id")
    question = data.get("question", "").strip()
    user_answer = data.get("user_answer", "").strip()

    if not interview_session_id or not question or not user_answer:
        return jsonify({
            "message": "Please provide interview session ID, question and answer"
        }), 400

    try:
        interview_session_id = int(interview_session_id)

        if interview_session_id <= 0:
            raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "message": "Invalid interview session ID"
        }), 400

    db = get_db_connection()

    if not db:
        return jsonify({"message": "Database connection failed"}), 500

    cursor = db.cursor(dictionary=True)

    try:
        # Verify interview session
        cursor.execute(
            """
            SELECT id
            FROM ai_interview_sessions
            WHERE id = %s AND user_id = %s
            """,
            (interview_session_id, session["user_id"])
        )

        interview = cursor.fetchone()

        if not interview:
            return jsonify({
                "message": "Interview session not found"
            }), 404

        # Prepare AI prompt
        prompt = f"""
You are an experienced technical interviewer.

Evaluate the candidate's interview answer.

Question:
{question}

Candidate Answer:
{user_answer}

Give feedback in simple English.

Provide:
1. Score out of 10.
2. What the candidate did well.
3. What needs improvement.
4. A better sample answer.

Return the score clearly in this format:
Score: 7/10
"""

        # Generate AI feedback
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
        feedback = ai_result.get("response", "").strip()

        if not feedback:
            return jsonify({
                "message": "AI did not generate feedback"
            }), 502

        # Extract score
        score_match = re.search(
            r"Score:\s*(\d{1,2})\s*/\s*10",
            feedback,
            re.IGNORECASE
        )

        score = int(score_match.group(1)) if score_match else None

        if score is not None and score > 10:
            score = None

        # Save answer and feedback in MySQL
        cursor.execute(
            """
            INSERT INTO interview_practice_answers
            (
                user_id,
                interview_session_id,
                question,
                user_answer,
                ai_feedback,
                score
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                session["user_id"],
                interview_session_id,
                question,
                user_answer,
                feedback,
                score
            )
        )

        db.commit()

        practice_id = cursor.lastrowid

        return jsonify({
            "message": "Answer evaluated and saved successfully",
            "practice_id": practice_id,
            "score": score,
            "feedback": feedback
        }), 201

    except requests.exceptions.ConnectionError:
        return jsonify({
            "message": "Cannot connect to Ollama"
        }), 503

    except requests.exceptions.Timeout:
        return jsonify({
            "message": "AI evaluation timed out"
        }), 504

    except requests.exceptions.RequestException as e:
        print("Ollama error:", e)

        return jsonify({
            "message": "AI evaluation failed"
        }), 502

    except Exception as e:
        db.rollback()
        print("Practice evaluation error:", e)

        return jsonify({
            "message": "Failed to evaluate answer"
        }), 500

    finally:
        cursor.close()
        db.close()


# ==========================================
# 2. RETRIEVE AI INTERVIEW PRACTICE HISTORY
# ==========================================

@practice_bp.route("/history", methods=["GET"])
def get_practice_history():

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
                id,
                interview_session_id,
                question,
                user_answer,
                ai_feedback,
                score,
                created_at
            FROM interview_practice_answers
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (session["user_id"],)
        )

        answers = cursor.fetchall()

        return jsonify({
            "message": "Practice history retrieved successfully",
            "total_answers": len(answers),
            "practice_history": answers
        }), 200

    except Exception as e:
        print("Practice history error:", e)

        return jsonify({
            "message": "Failed to retrieve practice history"
        }), 500

    finally:
        cursor.close()
        db.close()
