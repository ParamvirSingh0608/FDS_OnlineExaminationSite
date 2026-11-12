// ============================================
// Forgot Password - Multi-Step Flow Logic
// ============================================

let userEmail = '';
let resetToken = '';

// DOM references
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');

// ── Step 1: Send OTP ────────────────────────
const emailForm = document.getElementById('emailForm');
const emailError = document.getElementById('email-error');
const sendOtpBtn = document.getElementById('sendOtpBtn');

emailForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    emailError.textContent = '';

    // Show loading state
    sendOtpBtn.querySelector('.btn-text').style.display = 'none';
    sendOtpBtn.querySelector('.btn-loader').style.display = 'inline-flex';
    sendOtpBtn.disabled = true;

    try {
        const res = await fetch('http://localhost:3000/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.success) {
            userEmail = email;
            resetToken = data.token || '';
            document.getElementById('emailDisplay').textContent = maskEmail(email);
            goToStep(2);
            startCountdown();
        } else {
            emailError.textContent = data.message || 'Email not found.';
        }
    } catch (err) {
        emailError.textContent = 'Server connection failed. Please try again.';
    } finally {
        sendOtpBtn.querySelector('.btn-text').style.display = 'inline';
        sendOtpBtn.querySelector('.btn-loader').style.display = 'none';
        sendOtpBtn.disabled = false;
    }
};

// ── Step 2: Verify OTP ──────────────────────
const otpInputs = document.querySelectorAll('.otp-input');
const otpForm = document.getElementById('otpForm');
const otpError = document.getElementById('otp-error');

// Auto-focus next input & handle paste
otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length === 1) {
            input.classList.add('filled');
            if (idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && idx > 0) {
            otpInputs[idx - 1].focus();
            otpInputs[idx - 1].classList.remove('filled');
        }
    });
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
        if (/^\d{6}$/.test(pasted)) {
            pasted.split('').forEach((ch, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = ch;
                    otpInputs[i].classList.add('filled');
                }
            });
            otpInputs[5].focus();
        }
    });
});

otpForm.onsubmit = async (e) => {
    e.preventDefault();
    const otp = Array.from(otpInputs).map(i => i.value).join('');
    otpError.textContent = '';

    if (otp.length < 6) {
        otpError.textContent = 'Please enter the complete 6-digit code.';
        otpInputs.forEach(i => i.classList.add('error'));
        setTimeout(() => otpInputs.forEach(i => i.classList.remove('error')), 500);
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, otp })
        });
        const data = await res.json();

        if (data.success) {
            resetToken = data.token || resetToken;
            goToStep(3);
        } else {
            otpError.textContent = data.message || 'Invalid code. Please try again.';
            otpInputs.forEach(i => i.classList.add('error'));
            setTimeout(() => otpInputs.forEach(i => i.classList.remove('error')), 500);
        }
    } catch (err) {
        otpError.textContent = 'Server connection failed.';
    }
};

// Resend OTP
document.getElementById('resendBtn').onclick = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
        });
        const data = await res.json();
        if (data.success) {
            resetToken = data.token || resetToken;
            startCountdown();
            otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
            otpInputs[0].focus();
        }
    } catch (err) { /* silent retry */ }
};

// Back to step 1
document.getElementById('backToStep1').onclick = (e) => {
    e.preventDefault();
    goToStep(1);
};

// ── Step 3: Reset Password ──────────────────
const resetForm = document.getElementById('resetForm');
const resetError = document.getElementById('reset-error');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Password visibility toggles
document.getElementById('togglePw1').onclick = () => toggleVisibility(newPasswordInput, document.getElementById('togglePw1'));
document.getElementById('togglePw2').onclick = () => toggleVisibility(confirmPasswordInput, document.getElementById('togglePw2'));

function toggleVisibility(input, btn) {
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// Password strength meter
newPasswordInput.addEventListener('input', () => {
    const pw = newPasswordInput.value;
    const fill = document.getElementById('strengthFill');
    const label = document.getElementById('strengthLabel');
    
    fill.className = 'strength-fill';
    
    if (pw.length === 0) {
        label.textContent = 'Enter a password';
        return;
    }

    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) { fill.classList.add('weak'); label.textContent = 'Weak'; }
    else if (score === 2) { fill.classList.add('fair'); label.textContent = 'Fair'; }
    else if (score === 3) { fill.classList.add('good'); label.textContent = 'Good'; }
    else { fill.classList.add('strong'); label.textContent = 'Strong'; }
});

resetForm.onsubmit = async (e) => {
    e.preventDefault();
    const newPw = newPasswordInput.value;
    const confirmPw = confirmPasswordInput.value;
    resetError.textContent = '';

    if (newPw.length < 6) {
        resetError.textContent = 'Password must be at least 6 characters.';
        return;
    }
    if (newPw !== confirmPw) {
        resetError.textContent = 'Passwords do not match.';
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, token: resetToken, newPassword: newPw })
        });
        const data = await res.json();

        if (data.success) {
            goToStep(4);
        } else {
            resetError.textContent = data.message || 'Reset failed. Try again.';
        }
    } catch (err) {
        resetError.textContent = 'Server connection failed.';
    }
};

// ── Utilities ───────────────────────────────

function goToStep(n) {
    [step1, step2, step3, step4].forEach(s => s.classList.remove('active'));
    document.getElementById(`step${n}`).classList.add('active');
}

function maskEmail(email) {
    const [name, domain] = email.split('@');
    const masked = name.charAt(0) + '***' + name.charAt(name.length - 1);
    return masked + '@' + domain;
}

let countdownInterval;
function startCountdown() {
    clearInterval(countdownInterval);
    let seconds = 60;
    const countdownEl = document.getElementById('countdown');
    const timerText = document.getElementById('timerText');
    const resendBtn = document.getElementById('resendBtn');

    timerText.style.display = 'inline';
    resendBtn.style.display = 'none';
    countdownEl.textContent = seconds;

    countdownInterval = setInterval(() => {
        seconds--;
        countdownEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            timerText.style.display = 'none';
            resendBtn.style.display = 'inline';
        }
    }, 1000);
}
