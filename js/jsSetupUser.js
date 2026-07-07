/*******************************************
APLIKASI BERATIDEAL
SETUP USER 
- DATABASE : dbUser (TabelUser dan LogNotif)
TABELUSER
- Membuat user,Edit, Delete 
- Kirim notification ke user
- Mengatur level user
LOGNOTIF:
- Log User
*******************************************/

// ********* Deklarasi  Public **********
// url database :  dbUser (TabelUser dan LogNotif)
const URL_APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbwZR6DnXUYb4aSlbsAR-KG8qmYO64lOV9ask1gS1EH9Wuic06qoTvK9wqqgj_6t1WTzNg/exec';
let confirmCallback = null;
let confirmModal = null;
let pesanModalTimer = null;
let currentLogNotifFilter = 'SEMUA';
// **************************************

// ********* Modal Konfirmasi Kustom **********
function showConfirm(message, title = 'Konfirmasi') {
    return new Promise((resolve) => {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        
        if (!confirmModal) {
            confirmModal = new bootstrap.Modal(document.getElementById('modalConfirm'));
        }
       // Remove previous event listeners
        const okBtn = document.getElementById('confirmOkBtn');
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Add new event listeners
        newOkBtn.addEventListener('click', () => {
            confirmModal.hide();
            resolve(true);
        });
        newCancelBtn.addEventListener('click', () => {
            confirmModal.hide();
            resolve(false);
        });
        
        confirmModal.show();
    });
}

// **********************************
// Tampilkan Spinner Loading Overlay
// **************************************
function showLoading(show, target = 'user') {
  const overlayId = target === 'log' ? 'loadingOverlayLog' : 'loadingOverlayUser';
  const overlay = document.getElementById(overlayId);
  if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

// *************************************
// Fungsi untuk load awal Tabel User id
// *************************************
document.addEventListener('DOMContentLoaded', loadUserTable);
  document.getElementById('addUserButton').addEventListener('click', () => {
  const modalUser = document.getElementById('modalUser');
  modalUser.setAttribute('data-mode', 'add');
  document.getElementById('mode').value = 'add';
  document.getElementById('userForm').reset();
  document.getElementById('userId').disabled = false;
  document.getElementById('judulModal').textContent = 'INPUT USER';
  
  // Reset radio buttons (akses) to default (Yes for all)
  document.querySelectorAll('input[type="radio"][name^="akses"]').forEach(radio => {
    if (radio.value === 'Y') radio.checked = true;
  });
  
  new bootstrap.Modal(modalUser).show();
});

// *************************************
// Fungsi untuk memanggil Tabel User Id
// *************************************
function loadUserTable() {
    showLoading(true,'user');
    const callbackName = 'cb_' + Date.now();
    const script = document.createElement('script');
    script.src = `${URL_APPS_SCRIPT}?action=getTabelUser&callback=${callbackName}`;

    window[callbackName] = function(data) {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="16">Tidak ada data user.</td></tr>';
            showLoading(false,'user');
            return;
        }

        data.forEach(row => {
            const [userId, namaUser, emailUser, hpUser, passUser, levelUser, salah,
                login, setting, fc, adm, mem, we, crm, coach] = row;

            let editState     = '';
            let aktifasiState = '';
            let deleteState   = '';
            let unlockState   = 'disabled';
            let kirimState    = 'disabled';

            const salahCount = parseInt(salah) || 0;
            const unlockFlag = localStorage.getItem('notifReady_' + userId);

            if (salahCount >= 3) {
                editState     = 'disabled';
                aktifasiState = 'disabled';
                deleteState   = 'disabled';
                unlockState   = '';
                kirimState    = 'disabled';
            } else if (unlockFlag === 'true') {
                editState     = 'disabled';
                aktifasiState = 'disabled';
                deleteState   = 'disabled';
                unlockState   = 'disabled';
                kirimState    = '';
            }

            const tr = document.createElement('tr');
            tr.id = `row_${userId}`; // Untuk mengupdate baris record di tabel 

            tr.innerHTML = `
                <td>${userId}</td>
                <td>${namaUser}</td>
                <td>${emailUser}</td>
                <td>${hpUser}</td>
                <td>${passUser}</td>
                <td>${levelUser}</td>
                <td>${salah}</td>
                <td>${login}</td>
                <td>${setting}</td>
                <td>${fc}</td>
                <td>${adm}</td>
                <td>${mem}</td>
                <td>${we}</td>
                <td>${crm}</td>
                <td>${coach}</td>
                <td class="actions-col">
                    <i class="fas fa-edit action-icon" title="Edit User" onclick="showEditModal({
                        userId: '${userId}', 
                        userName: '${namaUser}', 
                        userEmail: '${emailUser}', 
                        userHP: '${hpUser}',
                        userPass: '${passUser}',
                        userLevel: '${levelUser}',
                        aksesLogin: '${login}', 
                        aksesSetting: '${setting}', 
                        aksesFC: '${fc}', 
                        aksesDashAdmin: '${adm}', 
                        aksesDashMember: '${mem}', 
                        aksesDashWE: '${we}', 
                        aksesDashCRM: '${crm}', 
                        aksesCoach: '${coach}'
                    })"></i>
                    <i class="fas fa-user-secret action-icon ${aktifasiState}" title="Kirim Notif Aktifasi" onclick="aktifasiNotif('${userId}','${namaUser}','${emailUser}','${hpUser}','${passUser}')"></i>
                    <i class="fas fa-trash-alt action-icon ${deleteState}" title="Hapus User" onclick="deleteUser('${userId}')"></i>
                    <i class="fas fa-unlock action-icon ${unlockState}" title="Aktifkan User" onclick="unlockUser('${userId}')"></i>
                    <i class="fas fa-paper-plane action-icon ${kirimState}" title="Kirim Notif Reset User" onclick="sendNotif('${userId}','${namaUser}','${emailUser}','${hpUser}','${passUser}')"></i>
                </td>
            `;

            tbody.appendChild(tr);
        });
        showLoading(false,'user');
        delete window[callbackName];
        document.body.removeChild(script);
    };

    script.onerror = function() {
        showPesan('error',' ERROR : Gagal mengambil data user!');
        showLoading(false,'user');
        delete window[callbackName];
    };
    document.body.appendChild(script);
}

