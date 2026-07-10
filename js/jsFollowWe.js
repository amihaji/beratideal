
/*******************************************
APLIKASI BERATIDEAL
Database :  dbWETools (SurveyData dan DataWE)
FOLLOWUP WE :
- File pdf dapat dikirim ke email dan wa
- Inputan untuk Data Sponsor/Pengundang
- Hasil Survey TIDAK ditampilkan ke layar
- Form Dashboard WE : Lihat, Edit dan Hapus
- Fiture Kirim WA Follow UP : Isi Pesan, Pilih Record untuk kirim WA
- Fiture Emoticon untuk kirim pesan
*******************************************/

// ********* Deklarasi  Public **********
// url database :  dbWETools (SurveyData dan DataWE)
const URL_dbWETools = 'https://script.google.com/macros/s/AKfycbzF6Tcp32ER0GANh0igUw-iJbTM-OHUNCabkFTqgsZ1x48sWQra-x56hlWqojHpGQ6h/exec';
const userID     = localStorage.getItem('userID') || '';
const userToken  = localStorage.getItem('userToken') || '';
const userLevel  = localStorage.getItem('userLevel') || 'User';
// ******************************************************

// Defenisikan semua constanta 
const editModal            = new bootstrap.Modal(document.getElementById('editModal'));
const viewModal            = new bootstrap.Modal(document.getElementById('viewModal'));
let viewModalScrollSyncing = false;
const startFollowUpButton  = document.getElementById('startFollowUpButton');
const cancelFollowUpButton = document.getElementById('cancelFollowUpButton');
const sendWaButton         = document.getElementById('sendWaButton');
const normalToolbar        = document.getElementById('normalToolbar');
const followUpToolbar      = document.getElementById('followUpToolbar');
const followUpMessageBox   = document.getElementById('followUpMessageBox');
const filterNamaInput   = document.getElementById('filterNama');
const filterButton         = document.getElementById('filterButton');
const checkAllCheckbox     = document.getElementById('checkAll');
const waMessageInput       = document.getElementById('waMessage');
const waProgressContainer  = document.getElementById('waProgressContainer');
const waProgressBar        = document.getElementById('waProgressBar');
    
const filterButtonEl = document.getElementById('filterButton');
if (filterButtonEl) filterButtonEl.addEventListener('click', loadTableData);
const filterNamaEl = document.getElementById('filterNama');
if (filterNamaEl) {
    filterNamaEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            loadTableData();
        }
    });
}
const saveChangesButtonEl = document.getElementById('saveChangesButton');
if (saveChangesButtonEl) saveChangesButtonEl.addEventListener('click', saveChanges);
const exportButtonEl = document.getElementById('exportButton');
if (exportButtonEl) exportButtonEl.addEventListener('click', exportToExcel);

function resetWaProgress() {
    if (!waProgressContainer || !waProgressBar) return;
    waProgressContainer.style.display = 'none';
    waProgressBar.style.width = '0%';
    waProgressBar.textContent = '0%';
    waProgressBar.setAttribute('aria-valuenow', '0');
}

function setFollowUpMode(isActive, options = {}) {
    const { clearMessage = false, clearSelection = false, keepProgress = false } = options;

    if (filterNamaInput) filterNamaInput.disabled = isActive;
    if (filterButton) filterButton.disabled = isActive;

    if (normalToolbar) normalToolbar.classList.toggle('sembunyikan', isActive);
    if (followUpToolbar) followUpToolbar.classList.toggle('sembunyikan', !isActive);
    if (followUpMessageBox) followUpMessageBox.style.display = isActive ? 'block' : 'none';

    document.querySelectorAll('.rowCheckbox').forEach((cb) => {
        cb.classList.toggle('d-none', !isActive);
        if (!isActive && clearSelection) cb.checked = false;
    });

    document.querySelectorAll('.action-icon').forEach((icon) => {
        icon.classList.toggle('disabled-action', isActive);
    });

    if (!isActive) {
        if (clearMessage && waMessageInput) waMessageInput.value = '';
        if (clearSelection && checkAllCheckbox) checkAllCheckbox.checked = false;
        if (!keepProgress) resetWaProgress();
    }
}

// **************************************
// Aktif dan Non Aktifkan Event Listener 
// **************************************
if (startFollowUpButton) {
    startFollowUpButton.addEventListener('click', () => {
        setFollowUpMode(true);
    });
}

