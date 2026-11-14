
// ==========================================
// JOBPILOT AI - INTERVIEW PRACTICE
// Flask API + MySQL + Ollama Integration
// ==========================================

const API_BASE = "http://127.0.0.1:5000/api";

const INTERVIEWS_API = `${API_BASE}/interviews`;
const PRACTICE_API = `${API_BASE}/practice`;

document.addEventListener("DOMContentLoaded", () => {
    initializePracticePage();
});

let interviewQuestions = [];
let practiceHistory = [];


// ==========================================
// INITIALIZE PAGE
// ==========================================

async function initializePracticePage() {
    setupSidebar();
    setupPracticeEvents();

    await loadInterviewSessions();
    await loadPracticeHistory();
}


// ==========================================
// SIDEBAR
// ==========================================

function setupSidebar() {
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });
    }

    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: "POST",
                    credentials: "include"
                });

                window.location.href = "login.html";
            } catch (error) {
                console.error("Logout error:", error);
                window.location.href = "login.html";
            }
        });
    }
}


// ==========================================
// EVENT LISTENERS
// ==========================================

function setupPracticeEvents() {
    const practiceForm = document.getElementById("practiceForm");
    const interviewSession = document.getElementById("interviewSession");
    const questionSelect = document.getElementById("questionSelect");
    const refreshHistory = document.getElementById("refreshHistory");

    if (practiceForm) {
        practiceForm.addEventListener("submit", evaluateAnswer);
    }

    if (interviewSession) {
        interviewSession.addEventListener("change", handleSessionChange);
    }

    if (questionSelect) {
        questionSelect.addEventListener("change", displaySelectedQuestion);
    }

    if (refreshHistory) {
        refreshHistory.addEventListener("click", loadPracticeHistory);
    }
}


// ==========================================
// LOAD INTERVIEW SESSIONS
// ==========================================

async function loadInterviewSessions() {
    const sessionSelect = document.getElementById("interviewSession");

    if (!sessionSelect) return;

    try {
        const response = await fetch(`${INTERVIEWS_API}/history`, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Could not load interviews");
        }

        const interviews = data.interviews || [];

        sessionSelect.innerHTML =
            '<option value="">Select an interview session</option>';

        interviews.forEach(interview => {
            const option = document.createElement("option");

            option.value = interview.id;

            option.textContent =
                `${interview.job_title || "Interview"} - ` +
                `${interview.company_name || "Company"} ` +
                `(${interview.interview_type || "Mixed"})`;

            option.dataset.questions =
                interview.questions_and_answers || "";

            sessionSelect.appendChild(option);
        });

        if (interviews.length === 0) {
            showMessage(
                "No interview sessions found. Generate an interview first.",
                "warning"
            );
        }

    } catch (error) {
        console.error("Interview loading error:", error);

        showMessage(
            error.message || "Failed to load interview sessions.",
            "error"
        );
    }
}


// ==========================================
// HANDLE SESSION CHANGE
// ==========================================

function handleSessionChange() {
    const sessionSelect = document.getElementById("interviewSession");
    const selectedOption = sessionSelect?.selectedOptions[0];

    const questionSelect = document.getElementById("questionSelect");
    const questionDisplay = document.getElementById("questionDisplay");

    interviewQuestions = [];

    if (!selectedOption || !selectedOption.value) {
        resetQuestionOptions();
        return;
    }

    const questionText = selectedOption.dataset.questions || "";

    interviewQuestions = extractQuestions(questionText);

    if (!questionSelect) return;

    questionSelect.innerHTML =
        '<option value="">Select a question</option>';

    interviewQuestions.forEach((question, index) => {
        const option = document.createElement("option");

        option.value = index;
        option.textContent = `Question ${index + 1}`;

        questionSelect.appendChild(option);
    });

    if (questionDisplay) {
        questionDisplay.textContent =
            interviewQuestions.length > 0
                ? "Choose a question to begin practicing."
                : "No questions could be extracted from this interview. Please check your Interviews page.";
    }
}


// ==========================================
// EXTRACT QUESTIONS FROM AI TEXT
// ==========================================

