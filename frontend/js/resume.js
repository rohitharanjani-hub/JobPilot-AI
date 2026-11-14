

const RESUME_API = "http://127.0.0.1:5000/api/resumes/";

document.addEventListener("DOMContentLoaded", () => {

    const resumeForm = document.getElementById("resumeForm");
    const resumeFile = document.getElementById("resumeFile");
    const resumeMessage = document.getElementById("resumeMessage");
    const resumeList = document.getElementById("resumeList");
    const resumeCount = document.getElementById("resumeCount");
    const uploadButton = document.getElementById("uploadResumeButton");

    if (!resumeForm || !resumeFile || !resumeList) {
        console.error("Resume page elements were not found.");
        return;
    }

    // Load uploaded resumes when page opens
    loadResumes();

    // Handle resume upload
    resumeForm.addEventListener("submit", uploadResume);


    // ==========================================
    // UPLOAD RESUME
    // ==========================================

    async function uploadResume(event) {

        event.preventDefault();

        const file = resumeFile.files[0];

        if (!file) {
            showMessage("Please select a PDF resume.", "warning");
            return;
        }

        // Validate PDF format
        if (
            file.type !== "application/pdf" &&
            !file.name.toLowerCase().endsWith(".pdf")
        ) {
            showMessage("Only PDF files are allowed.", "warning");
            return;
        }

        // Validate file size (10 MB)
        if (file.size > 10 * 1024 * 1024) {
            showMessage("File size must be less than 10 MB.", "warning");
            return;
        }

        const formData = new FormData();
        formData.append("resume", file);

        try {

            uploadButton.disabled = true;
            uploadButton.innerHTML =
                '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';

            const response = await fetch(RESUME_API, {
                method: "POST",
                credentials: "include",
                body: formData
            });

            const result = await response.json();

            if (response.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(
                    result.message || "Resume upload failed."
                );
            }

            showMessage(
                "Resume uploaded successfully! Resume ID: " +
                result.resume_id,
                "success"
            );

            resumeForm.reset();

            // Refresh resume history and count
            await loadResumes();

            // Show extracted text if returned by backend
            if (result.extracted_text) {
                showExtractedText(result.extracted_text);
            }

        } catch (error) {

            console.error("Resume upload error:", error);

            showMessage(error.message, "danger");

        } finally {

            uploadButton.disabled = false;
            uploadButton.innerHTML =
                '<i class="bi bi-upload"></i> Upload Resume';
        }
    }


    // ==========================================
    // LOAD RESUMES FROM FLASK API
    // ==========================================

    async function loadResumes() {

        resumeList.innerHTML =
            '<p class="text-muted">Loading resumes...</p>';

        try {

            const response = await fetch(RESUME_API, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            });

            const result = await response.json();

            if (response.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to load resumes."
                );
            }

            const resumes = result.resumes || [];

            // UPDATE UPLOADED RESUME COUNT
            if (resumeCount) {
                resumeCount.textContent = resumes.length;
            }

            // Display resume history
            displayResumes(resumes);

        } catch (error) {

            console.error("Resume loading error:", error);

            if (resumeCount) {
                resumeCount.textContent = "--";
            }

            resumeList.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHTML(error.message)}
                </div>
            `;
        }
    }


    // ==========================================
    // DISPLAY RESUME HISTORY
    // ==========================================

    function displayResumes(resumes) {

        if (resumes.length === 0) {

            resumeList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-file-earmark-pdf fs-1 text-muted"></i>

                    <h6 class="mt-3">No resumes uploaded yet</h6>

                    <p class="text-muted">
                        Upload your first PDF resume to get started.
                    </p>
                </div>
            `;

            return;
        }

        resumeList.innerHTML = resumes.map(resume => {

            const fileName = escapeHTML(resume.file_name || "Resume.pdf");
            const uploadedDate = formatDate(resume.uploaded_at);
            const extractedText = resume.extracted_text || "";

            return `
                <div class="resume-item border rounded-3 p-3 mb-3">

                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">

                        <div class="d-flex align-items-center gap-3">

                            <i class="bi bi-file-earmark-pdf fs-2 text-danger"></i>

                            <div>
                                <h6 class="mb-1 fw-bold">
                                    ${fileName}
                                </h6>

                                <small class="text-muted">
                                    Uploaded: ${uploadedDate}
                                </small>
                            </div>

                        </div>

                        <div class="d-flex gap-2">

                            <span class="badge bg-success">
                                Uploaded
                            </span>

                            ${
                                extractedText
                                ? `
                                    <button
                                        type="button"
                                        class="btn btn-sm btn-outline-primary preview-resume-btn">
                                        <i class="bi bi-eye"></i> Preview
                                    </button>
                                `
                                : ""
                            }

                        </div>

                    </div>

                    ${
                        extractedText
                        ? `
                            <div class="resume-extracted-data d-none">
                                ${escapeHTML(extractedText)}
                            </div>
                        `
                        : ""
                    }

                </div>
            `;

        }).join("");

        // Preview button events
        resumeList.querySelectorAll(".preview-resume-btn").forEach(button => {

            button.addEventListener("click", () => {

                const resumeCard = button.closest(".resume-item");

                const extractedElement =
                    resumeCard.querySelector(".resume-extracted-data");

                if (extractedElement) {
                    showExtractedText(extractedElement.textContent);
                }
            });

        });
    }


    // ==========================================
    // SHOW EXTRACTED RESUME TEXT
    // ==========================================

    function showExtractedText(text) {

        if (!text) {
            showMessage("No extracted resume text is available.", "warning");
            return;
        }

        let preview = document.getElementById("resumeTextPreview");

        if (!preview) {

            preview = document.createElement("div");

            preview.id = "resumeTextPreview";
            preview.className = "content-card mt-4";

            resumeList.parentElement.after(preview);
        }

        const previewText = text.substring(0, 1500);

        preview.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">

                <h5 class="fw-bold mb-0">
                    <i class="bi bi-file-text text-primary"></i>
                    Extracted Resume Text
                </h5>

                <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    id="closeResumePreview">
                    <i class="bi bi-x-lg"></i>
                </button>

            </div>

            <div class="bg-light rounded-3 p-3">
                <pre class="mb-0 text-wrap"
                     style="white-space: pre-wrap; overflow-wrap: anywhere;">${escapeHTML(previewText)}</pre>
            </div>

            ${
                text.length > 1500
                ? '<small class="text-muted mt-2 d-block">Showing the first 1500 characters.</small>'
                : ""
            }
        `;

        document.getElementById("closeResumePreview")
            .addEventListener("click", () => {
                preview.remove();
            });

        preview.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    // ==========================================
    // SHOW MESSAGE
    // ==========================================

    function showMessage(message, type = "info") {

        if (!resumeMessage) return;

        resumeMessage.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show"
                 role="alert">

                ${escapeHTML(message)}

                <button type="button"
                        class="btn-close"
                        data-bs-dismiss="alert">
                </button>

            </div>
        `;
    }


    // ==========================================
    // ESCAPE HTML
    // ==========================================

    function escapeHTML(value) {

        return String(value ?? "").replace(/[&<>"']/g, character => {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }


    // ==========================================
    // FORMAT DATE
    // ==========================================

    function formatDate(dateValue) {

        if (!dateValue) {
            return "Date unavailable";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

});
