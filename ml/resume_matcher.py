
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# Technical skills database
SKILLS_DATABASE = [
    "python",
    "java",
    "javascript",
    "html",
    "css",
    "bootstrap",
    "react",
    "angular",
    "node.js",
    "flask",
    "django",
    "mysql",
    "mongodb",
    "sql",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "data science",
    "data analysis",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "git",
    "github",
    "docker",
    "aws",
    "azure",
    "communication",
    "problem solving"
]


def extract_skills(text):

    if not text:
        return []

    text = text.lower()
    found_skills = []

    for skill in SKILLS_DATABASE:

        pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"

        if re.search(pattern, text):
            found_skills.append(skill)

    return found_skills


def calculate_similarity(resume_text, job_description):

    if not resume_text or not job_description:
        return 0.0

    documents = [
        resume_text,
        job_description
    ]

    vectorizer = TfidfVectorizer(
        stop_words="english"
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(documents)

        similarity = cosine_similarity(
            tfidf_matrix[0:1],
            tfidf_matrix[1:2]
        )[0][0]

        return round(float(similarity) * 100, 2)

    except ValueError:
        return 0.0


def match_resume_with_job(resume_text, job_description):

    resume_skills = extract_skills(resume_text)
    required_skills = extract_skills(job_description)

    matched_skills = [
        skill for skill in required_skills
        if skill in resume_skills
    ]

    missing_skills = [
        skill for skill in required_skills
        if skill not in resume_skills
    ]

    similarity_score = calculate_similarity(
        resume_text,
        job_description
    )

    if required_skills:
        skill_match_score = round(
            (len(matched_skills) / len(required_skills)) * 100,
            2
        )
    else:
        skill_match_score = 0.0

    # Combined matching score
    final_score = round(
        (similarity_score * 0.4) +
        (skill_match_score * 0.6),
        2
    )

    return {
        "match_percentage": final_score,
        "similarity_score": similarity_score,
        "skill_match_score": skill_match_score,
        "resume_skills": resume_skills,
        "required_skills": required_skills,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills
    }
