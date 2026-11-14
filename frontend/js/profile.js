
 // ==========================================
// JOBPILOT AI - USER PROFILE
// Flask API + MySQL Integration
// ==========================================

const PROFILE_API = "http://127.0.0.1:5000/api/profile/";
const AUTH_LOGOUT_API = "http://127.0.0.1:5000/api/auth/logout";

let originalProfileName = "";

document.addEventListener("DOMContentLoaded", () => {
    initializeProfilePage();
});


// ==========================================
// INITIALIZE PROFILE PAGE
// ==========================================

async function initializeProfilePage() {
    setupProfileEvents();
    await loadProfile();
}


// ==========================================
// EVENT LISTENERS
// ==========================================

function setupProfileEvents() {
    const profileForm = document.getElementById("profileForm");
    const resetButton = document.getElementById("resetProfileButton");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const logoutButton = document.getElementById("logoutButton");

    if (profileForm) {
        profileForm.addEventListener("submit", updateProfile);
    }

    if (resetButton) {
        resetButton.addEventListener("click", resetProfile);
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            document.getElementById("sidebar")?.classList.toggle("active");
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
    }
}


// ==========================================
// LOAD PROFILE FROM FLASK + MYSQL
// ==========================================

async function loadProfile() {
    showProfileMessage("Loading your profile...", "info");

    try {
        const response = await fetch(PROFILE_API, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Please login to view your profile.");
            }

            throw new Error(data.message || "Unable to load profile.");
        }

        const profile = data.profile;

        if (!profile) {
            throw new Error("Profile information was not returned.");
        }

        originalProfileName = profile.name || "";

        const nameInput = document.getElementById("profileName");
        const emailInput = document.getElementById("profileEmail");
        const createdInput = document.getElementById("profileCreatedAt");

        const displayName = document.getElementById("profileDisplayName");
        const displayEmail = document.getElementById("profileDisplayEmail");

        if (nameInput) nameInput.value = profile.name || "";
        if (emailInput) emailInput.value = profile.email || "";

        if (createdInput) {
            createdInput.value = formatProfileDate(profile.created_at);
        }

        if (displayName) {
            displayName.textContent = profile.name || "JobPilot User";
        }

        if (displayEmail) {
            displayEmail.textContent = profile.email || "";
        }

        showProfileMessage("Profile loaded successfully.", "success");

    } catch (error) {
        console.error("Profile loading error:", error);

        showProfileMessage(
            error.message || "Failed to load your profile.",
            "error"
        );
    }
}


// ==========================================
// UPDATE PROFILE
// ==========================================

async function updateProfile(event) {
    event.preventDefault();

    const nameInput = document.getElementById("profileName");
    const saveButton = document.getElementById("saveProfileButton");

    const name = nameInput?.value.trim();

    if (!name) {
        showProfileMessage("Please enter your name.", "warning");
        nameInput?.focus();
        return;
    }

    if (name.length > 100) {
        showProfileMessage(
            "Name cannot contain more than 100 characters.",
            "warning"
        );
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML =
            '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    }

    try {
        const response = await fetch(PROFILE_API, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name: name })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to update profile.");
        }

        originalProfileName = data.name || name;

        const displayName = document.getElementById("profileDisplayName");

        if (displayName) {
            displayName.textContent = originalProfileName;
        }

        nameInput.value = originalProfileName;

        showProfileMessage(
            data.message || "Profile updated successfully!",
            "success"
        );

    } catch (error) {
        console.error("Profile update error:", error);

        showProfileMessage(
            error.message || "Unable to update profile.",
            "error"
        );

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML =
                '<i class="fas fa-save me-2"></i>Save Changes';
        }
    }
}


// ==========================================
// RESET PROFILE FORM
// ==========================================

function resetProfile() {
    const nameInput = document.getElementById("profileName");

    if (nameInput) {
        nameInput.value = originalProfileName;
    }

    showProfileMessage("Profile form reset.", "info");
}


// ==========================================
// LOGOUT
// ==========================================

async function logoutUser(event) {
    event.preventDefault();

    try {
        const response = await fetch(AUTH_LOGOUT_API, {
            method: "POST",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Logout request failed.");
        }

        window.location.href = "login.html";

    } catch (error) {
        console.error("Logout error:", error);

        showProfileMessage(
            "Unable to logout. Please try again.",
            "error"
        );
    }
}


// ==========================================
// PROFILE MESSAGE
// ==========================================

function showProfileMessage(message, type = "info") {
    const messageElement = document.getElementById("profileMessage");

    if (!messageElement) return;

    const alertClasses = {
        success: "alert-success",
        error: "alert-danger",
        warning: "alert-warning",
        info: "alert-info"
    };

    messageElement.textContent = message;
    messageElement.className =
        `alert ${alertClasses[type] || "alert-info"}`;

    messageElement.hidden = false;
}


// ==========================================
// DATE FORMATTING
// ==========================================

function formatProfileDate(dateValue) {
    if (!dateValue) return "Not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}
