// ===================================================================================
//  STATE MANAGEMENT
// ===================================================================================
let currentOpenPatientId = null;

// Konfigurasi Day.js untuk menggunakan Bahasa Indonesia dan zona waktu WITA
dayjs.locale('id'); 
dayjs.extend(window.dayjs_plugin_isSameOrAfter);
dayjs.extend(window.dayjs_plugin_isToday);
dayjs.extend(window.dayjs_plugin_utc);
dayjs.extend(window.dayjs_plugin_timezone);
dayjs.tz.setDefault("Asia/Makassar");

// Data dummy untuk aplikasi
const database = {
    patients: [
        {
            id: 1,
            patientId: "P-2023-001",
            name: "Budi Jatmiko",
            initials: "BJ",
            age: 67,
            dob: "12 Mei 1956",
            gender: "Laki-laki",
            phone: "081234567890",
            address: "Jl. Melati No. 23, RT 05/RW 02, Kec. Sukajadi, Bandung",
            emergencyContact: "Sinta (Anak) - 081987654321",
            allergies: "Penisilin, Seafood",
            diagnosis: "Diabetes, Hipertensi",
            lastVisit: "Hari ini",
            status: "Stabil",
            ui: { statusColor: "green", avatarColor: "blue" },
            medicalRecords: {
                vitals: [
                    { date: "2023-11-15T09:00:00Z", bp: "130/85", heartRate: 78, bloodSugar: 145, spO2: "97%", nurse: "Siti Nurhaliza" },
                    { date: "2023-11-08T10:00:00Z", bp: "135/88", heartRate: 82, bloodSugar: 152, spO2: "96%", nurse: "Rina Marlina" },
                    { date: "2023-11-01T09:30:00Z", bp: "140/90", heartRate: 80, bloodSugar: 160, spO2: "95%", nurse: "Siti Nurhaliza" }
                ],
                medications: [
                    { name: "Metformin", dosage: "500 mg", frequency: "2x sehari", status: "Aktif" },
                    { name: "Amlodipine", dosage: "5 mg", frequency: "1x sehari", status: "Aktif" },
                    { name: "Aspirin", dosage: "81 mg", frequency: "1x sehari", status: "Aktif" }
                ],
                notes: [
                    { date: "2023-11-20T11:00:00Z", title: "Tele-konsultasi", nurse: "Rina Marlina", content: "Pasien melaporkan tidak ada keluhan berarti. Melanjutkan pengobatan sesuai rencana.", tags: ["Konsultasi", "Telemedicine"] },
                    { date: "2023-11-15T09:30:00Z", title: "Evaluasi Luka", nurse: "Siti Nurhaliza", content: "Luka pada kaki kanan sudah mengalami perbaikan signifikan, ukuran luka berkurang menjadi 2x1 cm.", tags: ["Diabetes", "Perawatan Luka"] }
                ],
                visitActions: [
                    { date: "2023-11-15T09:35:00Z", nurse: "Siti Nurhaliza", action: "Penggantian perban dan pembersihan luka.", status: "Selesai", followUp: "Jaga kebersihan luka, ganti perban setiap hari." }
                ]
            }
        },
        {
            id: 2,
            patientId: "P-2023-014",
            name: "Sri Rahayu",
            initials: "SR",
            age: 72,
            dob: "21 April 1951",
            gender: "Perempuan",
            phone: "081223344556",
            address: "Jl. Anggrek No. 45, RT 08/RW 03, Kec. Cibeunying, Bandung",
            emergencyContact: "Dodi (Cucu) - 081887766554",
            allergies: "Tidak ada",
            diagnosis: "Pasca Stroke",
            lastVisit: "Kemarin",
            status: "Perlu Perhatian",
            ui: { statusColor: "yellow", avatarColor: "purple" },
            medicalRecords: { vitals: [], medications: [], notes: [], visitActions: [] }
        },
        {
            id: 3,
            patientId: "P-2023-022",
            name: "Ahmad Sulaiman",
            initials: "AS",
            age: 58,
            dob: "03 Agustus 1965",
            gender: "Laki-laki",
            phone: "085678901234",
            address: "Jl. Dahlia No. 12, RT 03/RW 01, Kec. Antapani, Bandung",
            emergencyContact: "Rina (Istri) - 085765432109",
            allergies: "Debu",
            diagnosis: "PPOK",
            lastVisit: "3 hari lalu",
            status: "Stabil",
            ui: { statusColor: "green", avatarColor: "green" },
            medicalRecords: { vitals: [], medications: [], notes: [], visitActions: [] }
        }
    ],
    visits: [
        { id: 1, patientId: 1, date: dayjs().format('YYYY-MM-DD') + 'T09:00:00', task: "Cek gula darah, Ganti perban", status: "Selesai", ui: { statusColor: "green" } },
        { id: 2, patientId: 2, date: dayjs().format('YYYY-MM-DD') + 'T11:30:00', task: "Fisioterapi, Cek tekanan darah", status: "Dalam Perjalanan", ui: { statusColor: "yellow" } },
        { id: 3, patientId: 3, date: dayjs().format('YYYY-MM-DD') + 'T14:00:00', task: "Nebulizer, Edukasi keluarga", status: "Dijadwalkan", ui: { statusColor: "blue" } },
        { id: 4, patientId: 1, date: dayjs().add(1, 'day').format('YYYY-MM-DD') + 'T10:00:00', task: "Konsultasi diet", status: "Dijadwalkan", ui: { statusColor: "blue" } }
    ]
};

