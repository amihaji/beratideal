
/*******************************************
APLIKASI BERATIDEAL
Database :  dbWETools (SurveyData dan DataWE)
FOLLOWUP WE :
- Menghasilkan file pdf
- File pdf dapat dikirim ke email dan wa
- Penambahan Inputan untuk Data Sponsor/Pengundang
- Hasil Survey TIDAK ditampilkan ke layar
- Form Dashboard WE : Lihat, Edit dan Hapus
- Tambah Fiture Kirim WA Follow UP : Isi Pesan, Pilih Record untuk kirim WA
- Tambah Fiture Emoticon untuk kirim pesan
*******************************************/

// ********* Deklarasi  Public **********
// url database :  dbWETools (SurveyData dan DataWE)
const URL_dbWETools = 'https://script.google.com/macros/s/AKfycbx_c6LpqIcgCyr2NYbHdEAc3-kOc-EiQDH7pBUygFGFWR1aizQvunFbhox0QE0kpaF-/exec';
const userID     = localStorage.getItem('userID') || '';
const userToken  = localStorage.getItem('userToken') || '';
const userLevel  = localStorage.getItem('userLevel') || 'User';
// ******************************************************

// Defenisikan semua constanta 
const editModal            = new bootstrap.Modal(document.getElementById('editModal'));
const viewModal            = new bootstrap.Modal(document.getElementById('viewModal'));
const startFollowUpButton  = document.getElementById('startFollowUpButton');
const cancelFollowUpButton = document.getElementById('cancelFollowUpButton');
const sendWaButton         = document.getElementById('sendWaButton');
const normalToolbar        = document.getElementById('normalToolbar');
const followUpToolbar      = document.getElementById('followUpToolbar');
const followUpMessageBox   = document.getElementById('followUpMessageBox');
    
const filterButtonEl = document.getElementById('filterButton');
if (filterButtonEl) filterButtonEl.addEventListener('click', loadTableData);
const saveChangesButtonEl = document.getElementById('saveChangesButton');
if (saveChangesButtonEl) saveChangesButtonEl.addEventListener('click', saveChanges);
const exportButtonEl = document.getElementById('exportButton');
if (exportButtonEl) exportButtonEl.addEventListener('click', exportToExcel);

// **************************************
// Aktif dan Non Aktifkan Event Listener 
// **************************************
document.getElementById('startFollowUpButton').addEventListener('click', () => {
    // Non Aktifkan Toolbar Filter dan Button Filter
    document.getElementById('filterSponsor').disabled = true;
    document.getElementById('filterButton').disabled = true;
    // Menampilkan Toolbar Normal dan MessageBox
    normalToolbar.classList.add('sembunyikan');
    followUpMessageBox.style.display = 'block'; 
    // Menyembunyikan Toolbar Followup dan checkbox
    followUpToolbar.classList.remove('sembunyikan');
    document.querySelectorAll('.rowCheckbox').forEach(cb => cb.classList.remove('d-none'));
    // Non Aktifkan icon-icon View, Edit dan Hapus
    document.querySelectorAll('.action-icon').forEach(icon => icon.classList.add('disabled-action'));
});

// *************************************
// Aktif dan Non Aktifkan Event Listener
// ************************************* 
document.getElementById('cancelFollowUpButton').addEventListener('click', () => {
    // Aktifkan Toolbar Filter dan Button Filter
    document.getElementById('filterSponsor').disabled = false;
    document.getElementById('filterButton').disabled = false;
    // Menyembunyikan Toolbar Normal dan MessageBox
    normalToolbar.classList.remove('sembunyikan');
    followUpMessageBox.style.display = 'none';
    // Menampilkan Toolbar Followup dan checkbox
    followUpToolbar.classList.add('sembunyikan');
    document.querySelectorAll('.rowCheckbox').forEach(cb => cb.classList.add('d-none'));
    // Aktifkan kembali icon-icon View, Edit dan Hapus   
    document.querySelectorAll('.action-icon').forEach(icon => icon.classList.remove('disabled-action'));
    // Kosongkan inputan text area
    document.getElementById('waMessage').value = '';
});

// ****************
// Check semuanya
// ****************
document.getElementById('checkAll').addEventListener('change', function() {
    const isChecked = this.checked;
    document.querySelectorAll('.rowCheckbox').forEach(cb => cb.checked = isChecked);
});

// ********************
// Tampilkan spinner
// ********************
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
}

