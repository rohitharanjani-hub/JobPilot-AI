
// ==========================================
// JOBPILOT AI - APPLICATION TRACKER
// Flask API + MySQL Integration
// ==========================================

const APPLICATIONS_API = "http://127.0.0.1:5000/api/applications/";
const JOBS_API = "http://127.0.0.1:5000/api/jobs/";
const AUTH_API = "http://127.0.0.1:5000/api/auth/logout";

const VALID_STATUSES = [
    "Saved",
    "Applied",
    "Interview",
    "Selected",
    "Rejected"
];

let applications = [];
let availableJobs = [];
let applicationModal;

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById("applicationModal");

    if (modalElement && window.bootstrap) {
        applicationModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    }

    setupSidebar();
    setupLogout();
    setupApplicationForm();
    setupSearch();
    setupStatusFilter();
    setupAddButton();

    loadInitialData();
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
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        if (response.status === 401) {
            window.location.replace("login.html");
        }

        throw new Error(data.message || "Unable to complete your request.");
    }

    return data;
}

// ==========================================
// LOAD INITIAL DATA
// ==========================================

async function loadInitialData() {
    await loadJobs();
    await loadApplications();
}

// ==========================================
// LOAD AVAILABLE JOBS
// ==========================================

async function loadJobs() {
    const select = document.getElementById("applicationJobId");

    try {
        const result = await apiRequest(JOBS_API);

        availableJobs = result.jobs || [];

        populateJobDropdown();

    } catch (error) {
        console.error("Jobs loading error:", error);

        if (select) {
            select.innerHTML = '<option value="">Unable to load jobs</option>';
        }
    }
}

// ==========================================
// POPULATE JOB DROPDOWN
// ==========================================

function populateJobDropdown(selectedJobId = "") {
    const select = document.getElementById("applicationJobId");

    if (!select) return;

    select.innerHTML = `
        <option value="">Select a job</option>
        ${availableJobs.map(job => `
            <option value="${Number(job.id)}">
                ${escapeHTML(job.job_title)} - ${escapeHTML(job.company_name)}
            </option>
        `).join("")}
    `;

    select.value = String(selectedJobId || "");
}

// ==========================================
// LOAD APPLICATIONS
// ==========================================

async function loadApplications() {
    const table = document.getElementById("applicationsTableBody");

    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                Loading applications...
            </td>
        </tr>
    `;

    try {
        const result = await apiRequest(APPLICATIONS_API);

        applications = result.applications || [];

        updateStatistics();
        applyFilters();

    } catch (error) {
        console.error("Applications loading error:", error);

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
// UPDATE STATISTICS
// ==========================================

function updateStatistics() {
    setText("totalApplications", applications.length);

    setText(
        "appliedApplications",
        applications.filter(app => app.status === "Applied").length
    );

    setText(
        "interviewApplications",
        applications.filter(app => app.status === "Interview").length
    );

    setText(
        "selectedApplications",
        applications.filter(app => app.status === "Selected").length
    );
}

// ==========================================
// DISPLAY APPLICATIONS
// ==========================================

function displayApplications(list) {
    const table = document.getElementById("applicationsTableBody");

    if (!table) return;

    if (list.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <h6>No applications found</h6>
                    <p class="text-muted mb-0">
                        Add an application to start tracking your progress.
                    </p>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = list.map(app => {
        const id = Number(app.application_id);

        return `
            <tr>
                <td>${escapeHTML(app.job_title || "Job")}</td>

                <td>${escapeHTML(app.company_name || "Company")}</td>

                <td>${formatDate(app.applied_date)}</td>

                <td>
                    <span class="status-badge ${getStatusClass(app.status)}">
                        ${escapeHTML(app.status || "Saved")}
                    </span>
                </td>

                <td>
                    ${escapeHTML(
                        app.notes
                            ? app.notes.substring(0, 35) +
                              (app.notes.length > 35 ? "..." : "")
                            : "No notes"
                    )}
                </td>

                <td>
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-primary me-1"
                        data-action="edit"
                        data-id="${id}">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        data-action="delete"
                        data-id="${id}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    table.querySelectorAll("button[data-action]").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);

            if (button.dataset.action === "edit") {
                editApplication(id);
            }

            if (button.dataset.action === "delete") {
                deleteApplication(id);
            }
        });
    });
}

// ==========================================
// STATUS BADGE
// ==========================================

function getStatusClass(status) {
    const classes = {
        Saved: "status-saved",
        Applied: "status-applied",
        Interview: "status-interview",
        Selected: "status-selected",
        Rejected: "status-rejected"
    };

    return classes[status] || "status-saved";
}

// ==========================================
// ADD APPLICATION BUTTON
// ==========================================

function setupAddButton() {
    const button = document.getElementById("addApplicationButton");

    if (!button) return;

    button.addEventListener("click", () => {
        resetApplicationForm();

        populateJobDropdown();

        const jobSelect = document.getElementById("applicationJobId");
        const dateInput = document.getElementById("appliedDate");

        if (jobSelect) jobSelect.disabled = false;

        if (dateInput) {
            dateInput.disabled = true;
            dateInput.value = "";
        }

        setText("applicationModalTitle", "Add New Application");
        setText("saveApplicationButton", "Save Application");

        if (applicationModal) {
            applicationModal.show();
        }
    });
}

// ==========================================
// RESET FORM
// ==========================================

function resetApplicationForm() {
    const form = document.getElementById("applicationForm");

    if (form) form.reset();

    const idInput = document.getElementById("applicationId");
    const statusInput = document.getElementById("applicationStatus");
    const notesInput = document.getElementById("applicationNotes");
    const jobSelect = document.getElementById("applicationJobId");
    const dateInput = document.getElementById("appliedDate");

    if (idInput) idInput.value = "";
    if (statusInput) statusInput.value = "Saved";
    if (notesInput) notesInput.value = "";

    if (jobSelect) jobSelect.disabled = false;
    if (dateInput) {
        dateInput.disabled = true;
        dateInput.value = "";
    }
}

