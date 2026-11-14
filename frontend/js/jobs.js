
// ==========================================
// JOBPILOT AI - JOB MANAGEMENT
// Flask API + MySQL Integration
// ==========================================

const API_URL = "http://127.0.0.1:5000/api/jobs/";

let allJobs = [];
let jobModal;

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById("jobModal");

    if (modalElement && window.bootstrap) {
        jobModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    }

    setupSidebar();
    setupLogout();
    setupJobForm();
    setupSearch();
    loadJobs();
});

// ==========================================
// API REQUEST HELPER
// ==========================================

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            "Accept": "application/json",
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            window.location.replace("login.html");
        }

        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// ==========================================
// SIDEBAR
// ==========================================

function setupSidebar() {
    const toggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");

    if (toggle && sidebar) {
        toggle.addEventListener("click", () => {
            sidebar.classList.toggle("show");
        });
    }
}

// ==========================================
// LOGOUT
// ==========================================

function setupLogout() {
    const button = document.getElementById("logoutButton");

    if (!button) return;

    button.addEventListener("click", async (event) => {
        event.preventDefault();

        try {
            await apiRequest(
                "http://127.0.0.1:5000/api/auth/logout",
                { method: "POST" }
            );

            window.location.replace("login.html");

        } catch (error) {
            showMessage(error.message, "danger");
        }
    });
}

// ==========================================
// LOAD JOBS
// ==========================================

