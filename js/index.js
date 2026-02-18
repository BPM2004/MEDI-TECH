// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { firebaseConfig, appId } from "./firebase-config.js";

// --- Initialize Firebase ---
let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    setLogLevel('Debug'); // Enable debug logging
} catch (e) {
    console.error("Firebase initialization failed:", e);
    document.getElementById('status-message').textContent = 'Error: Could not connect to the service.';
}

// --- App State ---
let isAuthReady = false;

// --- UI Elements ---
const searchInput = document.getElementById('medicine-search');
const searchBtn = document.getElementById('search-btn');
const statusMessage = document.getElementById('status-message');
const ocrBtn = document.getElementById('ocr-btn');
const ocrInput = document.getElementById('ocr-input');

// --- Core Functions ---

async function seedInitialData() {
    // Check if user is authenticated before trying to read/write
    if (!auth.currentUser) {
        console.log("Seeding skipped: User not authenticated yet.");
        statusMessage.textContent = 'Waiting for authentication...';
        return;
    }

    const pharmaciesRef = collection(db, `artifacts/${appId}/public/data/pharmacies`);
    const q = query(pharmaciesRef);

    let querySnapshot;
    try {
        querySnapshot = await getDocs(q);
    } catch (e) {
        console.error("Firebase read error during seeding:", e);
        statusMessage.textContent = 'Error checking for pharmacies. Please check permissions.';
        return; // Stop execution if we can't even read
    }


    if (querySnapshot.empty) {
        console.log("Seeding initial data...");
        statusMessage.textContent = 'Setting up pharmacies...';

        const coreMedicines = [
            { name: "Paracetamol", price: 20 }, { name: "Dolo 650", price: 30 }, { name: "Crocin", price: 25 },
            { name: "Aspirin", price: 10 }, { name: "Band-Aid", price: 5 }, { name: "Dettol", price: 30 },
            { name: "Savlon", price: 35 }, { name: "Eno", price: 10 }, { name: "Digene", price: 22 },
            { name: "ORS", price: 22 }, { name: "Hand Sanitizer", price: 50 }, { name: "Face Mask", price: 10 }
        ];

        const otherMedicines = [
            { name: "Aciloc", price: 20 }, { name: "Allegra", price: 210 }, { name: "Amoxicillin", price: 80 }, { name: "Amrutanjan", price: 38 },
            { name: "Antiseptic Wipes", price: 70 }, { name: "Atorvastatin", price: 150 }, { name: "Avil", price: 25 },
            { name: "Azithromycin", price: 120 }, { name: "Becosules", price: 50 }, { name: "Benadryl", price: 110 },
            { name: "Betadine", price: 110 }, { name: "Betnovate-N", price: 40 }, { name: "Boroline", price: 35 }, { name: "Brufen", price: 15 },
            { name: "Burnol", price: 55 }, { name: "Calpol", price: 35 }, { name: "Cetirizine", price: 12 }, { name: "Ciplox", price: 60 },
            { name: "Ciprofloxacin", price: 75 }, { name: "Cofsils", price: 30 }, { name: "Combiflam", price: 45 }, { name: "Cotton Roll", price: 40 },
            { name: "Crepe Bandage", price: 180 }, { name: "D-Cold Total", price: 48 },
            { name: "Disprin", price: 10 }, { name: "Domstal", price: 50 },
            { name: "Electral", price: 21 }, { name: "Erythromycin", price: 90 },
            { name: "Folic Acid", price: 30 }, { name: "Gauze", price: 25 }, { name: "Gelusil", price: 18 }, { name: "Glimiprex", price: 100 },
            { name: "Glucose-D", price: 70 }, { name: "Glycerine Suppository", price: 15 }, { name: "Gripe Water", price: 60 }, { name: "Hajmola", price: 1 },
            { name: "Honitus", price: 95 }, { name: "Ibuprofen", price: 20 }, { name: "Iodex", price: 42 },
            { name: "Itch Guard", price: 85 }, { name: "Lacto Calamine", price: 120 }, { name: "Limcee", price: 25 }, { name: "Lip Balm", price: 150 },
            { name: "Liv.52", price: 120 }, { name: "Loperamide", price: 20 }, { name: "Meftal Spas", price: 30 }, { name: "Metformin", price: 40 },
            { name: "Metrogyl", price: 15 }, { name: "Montair LC", price: 250 }, { name: "Moov", price: 125 }, { name: "Mosquito Repellent", price: 75 },
            { name: "Nasal Spray", price: 90 }, { name: "Neosporin", price: 60 }, { name: "Neurobion Forte", price: 34 }, { name: "Nicip Plus", price: 28 },
            { name: "Ofloxacin", price: 85 }, { name: "Omez", price: 65 }, { name: "Ondem", price: 55 },
            { name: "Pantop D", price: 180 }, { name: "Pudin Hara", price: 18 }, { name: "Rantac", price: 20 },
            { name: "Revital", price: 310 }, { name: "Saridon", price: 15 }, { name: "Shelcal", price: 110 },
            { name: "Sinarest", price: 55 }, { name: "Soframycin", price: 45 }, { name: "Spasmonil", price: 25 }, { name: "Strepsils", price: 40 },
            { name: "Sunscreen", price: 350 }, { name: "Telma", price: 130 }, { name: "Thermometer", price: 150 }, { name: "Tinidazole", price: 10 },
            { name: "Vicks Action 500", price: 45 }, { name: "Vicks Vaporub", price: 50 }, { name: "Vitamin B Complex", price: 40 }, { name: "Vitamin C", price: 30 },
            { name: "Vitamin D3", price: 60 }, { name: "Volini", price: 130 }, { name: "Vomikind", price: 38 }, { name: "Zandu Balm", price: 40 }, { name: "Zincovit", price: 105 }
        ];

        const pharmaciesData = [
            { name: "Apollo Pharmacy", address: "123, Main Road, Mandya", location: { lat: 12.5233, lng: 76.8953 } },
            { name: "MedPlus Pharmacy", address: "456, Bus Stand Road, Mandya", location: { lat: 12.5281, lng: 76.8989 } },
            { name: "Jan Aushadhi Kendra", address: "789, Hospital Circle, Mandya", location: { lat: 12.5195, lng: 76.8912 } },
            { name: "Wellness Forever", address: "101, College Road, Maddur", location: { lat: 12.5833, lng: 77.0444 } },
            { name: "Sri Sai Medicals", address: "212, Market Street, Srirangapatna", location: { lat: 12.4243, lng: 76.6948 } },
            { name: "Keelara Grama Pharmacy", address: "Main Road, Keelara, Mandya", location: { lat: 12.4580, lng: 76.9230 } },
            { name: "Holalu Community Medicals", address: "Panchayat Circle, Holalu, Mandya", location: { lat: 12.5750, lng: 76.8650 } },
            { name: "Guttalu Sanjeevini", address: "Near Govt School, Guttalu, Mandya", location: { lat: 12.5490, lng: 76.9480 } }
        ];

        try {
            for (const pharmacy of pharmaciesData) {
                const medicineInventory = coreMedicines.map(med => ({
                    ...med,
                    stock: Math.floor(Math.random() * 50) + 50
                }));

                otherMedicines.forEach(med => {
                    if (Math.random() > 0.4) {
                        medicineInventory.push({
                            ...med,
                            stock: Math.random() > 0.1 ? Math.floor(Math.random() * 80) + 10 : 0
                        });
                    }
                });
                // Add pharmacy with empty ownerId for public access
                await addDoc(pharmaciesRef, { ...pharmacy, medicines: medicineInventory, ownerId: "" });
            }
            statusMessage.textContent = 'Pharmacies ready. Please allow location access.';
        } catch (e) {
            console.error("Firebase write error during seeding:", e);
            statusMessage.textContent = 'Error setting up pharmacies. Please check permissions.';
        }
    } else {
        console.log("Data already exists, no seeding needed.");
        statusMessage.textContent = 'Please allow location access.';
    }
}

