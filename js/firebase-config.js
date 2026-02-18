export const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyAIRO0BN7cRN71IGiUIPPphwm5LElqAOpI",
        authDomain: "btd-medtech.firebaseapp.com",
        projectId: "btd-medtech",
        storageBucket: "btd-medtech.appspot.com",
        messagingSenderId: "645731228941",
        appId: "1:645731228941:web:8dbf203fa4d817d6ef6444",
        measurementId: "G-EVLPYRXYL8"
    };

export const appId = typeof __app_id !== 'undefined' ? __app_id : 'pharmacy-finder-default';
