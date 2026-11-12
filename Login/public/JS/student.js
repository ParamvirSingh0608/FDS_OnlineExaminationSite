const studentEmail = localStorage.getItem('loggedInUserEmail');
if (!studentEmail) window.location.href = 'index.html';

document.getElementById('logoutBtn').onclick = () => { localStorage.removeItem('loggedInUserEmail'); window.location.href = 'index.html'; };

fetch(`http://localhost:3000/api/user?email=${studentEmail}`)
    .then(r => r.json()).then(d => { if(d.success) document.getElementById('welcomeMessage').textContent = `Welcome, ${d.user.name} 👋`; });

const navDash = document.getElementById('navDashboard');
const navRes = document.getElementById('navResults');
const navQueries = document.getElementById('navQueries');
const dashView = document.getElementById('dashboardOverview');
const resView = document.getElementById('resultsSection');
const queriesSection = document.getElementById('queriesSection');

function hideAll() {
    dashView.style.display = 'none'; resView.style.display = 'none'; queriesSection.style.display = 'none';
    navDash.classList.remove('active'); navRes.classList.remove('active'); navQueries.classList.remove('active');
}

navDash.onclick = () => { hideAll(); dashView.style.display = 'grid'; navDash.classList.add('active'); loadAvailableExams(); };
navRes.onclick = () => { hideAll(); resView.style.display = 'block'; navRes.classList.add('active'); loadPastResults(); };
navQueries.onclick = () => { hideAll(); queriesSection.style.display = 'block'; navQueries.classList.add('active'); loadStudentQueries(); };

async function loadAvailableExams() {
    const exRes = await fetch('http://localhost:3000/api/exams');
    const exData = await exRes.json();
    const resRes = await fetch(`http://localhost:3000/api/results?email=${studentEmail}`);
    const resData = await resRes.json();
    dashView.innerHTML = '';
    let completed = resData.success ? resData.results.map(r => r.examName) : [];
    
    const now = new Date();

    exData.exams.forEach(ex => {
        const isDone = completed.includes(ex.examName);
        let statusHtml = '';
        let isDisabled = isDone;
        let btnText = isDone ? 'Completed ✓' : 'Start';
        let btnStyle = isDone ? 'background:#28a745;' : '';

        if (!isDone) {
            if (ex.activationTime && new Date(ex.activationTime) > now) {
                isDisabled = true;
                btnText = 'Upcoming';
                btnStyle = 'background:#888; cursor:not-allowed;';
                statusHtml = `<p style="font-size:0.85rem; color:#f39c12; margin-top:5px;">Starts: ${new Date(ex.activationTime).toLocaleString()}</p>`;
            } else if (ex.closingTime && new Date(ex.closingTime) < now) {
                isDisabled = true;
                btnText = 'Closed';
                btnStyle = 'background:#ff4d4d; cursor:not-allowed;';
                statusHtml = `<p style="font-size:0.85rem; color:#ff4d4d; margin-top:5px;">Closed on: ${new Date(ex.closingTime).toLocaleString()}</p>`;
            } else if (ex.closingTime) {
                statusHtml = `<p style="font-size:0.85rem; color:#10b981; margin-top:5px;">Closes: ${new Date(ex.closingTime).toLocaleString()}</p>`;
            }
        }

        const card = document.createElement('div');
        card.className = 'exam-card';
        card.innerHTML = `<h3>${ex.examName}</h3><p>${ex.duration} Min</p>${statusHtml}
        <button class="btn" style="${btnStyle} margin-top:10px;" 
        onclick="${isDisabled ? '' : `window.location.href='exam.html?subject=${encodeURIComponent(ex.examName)}'`}" 
        ${isDisabled ? 'disabled' : ''}>${btnText}</button>`;
        dashView.appendChild(card);
    });
}

async function loadPastResults() {
    const res = await fetch(`http://localhost:3000/api/results?email=${studentEmail}`);
    const data = await res.json();
    const list = document.getElementById('myResultsList');
    list.innerHTML = '';
    data.results.forEach(r => {
        const percent = Math.round((r.score / r.totalQuestions) * 100);
        const threshold = r.passingPercentage ?? 35;
        const passed = percent >= threshold;
        const d = document.createElement('div');
        d.style = "background:var(--card-bg); padding:18px 22px; margin-top:12px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow); border:1px solid var(--glass-border); backdrop-filter:blur(10px);";
        d.innerHTML = `
            <div>
                <b style="font-size:1.05rem; color:var(--text-color);">${r.examName}</b>
                <div style="font-size:0.85rem; color:#888; margin-top:3px;">${new Date(r.dateTaken).toLocaleDateString()}</div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-weight:700; font-size:1.1rem; color:${passed ? '#10b981' : '#ff4d4d'}">${r.score}/${r.totalQuestions} (${percent}%)</span>
                ${r.wrongAnswers && r.wrongAnswers.length > 0 
                    ? `<button class="btn" style="padding:8px 16px; font-size:0.85rem; background:rgba(90,79,207,0.15); color:var(--primary); border:1px solid var(--primary);" onclick='showReviewModal(${JSON.stringify(r.wrongAnswers).replace(/'/g, "&apos;")})'>📋 Review</button>` 
                    : `<span style="background:rgba(16,185,129,0.15); color:#10b981; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:600;">✅ Perfect</span>`
                }
            </div>`;
        list.appendChild(d);
    });
}

document.getElementById('submitQueryBtn').onclick = async () => {
    const queryText = document.getElementById('queryInput').value;
    if(!queryText) return alert("Please type your issue.");
    await fetch('http://localhost:3000/api/queries', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ studentEmail, queryText })
    });
    document.getElementById('queryInput').value = '';
    loadStudentQueries();
};

async function loadStudentQueries() {
    const res = await fetch(`http://localhost:3000/api/queries/student?email=${studentEmail}`);
    const data = await res.json();
    const list = document.getElementById('myQueriesList');
    list.innerHTML = '<h2>My Query History</h2>';
    data.queries.forEach(q => {
        const color = q.status === 'Resolved' ? '#28a745' : (q.status === 'Rejected' ? '#ff4d4d' : '#f39c12');
        const d = document.createElement('div');
        d.style = `background:var(--card-bg); padding:20px; border-radius:12px; margin-top:15px; border-left: 6px solid ${color}; box-shadow:var(--shadow);`;
        d.innerHTML = `<p><strong>Query:</strong> ${q.queryText}</p><p><strong>Status:</strong> <span style="color:${color}; font-weight:bold;">${q.status}</span></p>${q.adminReply ? `<p><strong>Admin Reply:</strong> ${q.adminReply}</p>` : ''}`;
        list.appendChild(d);
    });
}
loadAvailableExams();

