// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, setLogLevel, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
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
let userLocation = null;
let isAuthReady = false;
let currentSearchQuery = null;
let allPharmacies = []; // To store the full list for filtering
let currentSort = 'distance';
let currentFilterStock = false;

// --- UI Elements ---
const searchInput = document.getElementById('medicine-search');
const searchBtn = document.getElementById('search-btn');
const statusMessage = document.getElementById('status-message');
const loader = document.getElementById('loader');
const noResults = document.getElementById('no-results');
const pharmacyList = document.getElementById('pharmacy-list');
const globalInfoContainer = document.getElementById('global-info-container');
const globalInfoBtn = document.getElementById('global-info-btn');
const infoMedName = document.getElementById('info-med-name');

const filterSortContainer = document.getElementById('filter-sort-container');
const sortSelect = document.getElementById('sort-select');
const filterStockBtn = document.getElementById('filter-stock-btn');

// Modal UI Elements
const modalBackdrop = document.getElementById('ai-modal-backdrop');
const modalContent = document.getElementById('ai-modal-content');
const modalCloseBtn = document.getElementById('ai-modal-close-btn');
const modalTitle = document.getElementById('ai-modal-title');
const modalLoader = document.getElementById('ai-modal-loader');
const modalBody = document.getElementById('ai-modal-body');

// --- Core Functions ---

