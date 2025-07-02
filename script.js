// ===================================================================================
//  Firebase Integration
// ===================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    onSnapshot,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyBSfuTrcpAt2aj7zHRlagYw673Lpi7B8uY",
  authDomain: "erecord-b67d5.firebaseapp.com",
  databaseURL: "https://erecord-b67d5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "erecord-b67d5",
  storageBucket: "erecord-b67d5.appspot.com",
  messagingSenderId: "1026438102584",
  appId: "1:1026438102584:web:6b296a8420f665260530cd"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===================================================================================
//  STATE MANAGEMENT
// ===================================================================================
let currentOpenPatientId = null;
let allPatients = []; // Cache untuk menyimpan data pasien

// Konfigurasi Day.js
dayjs.locale('id'); 
dayjs.extend(window.dayjs_plugin_isSameOrAfter);
dayjs.extend(window.dayjs_plugin_isToday);
dayjs.extend(window.dayjs_plugin_utc);
dayjs.extend(window.dayjs_plugin_timezone);
dayjs.tz.setDefault("Asia/Makassar");

// ===================================================================================
//  HELPER FUNCTIONS
// ===================================================================================

/** Menghitung umur dari tanggal lahir */
function calculateAge(dobString) {
    if (!dobString) return '';
    const birthDate = dayjs(dobString, "DD MMM YYYY");
    if (!birthDate.isValid()) return '';
    return dayjs().diff(birthDate, 'year');
}

