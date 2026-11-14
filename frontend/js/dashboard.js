// ==========================================
// JOBPILOT AI - DASHBOARD JAVASCRIPT
// Connects to Flask APIs
// ==========================================

const API_BASE_URL = "http://127.0.0.1:5000/api";

// ==========================================
// API REQUEST HELPER
// ==========================================

async function apiRequest(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Accept": "application/json"
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Unable to retrieve data.");
    }

    return data;
}

// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    setupSidebar();
    setupLogout();
    await loadDashboard();
});

// ==========================================
// SIDEBAR
// ==========================================

function setupSidebar() {
    const toggleButton = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");

    if (toggleButton && sidebar) {
        toggleButton.addEventListener("click", () => {
            sidebar.classList.toggle("show");
        });
    }
}

// ==========================================
// LOGOUT
// ==========================================

function setupLogout() {
    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", async (event) => {
        event.preventDefault();

        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );

            if (!response.ok) {
                throw new Error("Logout failed.");
            }

            window.location.replace("login.html");

        } catch (error) {
            alert(error.message || "Unable to logout. Please try again.");
        }
    });
}

// ==========================================
// LOAD DASHBOARD DATA
// ==========================================

async function loadDashboard() {
    try {
        const [jobsData, applicationsData] = await Promise.all([
            apiRequest("/jobs/"),
            apiRequest("/applications/")
        ]);

        const jobs = jobsData.jobs || [];
        const applications = applicationsData.applications || [];

        updateStatistics(jobs, applications);
        updateRecentApplications(applications);
        renderCharts(applications);

    } catch (error) {
        console.error("Dashboard loading error:", error);

        const table = document.getElementById("recentApplications");

        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger py-4">
                        Unable to load dashboard data.
                        Please sign in again or check your backend.
                    </td>
                </tr>
            `;
        }
    }
}

// ==========================================
// UPDATE STATISTICS
// ==========================================

function updateStatistics(jobs, applications) {
    const totalInterviews = applications.filter(
        app => app.status === "Interview"
    ).length;

    const totalSelected = applications.filter(
        app => app.status === "Selected"
    ).length;

    setText("totalJobs", jobs.length);
    setText("totalApplications", applications.length);
    setText("totalInterviews", totalInterviews);
    setText("totalSelected", totalSelected);
}

// ==========================================
// RECENT APPLICATIONS
// ==========================================

function updateRecentApplications(applications) {
    const table = document.getElementById("recentApplications");

    if (!table) return;

    if (!applications.length) {
        table.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <i class="bi bi-inbox"></i>
                        <h6>No applications yet</h6>
                        <p>Start tracking your job applications.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const recentApplications = [...applications]
        .sort((a, b) => {
            return new Date(b.applied_date || b.created_at || 0)
                - new Date(a.applied_date || a.created_at || 0);
        })
        .slice(0, 5);

    table.innerHTML = recentApplications.map(app => {
        const title = escapeHTML(
            app.job_title || app.title || "Job"
        );

        const company = escapeHTML(
            app.company_name || app.company || "Company"
        );

        const status = app.status || "Saved";
        const statusClass = getStatusClass(status);

        const appliedDate = app.applied_date
            ? formatDate(app.applied_date)
            : "Not available";

        return `
            <tr>
                <td class="fw-semibold">${title}</td>
                <td>${company}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${escapeHTML(status)}
                    </span>
                </td>
                <td>${appliedDate}</td>
            </tr>
        `;
    }).join("");
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
// APPLICATION CHARTS
// ==========================================

let applicationChartInstance = null;
let statusChartInstance = null;

function renderCharts(applications) {
    renderApplicationChart(applications);
    renderStatusChart(applications);
}

function renderApplicationChart(applications) {
    const canvas = document.getElementById("applicationChart");

    if (!canvas || typeof Chart === "undefined") return;

    if (applicationChartInstance) {
        applicationChartInstance.destroy();
    }

    const months = [];
    const counts = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date();

        date.setDate(1);
        date.setMonth(date.getMonth() - i);

        const monthName = date.toLocaleString("en-US", {
            month: "short"
        });

        const year = date.getFullYear();

        months.push(`${monthName} ${year}`);

        const count = applications.filter(app => {
            const appDate = new Date(
                app.applied_date || app.created_at
            );

            return (
                !isNaN(appDate.getTime()) &&
                appDate.getMonth() === date.getMonth() &&
                appDate.getFullYear() === year
            );
        }).length;

        counts.push(count);
    }

    applicationChartInstance = new Chart(canvas, {
        type: "line",

        data: {
            labels: months,

            datasets: [{
                label: "Applications",
                data: counts,
                borderColor: "#4f46e5",
                backgroundColor: "rgba(79, 70, 229, 0.10)",
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// ==========================================
// STATUS DOUGHNUT CHART
// ==========================================

function renderStatusChart(applications) {
    const canvas = document.getElementById("statusChart");

    if (!canvas || typeof Chart === "undefined") return;

    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    const statuses = [
        "Saved",
        "Applied",
        "Interview",
        "Selected",
        "Rejected"
    ];

    const counts = statuses.map(status =>
        applications.filter(app => app.status === status).length
    );

    statusChartInstance = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: statuses,

            datasets: [{
                data: counts,
                backgroundColor: [
                    "#94a3b8",
                    "#3b82f6",
                    "#f59e0b",
                    "#22c55e",
                    "#ef4444"
                ],
                borderWidth: 0
            }]
        },

        options: {
            responsive: true,
            cutout: "68%",

            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function setText(elementId, value) {
    const element = document.getElementById(elementId);

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

function formatDate(dateValue) {
    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}