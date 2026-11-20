
// ==========================================
// PULMOVISION AI - DASHBOARD SCRIPT
// ==========================================

const pages = [
    "dashboard",
    "upload",
    "preprocessing",
    "prediction",
    "gradcam",
    "history",
    "performance",
    "about"
];

const $ = id => document.getElementById(id);

// Redirect users to login if they try to open dashboard
// without an active login session.
if (
    document.getElementById("page-dashboard") &&
    !sessionStorage.getItem("pulmovisionUser")
) {
    window.location.replace("login.html");
}

// Run dashboard code only on the dashboard page.
if (document.getElementById("page-dashboard")) {

    const titles = {
        dashboard: "Dashboard",
        upload: "Upload X-ray",
        preprocessing: "Image preprocessing",
        prediction: "Disease prediction",
        gradcam: "Grad-CAM explainability",
        history: "Prediction history",
        performance: "Model performance",
        about: "About project"
    };

    let selectedFile = null;
    let selectedImageURL = null;

    let historyRecords = [
        {
            id: "XR-1024",
            prediction: "Normal",
            confidence: "96.2%",
            date: "20 Nov 2026",
            type: "Sample"
        },
        {
            id: "XR-1023",
            prediction: "Lung Opacity",
            confidence: "91.7%",
            date: "19 Nov 2026",
            type: "Sample"
        },
        {
            id: "XR-1022",
            prediction: "Viral Pneumonia",
            confidence: "88.4%",
            date: "18 Nov 2026",
            type: "Sample"
        },
        {
            id: "XR-1021",
            prediction: "COVID-19",
            confidence: "93.1%",
            date: "17 Nov 2026",
            type: "Sample"
        }
    ];

    // ==========================================
    // PAGE NAVIGATION
    // ==========================================

    function showPage(name) {
        if (!pages.includes(name)) return;

        document.querySelectorAll(".page").forEach(p =>
            p.classList.remove("active")
        );

        $("page-" + name).classList.add("active");

        document.querySelectorAll(".nav-link").forEach(b =>
            b.classList.toggle("active", b.dataset.page === name)
        );

        $("pageCrumb").textContent = titles[name];
        $("sidebar").classList.remove("open");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        if (name === "history") {
            renderHistory();
        }
    }

    document.querySelectorAll("[data-page]").forEach(b =>
        b.addEventListener("click", () => showPage(b.dataset.page))
    );

    document.querySelectorAll("[data-go]").forEach(b =>
        b.addEventListener("click", () => showPage(b.dataset.go))
    );

    $("mobileMenu").addEventListener("click", () =>
        $("sidebar").classList.toggle("open")
    );

    $("todayDate").textContent = new Date().toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

    // ==========================================
    // IMAGE UPLOAD AND PREPROCESSING
    // ==========================================

    function setImage(containerId, src, alt = "Uploaded X-ray") {
        const box = $(containerId);
        box.innerHTML = "";

        const img = document.createElement("img");
        img.src = src;
        img.alt = alt;

        box.appendChild(img);
    }

    function loadFile(file) {
        if (!file) return;

        if (!["image/jpeg", "image/png"].includes(file.type)) {
            alert("Please select a JPG or PNG image.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert("File size must be below 10 MB.");
            return;
        }

        selectedFile = file;

        if (selectedImageURL) {
            URL.revokeObjectURL(selectedImageURL);
        }

        selectedImageURL = URL.createObjectURL(file);

        $("fileInfo").textContent =
            `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;

        setImage("uploadPreview", selectedImageURL);

        $("previewBtn").disabled = false;
    }

    $("xrayInput").addEventListener("change", e =>
        loadFile(e.target.files[0])
    );

    $("dropzone").addEventListener("dragover", e => {
        e.preventDefault();
        $("dropzone").classList.add("dragging");
    });

    $("dropzone").addEventListener("dragleave", () =>
        $("dropzone").classList.remove("dragging")
    );

    $("dropzone").addEventListener("drop", e => {
        e.preventDefault();
        $("dropzone").classList.remove("dragging");
        loadFile(e.dataTransfer.files[0]);
    });

    $("clearUpload").addEventListener("click", () => {
        selectedFile = null;

        if (selectedImageURL) {
            URL.revokeObjectURL(selectedImageURL);
        }

        selectedImageURL = null;

        $("xrayInput").value = "";
        $("fileInfo").textContent = "No image selected";
        $("previewBtn").disabled = true;

        $("uploadPreview").innerHTML =
            '<div class="placeholder-lungs">🫁</div><span>Waiting for an image</span>';
    });

    $("previewBtn").addEventListener("click", () => {
        if (!selectedFile) return;

        setImage("originalImage", selectedImageURL);
        setImage("predictionImage", selectedImageURL);
        setImage("gradOriginal", selectedImageURL);

        const img = new Image();

        img.onload = () => {
            $("originalMeta").textContent =
                `Original dimensions: ${img.naturalWidth} × ${img.naturalHeight} pixels`;

            const canvas = document.createElement("canvas");

            canvas.width = 224;
            canvas.height = 224;

            canvas.getContext("2d").drawImage(
                img,
                0,
                0,
                224,
                224
            );

            setImage(
                "resizedImage",
                canvas.toDataURL("image/png"),
                "224 by 224 resized preview"
            );
        };

        img.src = selectedImageURL;

        showPage("preprocessing");
    });

    // ==========================================
    // PREDICTION HISTORY
    // ==========================================

    function renderHistory() {
        const rows = historyRecords.map(r =>
            `<tr>
                <td><b>${r.id}</b></td>
                <td>${r.prediction}</td>
                <td>${r.confidence}</td>
                <td>${r.date}</td>
                <td><span class="table-tag">${r.type}</span></td>
            </tr>`
        ).join("");

        $("historyRows").innerHTML = rows;

        $("recentRows").innerHTML = historyRecords
            .slice(0, 3)
            .map(r =>
                `<tr>
                    <td><b>${r.id}</b></td>
                    <td>${r.prediction}</td>
                    <td>${r.confidence}</td>
                    <td>${r.date}</td>
                    <td><span class="table-tag">Sample</span></td>
                </tr>`
            )
            .join("");
    }

    renderHistory();

    // ==========================================
    // DEMO PREDICTION
    // ==========================================

    $("demoPrediction").addEventListener("click", () => {

        const classes = [
            "COVID-19",
            "Lung Opacity",
            "Normal",
            "Viral Pneumonia"
        ];

        const values = [0.12, 0.18, 0.61, 0.09];

        $("resultTitle").textContent = "Normal · Sample only";

        $("probabilityBars").innerHTML = classes.map((c, i) =>
            `<div class="prob-row">
                <div class="prob-label">
                    <span>${c}</span>
                    <b>${(values[i] * 100).toFixed(1)}%</b>
                </div>
                <div class="prob-track">
                    <div class="prob-fill" style="width:${values[i] * 100}%"></div>
                </div>
            </div>`
        ).join("");

        // Save latest demo prediction for the Ask AI page.
        localStorage.setItem(
            "pulmovisionLatestPrediction",
            JSON.stringify({
                className: "Normal",
                confidence: "61.0%"
            })
        );

        $("resultTitle").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    // ==========================================
    // EXPORT HISTORY
    // ==========================================

    $("exportHistory").addEventListener("click", () => {

        const header = [
            "Image ID",
            "Prediction",
            "Confidence",
            "Date",
            "Type"
        ];

        const lines = historyRecords.map(r =>
            [
                r.id,
                r.prediction,
                r.confidence,
                r.date,
                r.type
            ].map(v =>
                `"${String(v).replaceAll('"', '""')}"`
            ).join(",")
        );

        const blob = new Blob(
            [[header.join(","), ...lines].join("\n")],
            { type: "text/csv" }
        );

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "pulmovision-history.csv";
        a.click();

        URL.revokeObjectURL(url);
    });

    // ==========================================
    // DASHBOARD CHARTS
    // ==========================================

    function initCharts() {
        if (!window.Chart) return;

        Chart.defaults.font.family = "'DM Sans', sans-serif";
        Chart.defaults.color = "#8092a2";

        const overview = document.getElementById("overviewChart");

        new Chart(overview, {
            type: "line",
            data: {
                labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
                datasets: [{
                    label: "Analyses",
                    data: [12, 19, 15, 28, 24, 36],
                    borderColor: "#209eaa",
                    backgroundColor: "rgba(32,158,170,.10)",
                    fill: true,
                    tension: .38,
                    pointRadius: 3,
                    pointBackgroundColor: "#209eaa"
                }]
            },
            options: {
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "#edf2f5" },
                        ticks: { font: { size: 9 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 9 } }
                    }
                }
            }
        });

        const cls = document.getElementById("classChart");

        new Chart(cls, {
            type: "doughnut",
            data: {
                labels: [
                    "COVID-19",
                    "Lung opacity",
                    "Normal",
                    "Viral pneumonia"
                ],
                datasets: [{
                    data: [24, 31, 29, 16],
                    backgroundColor: [
                        "#3286b4",
                        "#28a89c",
                        "#8976c9",
                        "#e5a15e"
                    ],
                    borderWidth: 3,
                    borderColor: "#fff"
                }]
            },
            options: {
                cutout: "68%",
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // ==========================================
    // USER PROFILE DROPDOWN
    // ==========================================

    const profileBtn = document.getElementById("userProfileBtn");
    const profileDropdown = document.getElementById("profileDropdown");

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileInitials = document.getElementById("profileInitials");

    const currentUser = JSON.parse(
        sessionStorage.getItem("pulmovisionUser") || "null"
    );

    if (currentUser) {

        const userName = currentUser.name || "User";
        const userEmail = currentUser.email || "";

        const initials = userName
            .trim()
            .split(/\s+/)
            .map(word => word.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();

        if (profileName) profileName.textContent = userName;
        if (profileEmail) profileEmail.textContent = userEmail;
        if (profileBtn) profileBtn.textContent = initials;
        if (profileInitials) profileInitials.textContent = initials;
    }

    // Open and close profile dropdown.
    if (profileBtn && profileDropdown) {

        profileBtn.addEventListener("click", function (event) {

            event.stopPropagation();

            const isOpen = profileDropdown.classList.toggle("show");

            profileBtn.setAttribute("aria-expanded", isOpen);
        });
    }

    // Close dropdown when clicking outside.
    document.addEventListener("click", function (event) {

        if (
            profileDropdown &&
            profileBtn &&
            !profileDropdown.contains(event.target) &&
            !profileBtn.contains(event.target)
        ) {
            profileDropdown.classList.remove("show");
            profileBtn.setAttribute("aria-expanded", "false");
        }
    });

    // Close dropdown using Escape key.
    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape" && profileDropdown) {

            profileDropdown.classList.remove("show");

            if (profileBtn) {
                profileBtn.setAttribute("aria-expanded", "false");
            }
        }
    });

    // Open the separate profile page.
    document.getElementById("profileDetailsBtn")?.addEventListener(
        "click",
        () => {
            window.location.href = "profile.html";
        }
    );

    // ==========================================
    // LOGOUT
    // ==========================================

    document.getElementById("logoutBtn")?.addEventListener(
        "click",
        function () {

            const confirmLogout = confirm(
                "Are you sure you want to logout?"
            );

            if (confirmLogout) {
                sessionStorage.removeItem("pulmovisionUser");
                window.location.replace("index.html");
            }
        }
    );

    // Initialize dashboard charts once.
    initCharts();
}