// ************************
// Tampilkan Tabel Data  
// ************************
function loadTableData() {
    showLoading(true);
    const filterValue  = document.getElementById('filterSponsor').value;
    const callbackName = 'data_cb_' + Date.now();
    const script       = document.createElement('script');
    script.src         = `${URL_dbWETools}?action=getDataWE&filter=${encodeURIComponent(filterValue)}&callback=${callbackName}`;
   
    script.onerror = () => { alert('Gagal mengambil data.'); showLoading(false); };

    window[callbackName] = (response) => {
        const tableBody  = document.getElementById('dataTableBody');
        tableBody.innerHTML = '';
        if (response.status === 'success') {
            response.data.forEach(row => {
                const tr        = document.createElement('tr');
                const rowIndex  = row[0];
                const tgl       = formatTanggal(row[1]); // Format tanggal Indonesia
                const nama      = row[2] || '';
                const hp        = row[3] || '';
                const email     = row[4] || '';
                const sponsor   = row[29] || '';
                const hpSponsor = row[30] || '';
                // Ubah data menjadi string sebelum menggunakan replace()
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
        } else {
            //alert(response.message);
            showPesan('warning', " ERROR : " + response.message);
            if(response.message.includes('Sesi tidak valid')); 
        }
        showLoading(false);
    };
    document.body.appendChild(script);
}

// ************************************
// Kirim WA hanya ke record tercentang
// ************************************
document.getElementById('sendWaButton').addEventListener('click', () => {
    const messageTemplate = document.getElementById('waMessage').value.trim();
    if (!messageTemplate) {
        // alert('Silahkan isi pesan follow up.');
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
            const hpSponsor = tr.children[6].textContent.trim();
            selectedRows.push({ nama, nomor, sponsor, hpSponsor });
        }
    });

    if (selectedRows.length === 0) {
        // alert('Pilih minimal satu record untuk mengirim pesan follow up.');
        showPesan('warning', " PERHATIAN : Pilih minimal satu record untuk mengirim pesan follow up");
        return;
    }
    // Konfigurasi API FONNTE
    const TokenFonnte = "Ekjb4bsxt4W6BcXHr4vE";
    const url         = "https://api.fonnte.com/send";

    // Inisialisasi progressbar
    const waProgressContainer = document.getElementById('waProgressContainer');
    const waProgressBar       = document.getElementById('waProgressBar');
    waProgressBar.style.width = '0%';
    waProgressBar.textContent = `0 dari ${selectedRows.length}`;
    waProgressContainer.style.display = 'block';

    // Non Aktifkan tombol-tombol
    document.getElementById('filterSponsor').disabled = true;
    document.getElementById('filterButton').disabled  = true;
    document.getElementById('sendWaButton').disabled  = true;
    document.getElementById('cancelFollowUpButton').disabled  = true;
    
    let completedCount = 0;

    selectedRows.forEach((row, index) => {
        setTimeout(() => {
            const message        = messageTemplate.replace('{nama}', row.nama).replace('{sponsor}', row.sponsor);
            const noWaUser       = "62" + row.nomor.replace(/^0+/, "");
            const noWaSponsor    = "62" + row.hpSponsor.replace(/^0+/, "");
            const payloadUser    = { target: noWaUser, message: message };
            const payloadSponsor = { target: noWaSponsor, message: `*Notifikasi FollowUp*\n\n${message}` };

            // Kirim ke user dan sponsor, lalu update progress setelah keduanya selesai
            Promise.all([
                fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': TokenFonnte, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadUser)
                }).then(res => res.json()).catch(err => console.error(`Error kirim ke user ${row.nama}:`, err)),

                fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': TokenFonnte, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadSponsor)
                }).then(res => res.json()).catch(err => console.error(`Error kirim ke sponsor ${row.sponsor}:`, err))
            ])
            .finally(() => {
                completedCount++;
                const progress = Math.round((completedCount / selectedRows.length) * 100);
                waProgressBar.style.width = progress + '%';
                waProgressBar.textContent = `${completedCount} dari ${selectedRows.length}`;

                if (completedCount === selectedRows.length) {
                    waProgressBar.style.width = '100%';
                    waProgressBar.textContent = '100%';
                    setTimeout(() => {
                        // Aktifkan kembali tombol-tombol
                        document.getElementById('filterSponsor').disabled = false;
                        document.getElementById('filterButton').disabled  = false;
                        document.getElementById('sendWaButton').disabled  = false;
                        document.getElementById('cancelFollowUpButton').disabled  = false;

                        //alert('Seluruh Pesan telah terkirim');
                        showPesan('success', " BERHASIL : mengirim seluruh pesan");
                        // Reset tampilan ke semula
                        cancelFollowUpButton.click();
                        waProgressContainer.style.display = 'none';
                        waProgressBar.style.width = '0%';
                        waProgressBar.textContent = '0%';
                        document.getElementById('filterSponsor').value = '';
                        document.getElementById('waMessage').value = '';
                        document.getElementById('checkAll').checked = false;
                        document.querySelectorAll('.rowCheckbox').forEach(cb => cb.checked = false);
                    }, 3000); // Delay agar progress 100% terlihat sebelum alert
                }
            });    
        }, index * 5000); // jeda 5 detik setiap perdata yang dikirim
    });
});

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
       editModal.hide();
       setTimeout(loadTableData, 500); // Beri jeda agar server sempat update
    });
    showPesan('success', " BERHASIL : menyimpan data");
}

