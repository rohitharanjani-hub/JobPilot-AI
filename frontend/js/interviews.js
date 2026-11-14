
// ==========================================
// JOBPILOT AI - AI INTERVIEW GENERATOR
// Flask API + MySQL + Ollama Integration
// ==========================================

const JOBS_API = "http://127.0.0.1:5000/api/jobs/";
const INTERVIEW_API = "http://127.0.0.1:5000/api/interviews/";

document.addEventListener("DOMContentLoaded", () => {
    const jobSelect = document.getElementById("jobSelect");
    const interviewType = document.getElementById("interviewType");
    const interviewForm = document.getElementById("interviewForm");
    const generateButton = document.getElementById("generateInterviewButton");

    const messageBox = document.getElementById("interviewMessage");
    const questionsContainer = document.getElementById("interviewQuestions");
    const questionCount = document.getElementById("questionCount");
    const historyContainer = document.getElementById("interviewHistory");

    let generatedInterview = "";

    // --------------------------------------
    // LOAD AVAILABLE JOBS
    // --------------------------------------

    async function loadJobs() {
        try {
            const response = await fetch(JOBS_API, {
                method: "GET",
                credentials: "include"
            });

            if (response.status === 401) {
                showMessage("Please log in to view available jobs.", "warning");
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load jobs.");
            }

            const jobs = data.jobs || [];

            jobSelect.innerHTML = `
                <option value="">Select a job</option>
            `;

            if (jobs.length === 0) {
                jobSelect.innerHTML = `
                    <option value="">No jobs available. Add a job first.</option>
                `;
                return;
            }

            jobs.forEach(job => {
                const option = document.createElement("option");
                option.value = job.id;
                option.textContent =
                    `${job.job_title} - ${job.company_name}`;
                jobSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Load jobs error:", error);
            showMessage("Could not load jobs. Check the backend server.", "danger");
        }
    }

    // --------------------------------------
    // SHOW MESSAGE
    // --------------------------------------

    function showMessage(message, type = "info") {
        messageBox.innerHTML = "";

        const alert = document.createElement("div");
        alert.className = `alert alert-${type}`;
        alert.textContent = message;

        messageBox.appendChild(alert);
    }

    function clearMessage() {
        messageBox.innerHTML = "";
    }

    // --------------------------------------
    // DISPLAY GENERATED INTERVIEW
    // --------------------------------------

    function displayInterview(data) {
        generatedInterview = data.questions_and_answers || "";

        questionsContainer.innerHTML = "";

        const heading = document.createElement("h5");
        heading.className = "mb-3";
        heading.textContent =
            `${data.job_title || "Interview"} - ${data.interview_type || "Mixed"} Interview`;

        const details = document.createElement("p");
        details.className = "text-muted small";
        details.textContent =
            `Session ID: ${data.interview_session_id || "N/A"} | AI Model: ${data.model || "Ollama"}`;

        const content = document.createElement("div");
        content.className = "interview-content";
        content.style.whiteSpace = "pre-wrap";
        content.style.lineHeight = "1.8";
        content.style.padding = "18px";
        content.style.borderRadius = "10px";
        content.style.background = "#f8fafc";
        content.style.border = "1px solid #e2e8f0";
        content.textContent = generatedInterview;

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "btn btn-outline-primary btn-sm mt-3";
        copyButton.textContent = "Copy Questions and Answers";

        copyButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(generatedInterview);
                showMessage("Interview questions copied successfully!", "success");
            } catch (error) {
                showMessage("Unable to copy. Please select and copy the text manually.", "warning");
            }
        });

        questionsContainer.appendChild(heading);
        questionsContainer.appendChild(details);
        questionsContainer.appendChild(content);
        questionsContainer.appendChild(copyButton);

        const matches = generatedInterview.match(/^\s*\d+\s*[.)]/gm);
        questionCount.textContent = matches ? matches.length : "10";
    }

    // --------------------------------------
    // GENERATE AI INTERVIEW
    // --------------------------------------

    interviewForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const jobId = jobSelect.value;
        const selectedType = interviewType.value;

        if (!jobId) {
            showMessage("Please select a job first.", "warning");
            return;
        }

        clearMessage();

        generateButton.disabled = true;
        generateButton.textContent = "Generating Interview... Please Wait";

        questionsContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-3">Ollama AI is preparing your interview questions.</p>
                <small class="text-muted">This may take a few minutes.</small>
            </div>
        `;

        try {
            const response = await fetch(
                `${INTERVIEW_API}generate`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        job_id: Number(jobId),
                        interview_type: selectedType
                    })
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                throw new Error("Your session has expired. Please log in again.");
            }

            if (!response.ok) {
                throw new Error(data.message || "Interview generation failed.");
            }

            displayInterview(data);

            showMessage(
                "Your AI interview has been generated and saved successfully!",
                "success"
            );

            await loadInterviewHistory();

        } catch (error) {
            console.error("Interview generation error:", error);

            questionsContainer.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;

            showMessage(error.message, "danger");

        } finally {
            generateButton.disabled = false;
            generateButton.textContent = "Generate AI Interview";
        }
    });

    // --------------------------------------
    // LOAD INTERVIEW HISTORY
    // --------------------------------------

    async function loadInterviewHistory() {
        try {
            const response = await fetch(
                `${INTERVIEW_API}history`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (response.status === 401) {
                historyContainer.innerHTML = `
                    <p class="text-muted">Please log in to view interview history.</p>
                `;
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load interview history.");
            }

            const interviews = data.interviews || [];

            historyContainer.innerHTML = "";

            if (interviews.length === 0) {
                historyContainer.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <p>No interview history found.</p>
                        <small>Generate your first AI interview to see it here.</small>
                    </div>
                `;
                return;
            }

            interviews.forEach((item, index) => {
                const card = document.createElement("div");
                card.className = "card mb-3";

                const cardBody = document.createElement("div");
                cardBody.className = "card-body";

                const title = document.createElement("h6");
                title.className = "mb-2";
                title.textContent =
                    `${item.job_title || "Interview"} - ${item.company_name || ""}`;

                const type = document.createElement("span");
                type.className = "badge bg-primary me-2";
                type.textContent = item.interview_type || "Mixed";

                const date = document.createElement("small");
                date.className = "text-muted";
                date.textContent = item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : "Date unavailable";

                const toggleButton = document.createElement("button");
                toggleButton.type = "button";
                toggleButton.className = "btn btn-sm btn-outline-primary d-block mt-3";
                toggleButton.textContent = "View Questions";

                const content = document.createElement("div");
                content.className = "mt-3 p-3 rounded";
                content.style.whiteSpace = "pre-wrap";
                content.style.background = "#f8fafc";
                content.style.display = "none";
                content.textContent = item.questions_and_answers || "No content available.";

                toggleButton.addEventListener("click", () => {
                    const isHidden = content.style.display === "none";
                    content.style.display = isHidden ? "block" : "none";
                    toggleButton.textContent = isHidden
                        ? "Hide Questions"
                        : "View Questions";
                });

                cardBody.appendChild(title);
                cardBody.appendChild(type);
                cardBody.appendChild(date);
                cardBody.appendChild(toggleButton);
                cardBody.appendChild(content);

                card.appendChild(cardBody);
                historyContainer.appendChild(card);
            });

        } catch (error) {
            console.error("Interview history error:", error);

            historyContainer.innerHTML = `
                <p class="text-danger">Could not load interview history.</p>
            `;
        }
    }

    // --------------------------------------
    // HTML ESCAPE
    // --------------------------------------

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    // --------------------------------------
    // INITIALIZE PAGE
    // --------------------------------------

    loadJobs();
    loadInterviewHistory();
});
