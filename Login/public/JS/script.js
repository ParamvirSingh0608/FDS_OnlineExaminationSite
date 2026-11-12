let selectedRole = 'student';

const studentBtn = document.getElementById('studentBtn');
const adminBtn = document.getElementById('adminBtn');
const loginForm = document.getElementById('loginForm');

studentBtn.addEventListener('click', () => {
    selectedRole = 'student';
    studentBtn.classList.add('active');
    adminBtn.classList.remove('active');
});

adminBtn.addEventListener('click', () => {
    selectedRole = 'admin';
    adminBtn.classList.add('active');
    studentBtn.classList.remove('active');
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: selectedRole })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Server is not responding. Make sure server.js is running.");
    }
});