
// ==========================================
// JOBPILOT AI - AI JOB RECOMMENDATIONS
// Flask API + MySQL Integration
// ==========================================

const RECOMMENDATIONS_API =
    "http://127.0.0.1:5000/api/recommendations/";

document.addEventListener("DOMContentLoaded", () => {
    const recommendationsList =
        document.getElementById("recommendationsList");

    const recommendationMessage =
        document.getElementById("recommendationMessage");

    const totalRecommendations =
        document.getElementById("totalRecommendations");

    const bestMatch =
        document.getElementById("bestMatch");

    const resumeStatus =
        document.getElementById("resumeStatus");

    const refreshButton =
        document.getElementById("refreshRecommendations");

    loadRecommendations();

    if (refreshButton) {
        refreshButton.addEventListener("click", loadRecommendations);
    }

    async function loadRecommendations() {
        recommendationsList.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary"></div>
                <p class="text-muted mt-3">
                    Analyzing your resume and finding matching jobs...
                </p>
            </div>
        `;

        showMessage("", "");

        try {
            const response = await fetch(RECOMMENDATIONS_API, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            });

            const result = await response.json();

            if (response.status === 401) {
                recommendationsList.innerHTML = `
                    <div class="alert alert-warning">
                        Please login to view your job recommendations.
                        <a href="login.html">Login here</a>.
                    </div>
                `;
                updateStats(0, 0, "Login required");
                return;
            }

            if (response.status === 404) {
                recommendationsList.innerHTML = `
                    <div class="text-center py-4">
                        <i class="bi bi-file-earmark-pdf fs-1 text-danger"></i>
                        <h5 class="mt-3">Resume Not Found</h5>
                        <p class="text-muted">
                            Please upload a readable PDF resume first.
                        </p>
                        <a href="resume.html" class="btn btn-primary">
                            Upload Resume
                        </a>
                    </div>
                `;

                updateStats(0, 0, "Not uploaded");
                return;
            }

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to load recommendations."
                );
            }

            const recommendations = result.recommendations || [];

            if (recommendations.length === 0) {
                recommendationsList.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-briefcase fs-1 text-muted"></i>
                        <h5 class="mt-3">No Jobs Available</h5>
                        <p class="text-muted">
                            Add jobs to your JobPilot AI catalogue
                            to receive recommendations.
                        </p>
                        <a href="jobs.html" class="btn btn-primary">
                            Explore Jobs
                        </a>
                    </div>
                `;

                updateStats(0, 0, "Uploaded");
                return;
            }

            updateStats(
                recommendations.length,
                recommendations[0].match_percentage || 0,
                "Uploaded"
            );

            displayRecommendations(recommendations);

            showMessage(
                result.message || "Recommendations loaded successfully.",
                "success"
            );

        } catch (error) {
            console.error("Recommendation error:", error);

            recommendationsList.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Unable to load recommendations.</strong>
                    <p class="mb-0">${escapeHTML(error.message)}</p>
                    Please check that your Flask backend is running
                    and try again.
                </div>
            `;

            updateStats(0, 0, "Unavailable");
        }
    }

    function displayRecommendations(recommendations) {
        recommendationsList.innerHTML = recommendations.map(job => {
            const score = Number(job.match_percentage) || 0;

            const matchColor =
                score >= 70 ? "success" :
                score >= 40 ? "warning" : "danger";

            const matchedSkills = Array.isArray(job.matched_skills)
                ? job.matched_skills : [];

            const missingSkills = Array.isArray(job.missing_skills)
                ? job.missing_skills : [];

            const matchedHTML = matchedSkills.length
                ? matchedSkills.map(skill =>
                    `<span class="badge bg-success-subtle text-success me-1 mb-1">
                        ${escapeHTML(skill)}
                    </span>`
                ).join("")
                : `<span class="text-muted">No matching skills found</span>`;

            const missingHTML = missingSkills.length
                ? missingSkills.map(skill =>
                    `<span class="badge bg-danger-subtle text-danger me-1 mb-1">
                        ${escapeHTML(skill)}
                    </span>`
                ).join("")
                : `<span class="text-success">No missing skills identified</span>`;

            const safeJobURL = getSafeJobURL(job.job_url);

            return `
                <div class="card mb-4 border shadow-sm">
                    <div class="card-body p-4">

                        <div class="d-flex justify-content-between
                                    align-items-start flex-wrap gap-3">

                            <div>
                                <h5 class="fw-bold mb-1">
                                    ${escapeHTML(job.job_title)}
                                </h5>

                                <p class="text-muted mb-2">
                                    <i class="bi bi-building"></i>
                                    ${escapeHTML(job.company_name)}
                                </p>
                            </div>

                            <div class="text-center">
                                <h3 class="text-${matchColor} fw-bold mb-0">
                                    ${score.toFixed(2)}%
                                </h3>
                                <small class="text-muted">Resume Match</small>
                            </div>
                        </div>

                        <div class="progress my-3" style="height: 9px;">
                            <div
                                class="progress-bar bg-${matchColor}"
                                role="progressbar"
                                style="width: ${Math.min(100, Math.max(0, score))}%"
                                aria-valuenow="${score}"
                                aria-valuemin="0"
                                aria-valuemax="100">
                            </div>
                        </div>

                        <div class="row g-3 mb-3">

                            <div class="col-md-6">
                                <p class="mb-1">
                                    <i class="bi bi-geo-alt text-primary"></i>
                                    <strong>Location:</strong>
                                    ${escapeHTML(job.location || "Not specified")}
                                </p>

                                <p class="mb-1">
                                    <i class="bi bi-clock text-primary"></i>
                                    <strong>Job Type:</strong>
                                    ${escapeHTML(job.job_type || "Not specified")}
                                </p>
                            </div>

                            <div class="col-md-6">
                                <p class="mb-1">
                                    <i class="bi bi-person-workspace text-primary"></i>
                                    <strong>Experience:</strong>
                                    ${escapeHTML(job.experience_level || "Not specified")}
                                </p>

                                <p class="mb-1">
                                    <i class="bi bi-currency-rupee text-primary"></i>
                                    <strong>Salary:</strong>
                                    ${escapeHTML(job.salary || "Not specified")}
                                </p>
                            </div>

                        </div>

                        <hr>

                        <div class="mb-3">
                            <h6 class="fw-bold text-success">
                                <i class="bi bi-check-circle"></i>
                                Matched Skills
                            </h6>
                            <div>${matchedHTML}</div>
                        </div>

                        <div class="mb-3">
                            <h6 class="fw-bold text-danger">
                                <i class="bi bi-exclamation-circle"></i>
                                Skills to Improve
                            </h6>
                            <div>${missingHTML}</div>
                        </div>

                        <div class="d-flex justify-content-end">
                            ${
                                safeJobURL
                                    ? `<a href="${escapeHTML(safeJobURL)}"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          class="btn btn-primary">
                                          View Job <i class="bi bi-box-arrow-up-right"></i>
                                       </a>`
                                    : `<button class="btn btn-secondary" disabled>
                                          Job Link Unavailable
                                       </button>`
                            }
                        </div>

                    </div>
                </div>
            `;
        }).join("");
    }

    function updateStats(total, best, status) {
        totalRecommendations.textContent = total;
        bestMatch.textContent = `${Number(best).toFixed(2)}%`;
        resumeStatus.textContent = status;
    }

    function showMessage(message, type) {
        if (!message) {
            recommendationMessage.innerHTML = "";
            return;
        }

        recommendationMessage.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show">
                ${escapeHTML(message)}
                <button type="button" class="btn-close"
                    data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    function getSafeJobURL(url) {
        if (!url || typeof url !== "string") return "";

        try {
            const parsedURL = new URL(url);

            if (parsedURL.protocol === "http:" ||
                parsedURL.protocol === "https:") {
                return parsedURL.href;
            }
        } catch (error) {
            return "";
        }

        return "";
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }
});