// *************************************
// Aktif dan Non Aktifkan Event Listener
// ************************************* 
if (cancelFollowUpButton) {
    cancelFollowUpButton.addEventListener('click', () => {
        setFollowUpMode(false, { clearMessage: true, clearSelection: true });
    });
}

// ****************
// Check semuanya
// ****************
if (checkAllCheckbox) {
    checkAllCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;
        document.querySelectorAll('.rowCheckbox').forEach(cb => cb.checked = isChecked);
    });
}

// ********************
// Tampilkan spinner
// ********************
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
}

function normalizeFollowUpWEKeyword(value) {
    return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function filterFollowUpWERecordsByName(rows, keyword) {
    const normalizedKeyword = normalizeFollowUpWEKeyword(keyword);
    if (!Array.isArray(rows)) return [];
    if (!normalizedKeyword) return rows;

    return rows.filter((row) => {
        const nama = normalizeFollowUpWEKeyword(row[2]);
        return nama.includes(normalizedKeyword);
    });
}

function renderFollowUpWETableRows(rows, emptyMessage) {
    const tableBody = document.getElementById('dataTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="8">${emptyMessage}</td></tr>`;
        return;
    }

    rows.forEach((row) => {
        const tr        = document.createElement('tr');
        const rowIndex  = row[0];
        const tgl       = formatTanggal(row[1]);
        const nama      = row[2] || '';
        const hp        = row[3] || '';
        const email     = row[4] || '';
        const sponsor   = row[29] || '';
        const hpSponsor = row[30] || '';
        const safeNama      = String(nama).replace(/'/g, "\\'");
        const safeHp        = String(hp).replace(/'/g, "\\'");
        const safeEmail     = String(email).replace(/'/g, "\\'");
        const safeSponsor   = String(sponsor).replace(/'/g, "\\'");
        const safeHpSponsor = String(hpSponsor).replace(/'/g, "\\'");

        tr.innerHTML = `
            <td><input type="checkbox" class="rowCheckbox d-none"></td>
            <td>${tgl}</td>
            <td>${nama}</td>
            <td>${hp}</td>
            <td>${email}</td>
            <td>${sponsor}</td>
            <td>${hpSponsor}</td>
            <td class="actions-col">
                <a href="#" class="action-icon ${userLevel === 'User' ? 'disabled-action' : ''}" 
                    onclick="${userLevel !== 'User' ? `viewRecord(${rowIndex})` : 'return false;'}" 
                    title="Lihat"><i class="fas fa-eye"></i></a>

                <a href="#" class="action-icon ${userLevel === 'User' ? 'disabled-action' : ''}" 
                    onclick="${userLevel !== 'User' ? `openEditModal(${rowIndex}, '${safeNama}', '${safeHp}', '${safeEmail}', '${safeSponsor}', '${safeHpSponsor}')` : 'return false;'}" 
                    title="Edit"><i class="fas fa-edit"></i></a>

                <a href="#" class="action-icon ${userLevel === 'User' ? 'disabled-action' : ''}" 
                    onclick="${userLevel !== 'User' ? `deleteRow(${rowIndex})` : 'return false;'}" 
                    title="Hapus"><i class="fas fa-trash"></i></a>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function cleanupFollowUpWEJsonp(script, callbackName) {
    delete window[callbackName];
    if (script && document.body.contains(script)) {
        document.body.removeChild(script);
    }
}

function sendFollowUpWARequest(target, message) {
    return new Promise((resolve) => {
        const callbackName = 'send_wa_cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
        const script = document.createElement('script');

        script.onerror = () => {
            cleanupFollowUpWEJsonp(script, callbackName);
            resolve({ status: 'error', message: 'Gagal menghubungi server FollowUp WA.' });
        };

        window[callbackName] = (response) => {
            cleanupFollowUpWEJsonp(script, callbackName);
            resolve(response || { status: 'error', message: 'Respons server FollowUp WA kosong.' });
        };

        script.src = `${URL_dbWETools}?action=sendFollowUpWA&target=${encodeURIComponent(target)}&message=${encodeURIComponent(message)}&callback=${callbackName}`;
        document.body.appendChild(script);
    });
}

// ************************
// Tampilkan Tabel Data  
// ************************
function loadTableData() {
    showLoading(true);
    const filterValue  = document.getElementById('filterNama').value.trim();
    const callbackName = 'data_cb_' + Date.now();
    const script       = document.createElement('script');
    script.src         = `${URL_dbWETools}?action=getDataWE&filter=${encodeURIComponent(filterValue)}&callback=${callbackName}`;
   
    script.onerror = () => {
        cleanupFollowUpWEJsonp(script, callbackName);
        showPesan('error', 'ERROR : Gagal mengambil data prospek WE.');
        showLoading(false);
    };

    window[callbackName] = (response) => {
        if (response.status === 'success') {
            const filteredRows = filterFollowUpWERecordsByName(response.data, filterValue);

            if (response.data.length === 0) {
                renderFollowUpWETableRows([], 'Tidak ada data prospek WE.');
            } else if (filteredRows.length === 0) {
                renderFollowUpWETableRows([], 'Data dengan nama tersebut tidak ditemukan.');
                showPesan('warning', 'PERHATIAN : Data dengan nama tersebut tidak ditemukan.');
            } else {
                renderFollowUpWETableRows(filteredRows, 'Tidak ada data prospek WE.');
            }
        } else {
            showPesan('warning', " ERROR : " + response.message);
            if(response.message.includes('Sesi tidak valid'));
        }
        cleanupFollowUpWEJsonp(script, callbackName);
        showLoading(false);
    };
    document.body.appendChild(script);
}

// ************************************
// Kirim WA hanya ke record tercentang
// ************************************
if (sendWaButton) {
    sendWaButton.addEventListener('click', () => {
        const messageTemplate = waMessageInput ? waMessageInput.value.trim() : '';
        if (!messageTemplate) {
            showPesan('warning', " PERHATIAN : Silahkan isi pesan FollowUp");
            return;
        }

        const selectedRows = [];
        document.querySelectorAll('.rowCheckbox').forEach((cb) => {
            if (cb.checked) {
                const tr = cb.closest('tr');
                const nama = tr.children[2].textContent.trim();
                const nomor = tr.children[3].textContent.trim();
                const sponsor = tr.children[5].textContent.trim();
                selectedRows.push({ nama, nomor, sponsor });
            }
        });

        if (selectedRows.length === 0) {
            showPesan('warning', " PERHATIAN : Pilih minimal satu record untuk mengirim pesan follow up");
            return;
        }

        if (!waProgressContainer || !waProgressBar) return;
        waProgressBar.style.width = '0%';
        waProgressBar.textContent = `0 dari ${selectedRows.length}`;
        waProgressBar.setAttribute('aria-valuenow', '0');
        waProgressContainer.style.display = 'block';

        if (filterNamaInput) filterNamaInput.disabled = true;
        if (filterButton) filterButton.disabled = true;
        sendWaButton.disabled = true;
        if (cancelFollowUpButton) cancelFollowUpButton.disabled = true;

        let completedCount = 0;
        let failedCount = 0;
        const failedRecipients = [];

        selectedRows.forEach((row, index) => {
            setTimeout(() => {
                const message = messageTemplate.replace('{nama}', row.nama).replace('{sponsor}', row.sponsor);
                sendFollowUpWARequest(row.nomor, message)
                .then((response) => {
                    if (!response || response.status !== 'success') {
                        failedCount++;
                        failedRecipients.push(`${row.nama} (${row.nomor})`);
                        console.error('Gagal kirim FollowUp WA:', row, response);
                    }
                })
                .finally(() => {
                    completedCount++;
                    const progress = Math.round((completedCount / selectedRows.length) * 100);
                    waProgressBar.style.width = progress + '%';
                    waProgressBar.textContent = `${completedCount} dari ${selectedRows.length}`;
                    waProgressBar.setAttribute('aria-valuenow', String(progress));

                    if (completedCount === selectedRows.length) {
                        waProgressBar.style.width = '100%';
                        waProgressBar.textContent = failedCount === 0
                            ? '100%'
                            : `Sukses ${selectedRows.length - failedCount}, Gagal ${failedCount}`;
                        waProgressBar.setAttribute('aria-valuenow', '100');
                        setTimeout(() => {
                            sendWaButton.disabled = false;
                            if (cancelFollowUpButton) cancelFollowUpButton.disabled = false;

                            if (failedCount === 0) {
                                showPesan('success', " BERHASIL : mengirim seluruh pesan WA");
                                setFollowUpMode(false, { clearMessage: true, clearSelection: true });
                                if (filterNamaInput) filterNamaInput.value = '';
                            } else {
                                showPesan('warning', ` PERHATIAN : ${failedCount} pesan WA gagal dikirim. Silahkan cek console browser.`, 5000);
                                console.warn('Daftar FollowUp WA gagal:', failedRecipients);
                            }
                        }, 3000);
                    }
                });
            }, index * 2500);
        });
    });
}

// ***************************
// Fungsi untuk mengedit data
// ***************************
function openEditModal(rowIndex, nama, hp, email, sponsor, hpSponsor) {
    document.getElementById('editRowIndex').value = rowIndex;
    document.getElementById('editNama').value = nama;
    document.getElementById('editNomorHp').value = hp;
    document.getElementById('editEmail').value = email;
    document.getElementById('editSponsor').value = sponsor;
    document.getElementById('editHpSponsor').value = hpSponsor;
    editModal.show();
}

// ****************************************
// Fungsi untuk menyimpan hasil pengeditan
// ****************************************
function saveChanges() {
    showLoading(true);
    const payload = {
        action: 'editData',
        userToken: userToken,  
        rowIndex:  document.getElementById('editRowIndex').value,
        nama:      document.getElementById('editNama').value,
        nomorHp:   document.getElementById('editNomorHp').value,
        email:     document.getElementById('editEmail').value,
        sponsor:   document.getElementById('editSponsor').value,
        hpSponsor: document.getElementById('editHpSponsor').value,
    };
    fetch(URL_dbWETools, {
       method: 'POST', 
       mode: 'no-cors', 
       headers: {'Content-Type': 'text/plain'}, 
       body: JSON.stringify(payload)
    }).finally(() => {
       setTimeout(() => {
           editModal.hide();
           setTimeout(loadTableData, 500);
       }, 700);
    });
    showPesanEdit('success', " BERHASIL : menyimpan data");
}

// *****************************
// Fungsi untuk menghapus data
// *****************************
async function deleteRow(rowIndex) {
    const confirmed = await showConfirm(`Anda yakin ingin menghapus data baris ke-${rowIndex}?`, "Konfirmasi Hapus");
    if (!confirmed) return;
    showLoading(true);
    const payload = { 
        action: 'deleteData', 
        userToken: userToken,  
        rowIndex: rowIndex 
    };
    fetch(URL_dbWETools, {
        method: 'POST', 
        mode: 'no-cors', 
        headers: {'Content-Type': 'text/plain'}, 
        body: JSON.stringify(payload)
    }).finally(() => {
       setTimeout(loadTableData, 500);
    });
    showPesan('warning', " PERHATIAN : data berhasil dihapus");
}

// ************************************************
// Fungsi untuk melihat data hasil evaluasi wetools
// ************************************************
function setupViewModalHorizontalScrollHelper() {
    const content = document.querySelector('#viewModal .followupwe-view-content');
    const helper = document.getElementById('viewModalScrollHelper');
    const bottomScroll = document.getElementById('viewModalBottomScroll');
    const bottomScrollInner = document.getElementById('viewModalBottomScrollInner');

    if (!helper || !bottomScroll || !bottomScrollInner) return;
    if (!content) {
        helper.style.display = 'none';
        return;
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const hasHorizontalOverflow = content.scrollWidth > content.clientWidth + 1;

    bottomScrollInner.style.width = `${content.scrollWidth}px`;
    helper.style.display = isMobile && hasHorizontalOverflow ? 'block' : 'none';

    if (!content.dataset.scrollSyncBound) {
        content.addEventListener('scroll', () => {
            if (viewModalScrollSyncing) return;
            viewModalScrollSyncing = true;
            bottomScroll.scrollLeft = content.scrollLeft;
            requestAnimationFrame(() => { viewModalScrollSyncing = false; });
        });
        content.dataset.scrollSyncBound = 'true';
    }

    if (!bottomScroll.dataset.scrollSyncBound) {
        bottomScroll.addEventListener('scroll', () => {
            const activeContent = document.querySelector('#viewModal .followupwe-view-content');
            if (!activeContent || viewModalScrollSyncing) return;
            viewModalScrollSyncing = true;
            activeContent.scrollLeft = bottomScroll.scrollLeft;
            requestAnimationFrame(() => { viewModalScrollSyncing = false; });
        });
        bottomScroll.dataset.scrollSyncBound = 'true';
    }

    bottomScroll.scrollLeft = content.scrollLeft;
}

function viewRecord(rowIndex) {
    showLoading(true);
    const callbackName = 'view_cb_' + Date.now();
    const script       = document.createElement('script');
    script.src         = `${URL_dbWETools}?action=getSingleRecord&rowIndex=${rowIndex}&userToken=${userToken}&callback=${callbackName}`;

    window[callbackName] = (response) => {
        if (response.status === 'success') {
            const data = response.data;
            const viewBody = document.getElementById('viewModalBody');

            const fungsionalHTML = (data.fungsional || []).map(item => `
                <tr>
                    <td>${item.label || "-"}</td>
                    <td style="text-align:center;">${item.jawaban || "-"}</td>
                </tr>`).join('');

            const evaluasiHTML = (data.evaluasi || []).map(item => `
                <tr>
                    <td class="followupwe-param-col">${item.param || "-"}</td>
                    <td class="text-center followupwe-hasil-col">${item.hasil || "-"}</td>
                    <td class="text-center followupwe-referensi-col">${item.ideal || "-"}</td>
                    <td class="text-center followupwe-satuan-col">${item.satuan || "-"}</td>
                    <td class="followupwe-keterangan-col" style="white-space:pre-line">${item.penjelasan || "-"}</td>
                </tr>`).join('');

            viewBody.innerHTML = `
                <div class="followupwe-view-content">
                <!-- DATA PROFILE -->
                <h6 class="mt-4"><i class="fas fa-user me-2"></i>Data Profile</h6>
                <table class="table table-bordered">
                    <tr><th style="background-color:#4d94ff;">Tgl Survey</th>
                        <td style="background-color:#4d94ff;"><b>${data.tanggal || "-"}</b></td>
                    </tr>
                    <tr><td>Nama</td><td>${data.nama}</td></tr>
                    <tr><td>No. HP</td><td>${data.hp}</td></tr>
                    <tr><td>Email</td><td>${data.email}</td></tr>
                    <tr><td>Umur</td><td>${data.umur} tahun</td></tr>
                    <tr><td>Jenis Kelamin</td><td>${data.jk}</td></tr>
                    <tr><td>Berat Badan</td><td>${data.berat} kg</td></tr>
                    <tr><td>Tinggi Badan</td><td>${data.tinggi} cm</td></tr>
                    <tr><td>Lingkar Perut</td><td>${data.lingkar} cm</td></tr>
                    <tr><td>Aktivitas Fisik</td><td>${data.aktivitas}</td></tr>
                </table>

                <!-- DATA FUNGSIONAL -->
                <h6 class="mt-4"><i class="fas fa-list-check me-2"></i>Status Fungsional</h6>
                <table class="table table-bordered">
                    <thead>
                        <tr><th style="background-color:#4d94ff; width:85%;">Pertanyaan</th>
                        <th style="background-color:#4d94ff; text-align:center; width:15%;">Jawaban</th></tr>
                    </thead>
                    <tbody>${fungsionalHTML}</tbody>
                </table>

                <!-- DATA EVALUASI -->
                <h6 class="mt-4"><i class="fas fa-heartbeat me-2"></i>Evaluasi Parameter</h6>
                <table class="table table-bordered followupwe-evaluasi-table">
                    <thead>
                        <tr>
                            <th class="followupwe-param-col" style="background-color:#4d94ff; width:25%;">Parameter</th>
                            <th class="followupwe-hasil-col" style="background-color:#4d94ff; width:5%; text-align:center;">Hasil</th>
                            <th class="followupwe-referensi-col" style="background-color:#4d94ff; width:15%; text-align:center;">Referensi</th>
                            <th class="followupwe-satuan-col" style="background-color:#4d94ff; width:5%; text-align:center;">Satuan</th>
                            <th class="followupwe-keterangan-col" style="background-color:#4d94ff; width:50%;">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>${evaluasiHTML}</tbody>
                </table>

                <!-- DATA KESIMPULAN DAN REKOMENDASI -->
                <h6 class="mt-4">Kesimpulan & Rekomendasi</h6>
                              
                <table class="table table-bordered followupwe-summary-table">
                    <tbody>
                    <tr><th class="followupwe-summary-label" style="background-color:#4d94ff; width:15%;">Skor</th>
                        <td class="followupwe-summary-content" style="width:85%;">Persentase kebugaran anda : <strong>${data.persen}</strong></td>
                    </tr>
                    <tr><th class="followupwe-summary-label" style="background-color:#4d94ff; width:15%;">Kesimpulan </th>
                        <td class="followupwe-summary-content" style="width:85%;">${data.kesimpulan}</td>
                    </tr>
                    <tr><th class="followupwe-summary-label" style="background-color:#4d94ff; width:15%;">Rekomendasi</th>
                        <td class="followupwe-summary-content" style="width:85%;">${data.rekomendasi}</td>
                    </tr>
                    </tbody>
                </table>
                </div>`;
 
                viewModal.show();
                setTimeout(setupViewModalHorizontalScrollHelper, 120);
        } else {
           //alert(response.message);
           showPesan('warning', " PERHATIAN : " + response.message);
        }
           showLoading(false);
    };
    document.body.appendChild(script);
}

// *************************************
// Fungsi untuk mengexport data ke Excel
// *************************************
function exportToExcel() {
    const table = document.querySelector(".table-box table");
    let csv = [];

    for (const row of table.rows) {
        let rowData = [];

        // Ambil sel dari index 1 sampai index ke-6 (lewatkan checkbox dan kolom aksi)
        for (let i = 1; i <= 6; i++) {
            rowData.push('"' + row.cells[i].innerText.replace(/"/g, '""') + '"');
        }
        csv.push(rowData.join(','));
    }

    const csvContent = "data:text/csv;charset=utf-8," + csv.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "DataSurvey.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showPesan('success', " BERHASIL : mengekspor data");
}

// *****************************
// Format penanggalan Indonesia
// *****************************
function formatTanggal(tanggalISO) {
    if (!tanggalISO) return ''; // Kembalikan string kosong jika tanggal tidak ada
        
    try {
        const d = new Date(tanggalISO);
        // getMonth() dimulai dari 0 (Januari=0), jadi kita tambah 1
        const hari = String(d.getDate()).padStart(2, '0');
        const bulan = String(d.getMonth() + 1).padStart(2, '0');
        const tahun = d.getFullYear();
        return `${hari}-${bulan}-${tahun}`;
    } catch (e) {
        // Jika format tanggal tidak valid, kembalikan apa adanya
        return tanggalISO;
    }
}

// ***************************
// Inisialisasi UI FollowUp WE
// **************************
function initFollowWeUI() {
    if (window.followWeUiInitialized) return;
    window.followWeUiInitialized = true;

    const viewModalEl = document.getElementById('viewModal');
    if (viewModalEl) {
        viewModalEl.addEventListener('shown.bs.modal', () => {
            setTimeout(setupViewModalHorizontalScrollHelper, 80);
        });
        viewModalEl.addEventListener('hidden.bs.modal', () => {
            const helper = document.getElementById('viewModalScrollHelper');
            if (helper) helper.style.display = 'none';
        });
    }

    window.addEventListener('resize', () => {
        if (document.getElementById('viewModal')?.classList.contains('show')) {
            setupViewModalHorizontalScrollHelper();
        }
    });

    const editModalEl = document.getElementById('editModal');
    if (editModalEl) {
        editModalEl.addEventListener('hidden.bs.modal', () => {
            const box = document.getElementById('pesanNotifEditBox');
            if (box) box.style.display = 'none';
        });
    }

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFollowWeUI, { once: true });
} else {
    initFollowWeUI();
}

// *****************************************
// Pesan Notifikasi untuk di Form Tabel User
// *****************************************
function showPesan(type, message, duration = 3000) {
  const box      = document.getElementById('pesanNotification');
  const icon     = document.getElementById('pesanNotifIcon');
  const text     = document.getElementById('pesanNotifText');

  // Reset class
  box.className  = 'notification-message';
  icon.className = 'pesan-notif-icon';

  if (type === 'error') {
    box.classList.add('notification-error');
    icon.classList.add('fas', 'fa-times-circle');
  } else if (type === 'success') {
    box.classList.add('notification-success');
    icon.classList.add('fas', 'fa-check-circle');
  } else if (type === 'warning') {
    box.classList.add('notification-warning');
    icon.classList.add('fas', 'fa-exclamation-circle');
  }
  text.textContent  = message;
  box.style.display = 'flex';
  setTimeout(() => {box.style.display = 'none';}, duration);
}

function showPesanEdit(type, message, duration = 2500) {
  const box  = document.getElementById('pesanNotifEditBox');
  const icon = document.getElementById('pesanNotifEditIcon');
  const text = document.getElementById('pesanNotifEditText');
  if (!box || !icon || !text) return;

  box.className  = 'notification-message modal-user-message';
  icon.className = 'pesan-notif-icon me-2';

  if (type === 'error') {
    box.classList.add('notification-error');
    icon.classList.add('fas', 'fa-times-circle');
  } else if (type === 'success') {
    box.classList.add('notification-success');
    icon.classList.add('fas', 'fa-check-circle');
  } else if (type === 'warning') {
    box.classList.add('notification-warning');
    icon.classList.add('fas', 'fa-exclamation-circle');
  }

  text.textContent  = message;
  box.style.display = 'flex';
  setTimeout(() => { box.style.display = 'none'; }, duration);
}
