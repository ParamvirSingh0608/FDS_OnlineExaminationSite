const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("status");
const violModal = document.getElementById("violationModal");
const reasonText = document.getElementById("reason");
const aiDot = document.getElementById("aiDot");

const studentEmail = localStorage.getItem('loggedInUserEmail');
const examSubject = new URLSearchParams(window.location.search).get('subject');
const socket = io();

let isReady = false;
let isPaused = false;
let violations = 0;
let consecutiveMisses = 0;
let aiInterval;
let timer;
let timeLeft = 300;
let current = 0;
let answers = {};
let questions = [];
let gazeAwaySeconds = 0;
let passingPercentage = 35; // default, overridden by exam settings

document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("visibilitychange", () => {
    if (document.hidden) triggerViolation("Tab switching detected!");
});

async function verifyEligibility() {
    if (!studentEmail || !examSubject) {
        window.location.href = 'index.html';
        return false;
    }
    
    try {
        const resCheck = await fetch(`http://localhost:3000/api/results?email=${studentEmail}`);
        const dataCheck = await resCheck.json();
        if (dataCheck.success && dataCheck.results.some(r => r.examName === examSubject)) {
            alert("You have already completed this exam.");
            window.location.href = 'user-dashboard.html';
            return false;
        }
        return true;
    } catch (e) {
        console.error(e);
        return true; 
    }
}

async function fetchQuestions() {
    try {
        const res = await fetch(`http://localhost:3000/api/questions?examName=${encodeURIComponent(examSubject)}`);
        const data = await res.json();
        if(data.success && data.questions && data.questions.length > 0) {
            questions = data.questions;
            timeLeft = data.duration * 60;
            passingPercentage = data.passingPercentage ?? 35;
            document.getElementById('title').innerText = examSubject;
        }
    } catch (e) {
        statusText.innerText = "Database connection failed.";
    }
}

async function initAI() {
    const MODEL_URL = "./models";

    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            isReady = true;
            if (questions.length > 0) {
                startBtn.disabled = false;
                startBtn.innerText = "Start Exam";
                statusText.innerText = "AI System Ready ✅";
            } else {
                statusText.innerText = "Waiting for questions...";
            }
        };
    } catch (err) {
        statusText.innerText = "Camera or AI models missing!";
    }
}

async function checkAI() {
    if (!isReady || isPaused || document.getElementById("result").style.display === "block") return;

    try {
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
            .withFaceLandmarks();

        let issue = "";

        if (detections.length > 1) {
            issue = "Multiple faces detected!";
        } 
        else if (detections.length === 0) {
            consecutiveMisses++;
            if (aiDot) aiDot.style.backgroundColor = "orange";
            
            if (consecutiveMisses >= 2) {
                issue = "Face not visible in camera!";
            }
        } 
        else {
            consecutiveMisses = 0;
            if (aiDot) aiDot.style.backgroundColor = "#10b981";

            const landmarks = detections[0].landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            const nose = landmarks.getNose()[3];

            const leftX = leftEye.reduce((sum, pt) => sum + pt.x, 0) / leftEye.length;
            const rightX = rightEye.reduce((sum, pt) => sum + pt.x, 0) / rightEye.length;

            const eyeDistance = rightX - leftX;
            const noseRatio = (nose.x - leftX) / eyeDistance;

            console.log(`Gaze Ratio: ${noseRatio.toFixed(2)}`);

            if (noseRatio < 0.35) {
                issue = "Looking too far RIGHT!";
            } 
            else if (noseRatio > 0.65) {
                issue = "Looking too far LEFT!";
            }
        }

        if (issue) {
            // Increment gaze-away counter (checkAI runs every 2s)
            gazeAwaySeconds += 2;

            if (gazeAwaySeconds >= 10) {
                // Emit alert to admin via Socket.io
                socket.emit('gazeAlert', { studentEmail, examName: examSubject, seconds: gazeAwaySeconds });
                gazeAwaySeconds = 0; // Reset after alerting so admin doesn't get spammed
            }

            triggerViolation(issue);
        } else {
            gazeAwaySeconds = 0; // Reset when student looks back
        }
    } catch (e) {
        console.error(e);
    }
}

