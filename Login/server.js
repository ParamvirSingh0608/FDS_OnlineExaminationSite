require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Forgot Password: OTP store & email config ──────────────────
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// In-memory OTP store: { email: { otp, token, expiresAt } }
const otpStore = new Map();

// Email transporter — configure with your SMTP credentials in .env
// If not configured, OTP will be printed to server console for development
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: (process.env.SMTP_PORT === '465'),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

const mongoURI = 'mongodb://paramvir:param123@ac-g2d2smo-shard-00-00.zmwkdk2.mongodb.net:27017,ac-g2d2smo-shard-00-01.zmwkdk2.mongodb.net:27017,ac-g2d2smo-shard-00-02.zmwkdk2.mongodb.net:27017/exam_system?ssl=true&replicaSet=atlas-39fo1q-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.error('Connection Error:', err));

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const ExamSchema = new mongoose.Schema({
    examName: { type: String, required: true, unique: true },
    duration: { type: Number, required: true },
    passingPercentage: { type: Number, default: 35 },
    activationTime: { type: Date, required: false },
    closingTime: { type: Date, required: false }
});
const Exam = mongoose.model('Exam', ExamSchema);

const QuestionSchema = new mongoose.Schema({
    examName: { type: String, required: true },
    questionText: { type: String, required: true },
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true },
    correctAnswer: { type: String, required: true }
});
const Question = mongoose.model('Question', QuestionSchema);