function getUserLocationAndSearch() {
    statusMessage.textContent = 'Please allow location access to continue.';
    loader.classList.remove('hidden');

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    const success = (position) => {
        userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        statusMessage.textContent = 'Location acquired. Ready to search.';
        findPharmacies(currentSearchQuery);
    };

    const error = (err) => {
        console.warn(`ERROR(${err.code}): ${err.message}`);
        userLocation = { lat: 12.5233, lng: 76.8953 }; // Mandya default
        statusMessage.textContent = 'Could not get location. Using a default. Ready to search.';
        findPharmacies(currentSearchQuery);
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getMockReview(pharmacyId) {
    let hash = 0;
    for (let i = 0; i < pharmacyId.length; i++) {
        const char = pharmacyId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    hash = Math.abs(hash);

    // Generate a rating between 3.5 and 5.0, in 0.1 increments
    const rating = 3.5 + (hash % 16) / 10.0;

    // Generate a review count between 10 and 200
    const reviewCount = 10 + (hash % 191);

    return { rating: rating.toFixed(1), reviewCount };
}

function getStarRatingHtml(rating) {
    const numRating = parseFloat(rating);
    const fullStars = Math.floor(numRating);
    const halfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    let html = '';
    for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star text-yellow-500"></i>';
    if (halfStar) html += '<i class="fas fa-star-half-alt text-yellow-500"></i>';
    for (let i = 0; i < emptyStars; i++) html += '<i class="far fa-star text-yellow-500"></i>';
    return html;
}

function getMockFeatures(pharmacyId) {
    let hash = 0;
    for (let i = 0; i < pharmacyId.length; i++) {
        const char = pharmacyId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    hash = Math.abs(hash);

    // Delivery Option
    // Start with a wrapper
    let deliveryHtml = '<div class="flex items-center gap-2 flex-wrap">';

    // All pharmacies get Home Delivery
    deliveryHtml += `<span class="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"><i class="fas fa-truck-fast mr-1"></i>Home Delivery</span>`;

    // Some pharmacies (1 in 3 chance) ALSO get 30 Min Delivery
    if (hash % 3 === 0) {
        deliveryHtml += `<span class="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><i class="fas fa-bolt mr-1"></i>30 Min Delivery</span>`;
    }

    deliveryHtml += `</div>`; // Close wrapper

    // Payment Options
    let paymentHtml = '<div class="flex items-center gap-3">';
    let paymentIcons = [];

    if ((hash & 1) > 0) { // Cash
        paymentIcons.push(`<i class="fas fa-money-bill-wave text-green-600" title="Cash Accepted"></i>`);
    }
    if ((hash & 2) > 0) { // UPI
        paymentIcons.push(`<i class="fas fa-mobile-alt text-blue-600" title="UPI/Mobile Payment"></i>`);
    }
    if ((hash & 4) > 0) { // Card
        paymentIcons.push(`<i class="fas fa-credit-card text-indigo-600" title="Card Accepted"></i>`);
    }

    // Ensure at least one payment method is shown
    if (paymentIcons.length === 0) {
        paymentIcons.push(`<i class="fas fa-money-bill-wave text-green-600" title="Cash Accepted"></i>`);
    }

    paymentHtml += paymentIcons.join('') + '</div>';

    return { deliveryHtml, paymentHtml };
}

async function findPharmacies(searchQuery) {
    const isSingleMedicine = !searchQuery.includes(',');
    const medicineName = isSingleMedicine ? searchQuery.trim() : 'prescription';

    if (!userLocation) {
        statusMessage.textContent = "Please enable location services.";
        return;
    }

    loader.classList.remove('hidden');
    noResults.classList.add('hidden');
    pharmacyList.innerHTML = '';
    globalInfoContainer.classList.add('hidden');
    filterSortContainer.classList.add('hidden');
    statusMessage.textContent = `Searching for "${medicineName}"...`;

    try {
        const pharmaciesRef = collection(db, `artifacts/${appId}/public/data/pharmacies`);
        const querySnapshot = await getDocs(pharmaciesRef);

        allPharmacies = []; // Clear previous results
        querySnapshot.forEach(doc => allPharmacies.push({ id: doc.id, ...doc.data() }));

        const processedPharmacies = allPharmacies.map(p => {
            const distance = getDistance(userLocation.lat, userLocation.lng, p.location.lat, p.location.lng);
            const reviewData = getMockReview(p.id); // Get mock review data
            const featureData = getMockFeatures(p.id); // Get mock feature data
            let searchResult = {};

            if (isSingleMedicine) {
                const medicine = p.medicines.find(m => m.name.toLowerCase() === medicineName.toLowerCase());
                searchResult = { foundMedicine: medicine || null };
            } else { // Multi-medicine search
                const medicineList = searchQuery.split(',').map(name => name.trim().toLowerCase());
                let foundCount = 0;
                const medicineDetails = medicineList.map(medName => {
                    const medicine = p.medicines.find(m => m.name.toLowerCase() === medName);
                    if (medicine && medicine.stock > 0) {
                        foundCount++;
                        return { ...medicine, name: medName, found: true }; // Ensure original casing isn't lost
                    }
                    return { name: medName, found: false };
                });
                searchResult = {
                    foundCount,
                    totalCount: medicineList.length,
                    medicineDetails
                };
            }
            return { ...p, ...reviewData, ...featureData, distance, searchResult }; // Add reviewData and featureData to pharmacy object
        });

        allPharmacies = processedPharmacies; // Store processed for sorting
        displayResults(); // Initial display
    } catch (error) {
        console.error("Error fetching pharmacies:", error);
        statusMessage.textContent = "An error occurred while searching.";
    } finally {
        loader.classList.add('hidden');
    }
}

function displayResults() {
    const isSingleMedicine = !currentSearchQuery.includes(',');
    const medicineName = isSingleMedicine ? currentSearchQuery : 'Prescription';

    pharmacyList.innerHTML = '';
    noResults.classList.add('hidden');

    let pharmaciesToDisplay = [...allPharmacies];

    // Enable Sort & Filter for BOTH single and multi-search
    filterSortContainer.classList.remove('hidden');

    // Enable Global Info for BOTH (contextual text)
    globalInfoContainer.classList.remove('hidden');
    if (isSingleMedicine) {
        infoMedName.textContent = medicineName;
    } else {
        infoMedName.textContent = "Prescription Medicines";
    }

    // Apply "In Stock Only" filter
    if (currentFilterStock) {
        if (isSingleMedicine) {
            pharmaciesToDisplay = pharmaciesToDisplay.filter(p => p.searchResult.foundMedicine && p.searchResult.foundMedicine.stock > 0);
        } else {
            // For multi-search, "In Stock" could mean "Has ALL items" or "Has AT LEAST ONE". 
            // Let's go with "Has at least one" to not filter out everything.
            pharmaciesToDisplay = pharmaciesToDisplay.filter(p => p.searchResult.foundCount > 0);
        }
    }

    // Apply sorting
    pharmaciesToDisplay.sort((a, b) => {
        // For multi-search, ALWAYS prioritize availability (foundCount) first, then the user's sort preference
        if (!isSingleMedicine) {
            const countDiff = b.searchResult.foundCount - a.searchResult.foundCount;
            if (countDiff !== 0) return countDiff;
        }

        // Secondary Sort (User Selection)
        if (currentSort === 'distance') {
            return a.distance - b.distance;
        } else if (currentSort === 'price') {
            const priceA = getEffectivePrice(a, isSingleMedicine);
            const priceB = getEffectivePrice(b, isSingleMedicine);
            return priceA - priceB;
        } else if (currentSort === 'price_desc') { // Assuming we might add this later or if it exists
            const priceA = getEffectivePrice(a, isSingleMedicine);
            const priceB = getEffectivePrice(b, isSingleMedicine);
            return priceB - priceA;
        }
        return 0;
    });

    if (isSingleMedicine) {
        statusMessage.textContent = `Showing ${pharmaciesToDisplay.length} pharmacies, sorted by ${currentSort.replace('_desc', ' (High to Low)')}.`;
    } else {
        statusMessage.textContent = `Showing ${pharmaciesToDisplay.length} pharmacies, sorted by availability and ${currentSort}.`;
    }

    if (pharmaciesToDisplay.length === 0) {
        noResults.classList.remove('hidden');
    }

    pharmaciesToDisplay.forEach((pharmacy, index) => {
        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-2xl shadow-md flex flex-col';

        let stockInfoHtml;

        // Determine if 'Buy Now' button should be shown
        let buyNowBtnHtml = '';

        if (isSingleMedicine) {
            const isInStock = pharmacy.searchResult.foundMedicine && pharmacy.searchResult.foundMedicine.stock > 0;
            if (isInStock) {
                const med = pharmacy.searchResult.foundMedicine;
                buyNowBtnHtml = `
                    <a href="./payment.html?med=${encodeURIComponent(med.name)}&price=${med.price}&pharmacy=${encodeURIComponent(pharmacy.name)}&stock=${med.stock}" 
                        target="_blank" 
                        class="w-full text-center bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-center gap-2">
                        <i class="fas fa-shopping-cart"></i> Buy Now
                    </a>
                `;
                stockInfoHtml = `
                    <p class="text-green-600 font-semibold flex items-center gap-2"><i class="fas fa-check-circle"></i><span>Available: ${pharmacy.searchResult.foundMedicine.name}</span></p>
                    <div class="flex justify-between items-center mt-2 text-sm text-gray-600">
                        <p>Stock: <span class="font-bold">${pharmacy.searchResult.foundMedicine.stock} units</span></p>
                        <p>Price: <span class="font-bold">₹${pharmacy.searchResult.foundMedicine.price}</span></p>
                    </div>
                `;
            } else {
                stockInfoHtml = `
                    <p class="text-red-600 font-semibold flex items-center gap-2"><i class="fas fa-times-circle"></i><span>Out of Stock: ${medicineName}</span></p>
                    <div class="flex justify-between items-center mt-2 text-sm text-gray-400">
                            <button data-medicine-name="${medicineName}" data-pharmacy-id="${pharmacy.id}" data-pharmacy-name="${pharmacy.name}" class="find-alternatives-btn text-purple-600 hover:underline text-xs font-semibold">✨ Find Alternatives</button>
                    </div>
                `;
            }
        } else { // Multi-medicine display
            const { foundCount, totalCount, medicineDetails } = pharmacy.searchResult;
            const allFound = foundCount === totalCount;
            const color = allFound ? 'text-green-600' : (foundCount > 0 ? 'text-orange-600' : 'text-red-600');

            const detailsHtml = medicineDetails.map(med => `
                <li class="flex justify-between items-center text-sm py-1">
                    <span>${med.name}</span>
                    ${med.found ?
                    `<span class="font-semibold text-green-600">Available (₹${med.price})</span>` :
                    `<div class="flex items-center gap-2">
                            <span class="font-semibold text-red-600">Out of Stock</span>
                            <button class="find-alternatives-btn text-xs text-purple-600 underline" data-medicine-name="${med.name}" data-pharmacy-id="${pharmacy.id}" data-pharmacy-name="${pharmacy.name}">Find Alt</button>
                         </div>`
                }
                </li>
            `).join('');

            stockInfoHtml = `
                <div class="flex justify-between items-center">
                    <p class="${color} font-semibold">Found ${foundCount} of ${totalCount} medicines</p>
                    <button class="view-details-btn text-blue-600 text-sm font-semibold hover:underline" data-target="details-${index}">View Details <i class="fas fa-chevron-down text-xs"></i></button>
                </div>
                <ul id="details-${index}" class="details-list mt-2 border-t pt-2">${detailsHtml}</ul>
            `;

            if (foundCount > 0) {
                // Calculate total price for available
                const total = medicineDetails.reduce((sum, m) => m.found ? sum + m.price : sum, 0);
                buyNowBtnHtml = `
                    <a href="#" class="w-full text-center bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed" title="Multi-buy coming soon">
                        <i class="fas fa-shopping-cart"></i> Buy Available (₹${total})
                    </a>
                `;
            }
        }

        card.innerHTML = `
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${pharmacy.name}</h3>
                        <p class="text-sm text-gray-500">${pharmacy.address}</p>
                        <div class="flex items-center gap-2 mt-1.5">
                            <span class="font-bold text-gray-700 text-sm">${pharmacy.rating}</span>
                            <span class="text-xs">${getStarRatingHtml(pharmacy.rating)}</span>
                            <span class="text-xs text-gray-500">(${pharmacy.reviewCount} reviews)</span>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <span class="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">${pharmacy.distance.toFixed(1)} km</span>
                    </div>
                </div>

                <!-- Features Section -->
                <div class="flex justify-between items-center mt-4 text-sm">
                    ${pharmacy.deliveryHtml}
                    ${pharmacy.paymentHtml}
                </div>

                <!-- Stock Info Section -->
                <div class="mt-4 pt-4 border-t border-gray-100">
                    ${stockInfoHtml}
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-5 space-y-3">
                ${buyNowBtnHtml}
                <a href="https://www.google.com/maps/dir/?api=1&destination=${pharmacy.location.lat},${pharmacy.location.lng}" target="_blank" class="w-full text-center bg-gray-800 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-black transition duration-300 flex items-center justify-center gap-2"><i class="fas fa-directions"></i> Directions</a>
            </div>
        `;
        pharmacyList.appendChild(card);
    });
}

function getEffectivePrice(pharmacy, isSingleMedicine) {
    if (isSingleMedicine) {
        return pharmacy.searchResult.foundMedicine?.price ?? Infinity;
    } else {
        // Sum of prices of FOUND medicines
        return pharmacy.searchResult.medicineDetails.reduce((sum, item) => {
            return item.found ? sum + item.price : sum;
        }, 0);
    }
}

async function callGemini(prompt) {
    showModal();
    modalLoader.classList.remove('hidden');
    modalBody.innerHTML = '';

    const apiKey = "YOUR_API_KEY_HERE"; // Groq API Key
    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

    const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Body:", errorBody);
            throw new Error(`API Error: ${response.status} ${response.statusText} \nDetails: ${errorBody}`);
        }

        const result = await response.json();

        if (result.choices && result.choices.length > 0) {
            const text = result.choices[0]?.message?.content || "No information available.";
            return { success: true, text: text };
        } else if (result.promptFeedback) {
            console.warn("Prompt was blocked:", result.promptFeedback);
            let blockReason = result.promptFeedback.blockReason || "Content blocked";
            let safetyRatings = (result.promptFeedback.safetyRatings || []).map(r => `${r.category}: ${r.probability}`).join(', ');
            return { success: false, text: `Sorry, I can't provide information on this topic. Reason: ${blockReason}. [${safetyRatings}]` };
        } else {
            return { success: false, text: "Sorry, I couldn't fetch that information. Please try again later." };
        }

    } catch (error) {
        console.error("Gemini API call failed:", error);
        return { success: false, text: `Sorry, I couldn't fetch that information. Error details: ${error.message}` };
    }
}

async function checkAlternativesInStock(pharmacyId, medicineName) {
    modalTitle.textContent = `Alternatives for ${medicineName}`;

    // 1. Get alternative names from AI
    const prompt = `What are common over-the-counter alternative medicines for "${medicineName}" in India? List ONLY the names, separated by commas. Example: Name1, Name2, Name3`;
    const aiResponse = await callGemini(prompt);

    if (!aiResponse.success) {
        modalBody.innerHTML = aiResponse.text; // Show error message
        modalLoader.classList.add('hidden');
        return;
    }

    const alternativeNames = aiResponse.text.split(',').map(name => name.trim().toLowerCase());

    // 2. Check stock for those names
    modalBody.innerHTML = `<p class="font-semibold">Checking stock for alternatives at this pharmacy...</p>`;

    const pharmacyDocRef = doc(db, `artifacts/${appId}/public/data/pharmacies`, pharmacyId);
    const docSnap = await getDoc(pharmacyDocRef);

    if (docSnap.exists()) {
        const pharmacyData = docSnap.data();
        const availableAlternatives = [];

        alternativeNames.forEach(altName => {
            const foundMed = pharmacyData.medicines.find(m => m.name.toLowerCase() === altName && m.stock > 0);
            if (foundMed) {
                availableAlternatives.push(foundMed);
            }
        });

        // 3. Display results
        if (availableAlternatives.length > 0) {
            let resultsHtml = `<p>Here are some alternatives available at this pharmacy:</p>
                                <ul class="list-disc list-inside space-y-2 mt-2">`;
            availableAlternatives.forEach(med => {
                resultsHtml += `<li><span class="font-bold">${med.name}</span> - Price: ₹${med.price}, Stock: ${med.stock}</li>`;
            });
            resultsHtml += `</ul>`;
            modalBody.innerHTML = resultsHtml;
        } else {
            modalBody.innerHTML = `<p>Sorry, no common alternatives for "${medicineName}" were found in stock at this pharmacy.</p>
                                    <p class="text-sm mt-2">Common alternatives include: ${aiResponse.text}</p>`;
        }
    } else {
        modalBody.innerHTML = "Sorry, could not find that pharmacy's data.";
    }

    modalLoader.classList.add('hidden');
}

function showModal() {
    modalBackdrop.classList.remove('hidden');
    modalBackdrop.classList.add('flex');
    setTimeout(() => {
        modalBackdrop.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
    }, 10);
}
function hideModal() {
    modalBackdrop.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modalBackdrop.classList.add('hidden'); // Corrected from modalBackdot
        modalBackdrop.classList.remove('flex');
    }, 300);
}