function extractQuestions(rawText) {
    if (!rawText) return [];

    const lines = rawText
        .replace(/\r/g, "")
        .split("\n");

    const questions = [];
    const seen = new Set();

    lines.forEach(originalLine => {
        let line = originalLine.trim();

        if (!line) return;

        // Remove common Markdown formatting.
        line = line.replace(/\*\*/g, "");
        line = line.replace(/^#+\s*/, "");

        // Ignore answer and explanation headings.
        if (/^(answer|sample answer|suggested answer|explanation|feedback|score|improvement|strengths)\s*[:\-]/i.test(line)) {
            return;
        }

        // Remove question labels.
        line = line.replace(
            /^(?:question|q)\s*\d*\s*[:.)\-]\s*/i,
            ""
        );

        // Remove numbered list prefixes.
        const numbered = /^\d+[\s.)-]+\s*/.test(line);

        line = line.replace(/^\d+[\s.)-]+\s*/, "").trim();

        // Ignore very short or empty lines.
        if (line.length < 12) return;

        // Ignore headings that are not questions.
        if (/^(section|technical interview|hr interview|questions and answers)\b/i.test(line)) {
            return;
        }

        const startsLikeQuestion =
            /^(what|why|how|when|where|who|which|explain|describe|tell|can|could|would|do|does|is|are|have|has|introduce|define|compare|differentiate)\b/i.test(line);

        if (!numbered && !line.endsWith("?") && !startsLikeQuestion) {
            return;
        }

        const normalized = line.toLowerCase();

        if (seen.has(normalized)) return;

        seen.add(normalized);
        questions.push(line);
    });

    return questions;
}


// ==========================================
// RESET QUESTION OPTIONS
// ==========================================

function resetQuestionOptions() {
    const questionSelect = document.getElementById("questionSelect");
    const questionDisplay = document.getElementById("questionDisplay");

    if (questionSelect) {
        questionSelect.innerHTML =
            '<option value="">Select a question</option>';
    }

    if (questionDisplay) {
        questionDisplay.textContent =
            "Select an interview session first.";
    }

    interviewQuestions = [];
}


// ==========================================
// DISPLAY SELECTED QUESTION
// ==========================================

function displaySelectedQuestion() {
    const questionSelect = document.getElementById("questionSelect");
    const questionDisplay = document.getElementById("questionDisplay");

    if (!questionSelect || !questionDisplay) return;

    const selectedIndex = questionSelect.value;

    if (selectedIndex === "") {
        questionDisplay.textContent = "Choose a question to practice.";
        return;
    }

    const question = interviewQuestions[Number(selectedIndex)];

    questionDisplay.textContent = question || "Question not found.";
}


// ==========================================
// EVALUATE ANSWER USING OLLAMA
// ==========================================

async function evaluateAnswer(event) {
    event.preventDefault();

    const sessionId =
        document.getElementById("interviewSession")?.value;

    const questionIndex =
        document.getElementById("questionSelect")?.value;

    const userAnswer =
        document.getElementById("userAnswer")?.value.trim();

    const question =
        questionIndex !== ""
            ? interviewQuestions[Number(questionIndex)]
            : "";

    const evaluateButton =
        document.getElementById("evaluateButton");

    if (!sessionId) {
        showMessage("Please select an interview session.", "warning");
        return;
    }

    if (!question) {
        showMessage("Please select an interview question.", "warning");
        return;
    }

    if (!userAnswer) {
        showMessage("Please enter your answer.", "warning");
        return;
    }

    if (evaluateButton) {
        evaluateButton.disabled = true;
        evaluateButton.textContent = "AI is evaluating...";
    }

    showMessage(
        "Your answer is being evaluated by AI. Please wait...",
        "info"
    );

    try {
        const response = await fetch(`${PRACTICE_API}/evaluate`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                interview_session_id: Number(sessionId),
                question: question,
                user_answer: userAnswer
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "AI evaluation failed");
        }

        displayEvaluation(data);

        document.getElementById("userAnswer").value = "";

        await loadPracticeHistory();

        showMessage(
            data.message || "Answer evaluated successfully!",
            "success"
        );

    } catch (error) {
        console.error("Evaluation error:", error);

        showMessage(
            error.message || "Something went wrong during evaluation.",
            "error"
        );

    } finally {
        if (evaluateButton) {
            evaluateButton.disabled = false;
            evaluateButton.textContent = "Evaluate My Answer";
        }
    }
}