/** Membuat inisial dari nama lengkap */
function getInitials(name) {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length > 1 && parts[1]) {
        return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/** Fungsi untuk memperbarui jam real-time */
function updateClock() {
    const clockElement = document.getElementById('realTimeClock');
    if (clockElement) {
        clockElement.textContent = dayjs().format('dddd, D MMMM YYYY, HH:mm:ss');
    }
}

// ===================================================================================
//  RENDER FUNCTIONS - Mengubah data menjadi HTML
// ===================================================================================

/** Memperbarui statistik di header */
async function updateStats() {
    const patientsSnapshot = await getDocs(collection(db, "patients"));
    const visitsSnapshot = await getDocs(collection(db, "visits"));
    
    const patientsCount = patientsSnapshot.size;
    const visitsData = visitsSnapshot.docs.map(doc => doc.data());

    const todaysVisits = visitsData.filter(visit => dayjs(visit.date.toDate()).isToday()).length;
    const pendingVisits = visitsData.filter(visit => dayjs(visit.date.toDate()).isAfter(dayjs(), 'day') && visit.status === 'Dijadwalkan').length;
    
    let totalRecords = 0;
    patientsSnapshot.forEach(doc => {
        const patient = doc.data();
        totalRecords += (patient.medicalRecords?.vitals?.length || 0);
        totalRecords += (patient.medicalRecords?.medications?.length || 0);
        totalRecords += (patient.medicalRecords?.notes?.length || 0);
        totalRecords += (patient.medicalRecords?.visitActions?.length || 0);
    });

    document.getElementById('total-patients-stat').textContent = patientsCount;
    document.getElementById('visits-today-stat').textContent = todaysVisits;
    document.getElementById('pending-visits-stat').textContent = pendingVisits;
    document.getElementById('total-records-stat').textContent = totalRecords;
}

/** Merender kartu pasien di halaman utama */
function renderPatientCards(patients) {
    const container = document.getElementById('recent-patients-container');
    container.innerHTML = '';
    patients.forEach(patient => {
        const cardHTML = `
            <button class="patient-card text-left w-full bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500" data-patient-id="${patient.id}">
                <div class="flex items-center mb-3">
                    <div class="bg-blue-100 text-blue-800 font-bold rounded-full h-10 w-10 flex items-center justify-center mr-3 flex-shrink-0">
                        ${getInitials(patient.name)}
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800">${patient.name}</h4>
                        <p class="text-sm text-gray-500">ID: ${patient.patientId}</p>
                    </div>
                </div>
                <div class="flex justify-between text-sm mb-2"><span class="text-gray-500">Usia:</span><span class="font-medium text-gray-700">${calculateAge(patient.dob)} tahun</span></div>
                <div class="flex justify-between text-sm mb-2"><span class="text-gray-500">Diagnosis:</span><span class="font-medium text-gray-700">${patient.diagnosis}</span></div>
                <div class="flex justify-between items-center mt-3">
                    <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">${patient.status || 'Stabil'}</span>
                    <span class="text-blue-600 hover:text-blue-800 text-sm font-medium">Lihat Detail</span>
                </div>
            </button>
        `;
        container.innerHTML += cardHTML;
    });
}

/** Merender jadwal kunjungan di halaman utama */
async function renderUpcomingVisits() {
    const tbody = document.getElementById('upcoming-visits-tbody');
    tbody.innerHTML = '';

    const visitsQuery = query(collection(db, "visits"), where("date", ">=", Timestamp.fromDate(dayjs().startOf('day').toDate())), where("date", "<=", Timestamp.fromDate(dayjs().endOf('day').toDate())));
    
    onSnapshot(visitsQuery, async (snapshot) => {
        tbody.innerHTML = ''; // Clear table before re-rendering
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-500 py-4">Tidak ada jadwal kunjungan untuk hari ini.</td></tr>`;
            return;
        }

        const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        visits.sort((a, b) => a.date.toMillis() - b.date.toMillis());

        for (const visit of visits) {
            const patientDoc = await getDoc(doc(db, "patients", visit.patientId));
            if (patientDoc.exists()) {
                const patient = patientDoc.data();
                const statusColor = visit.status === 'Selesai' ? 'green' : (visit.status === 'Dalam Perjalanan' ? 'yellow' : 'blue');
                const rowHTML = `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="bg-blue-100 text-blue-800 font-bold rounded-full h-8 w-8 flex items-center justify-center mr-3 flex-shrink-0">${getInitials(patient.name)}</div>
                                <div>
                                    <div class="text-sm font-medium text-gray-900">${patient.name}</div>
                                    <div class="text-sm text-gray-500">${calculateAge(patient.dob)} tahun</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${dayjs(visit.date.toDate()).format('HH:mm')}</div></td>
                        <td class="px-6 py-4"><div class="text-sm text-gray-900">${patient.address}</div></td>
                        <td class="px-6 py-4"><div class="text-sm text-gray-900">${visit.task}</div></td>
                        <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800">${visit.status}</span></td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button class="view-visit-button text-blue-600 hover:text-blue-900 mr-3" data-patient-id="${visit.patientId}">Lihat</button>
                            <button class="edit-visit-button text-indigo-600 hover:text-indigo-900" data-visit-id="${visit.id}">Edit</button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += rowHTML;
            }
        }
    });
}

/** Mengisi modal dengan data pasien yang dipilih */
async function populatePatientModal(patientId) {
    const patientRef = doc(db, "patients", patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
        console.error("Pasien tidak ditemukan!");
        return;
    }
    
    const patient = patientSnap.data();
    currentOpenPatientId = patientId;

    document.getElementById('modalPatientName').textContent = `Detail Rekam Medis - ${patient.name}`;
    document.getElementById('modal-patient-fullname').textContent = patient.name;
    document.getElementById('modal-patient-dob').textContent = patient.dob;
    document.getElementById('modal-patient-gender').textContent = patient.gender;
    document.getElementById('modal-patient-phone').textContent = patient.phone;
    document.getElementById('modal-patient-address').textContent = patient.address;
    document.getElementById('modal-patient-emergency').textContent = patient.emergencyContact || '-';
    document.getElementById('modal-patient-allergies').textContent = patient.allergies || 'Tidak ada';

    const records = patient.medicalRecords || {};
    populateVitalsTab(records.vitals || []);
    populateMedicationsTab(records.medications || []);
    // ... populate other tabs
    
    openPatientRecordModal();
}

/** Mengisi konten tab Pengobatan */
function populateMedicationsTab(medications) {
    const container = document.getElementById('medications-tab');
    if (!medications || medications.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500 mb-4">Tidak ada data pengobatan.</p>
                <button class="add-new-medication-button bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">+ Tambah Baru</button>
            </div>
        `;
        return;
    }
    
    let tableRows = '';
    medications.forEach((med, index) => {
        const statusColor = med.status === 'Aktif' ? 'green' : 'red';
        const isStopped = med.status === 'Dihentikan';
        tableRows += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${med.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${med.dosage}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${med.frequency}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800">
                        ${med.status}
                    </span>
                </td>
                 <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="stop-med-button text-red-600 hover:text-red-900 ${isStopped ? 'opacity-50 cursor-not-allowed' : ''}" data-med-index="${index}" ${isStopped ? 'disabled' : ''}>Hentikan</button>
                </td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div class="mb-4 flex justify-between items-center">
            <h5 class="font-medium text-gray-700">Daftar Pengobatan</h5>
            <button class="add-new-medication-button bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors">+ Tambah Baru</button>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Obat</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosis</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frekuensi</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" class="relative px-6 py-3"><span class="sr-only">Aksi</span></th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

// ... (Other populate functions like populateVitalsTab, etc. would be here)

// ===================================================================================
//  CONTROL FUNCTIONS - CRUD Operations
// ===================================================================================

/** Menangani penambahan pasien baru */
async function handleAddNewPatient(event) {
    event.preventDefault();
    const newPatient = {
        name: document.getElementById('new-patient-name').value,
        dob: document.getElementById('new-patient-dob').value,
        gender: document.getElementById('new-patient-gender').value,
        diagnosis: document.getElementById('new-patient-diagnosis').value,
        phone: document.getElementById('new-patient-phone').value,
        address: document.getElementById('new-patient-address').value,
        allergies: document.getElementById('new-patient-allergies').value,
        patientId: `P-${Date.now()}`, // Generate a unique ID
        status: "Stabil",
        medicalRecords: {
            vitals: [],
            medications: [],
            notes: [],
            visitActions: []
        }
    };

    try {
        await addDoc(collection(db, "patients"), newPatient);
        closeNewPatientModal();
        alert('Pasien baru berhasil ditambahkan!');
    } catch (e) {
        console.error("Error adding document: ", e);
        alert('Gagal menambahkan pasien baru.');
    }
}

/** Menangani penghentian Pengobatan */
async function handleStopMedication(medicationIndex) {
    if (currentOpenPatientId === null) return;

    const patientRef = doc(db, "patients", currentOpenPatientId);
    const patientSnap = await getDoc(patientRef);

    if (patientSnap.exists()) {
        const patientData = patientSnap.data();
        const medications = patientData.medicalRecords.medications || [];
        
        if (medications[medicationIndex]) {
            medications[medicationIndex].status = 'Dihentikan';
            
            try {
                await updateDoc(patientRef, {
                    "medicalRecords.medications": medications
                });
                populateMedicationsTab(medications); // Re-render the tab
            } catch (e) {
                console.error("Error updating medication status: ", e);
                alert('Gagal memperbarui status obat.');
            }
        }
    }
}

// ... (Other control functions like handleAddNewVisit, handleDeletePatient, etc.)

// ===================================================================================
//  EVENT LISTENERS
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Listener untuk data pasien secara real-time
    onSnapshot(collection(db, "patients"), (snapshot) => {
        allPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPatientCards(allPatients);
        updateStats();
    });

    // Listener untuk jadwal kunjungan hari ini
    renderUpcomingVisits();

    // Inisialisasi jam
    updateClock();
    setInterval(updateClock, 1000);

    // Event listener untuk klik pada kartu pasien
    document.getElementById('recent-patients-container').addEventListener('click', (event) => {
        const card = event.target.closest('.patient-card');
        if (card) {
            const patientId = card.dataset.patientId;
            populatePatientModal(patientId);
        }
    });

    // Event listener untuk modal pengobatan
    document.getElementById('medications-tab').addEventListener('click', (event) => {
        const stopButton = event.target.closest('.stop-med-button');
        if (stopButton) {
            const medIndex = parseInt(stopButton.dataset.medIndex, 10);
            handleStopMedication(medIndex);
        }
    });

    // ... (All other event listeners for buttons and forms)
    document.getElementById('newPatientForm').addEventListener('submit', handleAddNewPatient);
    // ... etc.
});