async function loadJobs() {
    const table = document.getElementById("jobsTableBody");

    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                Loading jobs...
            </td>
        </tr>
    `;

    try {
        const result = await apiRequest(API_URL);

        allJobs = result.jobs || [];

        updateStatistics();
        displayJobs(allJobs);

    } catch (error) {
        console.error("Job loading error:", error);

        table.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
    }
}

// ==========================================
// JOB STATISTICS
// ==========================================

function updateStatistics() {
    setText("jobCount", allJobs.length);

    const companies = new Set(
        allJobs.map(job =>
            (job.company_name || "").toLowerCase()
        )
    );

    setText("companyCount", companies.size);

    const fresherJobs = allJobs.filter(job =>
        (job.experience_level || "")
            .toLowerCase()
            .includes("fresher")
    );

    setText("fresherCount", fresherJobs.length);
}

// ==========================================
// DISPLAY JOBS
// ==========================================

function displayJobs(jobs) {
    const table = document.getElementById("jobsTableBody");

    if (!table) return;

    if (jobs.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="bi bi-briefcase"></i>
                        <h6>No jobs found</h6>
                        <p>Add your first job opportunity.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = jobs.map(job => `
        <tr>
            <td class="fw-semibold">
                ${escapeHTML(job.job_title || "")}
            </td>

            <td>${escapeHTML(job.company_name || "")}</td>

            <td>${escapeHTML(job.location || "Not specified")}</td>

            <td>${escapeHTML(job.experience_level || "Not specified")}</td>

            <td>${escapeHTML(job.job_type || "Not specified")}</td>

            <td>
                <div class="d-flex gap-2">

                    <button
                        class="btn btn-sm btn-outline-primary"
                        data-action="edit"
                        data-id="${Number(job.id)}"
                        title="Edit job">
                        <i class="bi bi-pencil"></i>
                    </button>

                    <button
                        class="btn btn-sm btn-outline-danger"
                        data-action="delete"
                        data-id="${Number(job.id)}"
                        title="Delete job">
                        <i class="bi bi-trash"></i>
                    </button>

                </div>
            </td>
        </tr>
    `).join("");

    table.querySelectorAll("button[data-action]").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);

            if (button.dataset.action === "edit") {
                editJob(id);
            }

            if (button.dataset.action === "delete") {
                deleteJob(id);
            }
        });
    });
}

// ==========================================
// ADD OR UPDATE JOB
// ==========================================

function setupJobForm() {
    const form = document.getElementById("jobForm");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const jobId = document.getElementById("jobId").value;

        // Field names match your Flask backend.
        const jobData = {
            title: document.getElementById("jobTitle").value.trim(),
            company: document.getElementById("companyName").value.trim(),
            location: document.getElementById("jobLocation").value.trim(),
            job_type: document.getElementById("jobType").value.trim(),
            experience_level: document.getElementById("experienceLevel").value.trim(),
            salary: document.getElementById("jobSalary").value.trim(),
            required_skills: document.getElementById("requiredSkills").value.trim(),
            description: document.getElementById("jobDescription").value.trim(),
            job_url: document.getElementById("jobUrl").value.trim()
        };

        if (!jobData.title || !jobData.company) {
            showMessage(
                "Job title and company are required.",
                "danger"
            );
            return;
        }

        const saveButton = document.getElementById("saveJobButton");

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            let result;

            if (jobId) {
                result = await apiRequest(`${API_URL}${jobId}`, {
                    method: "PUT",
                    body: JSON.stringify(jobData)
                });
            } else {
                result = await apiRequest(API_URL, {
                    method: "POST",
                    body: JSON.stringify(jobData)
                });
            }

            if (jobModal) {
                jobModal.hide();
            }

            form.reset();
            document.getElementById("jobId").value = "";

            document.getElementById("jobModalTitle").textContent =
                "Add New Job";

            showMessage(
                result.message || "Job saved successfully.",
                "success"
            );

            await loadJobs();

        } catch (error) {
            showMessage(error.message, "danger");

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Job";
        }
    });
}

// ==========================================
// EDIT JOB
// ==========================================

async function editJob(jobId) {
    try {
        const result = await apiRequest(`${API_URL}${jobId}`);

        const job = result.job;

        document.getElementById("jobId").value = job.id;
        document.getElementById("jobTitle").value = job.job_title || "";
        document.getElementById("companyName").value = job.company_name || "";
        document.getElementById("jobLocation").value = job.location || "";
        document.getElementById("jobType").value = job.job_type || "";
        document.getElementById("experienceLevel").value =
            job.experience_level || "";
        document.getElementById("jobSalary").value = job.salary || "";
        document.getElementById("requiredSkills").value =
            job.required_skills || "";
        document.getElementById("jobDescription").value =
            job.job_description || "";
        document.getElementById("jobUrl").value = job.job_url || "";

        document.getElementById("jobModalTitle").textContent = "Edit Job";

        if (jobModal) {
            jobModal.show();
        }

    } catch (error) {
        showMessage(error.message, "danger");
    }
}

// ==========================================
// DELETE JOB
// ==========================================

async function deleteJob(jobId) {
    const confirmed = confirm(
        "Are you sure you want to delete this job?"
    );

    if (!confirmed) return;

    try {
        const result = await apiRequest(`${API_URL}${jobId}`, {
            method: "DELETE"
        });

        showMessage(
            result.message || "Job deleted successfully.",
            "success"
        );

        await loadJobs();

    } catch (error) {
        showMessage(error.message, "danger");
    }
}

// ==========================================
// SEARCH JOBS
// ==========================================

function setupSearch() {
    const searchInput = document.getElementById("jobSearch");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase().trim();

        const filteredJobs = allJobs.filter(job => {
            return (
                (job.job_title || "").toLowerCase().includes(query) ||
                (job.company_name || "").toLowerCase().includes(query) ||
                (job.location || "").toLowerCase().includes(query)
            );
        });

        displayJobs(filteredJobs);
    });
}

// ==========================================
// MESSAGE DISPLAY
// ==========================================

function showMessage(message, type = "success") {
    const element = document.getElementById("jobMessage");

    if (!element) return;

    element.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${escapeHTML(message)}
            <button type="button"
                    class="btn-close"
                    data-bs-dismiss="alert">
            </button>
        </div>
    `;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}