// ==========================================
// ADD OR UPDATE APPLICATION
// ==========================================

function setupApplicationForm() {
    const form = document.getElementById("applicationForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const applicationId =
            document.getElementById("applicationId").value;

        const status =
            document.getElementById("applicationStatus").value;

        const notes =
            document.getElementById("applicationNotes").value;

        if (!VALID_STATUSES.includes(status)) {
            showMessage("Please select a valid status.", "danger");
            return;
        }

        const saveButton =
            document.getElementById("saveApplicationButton");

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            let result;

            if (applicationId) {
                const updateData = {
                    status: status,
                    notes: notes
                };

                const appliedDate =
                    document.getElementById("appliedDate").value;

                if (appliedDate) {
                    updateData.applied_date = appliedDate;
                }

                result = await apiRequest(
                    `${APPLICATIONS_API}${applicationId}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(updateData)
                    }
                );

            } else {
                const jobId =
                    document.getElementById("applicationJobId").value;

                if (!jobId) {
                    showMessage("Please select a job first.", "danger");
                    return;
                }

                const applicationData = {
                    job_id: Number(jobId),
                    status: status,
                    notes: notes
                };

                result = await apiRequest(APPLICATIONS_API, {
                    method: "POST",
                    body: JSON.stringify(applicationData)
                });
            }

            if (applicationModal) {
                applicationModal.hide();
            }

            resetApplicationForm();

            showMessage(
                result.message || "Application saved successfully.",
                "success"
            );

            await loadApplications();

        } catch (error) {
            showMessage(error.message, "danger");

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Application";
        }
    });
}

// ==========================================
// EDIT APPLICATION
// ==========================================

function editApplication(applicationId) {
    const app = applications.find(
        item => Number(item.application_id) === applicationId
    );

    if (!app) {
        showMessage("Application not found.", "danger");
        return;
    }

    resetApplicationForm();

    document.getElementById("applicationId").value =
        app.application_id;

    document.getElementById("applicationStatus").value =
        app.status || "Saved";

    document.getElementById("applicationNotes").value =
        app.notes || "";

    const jobSelect = document.getElementById("applicationJobId");

    jobSelect.innerHTML = `
        <option value="${Number(app.job_id)}">
            ${escapeHTML(app.job_title)} - ${escapeHTML(app.company_name)}
        </option>
    `;

    jobSelect.value = String(app.job_id);
    jobSelect.disabled = true;

    const dateInput = document.getElementById("appliedDate");

    dateInput.disabled = false;
    dateInput.value = toDateInputValue(app.applied_date);

    setText("applicationModalTitle", "Update Application");
    setText("saveApplicationButton", "Update Application");

    if (applicationModal) {
        applicationModal.show();
    }
}

// ==========================================
// DELETE APPLICATION
// ==========================================

async function deleteApplication(applicationId) {
    const confirmed = confirm(
        "Are you sure you want to delete this application?"
    );

    if (!confirmed) return;

    try {
        const result = await apiRequest(
            `${APPLICATIONS_API}${applicationId}`,
            { method: "DELETE" }
        );

        showMessage(
            result.message || "Application deleted successfully.",
            "success"
        );

        await loadApplications();

    } catch (error) {
        showMessage(error.message, "danger");
    }
}

// ==========================================
// SEARCH APPLICATIONS
// ==========================================

function setupSearch() {
    const searchInput =
        document.getElementById("applicationSearch");

    if (!searchInput) return;

    searchInput.addEventListener("input", applyFilters);
}

// ==========================================
// STATUS FILTER
// ==========================================

function setupStatusFilter() {
    const statusFilter =
        document.getElementById("statusFilter");

    if (!statusFilter) return;

    statusFilter.addEventListener("change", applyFilters);
}

// ==========================================
// APPLY SEARCH AND FILTER
// ==========================================

function applyFilters() {
    const query = (
        document.getElementById("applicationSearch")?.value || ""
    ).toLowerCase().trim();

    const selectedStatus =
        document.getElementById("statusFilter")?.value || "";

    const filtered = applications.filter(app => {
        const matchesSearch =
            (app.job_title || "").toLowerCase().includes(query) ||
            (app.company_name || "").toLowerCase().includes(query);

        const matchesStatus =
            !selectedStatus || app.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    displayApplications(filtered);
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

    button.addEventListener("click", async event => {
        event.preventDefault();

        try {
            await apiRequest(AUTH_API, { method: "POST" });

            window.location.replace("login.html");

        } catch (error) {
            showMessage(error.message, "danger");
        }
    });
}

// ==========================================
// MESSAGE DISPLAY
// ==========================================

function showMessage(message, type = "success") {
    const element =
        document.getElementById("applicationMessage");

    if (!element) return;

    element.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show"
             role="alert">
            ${escapeHTML(message)}
            <button type="button"
                    class="btn-close"
                    data-bs-dismiss="alert"
                    aria-label="Close">
            </button>
        </div>
    `;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ==========================================
// DATE HELPERS
// ==========================================

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return escapeHTML(String(value));
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function toDateInputValue(value) {
    if (!value) return "";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ==========================================
// GENERAL HELPERS
// ==========================================

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        if ("value" in element && element.tagName === "BUTTON") {
            element.textContent = value;
        } else {
            element.textContent = value;
        }
    }
}

function escapeHTML(value) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(value).replace(/[&<>"']/g, character => {
        return entities[character];
    });
}
