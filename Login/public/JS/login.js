const studentBtn = document.getElementById('studentBtn');
const adminBtn = document.getElementById('adminBtn');
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('error-message');
let selectedRole = 'student';

studentBtn.onclick = () => { 
    selectedRole = 'student'; 
    studentBtn.classList.add('active'); 
    adminBtn.classList.remove('active'); 
};
adminBtn.onclick = () => { 
    selectedRole = 'admin'; 
    adminBtn.classList.add('active'); 
    studentBtn.classList.remove('active'); 
};

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = loginForm.querySelector('.btn');
    
    errorMsg.style.display = 'none';
    btn.textContent = 'Signing in...';
    btn.style.opacity = '0.7';

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: selectedRole })
        });
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('loggedInUserEmail', email);
            window.location.href = data.redirect;
        } else {
            errorMsg.textContent = data.message || "Invalid credentials.";
            errorMsg.style.display = 'block';
            btn.textContent = 'Sign In';
            btn.style.opacity = '1';
        }
    } catch (error) { 
        errorMsg.textContent = "Server Connection Failed."; 
        errorMsg.style.display = 'block'; 
        btn.textContent = 'Sign In';
        btn.style.opacity = '1';
    }
};