let selectedRegRole = 'student';
const regStudentBtn = document.getElementById('regStudentBtn');
const regAdminBtn = document.getElementById('regAdminBtn');
const registerForm = document.getElementById('registerForm');

regStudentBtn.onclick = () => { selectedRegRole = 'student'; regStudentBtn.classList.add('active'); regAdminBtn.classList.remove('active'); };
regAdminBtn.onclick = () => { selectedRegRole = 'admin'; regAdminBtn.classList.add('active'); regStudentBtn.classList.remove('active'); };

registerForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;

    if (password !== confirm) return alert("Passwords do not match.");

    const res = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: selectedRegRole })
    });
    const data = await res.json();
    if (data.success) window.location.href = 'index.html';
    else alert(data.message || "Registration failed.");
};