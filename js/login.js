import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const statusMessage = document.getElementById('status-message');

loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    statusMessage.textContent = '';

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in, redirect to the admin page.
            window.location.href = './admin.html';
        })
        .catch((error) => {
            const errorMessage = error.message;
            statusMessage.textContent = errorMessage;
        });
});
