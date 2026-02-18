import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, onSnapshot, arrayUnion, arrayRemove, getDoc, addDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { firebaseConfig, appId } from "./firebase-config.js";

let app, db, auth, currentUser;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) { console.error("Firebase initialization failed:", e); }

let pharmacies = [];
let selectedPharmacyId = null;
let unsubscribeInventoryListener = null;
let newPharmacyCoords = null;

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

const authLayer = document.getElementById('auth-layer');
const pharmacySelect = document.getElementById('pharmacy-select');
const loadInventoryBtn = document.getElementById('load-inventory-btn');
const removePharmacyBtn = document.getElementById('remove-pharmacy-btn');
const adminContent = document.getElementById('admin-content');
const inventoryTableBody = document.getElementById('inventory-table-body');
const inventoryLoader = document.getElementById('inventory-loader');
const addMedBtn = document.getElementById('add-med-btn');
const newMedNameInput = document.getElementById('new-med-name');
const newMedStockInput = document.getElementById('new-med-stock');
const newMedPriceInput = document.getElementById('new-med-price');
const addStatus = document.getElementById('add-status');

const addPharmacyBtn = document.getElementById('add-pharmacy-btn');
const newPharmacyNameInput = document.getElementById('new-pharmacy-name');
const newPharmacyAddressInput = document.getElementById('new-pharmacy-address');
const newPharmacyCityInput = document.getElementById('new-pharmacy-city');
const newPharmacyPincodeInput = document.getElementById('new-pharmacy-pincode');
const getLocationBtn = document.getElementById('get-location-btn');
const addPharmacyStatus = document.getElementById('add-pharmacy-status');
const signOutBtn = document.getElementById('sign-out-btn');
const userEmailSpan = document.getElementById('user-email');

const welcomeOnboarding = document.getElementById('welcome-onboarding');
const manageInventorySection = document.getElementById('manage-inventory-section');

const fileUploadInput = document.getElementById('file-upload');
const processFileBtn = document.getElementById('process-file-btn');
const fileStatus = document.getElementById('file-status');

const confirmationModal = document.getElementById('confirmation-modal');
const confirmationMessage = document.getElementById('confirmation-message');
const cancelBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');

const addPharmacySection = document.getElementById('add-pharmacy-section');
const showAddPharmacyBtn = document.getElementById('show-add-pharmacy-btn');