// --- Event Listeners ---

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        // Just reload the page with the new query
        window.location.href = `./results.html?q=${encodeURIComponent(query)}`;
    }
});
searchInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `./results.html?q=${encodeURIComponent(query)}`;
        }
    }
});

sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    displayResults();
});

filterStockBtn.addEventListener('click', () => {
    currentFilterStock = !currentFilterStock;
    filterStockBtn.classList.toggle('active');
    displayResults();
});

globalInfoBtn.addEventListener('click', async () => {
    const medicineName = currentSearchQuery;

    if (medicineName) {
        if (!medicineName.includes(',')) {
            modalTitle.textContent = `About ${medicineName}`;
            const prompt = `Briefly explain what the medicine "${medicineName}" is commonly used for. Keep it concise and easy for a non-medical person to understand.`;
            const aiResponse = await callGemini(prompt);
            modalBody.innerHTML = aiResponse.text.replace(/\n/g, '<br>');
        } else {
            modalTitle.textContent = `About Prescription Medicines`;
            const prompt = `Briefly explain the uses of the following medicines: ${medicineName}. Keep it concise.`;
            const aiResponse = await callGemini(prompt);
            modalBody.innerHTML = aiResponse.text.replace(/\n/g, '<br>');
        }

        modalLoader.classList.add('hidden');
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.find-alternatives-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.closest('.find-alternatives-btn');
        const medicineName = btn.dataset.medicineName;
        const pharmacyId = btn.dataset.pharmacyId;
        const pharmacyName = btn.dataset.pharmacyName;

        modalTitle.textContent = `Finding alternatives for ${medicineName} at ${pharmacyName}...`;
        showModal(); // Make sure modal is shown
        modalLoader.classList.remove('hidden'); // Show loader
        checkAlternativesInStock(pharmacyId, medicineName);
    }
    if (e.target.closest('.view-details-btn')) {
        e.preventDefault();
        const btn = e.target.closest('.view-details-btn');
        const targetId = btn.dataset.target;
        const detailsList = document.getElementById(targetId);
        const icon = btn.querySelector('i');
        if (detailsList.style.maxHeight) {
            detailsList.style.maxHeight = null;
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        } else {
            detailsList.style.maxHeight = detailsList.scrollHeight + "px";
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
    }
});

modalCloseBtn.addEventListener('click', hideModal);
modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) {
        hideModal();
    }
});

// --- Page Load ---

onAuthStateChanged(auth, async (user) => {
    if (user && !isAuthReady) {
        isAuthReady = true;
        console.log("Auth state changed, user is authenticated:", user.uid);

        const urlParams = new URLSearchParams(window.location.search);
        currentSearchQuery = urlParams.get('q');

        if (currentSearchQuery) {
            searchInput.value = currentSearchQuery.split(',')[0]; // Show first med if multiple
            getUserLocationAndSearch();
        } else {
            statusMessage.textContent = 'No search query provided. Please go back to the home page.';
            loader.classList.add('hidden');
        }

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