function triggerViolation(msg) {
    reasonText.innerText = msg;
    violModal.style.display = "flex"; 
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
}

startBtn.onclick = () => {
    if (isReady) {
        document.documentElement.requestFullscreen().catch(() => {});
        startExam(); 
    }
};

document.getElementById("resumeBtn").onclick = () => {
    document.documentElement.requestFullscreen().catch(() => {});
    violModal.style.display = "none";
    isPaused = true;
    setTimeout(() => { isPaused = false; }, 5000);
};

document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        if (document.getElementById("result").style.display === "block") return;
        
        violations++;
        
        if (violations >= 3) {
            endExam();
        } else {
            if (!reasonText.innerText.includes("detected") && !reasonText.innerText.includes("visible") && !reasonText.innerText.includes("Looking")) {
                reasonText.innerText = "Manual exit detected. Stay in Fullscreen!";
            }
            violModal.style.display = "flex";
        }
    }
});

function startExam() {
    document.getElementById("startModal").style.display = "none";
    document.getElementById("exam").style.display = "block";
    
    video.style.position = "fixed";
    video.style.bottom = "20px";
    video.style.right = "20px";
    video.style.width = "180px";
    video.style.height = "auto";
    video.style.borderRadius = "12px";
    video.style.boxShadow = "0 8px 20px rgba(0,0,0,0.4)";
    video.style.zIndex = "500";
    document.body.appendChild(video);
    
    loadQ();
    aiInterval = setInterval(checkAI, 2000);
    startTimer();
}

function startTimer() {
    timer = setInterval(() => {
        if (timeLeft <= 0) { endExam(); return; }
        timeLeft--;
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        document.getElementById("time").innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

function loadQ() {
    const q = questions[current];
    if (!q) return;

    document.getElementById("qText").innerText = q.questionText;
    document.getElementById("qCount").innerText = `Question ${current + 1} of ${questions.length}`;

    const optDiv = document.getElementById("options");
    optDiv.innerHTML = "";

    ["A","B","C","D"].forEach(k => {
        const d = document.createElement("div");
        d.className = "option";
        if (answers[current] === k) d.classList.add("selected");
        d.innerText = `${k}. ${q["option"+k]}`;
        d.onclick = () => {
            answers[current] = k;
            loadQ();
        };
        optDiv.appendChild(d);
    });

    document.getElementById("prev").style.visibility = current === 0 ? "hidden" : "visible";
    const isLast = current === questions.length - 1;
    document.getElementById("next").style.display = isLast ? "none" : "inline-block";
    document.getElementById("submit").style.display = isLast ? "inline-block" : "none";
}

document.getElementById("next").onclick = () => { if (current < questions.length -1) { current++; loadQ(); } };
document.getElementById("prev").onclick = () => { if (current > 0) { current--; loadQ(); } };
document.getElementById("submit").onclick = endExam;

async function endExam() {
    clearInterval(timer);
    clearInterval(aiInterval);
    
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
    }
    video.style.display = "none";
    
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
    
    let finalScore = 0;
    const wrongAnswers = [];
    questions.forEach((q, i) => {
        if (answers[i] === q.correctAnswer) {
            finalScore++;
        } else {
            wrongAnswers.push({
                questionText: q.questionText,
                chosenAnswer: answers[i] || null,
                correctAnswer: q.correctAnswer,
                optionA: q.optionA, optionB: q.optionB,
                optionC: q.optionC, optionD: q.optionD
            });
        }
    });

    const percentage = Math.round((finalScore / questions.length) * 100);
    const passed = percentage >= passingPercentage;

    document.getElementById("exam").style.display = "none";
    document.getElementById("result").style.display = "block";
    
    document.getElementById("result").innerHTML = `
        <div class="card" style="max-width:700px; margin:40px auto; text-align:center;">
            <div style="font-size:4rem; margin-bottom:10px;">${passed ? '🎉' : '📝'}</div>
            <h1 style="font-size:2.5rem; color:${passed ? '#10b981' : '#f59e0b'}; margin-bottom:8px;">Exam Submitted!</h1>
            <div style="display:flex; justify-content:center; gap:30px; margin:20px 0; flex-wrap:wrap;">
                <div class="card" style="padding:20px 30px; min-width:130px;">
                    <div style="font-size:2rem; font-weight:800; color:var(--primary);">${finalScore}/${questions.length}</div>
                    <div style="font-size:0.85rem; color:#888; margin-top:4px;">Score</div>
                </div>
                <div class="card" style="padding:20px 30px; min-width:130px;">
                    <div style="font-size:2rem; font-weight:800; color:${passed ? '#10b981' : '#ff4d4d'};">${percentage}%</div>
                    <div style="font-size:0.85rem; color:#888; margin-top:4px;">${passed ? 'Passed ✅' : 'Failed ❌'}</div>
                </div>
                <div class="card" style="padding:20px 30px; min-width:130px;">
                    <div style="font-size:2rem; font-weight:800; color:#f59e0b;">${violations}</div>
                    <div style="font-size:0.85rem; color:#888; margin-top:4px;">Violations</div>
                </div>
            </div>
            <div id="wrongAnswersSection" style="margin-top:20px; text-align:left;"></div>
            <button class="btn" onclick="window.location.href='user-dashboard.html'" style="margin-top:25px; padding: 14px 40px;">Return to Dashboard</button>
        </div>
    `;

    showWrongAnswers(wrongAnswers);

    try {
        await fetch('http://localhost:3000/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                studentEmail, 
                examName: examSubject, 
                score: finalScore,
                totalQuestions: questions.length,
                wrongAnswers: wrongAnswers,
                passingPercentage: passingPercentage
            })
        });
    } catch (e) {
        console.error(e);
    }
}

