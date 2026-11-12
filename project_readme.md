# 🛡️ ExamPortal — AI-Proctored Online Examination System

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-face--api.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)

**ExamPortal** is a privacy-first, full-stack web application designed to conduct secure online examinations with real-time AI-powered proctoring. Built using Node.js, Express, MongoDB Atlas, Socket.IO, and `face-api.js` (TensorFlow.js), the platform performs all computer vision and facial landmark analysis **entirely on the client side**—ensuring zero video data ever leaves the student's browser while instantly alerting administrators to suspicious activity.

---

## ✨ Key Features

### 🤖 Client-Side AI Proctoring & Anti-Cheating
* **Privacy-First Architecture:** Runs `TinyFaceDetector` and `FaceLandmark68Net` directly in the browser; no video frames are recorded or uploaded to any server.
* **Face Presence & Multi-Face Detection:** Scans webcam frames every 2 seconds to detect missing faces ($4+$ seconds absence) or multiple individuals in frame.
* **Geometric Gaze Tracking:** Estimates head/gaze direction using the nose-to-eye ratio ($\text{noseRatio} = \frac{\text{noseX} - \text{leftX}}{\text{rightX} - \text{leftX}}$) to flag prolonged looking away from the screen.
* **Browser Lockdown Controls:** Enforces fullscreen mode (auto-submitting the exam on the 3rd exit), detects tab/window switching via the Page Visibility API, and disables right-click context menus and text selection.
* **Live Admin Alerts:** Broadcasts real-time proctoring alerts (`gazeAlert`) to the administrator's dashboard via Socket.IO when sustained looking away ($\ge 10\text{s}$) occurs.

### 🎓 Student Portal
* **Role-Based Authentication:** Dedicated student registration and login flow.
* **Timed MCQ Assessments:** One-question-at-a-time navigation with live countdown timers, auto-submission on timeout, and single-attempt enforcement.
* **Detailed Results & Wrong-Answer Review:** Instant score calculation, pass/fail status, chronological score progression line chart (Chart.js), and a side-by-side modal comparing selected answers against correct answers.
* **Support Queries & Live Chat:** Submit support tickets with status tracking (`Pending` / `Resolved` / `Rejected`) and chat live with administrators via a collapsible Socket.IO widget.

### 🛠️ Administrator Dashboard
* **Exam & Question Bank Management:** Create timed exams with custom passing thresholds, add 4-option MCQs, and delete exams with cascading question cleanup.
* **Visual Analytics:** Interactive Chart.js bar charts (average score percentage per exam) and doughnut charts (overall pass/fail ratio) alongside a complete student results table.
* **Real-Time Monitoring & Query Resolution:** Receive live AI violation alerts, reply to student queries, and communicate with test-takers in real time.
* **Glassmorphism UI with Theme Persistence:** Responsive Light and Dark themes powered by CSS custom properties and `localStorage`.

---

## 🏗️ System Architecture

ExamPortal follows a **Thin-Server / Fat-Client** event-driven architecture:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser)                   │
│  HTML5 / Glassmorphism CSS  │  Vanilla JS (ES6+) & Chart.js │
│  face-api.js (TensorFlow.js - Local Webcam Inference)       │
│  Socket.IO Client (Live Chat & Violation Broadcasts)        │
└──────────────┬──────────────────────────────┬───────────────┘
               │ REST API (JSON)              │ WebSockets
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server Layer (Node.js)                    │
│     Express.js REST API     │       Socket.IO Server        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data Layer (MongoDB Atlas)                  │
│   Collections: Users │ Exams │ Questions │ Results │ Queries│
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js (v18+), Express.js (`^5.2.1`), `cors`, `body-parser`, `dotenv` |
| **Database** | MongoDB Atlas (Cloud), Mongoose ODM (`^9.3.2`) |
| **Real-Time Engine** | Socket.IO (`^4.8.3`) |
| **AI / Computer Vision** | `face-api.js` (TensorFlow.js) — `TinyFaceDetector` & `FaceLandmark68Net` |
| **Frontend & Visualization** | HTML5, CSS3 (Glassmorphism + Dark/Light Themes), Vanilla JavaScript (ES6+), Chart.js |

---

## 📂 Project Structure

```text
FDS_OnlineExaminationSite/
└── Login/
    ├── public/                 # Static frontend assets, HTML pages, client JS, and face-api models
    │   ├── index.html          # Role-based Login page
    │   ├── register.html       # Student / Admin Registration page
    │   ├── user-dashboard.html # Student Dashboard, Analytics & Query Portal
    │   ├── admin-dashboard.html# Admin Exam Management, Analytics & Alerts
    │   ├── exam.html           # Fullscreen AI-Proctored Examination Interface
    │   └── models/             # Pre-trained TinyFaceDetector & FaceLandmark68 weights
    ├── server.js               # Express REST API & Socket.IO server entry point
    ├── package.json            # Project metadata and npm dependencies
    ├── .env                    # Environment variables (gitignored)
    └── .gitignore              # Specifies untracked files (node_modules, .env)
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher) and **npm**
* A **MongoDB Atlas** cluster (or local MongoDB instance)
* A modern browser (Chrome 90+, Edge 90+, Firefox 88+) with **webcam access**

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ParamvirSingh0608/FDS_OnlineExaminationSite.git
   cd FDS_OnlineExaminationSite/Login
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file inside the `Login/` directory and add your MongoDB Atlas connection string:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/exam_system?retryWrites=true&w=majority
   PORT=3000
   ```
   *(Make sure your IP address or `0.0.0.0/0` is whitelisted under **Network Access** in MongoDB Atlas).*

4. **Start the server:**
   ```bash
   node server.js
   ```

5. **Open the application:**
   Navigate to `http://localhost:3000` in your browser, allow webcam permissions when starting an exam, and log in as a **Student** or **Admin**.

---

## 🔌 API & WebSocket Reference

### REST API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register` | Register a new `student` or `admin` account |
| `POST` | `/api/login` | Authenticate user credentials and return role redirect |
| `GET` | `/api/user?email=` | Retrieve user profile details |
| `GET` / `POST` | `/api/exams` | Fetch all available exams or create a new exam |
| `DELETE` | `/api/exams/:id` | Delete an exam and cascade-delete its questions |
| `GET` / `POST` | `/api/questions` | Fetch questions for a specific exam or add a new MCQ |
| `GET` | `/api/admin/questions` | Fetch all questions across all exams |
| `GET` / `POST` | `/api/results` | Retrieve student/all results or submit a completed exam |
| `GET` / `POST` / `PUT` | `/api/queries` | Submit student support queries and post admin resolutions |

### Socket.IO Events
* `chatMessage`: Broadcasts real-time messages (`{ text, sender, role }`) between students and admins.
* `gazeAlert`: Emits live proctoring warnings (`{ studentEmail, examName, seconds }`) to admin dashboards when a student looks away for 10+ cumulative seconds.

---

## 🔮 Future Enhancements
* Implement password hashing (`bcrypt` / `Argon2`) and stateless `JWT` authentication with protected API middleware.
* Add iris-level gaze tracking and Web Audio API background noise detection.
* Support CSV/Excel bulk question uploads, question/option shuffling, and automated email notifications.
* Persist live chat history in MongoDB and add mobile-responsive layouts.

---

## 👥 Team & Academic Credits

Submitted in partial fulfillment for the degree of **Bachelor of Engineering in Computer Science Engineering** at **Chandigarh University** (April 2026):

* **Manish Sharma** (`24BCS11314`)
* **Paramvir Singh** (`24BCS11328`)
* **Yogesh** (`24BCS11325`)