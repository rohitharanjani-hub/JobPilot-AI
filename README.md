# JobPilot AI – AI-Powered Job Tracking and Career Assistant

## About the Project

JobPilot AI is an AI-powered full-stack web application designed to help students and job seekers manage their job search journey.

It allows users to manage job applications, analyze resumes, discover suitable job opportunities, and prepare for interviews using AI-powered features.

## Features

- **User Authentication:** Register, login and logout.
- **Dashboard:** View career and application information.
- **Job Management:** Add, view, update and delete job listings.
- **Application Tracking:** Track application status and notes.
- **Resume Analyzer:** Upload and analyze PDF resumes.
- **AI Job Recommendations:** Find suitable jobs based on resume skills.
- **AI Interview Generator:** Generate interview questions.
- **Interview Practice:** Practice answers and receive AI-based evaluation.
- **Profile Management:** Manage personal and professional details.

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap 5

### Backend
- Python
- Flask
- Flask-CORS

### Database
- MySQL

### AI and Machine Learning
- Ollama (Llama 3.1)
- Scikit-learn
- TF-IDF
- Cosine Similarity
- PyMuPDF

## Project Structure

```text
JobPilot-AI/
│
├── backend/
│   ├── routes/
│   ├── app.py
│   ├── config.py
│   └── database.py
│
├── frontend/
│   ├── css/
│   ├── js/
│   └── pages/
│
├── venv/
├── .env
└── README.md
```

## How to Run the Project

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd JobPilot-AI
```

### 2. Create and Activate Virtual Environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure the Database

- Create a MySQL database named `jobpilot_ai`.
- Configure your database credentials in the `.env` file.
- Create the required project tables.

### 5. Start the Backend

```bash
python -m backend.app
```

Backend URL: `http://127.0.0.1:5000`

### 6. Start the Frontend

Open another terminal:

```bash
python -m http.server 5500 --directory frontend
```

Open the application:

`http://127.0.0.1:5500/pages/login.html`

### 7. AI Requirements

Install and configure Ollama, then ensure the `llama3.1:latest` model is available for AI interview and practice features.

## Project Objective

The main objective of JobPilot AI is to simplify job searching and career preparation by combining full-stack web development, artificial intelligence, and machine learning.

## Future Enhancements

- Live job portal integration
- Email notifications
- Advanced resume scoring
- More personalized job recommendations
- Career analytics and progress reports

## Author

**Rohitha Ranjani**

B.Tech – Computer Science and Engineering (AI & Data Science)