// ==========================================
// DISPLAY AI FEEDBACK
// ==========================================

function displayEvaluation(data) {
    const feedbackPanel = document.getElementById("feedbackPanel");
    const resultScore = document.getElementById("resultScore");
    const feedbackContent = document.getElementById("feedbackContent");

    if (resultScore) {
        resultScore.textContent =
            data.score !== null && data.score !== undefined
                ? `${data.score}/10`
                : "N/A";
    }

    if (feedbackContent) {
        feedbackContent.textContent =
            data.feedback || "No feedback received.";
    }

    if (feedbackPanel) {
        feedbackPanel.hidden = false;
        feedbackPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// ==========================================
// LOAD PRACTICE HISTORY
// ==========================================

async function loadPracticeHistory() {
    try {
        const response = await fetch(`${PRACTICE_API}/history`, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Could not load practice history");
        }

        practiceHistory = data.practice_history || [];

        displayPracticeHistory(practiceHistory);
        updatePracticeStatistics(practiceHistory);

    } catch (error) {
        console.error("Practice history error:", error);

        showMessage(
            error.message || "Failed to load practice history.",
            "error"
        );
    }
}


// ==========================================
// DISPLAY PRACTICE HISTORY
// ==========================================

function displayPracticeHistory(history) {
    const historyContainer =
        document.getElementById("practiceHistory");

    if (!historyContainer) return;

    historyContainer.innerHTML = "";

    if (!history || history.length === 0) {
        historyContainer.innerHTML = `
            <div class="empty-state">
                <h5>No practice history yet</h5>
                <p>Submit your first interview answer to see your results here.</p>
            </div>
        `;
        return;
    }

    history.forEach(item => {
        const score =
            item.score !== null && item.score !== undefined
                ? `${item.score}/10`
                : "Not scored";

        const card = document.createElement("div");
        card.className = "practice-history-item";

        const question = document.createElement("h6");
        question.textContent = item.question || "Interview question";

        const answer = document.createElement("p");
        answer.textContent =
            `Your answer: ${item.user_answer || "No answer"}`;

        const scoreElement = document.createElement("strong");
        scoreElement.textContent = `Score: ${score}`;

        const date = document.createElement("small");
        date.textContent = formatDate(item.created_at);

        const feedback = document.createElement("p");
        feedback.textContent =
            item.ai_feedback || "No feedback available.";

        card.appendChild(question);
        card.appendChild(answer);
        card.appendChild(scoreElement);
        card.appendChild(document.createElement("br"));
        card.appendChild(date);
        card.appendChild(feedback);

        historyContainer.appendChild(card);
    });
}


// ==========================================
// UPDATE PRACTICE STATISTICS
// ==========================================

function updatePracticeStatistics(history) {
    const totalPractices = document.getElementById("totalPractices");
    const averageScore = document.getElementById("averageScore");
    const bestScore = document.getElementById("bestScore");

    const scores = history
        .map(item => Number(item.score))
        .filter(score => Number.isFinite(score) && score >= 0 && score <= 10);

    if (totalPractices) {
        totalPractices.textContent = history.length;
    }

    if (scores.length > 0) {
        const average =
            scores.reduce((total, score) => total + score, 0) /
            scores.length;

        if (averageScore) {
            averageScore.textContent = `${average.toFixed(1)}/10`;
        }

        if (bestScore) {
            bestScore.textContent = `${Math.max(...scores)}/10`;
        }
    } else {
        if (averageScore) averageScore.textContent = "0/10";
        if (bestScore) bestScore.textContent = "0/10";
    }
}


// ==========================================
// MESSAGE DISPLAY
// ==========================================

function showMessage(message, type = "info") {
    const messageElement = document.getElementById("practiceMessage");

    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `alert alert-${getAlertClass(type)}`;
    messageElement.hidden = false;
}


function getAlertClass(type) {
    const classes = {
        success: "success",
        error: "danger",
        warning: "warning",
        info: "info"
    };

    return classes[type] || "info";
}


// ==========================================
// DATE FORMATTING
// ==========================================

function formatDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleString();
}
