const adminEmail = localStorage.getItem('loggedInUserEmail');
if (!adminEmail) window.location.href = 'index.html';

document.getElementById('logoutBtn').onclick = () => { localStorage.removeItem('loggedInUserEmail'); window.location.href = 'index.html'; };

const navs = ['navDashboard', 'navManageExams', 'navManageQuestions', 'navViewResults', 'navAdminQueries'];
const sections = ['dashboardOverview', 'manageExamsSection', 'manageQuestionsSection', 'viewResultsSection', 'adminQueriesSection', 'createExamSection', 'addQuestionSection'];

function hideAll() {
    sections.forEach(s => document.getElementById(s).style.display = 'none');
    navs.forEach(n => document.getElementById(n).classList.remove('active'));
}

document.getElementById('navDashboard').onclick = () => { hideAll(); document.getElementById('dashboardOverview').style.display = 'grid'; document.getElementById('navDashboard').classList.add('active'); };
document.getElementById('navManageExams').onclick = () => { hideAll(); document.getElementById('manageExamsSection').style.display = 'block'; document.getElementById('navManageExams').classList.add('active'); loadExamsAdmin(); };
document.getElementById('navManageQuestions').onclick = () => { hideAll(); document.getElementById('manageQuestionsSection').style.display = 'block'; document.getElementById('navManageQuestions').classList.add('active'); loadQuestionsAdmin(); };
document.getElementById('navViewResults').onclick = () => { hideAll(); document.getElementById('viewResultsSection').style.display = 'block'; document.getElementById('navViewResults').classList.add('active'); loadAllResultsAdmin(); };
document.getElementById('navAdminQueries').onclick = () => { hideAll(); document.getElementById('adminQueriesSection').style.display = 'block'; document.getElementById('navAdminQueries').classList.add('active'); loadAdminQueries(); };

document.getElementById('showCreateExamBtn').onclick = () => { hideAll(); document.getElementById('createExamSection').style.display = 'block'; };
document.getElementById('showQuestionFormBtn').onclick = () => { hideAll(); document.getElementById('addQuestionSection').style.display = 'block'; };

async function loadExamsAdmin() {
    const res = await fetch('http://localhost:3000/api/exams');
    const data = await res.json();
    const container = document.getElementById('examListAdmin');
    container.innerHTML = '';
    data.exams.forEach(e => {
        let timeInfo = '';
        if (e.activationTime || e.closingTime) {
            const start = e.activationTime ? new Date(e.activationTime).toLocaleString() : 'Now';
            const end = e.closingTime ? new Date(e.closingTime).toLocaleString() : 'Never';
            timeInfo = `<br><small style="color:#888;">Active: ${start} - ${end}</small>`;
        }
        const d = document.createElement('div');
        d.style = "background:var(--card-bg); padding:15px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; border-radius:8px; box-shadow:var(--shadow);";
        d.innerHTML = `<div><span><b>${e.examName}</b></span>${timeInfo}</div> <button onclick="deleteExam('${e._id}')" style="background:red; color:white; border:none; padding:8px; border-radius:6px; cursor:pointer;">Delete</button>`;
        container.appendChild(d);
    });
}

async function deleteExam(id) { if(confirm("Delete Exam and its questions?")) { await fetch(`http://localhost:3000/api/exams/${id}`, {method:'DELETE'}); loadExamsAdmin(); } }

async function loadQuestionsAdmin() {
    const res = await fetch('http://localhost:3000/api/admin/questions');
    const data = await res.json();
    const container = document.getElementById('questionListAdmin');
    container.innerHTML = '';
    data.questions.forEach(q => {
        const d = document.createElement('div');
        d.style = "background:var(--card-bg); padding:15px; margin-top:10px; border-radius:8px; box-shadow:var(--shadow);";
        d.innerHTML = `<small>${q.examName}</small><p>${q.questionText}</p>`;
        container.appendChild(d);
    });
}

async function loadAllResultsAdmin() {
    const res = await fetch('http://localhost:3000/api/results');
    const data = await res.json();
    const tbody = document.getElementById('allResultsAdmin');
    tbody.innerHTML = '';
    data.results.forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `<td style="padding:15px;">${r.studentEmail}</td><td style="padding:15px;">${r.examName}</td><td style="padding:15px;">${r.score}/${r.totalQuestions}</td><td style="padding:15px;">${new Date(r.dateTaken).toLocaleDateString()}</td>`;
        tbody.appendChild(row);
    });
    
    if(data.success && data.results.length > 0) {
        renderAdminCharts(data.results);
    }
}