// Wrong Answers Review Modal
function showReviewModal(wrongAnswers) {
    const existing = document.getElementById('reviewModal');
    if (existing) existing.remove();

    let html = `
        <div id="reviewModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:2000; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div class="card" style="max-width:650px; width:100%; max-height:80vh; overflow-y:auto; position:relative;">
                <button onclick="document.getElementById('reviewModal').remove()" style="position:absolute; top:15px; right:15px; background:transparent; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-color);">✕</button>
                <h2 style="margin-bottom:20px; color:var(--text-color);">📋 Wrong Answers Review</h2>`;

    wrongAnswers.forEach((q, i) => {
        const chosenText = q.chosenAnswer ? `${q.chosenAnswer}. ${q['option' + q.chosenAnswer]}` : '<em>Not answered</em>';
        const correctText = `${q.correctAnswer}. ${q['option' + q.correctAnswer]}`;
        html += `
            <div class="card" style="margin-bottom:12px; border-left: 4px solid #ff4d4d; padding:15px 18px;">
                <p style="font-weight:600; margin-bottom:10px; color:var(--text-color);">Q${i+1}: ${q.questionText}</p>
                <p style="margin-bottom:6px;">
                    <span style="background:rgba(255,77,77,0.12); color:#ff4d4d; border-radius:6px; padding:3px 10px; font-size:0.85rem; font-weight:600;">❌ Your Answer:</span>
                    <span style="margin-left:8px; color:var(--text-color);">${chosenText}</span>
                </p>
                <p style="margin:0;">
                    <span style="background:rgba(16,185,129,0.12); color:#10b981; border-radius:6px; padding:3px 10px; font-size:0.85rem; font-weight:600;">✅ Correct Answer:</span>
                    <span style="margin-left:8px; color:var(--text-color);">${correctText}</span>
                </p>
            </div>`;
    });

    html += `</div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
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
    socket.emit('chatMessage', { text: chatInput.value, sender: studentEmail, role: 'student' });
    chatInput.value = '';
};

socket.on('chatMessage', (msg) => {
    const isMe = msg.sender === studentEmail;
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    div.innerHTML = `<span class="message-sender">${msg.sender} (${msg.role})</span>${msg.text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// --- Chart.js Logic ---
async function renderStudentChart() {
    const res = await fetch(`http://localhost:3000/api/results?email=${studentEmail}`);
    const data = await res.json();
    if(!data.success || data.results.length === 0) return;

    // Reverse to show chronological order
    const results = data.results.reverse();
    const labels = results.map(r => r.examName.substring(0, 10)); // Shorten name
    const scores = results.map(r => (r.score / r.totalQuestions) * 100);

    const ctx = document.getElementById('studentProgressChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Score Percentage',
                data: scores,
                borderColor: '#6C5DD3',
                backgroundColor: 'rgba(108, 93, 211, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100 } }
        }
    });
}
renderStudentChart();

// --- AI Chat Logic ---
const aiChatHeader = document.getElementById('aiChatHeader');
const aiChatBody = document.getElementById('aiChatBody');
const sendAiChatBtn = document.getElementById('sendAiChatBtn');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatMessages = document.getElementById('aiChatMessages');

aiChatHeader.onclick = () => {
    aiChatBody.style.display = aiChatBody.style.display === 'none' ? 'flex' : 'none';
};

sendAiChatBtn.onclick = async () => {
    const text = aiChatInput.value.trim();
    if (!text) return;
    
    // User message
    const userDiv = document.createElement('div');
    userDiv.className = 'message sent';
    userDiv.innerHTML = `<span class="message-sender">You</span>${text}`;
    aiChatMessages.appendChild(userDiv);
    
    aiChatInput.value = '';
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

    // Loading indicator
    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'message ai-received';
    loaderDiv.innerHTML = `<span class="message-sender">AI Tutor</span><div class="ai-loader"><span></span><span></span><span></span></div>`;
    aiChatMessages.appendChild(loaderDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

    try {
        const response = await fetch('http://localhost:3000/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        
        // Remove loader
        loaderDiv.remove();

        // AI response
        const aiDiv = document.createElement('div');
        aiDiv.className = 'message ai-received';
        aiDiv.innerHTML = `<span class="message-sender">AI Tutor</span>${data.reply.replace(/\\n/g, '<br>')}`;
        aiChatMessages.appendChild(aiDiv);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        
    } catch (error) {
        loaderDiv.remove();
        const errDiv = document.createElement('div');
        errDiv.className = 'message ai-received';
        errDiv.style.color = '#ff4d4d';
        errDiv.innerHTML = `<span class="message-sender">AI Tutor</span>Sorry, I encountered an error connecting to the AI service.`;
        aiChatMessages.appendChild(errDiv);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }
};

aiChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAiChatBtn.click();
});