// --- FUNCTION ADDED BACK ---
function getUserLocation() {
    statusMessage.textContent = 'Please allow location access to continue.';
    // We are not disabling the search button here anymore
    // searchBtn.disabled = true; 
    // searchBtn.classList.add('cursor-not-allowed', 'opacity-50');

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    const success = (position) => {
        // userLocation = { lat: position.coords.latitude, lng: position.coords.longitude }; // Not needed on this page
        statusMessage.textContent = 'Location acquired. Ready to search.';
        // searchBtn.disabled = false;
        // searchBtn.classList.remove('cursor-not-allowed', 'opacity-50');
    };

    const error = (err) => {
        console.warn(`ERROR(${err.code}): ${err.message}`);
        // userLocation = { lat: 12.5233, lng: 76.8953 };  // Not needed on this page
        statusMessage.textContent = 'Could not get location. Using a default. Ready to search.';
        // searchBtn.disabled = false;
        // searchBtn.classList.remove('cursor-not-allowed', 'opacity-50');
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
}
async function callGeminiWithImage(base64ImageData, mimeType) { // <-- 1. Accept mimeType
    statusMessage.textContent = 'Reading prescription...';
    // NOTE: The user's hardcoded API key is removed as it's not needed
    // for the gemini-2.0-flash model in this environment.
    const apiKey = "YOUR API KEY"; // API key is handled by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: "Extract the names of the medicines from this prescription image. List only the names, separated by commas. If you cannot read any names, respond with 'Error'." },
                { inlineData: { mimeType: mimeType, data: base64ImageData } } // <-- 2. Use dynamic mimeType
            ]
        }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const result = await response.json();
        const text = result.candidates[0]?.content?.parts[0]?.text.trim();

        if (text && text.toLowerCase() !== 'error') {
            // NEW: Redirect to results page with the comma-separated list
            window.location.href = `./results.html?q=${encodeURIComponent(text)}`;

        } else {
            statusMessage.textContent = 'Could not read any medicines from the image. Please try again.';
        }

    } catch (error) {
        console.error("Gemini Vision API call failed:", error);
        statusMessage.textContent = `Sorry, there was an error reading the prescription: ${error.message}`;
    }
}

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        window.location.href = `./results.html?q=${encodeURIComponent(query)}`;
    }
});

searchInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim(); // FIX: Was searchInput.input.value
        if (query) {
            window.location.href = `./results.html?q=${encodeURIComponent(query)}`;
        }
    }
});

ocrBtn.addEventListener('click', () => {
    ocrInput.click();
});

ocrInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
        const mimeType = file.type; // <-- 3. Get the actual file type
        callGeminiWithImage(base64String, mimeType); // <-- 4. Pass it to the function
    };
    reader.readAsDataURL(file);
});

// --- Page Load ---

onAuthStateChanged(auth, async (user) => {
    if (user && !isAuthReady) {
        isAuthReady = true;
        console.log("Auth state changed, user is authenticated:", user.uid);
        await seedInitialData(); // Run seeding *after* auth is ready
        getUserLocation(); // Get location *after* auth isj ready
    } else if (!user) {
        console.log("Auth state changed, user is null.");
    }
});

if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
    console.log("Signing in with custom token...");
    signInWithCustomToken(auth, __initial_auth_token).catch((e) => {
        console.error("Custom token sign-in failed, trying anonymous:", e);
        signInAnonymously(auth).catch(e_anon => console.error("Anonymous sign-in failed:", e_anon));
    });
} else {
    console.log("Signing in anonymously...");
    signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
}

if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
    console.log("Signing in with custom token...");
    signInWithCustomToken(auth, __initial_auth_token).catch((e) => {
        console.error("Custom token sign-in failed, trying anonymous:", e);
        signInAnonymously(auth).catch(e_anon => console.error("Anonymous sign-in failed:", e_anon));
    });
} else {
    console.log("Signing in anonymously...");
    signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
}