async function loadAdminQueries() {
    const res = await fetch('http://localhost:3000/api/queries/admin');
    const data = await res.json();
    const container = document.getElementById('adminQueriesList');
    container.innerHTML = '';
    data.queries.forEach(q => {
        const d = document.createElement('div');
        d.style = "background:var(--card-bg); padding:20px; border-radius:12px; margin-top:15px; box-shadow:var(--shadow);";
        d.innerHTML = `<p><strong>From:</strong> ${q.studentEmail}</p><p><strong>Query:</strong> ${q.queryText}</p>${q.status === 'Pending' ? `<textarea id="reply-${q._id}" placeholder="Reply" style="width:100%; margin:10px 0; padding:10px;"></textarea><button class="btn" onclick="updateQuery('${q._id}', 'Resolved')">Resolve</button><button class="btn" style="background:red;" onclick="updateQuery('${q._id}', 'Rejected')">Reject</button>` : `<p>Action: ${q.status}</p>`}`;
        container.appendChild(d);
    });
}

window.updateQuery = async (id, status) => {
    const adminReply = document.getElementById(`reply-${id}`) ? document.getElementById(`reply-${id}`).value : "";
    await fetch(`http://localhost:3000/api/queries/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ adminReply, status }) });
    loadAdminQueries();
};

document.getElementById('createExamForm').onsubmit = async (e) => {
    e.preventDefault();
    const activationTime = document.getElementById('examActivationTime').value;
    const closingTime = document.getElementById('examClosingTime').value;

    await fetch('http://localhost:3000/api/exams', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
            examName: document.getElementById('newExamName').value, 
            duration: document.getElementById('examDuration').value,
            passingPercentage: parseInt(document.getElementById('examPassingPct').value) || 35,
            activationTime: activationTime ? new Date(activationTime).toISOString() : null,
            closingTime: closingTime ? new Date(closingTime).toISOString() : null
        }) 
    });
    e.target.reset(); 
    document.getElementById('examPassingPct').value = 35; // reset to default
    alert("Exam Created!");
    loadExamsAdmin();
};

document.getElementById('addQuestionForm').onsubmit = async (e) => {
    e.preventDefault();
    const body = { examName: document.getElementById('examName').value, questionText: document.getElementById('questionText').value, optionA: document.getElementById('optionA').value, optionB: document.getElementById('optionB').value, optionC: document.getElementById('optionC').value, optionD: document.getElementById('optionD').value, correctAnswer: document.getElementById('correctAnswer').value };
    await fetch('http://localhost:3000/api/questions', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    e.target.reset(); alert("Added");
};

// --- Chart.js Logic ---
let adminBarChart, adminPieChart;
function renderAdminCharts(results) {
    // Process Data for Bar Chart (Average Score per Exam)
    const examMap = {};
    let passed = 0, failed = 0;
    
    results.forEach(r => {
        const percent = (r.score / r.totalQuestions) * 100;
        if(percent >= 50) passed++; else failed++;
        
        if(!examMap[r.examName]) examMap[r.examName] = { totalScore: 0, count: 0 };
        examMap[r.examName].totalScore += percent;
        examMap[r.examName].count += 1;
    });

    const labels = Object.keys(examMap);
    const avgScores = labels.map(exam => examMap[exam].totalScore / examMap[exam].count);

    // Bar Chart
    const barCtx = document.getElementById('adminBarChart').getContext('2d');
    if(adminBarChart) adminBarChart.destroy();
    adminBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avg Score (%)',
                data: avgScores,
                backgroundColor: '#5a4fcf',
                borderRadius: 5
            }]
        }
    });

    // Pie Chart
    const pieCtx = document.getElementById('adminPieChart').getContext('2d');
    if(adminPieChart) adminPieChart.destroy();
    adminPieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Passed', 'Failed'],
            datasets: [{
                data: [passed, failed],
                backgroundColor: ['#28a745', '#ff4d4d']
            }]
        }
    });
}

// --- Live Chat Logic ---
const socket = io();
const chatHeader = document.getElementById('chatHeader');
const chatBody = document.getElementById('chatBody');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');

chatHeader.onclick = () => {
    chatBody.style.display = chatBody.style.display === 'none' ? 'flex' : 'none';
};

sendChatBtn.onclick = () => {
    if(!chatInput.value.trim()) return;
    socket.emit('chatMessage', { text: chatInput.value, sender: 'Admin', role: 'admin' });
    chatInput.value = '';
};

socket.on('chatMessage', (msg) => {
    const isMe = msg.sender === 'Admin';
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    div.innerHTML = `<span class="message-sender">${msg.sender} (${msg.role})</span>${msg.text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// AI Proctoring: receive gaze alert from student's exam
socket.on('gazeAlert', (data) => {
    // Auto-open chat widget to draw attention
    chatBody.style.display = 'flex';

    const div = document.createElement('div');
    div.className = 'message received';
    div.style.background = 'rgba(255, 77, 77, 0.2)';
    div.style.borderLeft = '4px solid #ff4d4d';
    div.innerHTML = `<span class="message-sender" style="color:#ff4d4d;">⚠️ PROCTORING ALERT</span>Student <b>${data.studentEmail}</b> has been looking away during exam "<b>${data.examName}</b>" for ${data.seconds}+ seconds!`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});