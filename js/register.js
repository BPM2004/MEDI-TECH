import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('register-btn');
const statusMessage = document.getElementById('status-message');

registerBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    statusMessage.textContent = '';

    if (!email || !password) {
        statusMessage.textContent = 'Please enter both email and password.';
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in 
            statusMessage.textContent = 'Registration successful! Redirecting to admin dashboard...';
            statusMessage.className = "text-center mt-4 text-sm text-green-500";
            setTimeout(() => {
                window.location.href = './admin.html';
            }, 2000);
        })
        .catch((error) => {
            const errorMessage = error.message;
            statusMessage.textContent = errorMessage;
        });
});