const ResultSchema = new mongoose.Schema({
    studentEmail: { type: String, required: true },
    examName: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    wrongAnswers: { type: Array, default: [] },
    passingPercentage: { type: Number, default: 35 },
    dateTaken: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

const QuerySchema = new mongoose.Schema({
    studentEmail: { type: String, required: true },
    queryText: { type: String, required: true },
    adminReply: { type: String, default: "" },
    status: { type: String, default: "Pending" },
    dateSubmitted: { type: Date, default: Date.now }
});
const Query = mongoose.model('Query', QuerySchema);

app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const newUser = new User({ name, email, password, role });
        await newUser.save();
        res.json({ success: true, message: "Registration successful!" });
    } catch (error) {
        res.status(400).json({ success: false, message: "Email already exists." });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const user = await User.findOne({ email, password, role });
        if (user) {
            res.json({ success: true, redirect: role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html' });
        } else {
            res.status(401).json({ success: false, message: "Invalid email, password, or role." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// ── Forgot Password: Send OTP ───────────────────────────────────
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email." });
        }

        const otp = generateOTP();
        const token = generateToken();

        // Store OTP with 5-minute expiry
        otpStore.set(email, {
            otp,
            token,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        // Send OTP via email if transporter is configured
        if (transporter) {
            await transporter.sendMail({
                from: `"ExamPortal" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Password Reset - ExamPortal",
                html: `
                    <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: auto; padding: 30px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <h2 style="margin-bottom: 10px;">🔐 Password Reset</h2>
                        <p>Hi ${user.name},</p>
                        <p>Your verification code is:</p>
                        <div style="background: rgba(255,255,255,0.2); padding: 18px; border-radius: 10px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 2.5rem; font-weight: 800; letter-spacing: 8px;">${otp}</span>
                        </div>
                        <p style="font-size: 0.9rem; opacity: 0.85;">This code expires in <strong>5 minutes</strong>. If you didn't request this, ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.3); margin: 20px 0;">
                        <p style="font-size: 0.8rem; opacity: 0.7;">— ExamPortal Team</p>
                    </div>
                `
            });
            console.log(`[OTP] Email sent to ${email}`);
        } else {
            // Development fallback: print OTP to server console
            console.log(`\n╔════════════════════════════════════════╗`);
            console.log(`║  OTP for ${email}: ${otp}       ║`);
            console.log(`╚════════════════════════════════════════╝\n`);
        }

        res.json({ success: true, message: "Verification code sent!", token });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
});

// ── Forgot Password: Verify OTP ─────────────────────────────────
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        const stored = otpStore.get(email);

        if (!stored) {
            return res.status(400).json({ success: false, message: "No verification code found. Please request a new one." });
        }
        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: "Code expired. Please request a new one." });
        }
        if (stored.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid code. Please check and try again." });
        }

        // OTP is valid — generate a new token for the reset step
        const resetToken = generateToken();
        otpStore.set(email, { ...stored, token: resetToken, otpVerified: true });

        res.json({ success: true, token: resetToken });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ── Forgot Password: Reset Password ─────────────────────────────
app.post('/api/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;
    try {
        const stored = otpStore.get(email);

        if (!stored || !stored.otpVerified) {
            return res.status(400).json({ success: false, message: "Invalid reset session. Please start over." });
        }
        if (stored.token !== token) {
            return res.status(400).json({ success: false, message: "Invalid token. Please start over." });
        }
        if (Date.now() > stored.expiresAt + 10 * 60 * 1000) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: "Session expired. Please start over." });
        }

        // Update the user's password
        await User.findOneAndUpdate({ email }, { password: newPassword });

        // Clean up OTP store
        otpStore.delete(email);

        res.json({ success: true, message: "Password reset successful!" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.get('/api/user', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.query.email }).select('-password');
        if (user) res.json({ success: true, user });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/exams', async (req, res) => {
    try {
        const newExam = new Exam(req.body);
        await newExam.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/exams', async (req, res) => {
    try {
        const exams = await Exam.find();
        res.json({ success: true, exams });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.delete('/api/exams/:id', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ success: false });
        const nameToDelete = exam.examName;
        await Exam.findByIdAndDelete(req.params.id);
        await Question.deleteMany({ examName: nameToDelete });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/questions', async (req, res) => {
    try {
        const newQuestion = new Question(req.body);
        await newQuestion.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json({ success: true, questions });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find({ examName: req.query.examName });
        const exam = await Exam.findOne({ examName: req.query.examName });
        res.json({ 
            success: true, 
            questions, 
            duration: exam ? exam.duration : 30,
            passingPercentage: exam ? exam.passingPercentage : 35
        });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/results', async (req, res) => {
    try {
        const newResult = new Result(req.body);
        await newResult.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/results', async (req, res) => {
    try {
        const query = req.query.email ? { studentEmail: req.query.email } : {};
        const results = await Result.find(query).sort({ dateTaken: -1 });
        res.json({ success: true, results });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/queries', async (req, res) => {
    try {
        const newQuery = new Query(req.body);
        await newQuery.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/queries/student', async (req, res) => {
    try {
        const queries = await Query.find({ studentEmail: req.query.email }).sort({ dateSubmitted: -1 });
        res.json({ success: true, queries });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/queries/admin', async (req, res) => {
    try {
        const queries = await Query.find().sort({ dateSubmitted: -1 });
        res.json({ success: true, queries });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.put('/api/queries/:id', async (req, res) => {
    try {
        const { adminReply, status } = req.body;
        await Query.findByIdAndUpdate(req.params.id, { adminReply, status });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ── AI Chatbot Endpoint ─────────────────────────────────────────
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/ai-chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: "No message provided." });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const systemPrompt = `You are a friendly, helpful AI Tutor for an online Exam Portal. 
Your job is to help students with questions about taking exams, using the dashboard, and general study tips.
Do NOT give direct answers to specific exam questions. 
Keep your answers relatively short, conversational, and encouraging.
User message: ${message}`;

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        res.json({ success: true, reply: responseText });
    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({ success: false, message: "AI Service error" });
    }
});


io.on('connection', (socket) => {
    socket.on('chatMessage', (msg) => {
        io.emit('chatMessage', msg);
    });

    // AI Proctoring: student gaze away alert
    socket.on('gazeAlert', (data) => {
        // data = { studentEmail, examName }
        // Broadcast warning only to admin clients
        io.emit('gazeAlert', data);
    });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));