// ==========================================
// PULMOVISION AI - LOGIN AND REGISTRATION
// ==========================================


// ==========================================
// REGISTER PAGE
// ==========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const name = document.getElementById("registerName").value.trim();

        const email = document.getElementById("registerEmail")
            .value.trim().toLowerCase();

        const mobile = document.getElementById("registerMobile").value.trim();

        const dob = document.getElementById("registerDob").value;

        const gender = document.getElementById("registerGender").value;

        const password = document.getElementById("registerPassword").value;

        const confirmPassword = document.getElementById("confirmPassword").value;

        const message = document.getElementById("registerMessage");

        if (!/^[0-9]{10}$/.test(mobile)) {
            message.textContent = "Enter a valid 10-digit mobile number.";
            return;
        }

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match.";
            return;
        }

        const users = JSON.parse(
            localStorage.getItem("pulmovisionUsers") || "[]"
        );

        const existingUser = users.find(user =>
            user.email === email || user.mobile === mobile
        );

        if (existingUser) {
            message.textContent =
                "Email or mobile number already registered.";
            return;
        }

        const newUser = {
            name,
            email,
            mobile,
            dob,
            gender,
            password
        };

        users.push(newUser);

        localStorage.setItem(
            "pulmovisionUsers",
            JSON.stringify(users)
        );

        message.style.color = "#39d98a";
        message.textContent = "Registration successful!";

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    });
}


// ==========================================
// LOGIN PAGE
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const email = document.getElementById("loginEmail")
            .value.trim().toLowerCase();

        const password = document.getElementById("loginPassword").value;

        const message = document.getElementById("loginMessage");

        // Get registered users.
        const users = JSON.parse(
            localStorage.getItem("pulmovisionUsers") || "[]"
        );

        // Find matching user.
        const matchedUser = users.find(user =>
            user.email === email && user.password === password
        );

        if (!matchedUser) {
            message.style.color = "#ff7777";
            message.textContent = "Invalid email or password.";
            return;
        }

        // Save user details for profile page and dashboard.
        sessionStorage.setItem(
            "pulmovisionUser",
            JSON.stringify({
                name: matchedUser.name,
                email: matchedUser.email,
                mobile: matchedUser.mobile,
                dob: matchedUser.dob,
                gender: matchedUser.gender
            })
        );

        message.style.color = "#55e3a5";
        message.textContent = "Login successful!";

        setTimeout(function () {
            window.location.href = "dashboard.html";
        }, 800);
    });
}
