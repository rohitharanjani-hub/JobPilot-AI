
// ==================================================
// JOBPILOT AI - MAIN JAVASCRIPT
// Authentication + Common Frontend Functions
// Flask API + MySQL Integration
// ==================================================

const API_BASE_URL = "http://127.0.0.1:5000/api";

// ==================================================
// INITIALIZATION
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
    setupPasswordToggle();
    setupLogin();
    setupRegistration();
    setupLogout();
});

// ==================================================
// API REQUEST HELPER
// ==================================================

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

    let result = {};

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(
            result.message || "Something went wrong. Please try again."
        );
    }

    return result;
}

// ==================================================
// PASSWORD SHOW / HIDE
// ==================================================

function setupPasswordToggle() {
    const toggleButton = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");

    if (!toggleButton || !passwordInput) return;

    toggleButton.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        toggleButton.innerHTML = isPassword
            ? '<i class="bi bi-eye-slash"></i>'
            : '<i class="bi bi-eye"></i>';

        toggleButton.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

// ==================================================
// LOGIN
// ==================================================

function setupLogin() {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const loginButton = document.getElementById("loginButton");

        if (!email || !password) {
            showAuthMessage(
                "Please enter your email and password.",
                "danger"
            );
            return;
        }

        loginButton.disabled = true;
        loginButton.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

        try {
            const result = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            showAuthMessage(
                result.message || "Login successful!",
                "success"
            );

            window.location.href = "dashboard.html";

        } catch (error) {
            showAuthMessage(error.message, "danger");

        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML =
                '<i class="bi bi-box-arrow-in-right me-2"></i> Sign In';
        }
    });
}

// ==================================================
// REGISTRATION
// ==================================================

function setupRegistration() {
    const registerForm = document.getElementById("registerForm");

    if (!registerForm) return;

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nameElement = document.getElementById("name");
        const emailElement = document.getElementById("email");
        const passwordElement = document.getElementById("password");

        const name = nameElement?.value.trim() || "";
        const email = emailElement?.value.trim() || "";
        const password = passwordElement?.value || "";

        const registerButton = document.getElementById("registerButton");

        if (!name || !email || !password) {
            showAuthMessage(
                "Please fill in all required fields.",
                "danger"
            );
            return;
        }

        registerButton.disabled = true;
        registerButton.textContent = "Creating account...";

        try {
            const result = await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            showAuthMessage(
                result.message || "Registration successful!",
                "success"
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);

        } catch (error) {
            showAuthMessage(error.message, "danger");

        } finally {
            registerButton.disabled = false;
            registerButton.textContent = "Create Account";
        }
    });
}

// ==================================================
// LOGOUT
// ==================================================

function setupLogout() {
    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", async (event) => {
        event.preventDefault();

        logoutButton.disabled = true;

        try {
            await apiRequest("/auth/logout", {
                method: "POST"
            });

            window.location.replace("login.html");

        } catch (error) {
            showAuthMessage(error.message, "danger");
            logoutButton.disabled = false;
        }
    });
}

// ==================================================
// MESSAGE DISPLAY
// ==================================================

function showAuthMessage(message, type = "success") {
    const messageElement = document.getElementById("message");

    if (!messageElement) {
        console.log(message);
        return;
    }

    messageElement.innerHTML = `
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
}

// ==================================================
// HTML ESCAPE
// ==================================================

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

// ==================================================
// DATE FORMATTER
// ==================================================

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(String(value));
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// ==================================================
// COMMON TEXT HELPER
// ==================================================

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// ==================================================
// END OF MAIN JAVASCRIPT
// ==================================================