// ===================================================================================
//  HELPER FUNCTIONS - Fungsi-fungsi bantuan
// ===================================================================================

/** Menghitung umur dari tanggal lahir */
function calculateAge(dobString) {
    if (!dobString) return '';
    const birthYear = parseInt(dobString.split(' ')[2]);
    if (isNaN(birthYear)) return '';
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
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
function updateStats() {
    document.getElementById('total-patients-stat').textContent = database.patients.length;
    
    const todaysVisits = database.visits.filter(visit => dayjs(visit.date).isToday());
    document.getElementById('visits-today-stat').textContent = todaysVisits.length;

    const pendingVisits = database.visits.filter(visit => dayjs(visit.date).isAfter(dayjs(), 'day'));
    document.getElementById('pending-visits-stat').textContent = pendingVisits.length;


    let totalRecords = 0;
    database.patients.forEach(p => {
        totalRecords += (p.medicalRecords.vitals?.length || 0);
        totalRecords += (p.medicalRecords.medications?.length || 0);
        totalRecords += (p.medicalRecords.notes?.length || 0);
        totalRecords += (p.medicalRecords.visitActions?.length || 0);
    });
    document.getElementById('total-records-stat').textContent = totalRecords;
}

/** Merender kartu pasien di halaman utama */
function renderPatientCards() {
    const container = document.getElementById('recent-patients-container');
    container.innerHTML = '';
    database.patients.forEach(patient => {
        const cardHTML = `
            <button class="patient-card text-left w-full bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500" data-patient-id="${patient.id}">
                <div class="flex items-center mb-3">
                    <div class="bg-${patient.ui.avatarColor}-100 text-${patient.ui.avatarColor}-800 font-bold rounded-full h-10 w-10 flex items-center justify-center mr-3 flex-shrink-0">
                        ${patient.initials}
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800">${patient.name}</h4>
                        <p class="text-sm text-gray-500">ID: ${patient.patientId}</p>
                    </div>
                </div>
                <div class="flex justify-between text-sm mb-2"><span class="text-gray-500">Usia:</span><span class="font-medium text-gray-700">${patient.age} tahun</span></div>
                <div class="flex justify-between text-sm mb-2"><span class="text-gray-500">Diagnosis:</span><span class="font-medium text-gray-700">${patient.diagnosis}</span></div>
                <div class="flex justify-between text-sm mb-3"><span class="text-gray-500">Kunjungan Terakhir:</span><span class="font-medium text-gray-700">${patient.lastVisit}</span></div>
                <div class="flex justify-between items-center">
                    <span class="bg-${patient.ui.statusColor}-100 text-${patient.ui.statusColor}-800 text-xs px-2 py-1 rounded-full font-medium">${patient.status}</span>
                    <span class="text-blue-600 hover:text-blue-800 text-sm font-medium">Lihat Detail</span>
                </div>
            </button>
        `;
        container.innerHTML += cardHTML;
    });
}

/** Merender jadwal kunjungan di halaman utama */
function renderUpcomingVisits() {
    const tbody = document.getElementById('upcoming-visits-tbody');
    tbody.innerHTML = '';
    const todaysVisits = database.visits.filter(visit => dayjs(visit.date).isToday());

    if (todaysVisits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-500 py-4">Tidak ada jadwal kunjungan untuk hari ini.</td></tr>`;
        return;
    }
    
    // Urutkan jadwal berdasarkan waktu
    todaysVisits.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

    todaysVisits.forEach(visit => {
        const patient = database.patients.find(p => p.id === visit.patientId);
        if (!patient) return;
        
        const rowHTML = `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="bg-${patient.ui.avatarColor}-100 text-${patient.ui.avatarColor}-800 font-bold rounded-full h-8 w-8 flex items-center justify-center mr-3 flex-shrink-0">${patient.initials}</div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${patient.name}</div>
                            <div class="text-sm text-gray-500">${patient.age} tahun</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${dayjs(visit.date).format('HH:mm')}</div></td>
                <td class="px-6 py-4"><div class="text-sm text-gray-900">${patient.address}</div></td>
                <td class="px-6 py-4"><div class="text-sm text-gray-900">${visit.task}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${visit.ui.statusColor}-100 text-${visit.ui.statusColor}-800">${visit.status}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="view-visit-button text-blue-600 hover:text-blue-900 mr-3" data-patient-id="${visit.patientId}">Lihat</button>
                    <button class="edit-visit-button text-indigo-600 hover:text-indigo-900" data-visit-id="${visit.id}">Edit</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += rowHTML;
    });
}

/** Mengisi modal dengan data pasien yang dipilih */
function populatePatientModal(patientId) {
    const patient = database.patients.find(p => p.id === patientId);
    if (!patient) return;

    currentOpenPatientId = patientId;

    document.getElementById('modalPatientName').textContent = `Detail Rekam Medis - ${patient.name}`;
    document.getElementById('modal-patient-fullname').textContent = patient.name;
    document.getElementById('modal-patient-dob').textContent = patient.dob;
    document.getElementById('modal-patient-gender').textContent = patient.gender;
    document.getElementById('modal-patient-phone').textContent = patient.phone;
    document.getElementById('modal-patient-address').textContent = patient.address;
    document.getElementById('modal-patient-emergency').textContent = patient.emergencyContact;
    document.getElementById('modal-patient-allergies').textContent = patient.allergies;

    populateVitalsTab(patient.medicalRecords.vitals);
    populateMedicationsTab(patient.medicalRecords.medications);
    populateActionsTab(patient.medicalRecords.visitActions);
    populateNotesTab(patient.medicalRecords.notes);
    populateHistoryTab(patient.id);
    
    openPatientRecordModal();
}

/** Mengisi konten tab Tanda Vital */
function populateVitalsTab(vitals) {
    const container = document.getElementById('vitals-tab');
    if (!vitals || vitals.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500 mb-4">Tidak ada data tanda vital.</p>
                <button class="add-new-vital-button bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">+ Tambah Baru</button>
            </div>
        `;
        return;
    }

    const latestVital = vitals[0];
    let tableRows = '';
    const sortedVitals = [...vitals].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

    sortedVitals.forEach(v => {
        tableRows += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dayjs(v.date).format('DD MMM YYYY')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${v.bp}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${v.heartRate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${v.bloodSugar}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${v.spO2}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${v.nurse}</td>
            </tr>`;
    });
    
    container.innerHTML = `
        <div class="mb-4 flex justify-between items-center"><h5 class="font-medium text-gray-700">Tanda Vital Terbaru</h5><button class="add-new-vital-button bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors">+ Tambah Baru</button></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-white border border-gray-200 rounded-lg p-3"><div class="text-sm font-medium text-gray-600">Tekanan Darah</div><div class="text-xl font-bold text-gray-800">${latestVital.bp}</div><div class="text-xs text-gray-500">mmHg</div></div>
            <div class="bg-white border border-gray-200 rounded-lg p-3"><div class="text-sm font-medium text-gray-600">Detak Jantung</div><div class="text-xl font-bold text-gray-800">${latestVital.heartRate}</div><div class="text-xs text-gray-500">bpm</div></div>
            <div class="bg-white border border-gray-200 rounded-lg p-3"><div class="text-sm font-medium text-gray-600">Gula Darah</div><div class="text-xl font-bold text-gray-800">${latestVital.bloodSugar}</div><div class="text-xs text-gray-500">mg/dL</div></div>
            <div class="bg-white border border-gray-200 rounded-lg p-3"><div class="text-sm font-medium text-gray-600">Saturasi Oksigen</div><div class="text-xl font-bold text-gray-800">${latestVital.spO2}</div><div class="text-xs text-gray-500">SpO2</div></div>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50"><tr><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tekanan Darah</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detak Jantung</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gula Darah</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SpO2</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perawat</th></tr></thead>
                <tbody class="bg-white divide-y divide-gray-200">${tableRows}</tbody>
            </table>
        </div>
    `;
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
    medications.forEach(med => {
        const statusColor = med.status === 'Aktif' ? 'green' : (med.status === 'Dihentikan' ? 'red' : 'yellow');
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
                    <button class="stop-med-button text-red-600 hover:text-red-900 ${isStopped ? 'opacity-50 cursor-not-allowed' : ''}" data-med-name="${med.name}" ${isStopped ? 'disabled' : ''}>Hentikan</button>
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

/** Mengisi konten tab Tindakan */
function populateActionsTab(actions) {
    const container = document.getElementById('actions-tab');
    if (!actions || actions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500 mb-4">Belum ada tindakan yang tercatat.</p>
                <button class="add-new-action-button bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">+ Tambah Tindakan</button>
            </div>
        `;
        return;
    }
    
    let actionsHTML = `<div class="mb-4 flex justify-between items-center">
                                <h5 class="font-medium text-gray-700">Daftar Tindakan</h5>
                                <button class="add-new-action-button bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors">+ Tambah Baru</button>
                            </div>
                            <div class="space-y-4">`;
    const sortedActions = [...actions].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

    sortedActions.forEach(item => {
        const statusColor = item.status === 'Selesai' ? 'green' : (item.status === 'Berlangsung' ? 'yellow' : 'red');
        actionsHTML += `
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="text-sm text-gray-500">Oleh ${item.nurse} pada ${dayjs(item.date).format('DD MMM YYYY, HH:mm')}</p>
                    </div>
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800">
                        ${item.status}
                    </span>
                </div>
                <p class="font-semibold text-gray-800 mt-1">Tindakan:</p>
                <p class="text-gray-700 mb-2">${item.action}</p>
                <p class="font-semibold text-gray-800 mt-1">Rencana Tindak Lanjut:</p>
                <p class="text-gray-700">${item.followUp}</p>
            </div>
        `;
    });
    actionsHTML += '</div>';
    container.innerHTML = actionsHTML;
}

/** Mengisi konten tab Catatan Perawat */
function populateNotesTab(notes) {
    const container = document.getElementById('notes-tab');
    if (!notes || notes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Tidak ada catatan perawat.</p>';
        return;
    }
    
    let notesHTML = '<div class="space-y-4">';
    const sortedNotes = [...notes].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

    sortedNotes.forEach(note => {
        const tagsHTML = note.tags.map(tag => `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">${tag}</span>`).join(' ');
        notesHTML += `
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h5 class="font-semibold text-gray-800">${note.title}</h5>
                        <p class="text-sm text-gray-500">Oleh ${note.nurse} pada ${dayjs(note.date).format('DD MMM YYYY, HH:mm')}</p>
                    </div>
                </div>
                <p class="text-gray-700 mb-3">${note.content}</p>
                <div class="flex flex-wrap gap-2">
                    ${tagsHTML}
                </div>
            </div>
        `;
    });
    notesHTML += '</div>';
    container.innerHTML = notesHTML;
}

/** Mengisi konten tab Riwayat Kunjungan */
function populateHistoryTab(patientId) {
    const container = document.getElementById('history-tab');
    const patient = database.patients.find(p => p.id === patientId);
    if (!patient) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Pasien tidak ditemukan.</p>';
        return;
    }

    const notesHistory = (patient.medicalRecords.notes || []).map(item => ({...item, type: 'Catatan Observasi', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' }));
    const vitalsHistory = (patient.medicalRecords.vitals || []).map(item => ({...item, type: 'Pemeriksaan Tanda Vital', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' }));
    const visitsHistory = (database.visits.filter(v => v.patientId === patientId) || []).map(item => ({...item, type: 'Kunjungan Terjadwal', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }));
    const actionsHistory = (patient.medicalRecords.visitActions || []).map(item => ({ ...item, type: 'Tindakan Keperawatan', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }));
    
    const allHistory = [...notesHistory, ...vitalsHistory, ...visitsHistory, ...actionsHistory];
    allHistory.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

    if (allHistory.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Tidak ada riwayat kunjungan.</p>';
        return;
    }

    let historyHTML = '<div class="relative border-l border-gray-200 ml-3">';
    allHistory.forEach(item => {
        let contentHTML = '';
        if (item.type === 'Catatan Observasi') {
            contentHTML = `<h3 class="font-semibold text-gray-900">${item.title}</h3><p class="text-sm text-gray-600">${item.content}</p><p class="text-xs text-gray-500 mt-1">Dicatat oleh: ${item.nurse}</p>`;
        } else if (item.type === 'Pemeriksaan Tanda Vital') {
            contentHTML = `<h3 class="font-semibold text-gray-900">${item.type}</h3><p class="text-sm text-gray-600">TD: ${item.bp}, Nadi: ${item.heartRate}, GDS: ${item.bloodSugar}, SpO2: ${item.spO2}</p><p class="text-xs text-gray-500 mt-1">Diperiksa oleh: ${item.nurse}</p>`;
        } else if (item.type === 'Kunjungan Terjadwal') {
            contentHTML = `<h3 class="font-semibold text-gray-900">${item.type}</h3><p class="text-sm text-gray-600">Tugas: ${item.task}</p><p class="text-xs text-gray-500 mt-1">Status: ${item.status}</p>`;
        } else if (item.type === 'Tindakan Keperawatan') {
            contentHTML = `<h3 class="font-semibold text-gray-900">${item.type}</h3><p class="text-sm text-gray-600">${item.action}</p><p class="text-xs text-gray-500 mt-1">Rencana: ${item.followUp}</p><p class="text-xs text-gray-500 mt-1">Oleh: ${item.nurse}</p>`;
        }
        
        historyHTML += `
            <div class="mb-10 ml-6">
                <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white">
                    <svg class="w-3 h-3 text-blue-800" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${item.icon}" clip-rule="evenodd"></path></svg>
                </span>
                <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div class="items-center justify-between mb-3 sm:flex">
                        <time class="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">${dayjs(item.date).format('dddd, DD MMMM YYYY, HH:mm')}</time>
                        <div class="text-sm font-normal text-gray-500"><div class="font-semibold text-gray-900">${item.type}</div></div>
                    </div>
                    <div class="p-3 text-sm italic font-normal text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                        ${contentHTML}
                    </div>
                </div>
            </div>
        `;
    });
    historyHTML += '</div>';
    container.innerHTML = historyHTML;
}


// ===================================================================================
//  CONTROL FUNCTIONS - Mengelola state UI (misal: modal, tab)
// ===================================================================================

const patientRecordModal = document.getElementById('patientRecordModal');
const newPatientModal = document.getElementById('newPatientModal');
const newNoteModal = document.getElementById('newNoteModal');
const newVitalModal = document.getElementById('newVitalModal');
const newMedicationModal = document.getElementById('newMedicationModal');
const newActionModal = document.getElementById('newActionModal');
const editVisitModal = document.getElementById('editVisitModal');
const newVisitModal = document.getElementById('newVisitModal');

function toggleBodyScroll(shouldLock) {
    document.body.classList.toggle('modal-open', shouldLock);
}

/** Membuka/menutup modals */
function openPatientRecordModal() { patientRecordModal.classList.remove('hidden'); toggleBodyScroll(true); }
function closePatientRecordModal() { patientRecordModal.classList.add('hidden'); currentOpenPatientId = null; toggleBodyScroll(false); }
function openNewPatientModal() { newPatientModal.classList.remove('hidden'); toggleBodyScroll(true); }
function closeNewPatientModal() { newPatientModal.classList.add('hidden'); document.getElementById('newPatientForm').reset(); toggleBodyScroll(false); }
function openNewNoteModal() { newNoteModal.classList.remove('hidden'); }
function closeNewNoteModal() { newNoteModal.classList.add('hidden'); document.getElementById('newNoteForm').reset(); }
function openNewVitalModal() { newVitalModal.classList.remove('hidden'); }
function closeNewVitalModal() { newVitalModal.classList.add('hidden'); document.getElementById('newVitalForm').reset(); }
function openNewMedicationModal() { newMedicationModal.classList.remove('hidden'); }
function closeNewMedicationModal() { newMedicationModal.classList.add('hidden'); document.getElementById('newMedicationForm').reset(); }
function openNewActionModal() { newActionModal.classList.remove('hidden'); }
function closeNewActionModal() { newActionModal.classList.add('hidden'); document.getElementById('newActionForm').reset(); }
function openEditVisitModal(visitId) {
    const visit = database.visits.find(v => v.id === visitId);
    if (!visit) return;
    document.getElementById('edit-visit-id').value = visit.id;
    document.getElementById('edit-visit-task').value = visit.task;
    document.getElementById('edit-visit-status').value = visit.status;
    editVisitModal.classList.remove('hidden');
    toggleBodyScroll(true);
}
function closeEditVisitModal() { editVisitModal.classList.add('hidden'); toggleBodyScroll(false); }
function openNewVisitModal() {
    const patientSelect = document.getElementById('new-visit-patient');
    patientSelect.innerHTML = '<option value="">Pilih Pasien...</option>'; // Reset
    database.patients.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.id;
        option.textContent = `${patient.name} (ID: ${patient.patientId})`;
        patientSelect.appendChild(option);
    });
    newVisitModal.classList.remove('hidden');
    toggleBodyScroll(true);
}
function closeNewVisitModal() { newVisitModal.classList.add('hidden'); document.getElementById('newVisitForm').reset(); toggleBodyScroll(false); }


/** Mengelola perpindahan tab di dalam modal */
function handleTabSwitching(event) {
    const clickedButton = event.target.closest('.tab-button');
    if (!clickedButton) return;

    document.querySelectorAll('#tabs-container .tab-button').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('text-gray-500', 'hover:text-gray-700');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    clickedButton.classList.add('tab-active');
    clickedButton.classList.remove('text-gray-500', 'hover:text-gray-700');

    const tabId = clickedButton.dataset.tab;
    document.getElementById(`${tabId}-tab`).classList.remove('hidden');
}

/** Menangani penambahan pasien baru */
function handleAddNewPatient(event) {
    event.preventDefault(); 
    const name = document.getElementById('new-patient-name').value;
    const dob = document.getElementById('new-patient-dob').value;
    const gender = document.getElementById('new-patient-gender').value;
    const diagnosis = document.getElementById('new-patient-diagnosis').value;
    const phone = document.getElementById('new-patient-phone').value;
    const address = document.getElementById('new-patient-address').value;
    const allergies = document.getElementById('new-patient-allergies').value;

    const newPatientId = database.patients.length > 0 ? Math.max(...database.patients.map(p => p.id)) + 1 : 1;
    const avatarColors = ['red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newPatient = {
        id: newPatientId,
        patientId: `P-2024-${String(newPatientId).padStart(3, '0')}`,
        name: name, initials: getInitials(name), age: calculateAge(dob), dob: dob, gender: gender, phone: phone, address: address,
        emergencyContact: "-", allergies: allergies || "Tidak ada", diagnosis: diagnosis, lastVisit: "Baru", status: "Stabil",
        ui: { statusColor: "blue", avatarColor: randomColor },
        medicalRecords: { vitals: [], medications: [], notes: [], visitActions: [] }
    };

    database.patients.push(newPatient);
    renderPatientCards();
    updateStats();
    closeNewPatientModal();
}

/** Menangani penambahan catatan baru */
function handleAddNewNote(event) {
    event.preventDefault();
    if (currentOpenPatientId === null) return;

    const title = document.getElementById('new-note-title').value;
    const content = document.getElementById('new-note-content').value;
    const tags = document.getElementById('new-note-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    const newNote = {
        date: new Date().toISOString(),
        title: title, nurse: "Perawat Saat Ini", content: content, tags: tags
    };

    const patient = database.patients.find(p => p.id === currentOpenPatientId);
    if (patient) {
        patient.medicalRecords.notes.unshift(newNote);
        populateNotesTab(patient.medicalRecords.notes);
        populateHistoryTab(patient.id);
        updateStats();
    }
    
    closeNewNoteModal();
}

/** Menangani penambahan Tanda Vital baru */
function handleAddNewVital(event) {
    event.preventDefault();
    if (currentOpenPatientId === null) return;

    const bp = document.getElementById('new-vital-bp').value;
    const heartRate = document.getElementById('new-vital-hr').value;
    const bloodSugar = document.getElementById('new-vital-sugar').value;
    const spO2 = document.getElementById('new-vital-spo2').value;
    const nurse = document.getElementById('new-vital-nurse').value;

    const newVital = {
        date: new Date().toISOString(),
        bp: bp,
        heartRate: heartRate,
        bloodSugar: bloodSugar,
        spO2: spO2 + "%",
        nurse: nurse
    };

    const patient = database.patients.find(p => p.id === currentOpenPatientId);
    if (patient) {
        patient.medicalRecords.vitals.unshift(newVital);
        populateVitalsTab(patient.medicalRecords.vitals);
        populateHistoryTab(patient.id);
        updateStats();
    }

    closeNewVitalModal();
}

/** Menangani penambahan Pengobatan baru */
function handleAddNewMedication(event) {
    event.preventDefault();
    if (currentOpenPatientId === null) return;

    const name = document.getElementById('new-med-name').value;
    const dosage = document.getElementById('new-med-dosage').value;
    const frequency = document.getElementById('new-med-frequency').value;
    const status = document.getElementById('new-med-status').value;

    const newMedication = { name, dosage, frequency, status };

    const patient = database.patients.find(p => p.id === currentOpenPatientId);
    if (patient) {
        patient.medicalRecords.medications.push(newMedication);
        populateMedicationsTab(patient.medicalRecords.medications);
        populateHistoryTab(patient.id);
        updateStats();
    }
    
    closeNewMedicationModal();
}

/** Menangani penghentian Pengobatan */
function handleStopMedication(medicationName) {
    if (currentOpenPatientId === null) return;

    const patient = database.patients.find(p => p.id === currentOpenPatientId);
    if (!patient) return;

    const medication = patient.medicalRecords.medications.find(m => m.name === medicationName);
    if (medication) {
        medication.status = 'Dihentikan';
        // Render ulang tab pengobatan untuk menampilkan perubahan
        populateMedicationsTab(patient.medicalRecords.medications);
    }
}

/** Menangani penambahan Tindakan baru */
function handleAddNewAction(event) {
    event.preventDefault();
    if (currentOpenPatientId === null) return;

    const nurse = document.getElementById('new-action-nurse').value;
    const action = document.getElementById('new-action-type').value;
    const status = document.getElementById('new-action-status').value;
    const followUp = document.getElementById('new-action-followup').value;

    const newAction = {
        date: new Date().toISOString(),
        nurse, action, status, followUp
    };
    
    const patient = database.patients.find(p => p.id === currentOpenPatientId);
    if (patient) {
        patient.medicalRecords.visitActions.unshift(newAction);
        populateActionsTab(patient.medicalRecords.visitActions);
        populateHistoryTab(patient.id);
        updateStats();
    }

    closeNewActionModal();
}

/** Menangani pembaruan data kunjungan */
function handleUpdateVisit(event) {
    event.preventDefault();
    const visitId = parseInt(document.getElementById('edit-visit-id').value);
    const task = document.getElementById('edit-visit-task').value;
    const status = document.getElementById('edit-visit-status').value;

    const visit = database.visits.find(v => v.id === visitId);
    if(visit) {
        visit.task = task;
        visit.status = status;
        
        // Update status color based on status text
        if (status === 'Selesai') visit.ui.statusColor = 'green';
        else if (status === 'Dalam Perjalanan') visit.ui.statusColor = 'yellow';
        else if (status === 'Dibatalkan') visit.ui.statusColor = 'red';
        else visit.ui.statusColor = 'blue';
    }

    renderUpcomingVisits();
    closeEditVisitModal();
}

/** Menangani penambahan jadwal kunjungan baru */
function handleAddNewVisit(event) {
    event.preventDefault();
    const patientId = parseInt(document.getElementById('new-visit-patient').value);
    const time = document.getElementById('new-visit-time').value;
    const task = document.getElementById('new-visit-task').value;

    if (!patientId || !time || !task) {
        alert("Harap isi semua field!");
        return;
    }

    // Menggabungkan tanggal hari ini dengan waktu dari input
    const today = dayjs().format('YYYY-MM-DD');
    const visitDateTime = `${today}T${time}:00`; // Format ISO 8601 lokal

    const newVisitId = database.visits.length > 0 ? Math.max(...database.visits.map(v => v.id)) + 1 : 1;
    
    const newVisit = {
        id: newVisitId,
        patientId: patientId,
        date: visitDateTime,
        task: task,
        status: "Dijadwalkan",
        ui: { statusColor: "blue" }
    };
    
    database.visits.push(newVisit);
    renderUpcomingVisits(); // <--- INI KUNCI UTAMANYA
    updateStats();
    closeNewVisitModal();
}

/** Menangani proses penghapusan data pasien */
function handleDeletePatient() {
    if (currentOpenPatientId === null) return;

    // 1. Meminta kredensial (username dan password)
    const username = prompt("Untuk menghapus data, masukkan username:", "");
    // Jika user menekan tombol cancel pada prompt username
    if (username === null) {
        alert('Penghapusan dibatalkan.');
        return;
    }

    const password = prompt("Masukkan password:", "");
    // Jika user menekan tombol cancel pada prompt password
    if (password === null) {
        alert('Penghapusan dibatalkan.');
        return;
    }

    // 2. Validasi kredensial
    if (username !== 'admin' || password !== '12345') {
        alert('Username atau password salah! Penghapusan dibatalkan.');
        return; // Hentikan fungsi jika kredensial salah
    }
    
    // 3. Meminta konfirmasi akhir menggunakan window.confirm
    const isConfirmed = window.confirm('Apakah Anda yakin ingin menghapus data pasien ini? Tindakan ini tidak dapat dibatalkan.');

    // 4. Jika user mengkonfirmasi untuk menghapus
    if (isConfirmed) {
        const patientIndex = database.patients.findIndex(p => p.id === currentOpenPatientId);
        
        if (patientIndex > -1) {
            // Hapus pasien dari array `database.patients`
            database.patients.splice(patientIndex, 1);
            
            // Hapus juga semua jadwal kunjungan yang terkait dengan pasien ini
            database.visits = database.visits.filter(v => v.patientId !== currentOpenPatientId);

            // Tutup modal detail pasien
            closePatientRecordModal();
            
            // Render ulang UI untuk merefleksikan perubahan
            renderPatientCards();
            renderUpcomingVisits();
            updateStats();
            
            // Beri notifikasi bahwa data berhasil dihapus
            alert('Data pasien berhasil dihapus.');
        }
    } else {
        // Jika user membatalkan konfirmasi
        alert('Penghapusan dibatalkan.');
    }
}


// ===================================================================================
//  EVENT LISTENERS - Titik masuk utama interaksi pengguna
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    renderPatientCards();
    renderUpcomingVisits();
    updateStats();

    // Inisialisasi dan perbarui jam setiap detik
    updateClock();
    setInterval(updateClock, 1000);

    document.getElementById('recent-patients-container').addEventListener('click', (event) => {
        const card = event.target.closest('.patient-card');
        if (card) {
            const patientId = parseInt(card.dataset.patientId);
            populatePatientModal(patientId);
        }
    });
    
    // Event listener untuk tabel kunjungan
    document.getElementById('upcoming-visits-tbody').addEventListener('click', (event) => {
        const viewButton = event.target.closest('.view-visit-button');
        const editButton = event.target.closest('.edit-visit-button');

        if (viewButton) {
            const patientId = parseInt(viewButton.dataset.patientId);
            populatePatientModal(patientId);
        }
        
        if(editButton) {
            const visitId = parseInt(editButton.dataset.visitId);
            openEditVisitModal(visitId);
        }
    });

    document.getElementById('closeModalButtonHeader').addEventListener('click', closePatientRecordModal);
    document.getElementById('closeModalButtonFooter').addEventListener('click', closePatientRecordModal);
    document.getElementById('tabs-container').addEventListener('click', handleTabSwitching);

    patientRecordModal.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-new-vital-button')) openNewVitalModal();
        if (event.target.classList.contains('add-new-medication-button')) openNewMedicationModal();
        if (event.target.classList.contains('add-new-action-button')) openNewActionModal();
        if (event.target.closest('#deletePatientButton')) {
            handleDeletePatient();
        }

        // Event listener untuk tombol Hentikan di tab pengobatan
        const stopMedButton = event.target.closest('.stop-med-button');
        if (stopMedButton) {
            const medName = stopMedButton.dataset.medName;
            handleStopMedication(medName);
        }
    });
    
    document.getElementById('addNewRecordFooterButton').addEventListener('click', () => {
        const activeTab = document.querySelector('#tabs-container .tab-button.tab-active');
        if (!activeTab) return;
        const tabName = activeTab.dataset.tab;
        if (tabName === 'vitals') openNewVitalModal();
        if (tabName === 'medications') openNewMedicationModal();
        if (tabName === 'actions') openNewActionModal();
        if (tabName === 'notes') openNewNoteModal();
    });

    document.getElementById('newRecordButton').addEventListener('click', openNewPatientModal);
    document.getElementById('cancelNewPatientButton').addEventListener('click', closeNewPatientModal);
    document.getElementById('newPatientForm').addEventListener('submit', handleAddNewPatient);

    document.getElementById('cancelNewNoteButton').addEventListener('click', closeNewNoteModal);
    document.getElementById('newNoteForm').addEventListener('submit', handleAddNewNote);
    
    document.getElementById('cancelNewVitalButton').addEventListener('click', closeNewVitalModal);
    document.getElementById('newVitalForm').addEventListener('submit', handleAddNewVital);

    document.getElementById('cancelNewMedicationButton').addEventListener('click', closeNewMedicationModal);
    document.getElementById('newMedicationForm').addEventListener('submit', handleAddNewMedication);

    document.getElementById('cancelNewActionButton').addEventListener('click', closeNewActionModal);
    document.getElementById('newActionForm').addEventListener('submit', handleAddNewAction);
    
    // Event listeners untuk modal Edit Kunjungan
    document.getElementById('cancelEditVisitButton').addEventListener('click', closeEditVisitModal);
    document.getElementById('editVisitForm').addEventListener('submit', handleUpdateVisit);
    
    // Event listeners untuk modal Jadwal Kunjungan Baru
    document.getElementById('addVisitButton').addEventListener('click', openNewVisitModal);
    document.getElementById('cancelNewVisitButton').addEventListener('click', closeNewVisitModal);
    document.getElementById('newVisitForm').addEventListener('submit', handleAddNewVisit);
});