async function loadOwnerPharmacies() {
    if (!currentUser) return;
    pharmacySelect.innerHTML = '<option value="">-- Loading Your Pharmacies --</option>';
    try {
        const pharmaciesRef = collection(db, `artifacts/${appId}/public/data/pharmacies`);
        const q = query(pharmaciesRef, where("ownerId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        pharmacies = [];
        querySnapshot.forEach(doc => {
            pharmacies.push({ id: doc.id, ...doc.data() });
        });

        if (pharmacies.length === 0) {
            pharmacySelect.innerHTML = '<option value="">-- You have no pharmacies --</option>';
            welcomeOnboarding.classList.remove('hidden');
            addPharmacySection.classList.remove('hidden');
            showAddPharmacyBtn.classList.add('hidden'); // Hide button if form is already visible
            manageInventorySection.classList.add('hidden');
            adminContent.classList.add('hidden');
        } else {
            welcomeOnboarding.classList.add('hidden');
            addPharmacySection.classList.add('hidden');
            showAddPharmacyBtn.classList.remove('hidden'); // Show button if pharmacies exist
            manageInventorySection.classList.remove('hidden');
            pharmacySelect.innerHTML = '<option value="">-- Select a Pharmacy --</option>';
            pharmacies.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                pharmacySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading pharmacies:", error);
        pharmacySelect.innerHTML = '<option value="">-- Error Loading --</option>';
    }
}

async function addNewPharmacy() {
    if (!currentUser) return;
    const name = newPharmacyNameInput.value.trim();
    const address = newPharmacyAddressInput.value.trim();
    const city = newPharmacyCityInput.value.trim();
    const pincode = newPharmacyPincodeInput.value.trim();

    addPharmacyStatus.className = 'text-center mt-2 text-sm text-red-500';
    if (!name || !address || !city || !pincode) {
        addPharmacyStatus.textContent = 'Please fill out all address fields.';
        return;
    }
    if (!newPharmacyCoords) {
        addPharmacyStatus.textContent = 'Please use the button to set your pharmacy location.';
        return;
    }

    addPharmacyStatus.textContent = 'Adding pharmacy...';
    addPharmacyStatus.className = 'text-center mt-2 text-sm text-blue-500';
    const fullAddress = `${address}, ${city}, ${pincode}`;

    const newPharmacy = {
        name,
        address: fullAddress,
        location: {
            lat: newPharmacyCoords.lat,
            lng: newPharmacyCoords.lng
        },
        medicines: [],
        ownerId: currentUser.uid
    };

    try {
        const pharmaciesRef = collection(db, `artifacts/${appId}/public/data/pharmacies`);
        await addDoc(pharmaciesRef, newPharmacy);

        newPharmacyNameInput.value = '';
        newPharmacyAddressInput.value = '';
        newPharmacyCityInput.value = '';
        newPharmacyPincodeInput.value = '';
        newPharmacyCoords = null;
        getLocationBtn.classList.remove('bg-green-200');
        getLocationBtn.querySelector('span').textContent = 'Use My Current Location';

        addPharmacyStatus.textContent = `Successfully added "${name}"!`;
        addPharmacyStatus.className = 'text-center mt-2 text-sm text-green-500';
        await loadOwnerPharmacies();
    } catch (error) {
        console.error("Error adding pharmacy:", error);
        addPharmacyStatus.textContent = 'Error adding pharmacy.';
    }
}

function renderInventory(medicines) {
    inventoryTableBody.innerHTML = '';
    medicines.sort((a, b) => a.name.localeCompare(b.name)).forEach((med, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-4">${med.name}</td>
            <td class="p-4"><input type="number" value="${med.stock}" class="w-24 p-2 border rounded-md" id="stock-${index}"></td>
            <td class="p-4"><input type="number" value="${med.price}" class="w-24 p-2 border rounded-md" id="price-${index}"></td>
            <td class="p-4 text-center">
                <button data-index="${index}" data-name="${med.name}" class="update-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Update</button>
                <button data-name="${med.name}" class="remove-btn bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 ml-2">Remove</button>
            </td>
        `;
        inventoryTableBody.appendChild(row);
    });
}

async function updateMedicine(index, originalName) {
    inventoryLoader.classList.remove('hidden');
    const stock = document.getElementById(`stock-${index}`).value;
    const price = document.getElementById(`price-${index}`).value;

    const pharmacyDocRef = doc(db, `artifacts/${appId}/public/data/pharmacies`, selectedPharmacyId);
    const selectedPharmacy = pharmacies.find(p => p.id === selectedPharmacyId);

    const updatedMedicines = selectedPharmacy.medicines.map(med => {
        if (med.name === originalName) {
            return { ...med, stock: parseInt(stock, 10), price: parseFloat(price) };
        }
        return med;
    });

    try {
        await updateDoc(pharmacyDocRef, { medicines: updatedMedicines });
    } catch (error) {
        console.error("Error updating medicine:", error);
    } finally {
        inventoryLoader.classList.add('hidden');
    }
}

async function removeMedicine(medicineName) {
    inventoryLoader.classList.remove('hidden');
    const pharmacyDocRef = doc(db, `artifacts/${appId}/public/data/pharmacies`, selectedPharmacyId);

    const selectedPharmacy = pharmacies.find(p => p.id === selectedPharmacyId);
    const medicineToRemove = selectedPharmacy.medicines.find(med => med.name === medicineName);

    if (!medicineToRemove) {
        console.error("Could not find the medicine object to remove.");
        inventoryLoader.classList.add('hidden');
        return;
    }

    try {
        await updateDoc(pharmacyDocRef, {
            medicines: arrayRemove(medicineToRemove)
        });
    } catch (error) {
        console.error("Error removing medicine:", error);
    } finally {
        inventoryLoader.classList.add('hidden');
    }
}

async function addNewMedicine() {
    const name = newMedNameInput.value.trim();
    const stock = newMedStockInput.value;
    const price = newMedPriceInput.value;

    if (!name || stock === '' || price === '') {
        addStatus.textContent = 'Please fill all fields.';
        addStatus.className = 'text-center mt-2 text-sm text-red-500';
        return;
    }

    const stockNum = parseInt(stock, 10);
    const priceNum = parseFloat(price);

    if (isNaN(stockNum) || isNaN(priceNum) || stockNum < 0 || priceNum < 0) {
        addStatus.textContent = 'Please enter valid numbers for stock and price.';
        addStatus.className = 'text-center mt-2 text-sm text-red-500';
        return;
    }

    addStatus.textContent = 'Adding...';
    addStatus.className = 'text-center mt-2 text-sm text-blue-500';
    inventoryLoader.classList.remove('hidden');

    const pharmacyDocRef = doc(db, `artifacts/${appId}/public/data/pharmacies`, selectedPharmacyId);

    const docSnap = await getDoc(pharmacyDocRef);
    if (!docSnap.exists()) {
        console.error("Pharmacy document not found!");
        inventoryLoader.classList.add('hidden');
        return;
    }
    const currentPharmacyData = docSnap.data();

    const existingMed = currentPharmacyData.medicines.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existingMed) {
        addStatus.textContent = `"${name}" already exists. Please update it below.`;
        addStatus.className = 'text-center mt-2 text-sm text-red-500';
        inventoryLoader.classList.add('hidden');
        return;
    }

    const newMedicine = {
        name,
        stock: stockNum,
        price: priceNum
    };

    try {
        await updateDoc(pharmacyDocRef, {
            medicines: arrayUnion(newMedicine)
        });

        newMedNameInput.value = '';
        newMedStockInput.value = '';
        newMedPriceInput.value = '';
        addStatus.textContent = `Successfully added "${name}"!`;
        addStatus.className = 'text-center mt-2 text-sm text-green-500';
    } catch (error) {
        console.error("Error adding medicine:", error);
        addStatus.textContent = 'Error adding medicine.';
    } finally {
        inventoryLoader.classList.add('hidden');
    }
}

async function deleteSelectedPharmacy() {
    if (!selectedPharmacyId) return;

    const pharmacyDocRef = doc(db, `artifacts/${appId}/public/data/pharmacies`, selectedPharmacyId);
    try {
        await deleteDoc(pharmacyDocRef);
        adminContent.classList.add('hidden');
        selectedPharmacyId = null;
        removePharmacyBtn.disabled = true;
        await loadOwnerPharmacies();
    } catch (error) {
        console.error("Error removing pharmacy:", error);
    } finally {
        confirmationModal.classList.add('hidden');
    }
}

async function updateInventory(medicines) {
    if (medicines.length === 0) {
        throw new Error("No valid medicine data found in the file.");
    }

    fileStatus.textContent = `Found ${medicines.length} medicines. Updating inventory...`;

    const pharmacyDocRef = doc(db, `artifacts/${appId}/public/data/pharmacies`, selectedPharmacyId);
    const docSnap = await getDoc(pharmacyDocRef);
    if (!docSnap.exists()) throw new Error("Selected pharmacy not found.");

    const currentMedicines = docSnap.data().medicines || [];
    const medicineMap = new Map(currentMedicines.map(m => [m.name.toLowerCase(), m]));

    medicines.forEach(med => {
        medicineMap.set(med.name.toLowerCase(), med);
    });

    const updatedMedicines = Array.from(medicineMap.values());

    await updateDoc(pharmacyDocRef, { medicines: updatedMedicines });

    fileStatus.textContent = `Successfully updated inventory with ${medicines.length} records.`;
    fileStatus.className = 'text-center mt-3 text-sm text-green-500';
}

async function processPDF(file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const pdf = await pdfjsLib.getDocument(event.target.result).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
            }

            const lines = fullText.split('\n').filter(line => line.trim() !== '' && line.includes('"'));
            const medicinesFromPdf = lines.reduce((acc, line) => {
                const parts = line.match(/"(.*?)"/g);
                if (!parts || parts.length < 2) return acc;
                const namePart = parts[0].replace(/"/g, '').trim();
                const pricePart = parts[1].replace(/"/g, '').trim();
                const priceMatch = pricePart.match(/^(\d+\.?\d*)/);
                const price = priceMatch ? parseFloat(priceMatch[0]) : null;
                const names = namePart.split('  ').filter(n => n.trim() !== '');
                names.forEach(name => {
                    if (name && price !== null) {
                        const stock = Math.floor(Math.random() * 91) + 10;
                        acc.push({ name: name.trim(), stock, price });
                    }
                });
                return acc;
            }, []);
            await updateInventory(medicinesFromPdf);
        } catch (error) {
            throw error;
        }
    };
    reader.readAsArrayBuffer(file);
}

async function processExcel(file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: ['name', 'price'] });

            const medicinesFromExcel = json.map(row => {
                if (!row.name || !row.price) return null;
                const price = parseFloat(row.price);
                if (isNaN(price)) return null;
                return {
                    name: String(row.name).trim(),
                    price: price,
                    stock: Math.floor(Math.random() * 91) + 10
                }
            }).filter(Boolean);

            await updateInventory(medicinesFromExcel);
        } catch (error) {
            throw error;
        }
    };
    reader.readAsArrayBuffer(file);
}

async function processImage(file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const base64ImageData = event.target.result.split(',')[1];
            const apiKey = "AIzaSyAIRO0BN7cRN71IGiUIPPphwm5LElqAOpI";
            if (!apiKey) {
                throw new Error("Gemini API Key is not configured. Image processing is disabled.");
            }
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{
                    role: "user",
                    parts: [
                        { text: "Analyze this image of a medicine list or bill. Extract the medicine name, price, and stock quantity for each item. Return ONLY a valid JSON array where each object has 'name' (string), 'price' (number), and 'stock' (number). Do not include any markdown formatting like ```json or ```." },
                        { inlineData: { mimeType: file.type, data: base64ImageData } }
                    ]
                }]
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const result = await response.json();
            const text = result.candidates[0]?.content?.parts[0]?.text || "";
            const cleanedText = text.replace(/^```json\s*|```\s*$/g, '');
            const medicinesFromImage = JSON.parse(cleanedText).map(med => ({
                ...med,
                stock: Math.floor(Math.random() * 91) + 10
            }));

            await updateInventory(medicinesFromImage);

        } catch (error) {
            throw error;
        }
    };
    reader.readAsDataURL(file);
}

async function processFile(file) {
    fileStatus.textContent = `Processing ${file.name}...`;
    fileStatus.className = 'text-center mt-3 text-sm text-blue-500';

    const extension = file.name.split('.').pop().toLowerCase();
    try {
        if (extension === 'pdf') {
            await processPDF(file);
        } else if (['xls', 'xlsx'].includes(extension)) {
            await processExcel(file);
        } else if (['jpg', 'jpeg', 'png'].includes(extension)) {
            await processImage(file);
        } else {
            throw new Error('Unsupported file type.');
        }
    } catch (error) {
        console.error("Error processing file:", error);
        fileStatus.textContent = `Error: ${error.message}`;
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authLayer.classList.remove('hidden');
        userEmailSpan.textContent = user.email;
        await loadOwnerPharmacies();
    } else {
        const currentPath = window.location.pathname.split('/').pop();
        const baseURL = window.location.href.replace(currentPath, '');
        window.location.href = baseURL + 'login.html';
    }
});

signOutBtn.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Sign out error', error);
    });
});

addPharmacyBtn.addEventListener('click', addNewPharmacy);


showAddPharmacyBtn.addEventListener('click', () => {
    addPharmacySection.classList.remove('hidden');
    addPharmacySection.scrollIntoView({ behavior: 'smooth' });
});

getLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        addPharmacyStatus.textContent = 'Geolocation is not supported by your browser.';
        return;
    }

    const buttonSpan = getLocationBtn.querySelector('span');
    buttonSpan.textContent = 'Fetching Location...';

    navigator.geolocation.getCurrentPosition((position) => {
        newPharmacyCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        buttonSpan.textContent = 'Location Captured!';
        getLocationBtn.classList.add('bg-green-200');
        addPharmacyStatus.textContent = `Location set to ${newPharmacyCoords.lat.toFixed(4)}, ${newPharmacyCoords.lng.toFixed(4)}`;
        addPharmacyStatus.className = 'text-center mt-2 text-sm text-green-500';
    }, () => {
        addPharmacyStatus.textContent = 'Unable to retrieve your location. Please check browser permissions.';
        buttonSpan.textContent = 'Use My Current Location';
    });
});

pharmacySelect.addEventListener('change', () => {
    selectedPharmacyId = pharmacySelect.value;
    if (pharmacySelect.value) {
        removePharmacyBtn.disabled = false;
    } else {
        removePharmacyBtn.disabled = true;
        adminContent.classList.add('hidden');
    }
});

loadInventoryBtn.addEventListener('click', () => {
    if (!selectedPharmacyId) {
        alert('Please select a pharmacy first.');
        return;
    };

    adminContent.classList.remove('hidden');

    if (unsubscribeInventoryListener) {
        unsubscribeInventoryListener();
    }

    const pharmacyDocRef = doc(db, `artifacts/${appId}/public/data/pharmacies`, selectedPharmacyId);
    unsubscribeInventoryListener = onSnapshot(pharmacyDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const pharmacyData = { id: docSnap.id, ...docSnap.data() };
            const pharmacyIndex = pharmacies.findIndex(p => p.id === pharmacyData.id);
            if (pharmacyIndex > -1) {
                pharmacies[pharmacyIndex] = pharmacyData;
            }

            renderInventory(pharmacyData.medicines);
        }
    });
});

removePharmacyBtn.addEventListener('click', () => {
    if (!selectedPharmacyId) return;
    const selectedPharmacy = pharmacies.find(p => p.id === selectedPharmacyId);
    confirmationMessage.textContent = `Are you sure you want to permanently delete "${selectedPharmacy.name}"? This action cannot be undone.`;
    confirmationModal.classList.remove('hidden');
});

processFileBtn.addEventListener('click', () => {
    const file = fileUploadInput.files[0];
    if (!selectedPharmacyId) {
        fileStatus.textContent = 'Please select a pharmacy before uploading.';
        return;
    }
    if (!file) {
        fileStatus.textContent = 'Please select a file to process.';
        return;
    }
    processFile(file);
});

cancelBtn.addEventListener('click', () => {
    confirmationModal.classList.add('hidden');
});

confirmBtn.addEventListener('click', deleteSelectedPharmacy);

inventoryTableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('update-btn')) {
        const index = e.target.dataset.index;
        const name = e.target.dataset.name;
        updateMedicine(index, name);
    }
    if (e.target.classList.contains('remove-btn')) {
        const name = e.target.dataset.name;
        removeMedicine(name);
    }
});
addMedBtn.addEventListener('click', addNewMedicine);