async function bootSystem() {
    const isEligible = await verifyEligibility();
    if (isEligible) {
        await fetchQuestions();
        await initAI();
    }
}

bootSystem();

// Show wrong answers with polished styling
function showWrongAnswers(wrongOnes) {
    const container = document.getElementById('wrongAnswersSection');
    if (!container) return;

    if (!wrongOnes || wrongOnes.length === 0) {
        container.innerHTML = `
            <div class="card" style="border-left: 4px solid #10b981; padding: 15px 20px;">
                <p style="color:#10b981; font-weight:600; margin:0;">🎉 Perfect Score! All answers were correct.</p>
            </div>`;
        return;
    }

    let html = `
        <h3 style="color:var(--text-color); margin-bottom:15px; font-size:1.2rem;">
            ❌ Wrong Answers Review <span style="background:rgba(255,77,77,0.15); color:#ff4d4d; padding:3px 10px; border-radius:20px; font-size:0.9rem;">${wrongOnes.length} incorrect</span>
        </h3>`;

    wrongOnes.forEach((q, i) => {
        const chosenText = q.chosenAnswer ? `${q.chosenAnswer}. ${q['option' + q.chosenAnswer]}` : '<em>Not answered</em>';
        const correctText = `${q.correctAnswer}. ${q['option' + q.correctAnswer]}`;
        html += `
            <div class="card" style="margin-bottom:12px; border-left: 4px solid #ff4d4d; padding:18px 20px;">
                <p style="font-weight:600; margin-bottom:12px; color:var(--text-color);">Q${i+1}: ${q.questionText}</p>
                <p style="margin-bottom:6px;">
                    <span style="background:rgba(255,77,77,0.12); color:#ff4d4d; border-radius:6px; padding:4px 10px; font-weight:600; font-size:0.9rem;">❌ Your Answer:</span>
                    <span style="margin-left:8px; color:var(--text-color);">${chosenText}</span>
                </p>
                <p style="margin:0;">
                    <span style="background:rgba(16,185,129,0.12); color:#10b981; border-radius:6px; padding:4px 10px; font-weight:600; font-size:0.9rem;">✅ Correct Answer:</span>
                    <span style="margin-left:8px; color:var(--text-color);">${correctText}</span>
                </p>
            </div>`;
    });

    container.innerHTML = html;
}