// **********************************
// Fungsi untuk kembali ke setup user
// **********************************
function kembaliKeSetupUser() {
  document.querySelector('.container').style.display    = 'block';  // Tampilkan semua form Setup User
  document.getElementById('logNotifForm').style.display = 'none';   // Sembunyikan form Log Notifikasi
  loadUserTable(); // Refresh data user
}

// ********************************************
// Fungsi untuk memanggil Tabel Log Notifikasi 
// ********************************************
function loadLogNotifTable() {
  showLoading(true, 'log');
  const callbackName = 'cb_' + Date.now();
  const script       = document.createElement('script');
  script.src         = `${URL_APPS_SCRIPT}?action=getLogNotif&callback=${callbackName}`;

  window[callbackName] = function(data) {
    const tbody = document.getElementById('logNotifTableBody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Tidak ada log notifikasi.</td></tr>';
      showLoading(false, 'log');
      return;
    }

    data.forEach(row => {
      const [waktu, userId, nama, email, hp, pass, status] = row;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${waktu}</td>
        <td>${userId}</td>
        <td>${nama}</td>
        <td>${email}</td>
        <td>${hp}</td>
        <td>${pass}</td>
        <td>${status}</td>
      `;
      tbody.appendChild(tr);
    });
    filterLogNotif(currentLogNotifFilter || 'SEMUA');
    showLoading(false, 'log');
    delete window[callbackName];
    document.body.removeChild(script);
  };

  script.onerror = function() {
    showPesan('error', ' ERROR : Gagal mengambil data log notifikasi!');
    showLoading(true, 'log');
    delete window[callbackName];
    document.body.removeChild(script);
  };

  document.body.appendChild(script);
}

// ***************************************************
// Sembunyikan tombol Setup User saat tampil Log Notif
// ***************************************************
function showLogNotifForm() {
  // Sembunyikan elemen-elemen Setup User
  document.querySelector('.container').style.display    = 'none';  // Sembunyikan semua form Setup User
  document.getElementById('nav-lognotifForm').style.display = 'block'; // Tampilkan form Log Notifikasi
  loadLogNotifTable(); // Load datanya
}

// **************************
// Fungsi untuk menambah user
// **************************
function addUser() {
    console.log('=== addUser() dipanggil ===');
    const userId     = document.getElementById('userId').value.trim().toLowerCase();
    document.getElementById('userId').value = userId;
    const userName   = document.getElementById('userName').value.trim().toLowerCase();
    document.getElementById('userName').value = userName;
    const userEmail  = document.getElementById('userEmail').value.trim();
    const userHP     = document.getElementById('userHP').value.trim();
    const userPass   = document.getElementById('userPass').value.trim();
    const userLevel  = document.getElementById('userLevel').value;

    const aksesLogin      = document.querySelector('input[name="aksesLogin"]:checked')?.value || 'N';
    const aksesSetting    = document.querySelector('input[name="aksesSetting"]:checked')?.value || 'N';
    const aksesFC         = document.querySelector('input[name="aksesFC"]:checked')?.value || 'N';
    const aksesDashAdmin  = document.querySelector('input[name="aksesDashAdmin"]:checked')?.value || 'N';
    const aksesDashMember = document.querySelector('input[name="aksesDashMember"]:checked')?.value || 'N';
    const aksesDashWE     = document.querySelector('input[name="aksesDashWE"]:checked')?.value || 'N';
    const aksesDashCRM    = document.querySelector('input[name="aksesDashCRM"]:checked')?.value || 'N';
    const aksesCoach      = document.querySelector('input[name="aksesCoach"]:checked')?.value || 'N';

    // Validasi
    if (!validateUserForm()) {
      console.log('Validasi gagal, keluar dari addUser');
      return;
    }
    console.log('Validasi berhasil addUser');

    // Cek duplikasi User ID di tabel
    const rows = document.querySelectorAll('#userTableBody tr');
    for (let row of rows) {
        const cellUserId = row.children[0]?.textContent?.trim();
        if (cellUserId === userId) {
            showPesanModal("warning", " WARNING : User ID sudah digunakan.");
            return;
        }
    }

    const callbackName = 'cb_' + Date.now();
    const script = document.createElement('script'); // Declare script BEFORE callback!
    
    window[callbackName] = function(response) {
        console.log('=== Callback addUser dipanggil ===');
        console.log('Respon server addUser:', response);
        if (response.success) {
            handleUserModalSuccess(response.message);
        } else {
            showPesanModal('error', ' ERROR : Gagal menyimpan data');
        }
        delete window[callbackName];
        if (document.body.contains(script)) document.body.removeChild(script);
    };

    script.onerror = function() {
        console.error('=== ERROR addUser: Gagal memuat script ===');
        showPesanModal('error', ' ERROR : Gagal terhubung ke server (addUser)');
        delete window[callbackName];
        if (document.body.contains(script)) document.body.removeChild(script);
    };

    const params = new URLSearchParams({
        action: 'addUser',
        userId, userName, userEmail, userHP, userPass, userLevel,
        aksesLogin, aksesSetting, aksesFC, aksesDashAdmin ,aksesDashMember, aksesDashWE , aksesDashCRM, aksesCoach,
        callback: callbackName
    });

    const fullUrl = `${URL_APPS_SCRIPT}?${params.toString()}`;
    console.log('URL addUser:', fullUrl);
    script.src = fullUrl;
    document.body.appendChild(script);
    console.log('Script addUser appended');
}

// ******************************
// Fungsi untuk mengedit user id
// ******************************
function editUser() {
    console.log('=== editUser() dipanggil ===');
    
    const userId     = document.getElementById('userId').value.trim().toLowerCase();
    document.getElementById('userId').value = userId;
    const userName   = document.getElementById('userName').value.trim().toLowerCase();
    document.getElementById('userName').value = userName;
    const userEmail  = document.getElementById('userEmail').value.trim();
    const userHP     = document.getElementById('userHP').value.trim();
    const userPass   = document.getElementById('userPass').value.trim();
    const userLevel  = document.getElementById('userLevel').value;

    const aksesLogin    = document.querySelector('input[name="aksesLogin"]:checked')?.value || 'N';
    const aksesSetting  = document.querySelector('input[name="aksesSetting"]:checked')?.value || 'N';
    const aksesFC      = document.querySelector('input[name="aksesFC"]:checked')?.value || 'N';
    const aksesDashAdmin  = document.querySelector('input[name="aksesDashAdmin"]:checked')?.value || 'N';
    const aksesDashMember = document.querySelector('input[name="aksesDashMember"]:checked')?.value || 'N';
    const aksesDashWE     = document.querySelector('input[name="aksesDashWE"]:checked')?.value || 'N';
    const aksesDashCRM    = document.querySelector('input[name="aksesDashCRM"]:checked')?.value || 'N';
    const aksesCoach      = document.querySelector('input[name="aksesCoach"]:checked')?.value || 'N';

    console.log('Data yang akan dikirim edit:');
    console.log({userId, userName, userEmail, userHP, userPass, userLevel, 
      aksesLogin, aksesSetting, aksesFC, aksesDashAdmin, aksesDashMember, 
      aksesDashWE, aksesDashCRM, aksesCoach});

    // Validasi
    if (!validateUserForm()) {
      console.log('Validasi gagal, keluar dari editUser');
      return;
    }
    console.log('Validasi berhasil');

    const callbackName = 'cb_' + Date.now();
    const script = document.createElement('script'); // Declare script BEFORE callback!
    
    window[callbackName] = function(response) {
        console.log('=== Callback editUser dipanggil ===');
        console.log('Respon server editUser:', response);
        if (response.status === "success" || response.success) {
            console.log('Edit berhasil, memanggil handleUserModalSuccess');
            handleUserModalSuccess(response.message || "Data berhasil diupdate");
            document.getElementById("modalUser").setAttribute("data-mode", "add");
        } else {
            console.log('Edit gagal:', response.message);
            showPesanModal("error", " ERROR : " + (response.message || "Gagal update data"));
        }
        delete window[callbackName];
        if (document.body.contains(script)) document.body.removeChild(script);
    };

    script.onerror = function() {
        console.error('=== ERROR editUser: Gagal memuat script ===');
        showPesanModal('error', ' ERROR : Gagal terhubung ke server (editUser)');
        delete window[callbackName];
        if (document.body.contains(script)) document.body.removeChild(script);
    };

    const params = new URLSearchParams({
        action: 'editUser',
        userId, userName, userEmail, userHP, userPass, userLevel,
        aksesLogin, aksesSetting, aksesFC, aksesDashAdmin, aksesDashMember, aksesDashWE, aksesDashCRM, aksesCoach,
        callback: callbackName
    });

    const fullUrl = `${URL_APPS_SCRIPT}?${params.toString()}`;
    console.log('URL editUser:', fullUrl);
    script.src = fullUrl;
    document.body.appendChild(script);
    console.log('Script editUser appended');
}

// **************************************
// Fungsi untuk pengaturan tombol simpan
// **************************************
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== jsSetupUser.js DOMContentLoaded ===');
  const userForm = document.getElementById("userForm");
  console.log('userForm element:', userForm);
  
  if (userForm) {
    userForm.addEventListener("submit", (e) => {
      console.log('=== userForm SUBMIT event dipicu ===');
      e.preventDefault(); // Prevent default form submission
      const mode = document.getElementById("modalUser").getAttribute("data-mode");
      console.log('Current mode:', mode);
      
      if (mode === "edit") {
        console.log('Memanggil editUser()');
        editUser();
      } else {
        console.log('Memanggil addUser()');
        addUser();
      }
    });
  }
});

// ******************************
// Fungsi untuk menghapus user id
// ******************************
async function deleteUser(userId) {
  const confirmed = await showConfirm("Yakin ingin menghapus user ini?", "Konfirmasi Hapus");
  if (!confirmed) return;

  const callback = 'cb_' + Date.now();
  window[callback] = function(response) {
    if (response.status === 'success') {
       showPesan('success', " SUKSES : " + response.message);
       loadUserTable(); // Refresh tabel
    }
    delete window[callback];
  };

  const script = document.createElement('script');
  script.src = `${URL_APPS_SCRIPT}?action=deleteUser&userId=${encodeURIComponent(userId)}&callback=${callback}`;
  document.body.appendChild(script);
}

// ***************************
// Fungsi untuk reset user id
// ***************************
async function unlockUser(userId) {
  const confirmed = await showConfirm("Anda yakin untuk unlock user ini?", "Konfirmasi Unlock");
  if (!confirmed) return;
  const callbackName = 'cbUnlock_' + Date.now();
  window[callbackName] = (res) => {
    if (res.status === 'success') {
      showPesan('success', " SUKSES : " + res.message);
      localStorage.setItem('notifReady_' + userId, 'true');
      const row = document.getElementById(`row_${userId}`);
      if (row) {
        const cols = row.getElementsByTagName('td');
        if (cols.length >= 7) cols[6].textContent = '0';
        row.querySelector('.fa-edit')?.classList.add('disabled');
        row.querySelector('.fa-user-secret')?.classList.remove('disabled');
        row.querySelector('.fa-trash-alt')?.classList.add('disabled');
        row.querySelector('.fa-unlock')?.classList.add('disabled');
        row.querySelector('.fa-paper-plane')?.classList.remove('disabled');
      }
    } else showPesan('error', " ERROR : Reset Login gagal " + res.message);
      delete window[callbackName];
  };
  const script = document.createElement('script');
  script.src = `${URL_APPS_SCRIPT}?action=unlockUser&userId=${encodeURIComponent(userId)}&callback=${callbackName}`;
  document.body.appendChild(script);
}

// *************************************************
// Fungsi untuk mengirim notifikasi ke wa dan email
// *************************************************
function normalizeWhatsAppNumber(phoneNumber) {
    const digitsOnly = String(phoneNumber || '').replace(/\D/g, '');

    if (!digitsOnly) return '';
    if (digitsOnly.startsWith('62')) return digitsOnly;
    if (digitsOnly.startsWith('0')) return `62${digitsOnly.slice(1)}`;

    return digitsOnly;
}

function sendNotif(userId, userName, userEmail, userHP, userPass) {
    const waNumber = normalizeWhatsAppNumber(userHP);
    console.log("Mengirim notifikasi ke:", userId, userName, userEmail, waNumber, userPass);

    if (!waNumber || waNumber.length < 10 || waNumber.length > 15) {
        showPesan('error', " ERROR : Nomor WhatsApp user tidak valid.");
        return;
    }

    const callback = 'cb_' + Date.now();
    const script = document.createElement('script');
    script.src = `${URL_APPS_SCRIPT}?action=sendNotifUser` +
        `&userId=${encodeURIComponent(userId)}` +
        `&userName=${encodeURIComponent(userName)}` +
        `&userEmail=${encodeURIComponent(userEmail)}` +
        `&userHP=${encodeURIComponent(waNumber)}` +
        `&userPass=${encodeURIComponent(userPass)}` +
        `&callback=${callback}`;

    window[callback] = function (response) {
        console.log("Respon kirim:", response);
        if (response.status === 'success') {
            showPesan('success', " SUKSES : " + response.message);
            localStorage.removeItem('notifReady_' + userId);
            loadUserTable(); // reload tampilan icon
        } else if (response.status === 'partial') {
            showPesan('warning', " WARNING : " + response.message, 5000);
        } else {
            showPesan('error', " ERROR : " + response.message);
        }

        delete window[callback];
        document.body.removeChild(script);
    };

    script.onerror = () => {
        showPesan('error', " ERROR : Gagal terhubung ke server");
        delete window[callback];
        document.body.removeChild(script);
    };

    document.body.appendChild(script);
}

// *******************************
// Fungsi untuk Mengaktifasi User
// *******************************
function aktifasiNotif(userId, userName, userEmail, userHP, userPass) {
    const waNumber = normalizeWhatsAppNumber(userHP);
    console.log("Mengirim notifikasi ke:", userId, userName, userEmail, waNumber, userPass);

    if (!waNumber || waNumber.length < 10 || waNumber.length > 15) {
        showPesan('error', " ERROR : Nomor WhatsApp user tidak valid.");
        return;
    }

    const callback = 'cb_' + Date.now();
    const script = document.createElement('script');
    script.src = `${URL_APPS_SCRIPT}?action=aktifasiUser` +
        `&userId=${encodeURIComponent(userId)}` +
        `&userName=${encodeURIComponent(userName)}` +
        `&userEmail=${encodeURIComponent(userEmail)}` +
        `&userHP=${encodeURIComponent(waNumber)}` +
        `&userPass=${encodeURIComponent(userPass)}` +
        `&callback=${callback}`;

    window[callback] = function (response) {
        console.log("Respon kirim:", response);
        if (response.status === 'success') {
            showPesan('success', " SUKSES : " + response.message);
            localStorage.removeItem('notifReady_' + userId);
            loadUserTable(); // reload tampilan icon
        } else if (response.status === 'partial') {
            showPesan('warning', " WARNING : " + response.message, 5000);
        } else {
            showPesan('error', " ERROR : " + response.message);
        }

        delete window[callback];
        document.body.removeChild(script);
    };

    script.onerror = () => {
        showPesan('error', " ERROR : Gagal terhubung ke server");
        delete window[callback];
        document.body.removeChild(script);
    };

    document.body.appendChild(script);
}

// **********************
// Mengupdate Baris Icon
// *********************
function updateRowIcons(row, mode) {
    const icons = row.querySelectorAll('.action-icon');
    const [editIcon, aktifasiIcon, delIcon, unlockIcon, kirimIcon] = icons;

    if (mode === 'unlock') {
        editIcon.classList.add('disabled');
        aktifasiIcon.classList.add('disabled');
        delIcon.classList.add('disabled');
        unlockIcon.classList.add('disabled');
        kirimIcon.classList.remove('disabled');
    } else if (mode === 'kirim') {
        editIcon.classList.remove('disabled');
        aktifasiIcon.classList.remove('disabled');
        delIcon.classList.remove('disabled');
        unlockIcon.classList.add('disabled');
        kirimIcon.classList.add('disabled');
    }
}

// ********************************
// Menghapus Seluruh log Notifikasi
// ********************************
async function deleteAllLogNotif() {
  return deleteLogNotif('SEMUA');
}

async function deleteLogNotif(forceStatus) {
  const status = String(forceStatus || currentLogNotifFilter || 'SEMUA').trim().toUpperCase();
  const label = status === 'SEMUA' ? 'semua log notifikasi' : `log notifikasi status "${status}"`;
  const confirmed = await showConfirm(`Yakin ingin menghapus ${label}?`, "Konfirmasi Hapus Log");
  if (!confirmed) return;

  const callback = 'cb_' + Date.now();
  const script = document.createElement('script');
  const timeoutMs = 12000;
  let finished = false;

  const action = status === 'SEMUA' ? 'deleteAllLogNotif' : 'deleteLogNotifByStatus';
  const statusParam = status === 'SEMUA' ? '' : `&status=${encodeURIComponent(status)}`;
  script.src = `${URL_APPS_SCRIPT}?action=${action}${statusParam}&callback=${callback}`;

  const timeoutId = setTimeout(() => {
    if (finished) return;
    finished = true;
    if (status === 'SEMUA') {
      showPesan("error", "ERROR : Tidak ada respon dari server");
    } else {
      showPesan("error", `ERROR : Hapus log status "${status}" belum didukung server (action deleteLogNotifByStatus)`);
    }
    delete window[callback];
    if (document.body.contains(script)) document.body.removeChild(script);
  }, timeoutMs);

  window[callback] = function(response) {
    if (finished) return;
    finished = true;
    clearTimeout(timeoutId);
    if (response && response.status === 'success') {
      showPesan("success", "Data log berhasil terhapus");
      loadLogNotifTable();
    } else {
      showPesan("error", (response && response.message) ? response.message : "Gagal menghapus log");
    }
    delete window[callback];
    if (document.body.contains(script)) document.body.removeChild(script);
  };

  script.onerror = function() {
    if (finished) return;
    finished = true;
    clearTimeout(timeoutId);
    showPesan("error", "Tidak dapat terhubung ke server");
    delete window[callback];
    if (document.body.contains(script)) document.body.removeChild(script);
  };

  document.body.appendChild(script);
}

// *****************************************
// Pesan Notifikasi untuk di Form Tabel User
// *****************************************
function showPesan(type, message, duration = 3000) {
  const boxes = document.querySelectorAll('#pesanNotification');
  const box = Array.from(boxes).find((el) => el && el.offsetParent !== null) || boxes[0];
  if (!box) return;

  const icon = box.querySelector('[id="pesanNotifIcon"]') || document.getElementById('pesanNotifIcon');
  const text = box.querySelector('[id="pesanNotifText"]') || document.getElementById('pesanNotifText');
  if (!icon || !text) return;

  box.classList.remove('notification-error', 'notification-success', 'notification-warning');
  box.classList.add('notification-message');
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

// **************************************************
// Pesan Notifikasi untuk di Form Modal Add dan Edit
// **************************************************
function showPesanModal(type, message, duration = 3000) {
  const boxModal  = document.getElementById('pesanNotifModalBox');
  const iconModal = document.getElementById('pesanNotifModalIcon');
  const textModal = document.getElementById('pesanNotifModalText');

  // Reset class
  boxModal.className  = 'notification-message modal-user-message';
  iconModal.className = 'pesan-notif-icon me-2';
  if (pesanModalTimer) {
    clearTimeout(pesanModalTimer);
    pesanModalTimer = null;
  }

  if (type === 'error') {
    boxModal.classList.add('notification-error');
    iconModal.classList.add('fas', 'fa-times-circle');
  } else if (type === 'success') {
    boxModal.classList.add('notification-success');
    iconModal.classList.add('fas', 'fa-check-circle');
  } else if (type === 'warning') {
    boxModal.classList.add('notification-warning');
    iconModal.classList.add('fas', 'fa-exclamation-circle');
  }

  textModal.textContent  = message;
  boxModal.style.display = 'flex';
  if (duration > 0) {
    pesanModalTimer = setTimeout(() => {
      boxModal.style.display = 'none';
      pesanModalTimer = null;
    }, duration);
  }
}

function handleUserModalSuccess(message) {
  const modalEl = document.getElementById("modalUser");
  const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);

  showPesanModal("success", " SUKSES : " + message, 1200);

  setTimeout(() => {
    modalInstance.hide();
    loadUserTable();
  }, 1200);
}


// **************************
// Tampilkan Modal Edit User
// ************************** 
function showEditModal(userData) {
  console.log('=== showEditModal dipanggil ===');
  console.log('userData:', userData);
  
  // Isi input dari userData
  document.getElementById('judulModal').textContent = 'EDIT USER';
  document.getElementById('userId').disabled = true;
  document.getElementById("userId").value    = userData.userId;
  document.getElementById("userName").value  = userData.userName;
  document.getElementById("userEmail").value = userData.userEmail;
  document.getElementById("userHP").value    = userData.userHP;
  document.getElementById("userPass").value  = userData.userPass;
  document.getElementById("userLevel").value = userData.userLevel;

  // Set radio akses
  const aksesList = ['Login', 'Setting', 'FC', 'DashAdmin', 'DashMember', 'DashWE', 'DashCRM', 'Coach'];
  aksesList.forEach(aksesName => {
    const val = userData['akses' + aksesName] || 'N';
    const radio = document.querySelector(`input[name="akses${aksesName}"][value="${val}"]`);
    console.log(`akses${aksesName}:`, val, radio);
    if (radio) radio.checked = true;
  });

  // Tampilkan modal & ubah mode
  const modalUser = document.getElementById("modalUser");
  modalUser.setAttribute("data-mode", "edit");
  console.log('modalUser data-mode set to:', modalUser.getAttribute("data-mode"));
  
  new bootstrap.Modal(modalUser).show();
  console.log('=== Modal Edit ditampilkan ===');
}

// **********************
// Validasi Form User
// ********************** 
function validateUserForm() {
    const userId    = document.getElementById('userId').value.trim().toLowerCase();
    document.getElementById('userId').value = userId;
    const userName  = document.getElementById('userName').value.trim().toLowerCase();
    document.getElementById('userName').value = userName;

    const userEmail = document.getElementById('userEmail').value.trim();
    const userHP    = document.getElementById('userHP').value.trim();
    const userPass  = document.getElementById('userPass').value.trim();

    const userIdPattern   = /^(?!.*\s)(?!.*[A-Z]).{6,8}$/;           // 6-8 karakter, tanpa spasi & tanpa huruf besar
    const userNamePattern = /^[a-z\s]{3,20}$/;                       // hanya huruf kecil dan spasi, panjang 3-20
    const emailPattern    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hpPattern       = /^[0-9]{10,14}$/;                        // hanya angka, panjang 10–14
    const passwordPattern = /^(?!.*\s).{6,8}$/;                      // 6-8 karakter, kombinasi bebas tanpa spasi

    if (!userIdPattern.test(userId)) {
        showPesanModal("warning", " WARNING : User ID 6-8 karakter, tanpa spasi dan tanpa huruf besar.");
        return false;
    }
    if (!userNamePattern.test(userName)) {
        showPesanModal("warning", " WARNING : Nama user 3-20 karakter, huruf kecil dan spasi saja.");
        return false;
    }
    if (!emailPattern.test(userEmail)) {
        showPesanModal("warning", " WARNING : Format email tidak valid.");
        return false;
    }
    if (!hpPattern.test(userHP)) {
        showPesanModal("warning", " WARNING : Nomor HP harus 10-14 digit angka.");
        return false;
    }
    if (!passwordPattern.test(userPass)) {
        showPesanModal("warning", " WARNING : Password 6-8 karakter, boleh kombinasi bebas tanpa spasi.");
        return false;
    }
    return true;
}

// *****************************
// Filter Log Notifikasi
// *****************************   
function filterLogNotif(status) {
    currentLogNotifFilter = String(status || 'SEMUA').trim().toUpperCase();
    const rows = document.querySelectorAll('#logNotifTableBody tr');
    rows.forEach(row => {
        const statusText = row.cells[6]?.textContent?.trim().toUpperCase();
        if (currentLogNotifFilter === 'SEMUA' || statusText === currentLogNotifFilter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