// *****************************
// Fungsi untuk menghapus data
// *****************************
function deleteRow(rowIndex) {
    if (!confirm(`Anda yakin ingin menghapus data baris ke-${rowIndex}?`)) return;
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
                    <td>${item.param || "-"}</td>
                    <td class="text-center">${item.hasil || "-"}</td>
                    <td class="text-center">${item.ideal || "-"}</td>
                    <td class="text-center">${item.satuan || "-"}</td>
                    <td style="white-space:pre-line">${item.penjelasan || "-"}</td>
                </tr>`).join('');

            viewBody.innerHTML = `
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
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th style="background-color:#4d94ff; width:25%;">Parameter</th>
                            <th style="background-color:#4d94ff; width:5%; text-align:center;">Hasil</th>
                            <th style="background-color:#4d94ff; width:15%; text-align:center;">Referensi</th>
                            <th style="background-color:#4d94ff; width:5%; text-align:center;">Satuan</th>
                            <th style="background-color:#4d94ff; width:50%;">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>${evaluasiHTML}</tbody>
                </table>

                <!-- DATA KESIMPULAN DAN REKOMENDASI -->
                <h6 class="mt-4">Kesimpulan & Rekomendasi</h6>
                              
                <table class="table table-bordered">
                    <tbody>
                    <tr><th style="background-color:#4d94ff; width:15%;">Skor</th>
                        <td style="width:85%;">Persentase kebugaran anda : <strong>${data.persen}</strong></td>
                    </tr>
                    <tr><th style="background-color:#4d94ff; width:15%;">Kesimpulan </th>
                        <td style="width:85%;">${data.kesimpulan}</td>
                    </tr>
                    <tr><th style="background-color:#4d94ff; width:15%;">Rekomendasi</th>
                        <td style="width:85%;">${data.rekomendasi}</td>
                    </tr>
                    </tbody>
                </table>`;
 
                viewModal.show();
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
// Inisialisasi Emoji Picker
// **************************
document.addEventListener('DOMContentLoaded', () => {
    const picker   = document.getElementById('emojiPicker');
    const button   = document.getElementById('emojiPickerButton');
    const textarea = document.getElementById('waMessage');

    // Fungsi untuk menambahkan emoji ke textarea
    button.addEventListener('click', () => {
        const textareaRect = textarea.getBoundingClientRect();
        const pickerWidth  = 300;   // atau 320 sesuai kenyamanan
        const pickerHeight = 350;   // tinggi rata-rata picker

        let left = window.innerWidth / 2 - pickerWidth / 2 + window.scrollX;
        // let top  = textareaRect.bottom + window.scrollY + 2;    // 2px jarak bawah textarea
        let top  = textareaRect.bottom + window.scrollY ;

        picker.style.display  = picker.style.display === 'none' ? 'block' : 'none';
        picker.style.position = 'absolute';
        picker.style.width    = pickerWidth + 'px';
        picker.style.left     = left + 'px';
        picker.style.top      = top + 'px';
        picker.style.zIndex   = 9999;
    });

    picker.addEventListener('emoji-click', (event) => {
        const emoji = event.detail.unicode;
        const start = textarea.selectionStart;
        const end   = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + emoji + textarea.value.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    });

    // Hide picker if clicking outside
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && e.target !== button) {
            picker.style.display = 'none';
        }
    });
});

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
