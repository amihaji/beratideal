// ********* Deklarasi  Public **********
const URL_APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbyCXTw8u_-50XmbRG4zuOzzSMAQjd6mNDZk6DAU3DppgrM2454urI6YziYlfsQT7N1zCA/exec';
// **************************************

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
  document.getElementById('mode').value = 'add';
  document.getElementById('userForm').reset();
  document.getElementById('userId').disabled = false;
  document.getElementById('judulModal').textContent = 'INPUT USER';
  new bootstrap.Modal(document.getElementById('modalUser')).show();
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
            tbody.innerHTML = '<tr><td colspan="15">Tidak ada data user.</td></tr>';
            showLoading(false,'user');
            return;
        }

        data.forEach(row => {
            const [userId, namaUser, emailUser, hpUser, passUser, levelUser, salah,
                login, setting, fc, adm, mem, we, crm, coach, aksi] = row;

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
                <td>${crm}</td>
                <td>${coach}</td>
                <td class="actions-col"${aksi}>

                    <!-- <i class="fas fa-edit action-icon ${editState}" title="Edit User" onclick="editUser('${userId}')"></i> -->

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
    const userId     = document.getElementById('userId').value.trim().toLowerCase();
    document.getElementById('userId').value = userId;
    const userName   = document.getElementById('userName').value.trim().toUpperCase();
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
    const aksesDashWE     = document.querySelector('input[name="aksesDashWE')?.value || 'N';
    const aksesDashCRM    = document.querySelector('input[name="aksesDashCRM"]:checked')?.value || 'N';
    const aksesCoach      = document.querySelector('input[name="aksesCoach"]:checked')?.value || 'N';

    // Validasi
    if (!validateUserForm()) return;

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
    window[callbackName] = function(response) {
        if (response.success) {
            showPesanModal('success', ' SUKSES : ' + response.message);
            bootstrap.Modal.getInstance(document.getElementById("modalUser")).hide();
            loadUserTable();
        } else {
            showPesanModal('error', ' ERROR : Gagal menyimpan data');
        }
        delete window[callbackName];
    };

    const params = new URLSearchParams({
        action: 'addUser',
        userId, userName, userEmail, userHP, userPass, userLevel,
        aksesLogin, aksesSetting, aksesFC, aksesDashAdmin ,aksesDashMember, aksesDashWE , aksesDashCRM, aksesCoach,
        callback: callbackName
    });

    const script = document.createElement('script');
    script.src = `${URL_APPS_SCRIPT}?${params.toString()}`;
    document.body.appendChild(script);
}

// ******************************
// Fungsi untuk mengedit user id
// ******************************
function editUser() {
    const userId     = document.getElementById('userId').value.trim().toLowerCase();
    document.getElementById('userId').value = userId;
    const userName   = document.getElementById('userName').value.trim().toUpperCase();
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
    const aksesDashWE     = document.querySelector('input[name="aksesDashWE')?.value || 'N';
    const aksesDashCRM    = document.querySelector('input[name="aksesDashCRM"]:checked')?.value || 'N';
    const aksesCoach      = document.querySelector('input[name="aksesCoach"]:checked')?.value || 'N';


    // Validasi
    if (!validateUserForm()) return;

    const callbackName = 'cb_' + Date.now();
    window[callbackName] = function(res) {
        if (res.status === "success") {
            showPesanModal("success", " SUKSES : " + res.message);
            bootstrap.Modal.getInstance(document.getElementById("modalUser")).hide();
            loadUserTable();
            document.getElementById("modalUser").setAttribute("data-mode", "add");
        } else {
            showPesanModal("error", " ERROR : " + res.message);
        }
        delete window[callbackName];
    };

    const params = new URLSearchParams({
        action: 'editUser',
        userId, userName, userEmail, userHP, userPass, userLevel,
        aksesLogin, aksesSetting, aksesFC, aksesDashAdmin ,aksesDashMember, aksesDashWE , aksesDashCRM, aksesCoach,
        callback: callbackName
    });

    const script = document.createElement("script");
    script.src = `${URL_APPS_SCRIPT}?${params.toString()}`;
    document.body.appendChild(script);
}

// **************************************
// Fungsi untuk pengaturan tombol simpan
// **************************************
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById("saveUserBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const mode = document.getElementById("modalUser").getAttribute("data-mode");
      if (mode === "edit") {
        editUser();
      } else {
        addUser();
      }
    });
  }
});

// ******************************
// Fungsi untuk menghapus user id
// ******************************
function deleteUser(userId) {
  if (!confirm("Yakin ingin menghapus user ini?")) return;

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
function unlockUser(userId) {
  if (!confirm("Anda yakin untuk unlock user ini?")) return;
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
function sendNotif(userId, userName, userEmail, userHP, userPass) {
    console.log("Mengirim notifikasi ke:", userId, userName, userEmail, userHP, userPass);

    const callback = 'cb_' + Date.now();
    const script = document.createElement('script');
    script.src = `${URL_APPS_SCRIPT}?action=sendNotifUser` +
        `&userId=${encodeURIComponent(userId)}` +
        `&userName=${encodeURIComponent(userName)}` +
        `&userEmail=${encodeURIComponent(userEmail)}` +
        `&userHP=${encodeURIComponent(userHP)}` +
        `&userPass=${encodeURIComponent(userPass)}` +
        `&callback=${callback}`;

    window[callback] = function (response) {
        console.log("Respon kirim:", response);
        if (response.status === 'success') {
            showPesan('success', " SUKSES : " + response.message);
            localStorage.removeItem('notifReady_' + userId);
            loadUserTable(); // reload tampilan icon
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
    console.log("Mengirim notifikasi ke:", userId, userName, userEmail, userHP, userPass);

    const callback = 'cb_' + Date.now();
    const script = document.createElement('script');
    script.src = `${URL_APPS_SCRIPT}?action=aktifasiUser` +
        `&userId=${encodeURIComponent(userId)}` +
        `&userName=${encodeURIComponent(userName)}` +
        `&userEmail=${encodeURIComponent(userEmail)}` +
        `&userHP=${encodeURIComponent(userHP)}` +
        `&userPass=${encodeURIComponent(userPass)}` +
        `&callback=${callback}`;

    window[callback] = function (response) {
        console.log("Respon kirim:", response);
        if (response.status === 'success') {
            showPesan('success', " SUKSES : " + response.message);
            localStorage.removeItem('notifReady_' + userId);
            loadUserTable(); // reload tampilan icon
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
function deleteAllLogNotif() {
  if (!confirm("Yakin ingin menghapus semua log notifikasi?")) return;

  const callback = 'cb_' + Date.now();
  const script   = document.createElement('script');
  script.src     = `${URL_APPS_SCRIPT}?action=deleteAllLogNotif&callback=${callback}`;

  window[callback] = function(response) {
    if (response.status === 'success') {
      showPesan("success", "Semua log berhasil dihapus");
      loadLogNotifTable(); // Refresh tabel log
    } else {
      showPesan("error", "Gagal menghapus log");
    }
    delete window[callback];
    document.body.removeChild(script);
  };

  script.onerror = function() {
    showPesan("error", "Tidak dapat terhubung ke server");
    delete window[callback];
    document.body.removeChild(script);
  };

  document.body.appendChild(script);
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

// **************************************************
// Pesan Notifikasi untuk di Form Modal Add dan Edit
// **************************************************
function showPesanModal(type, message, duration = 3000) {
  const boxModal  = document.getElementById('pesanNotifModalBox');
  const iconModal = document.getElementById('pesanNotifModalIcon');
  const textModal = document.getElementById('pesanNotifModalText');

  // Reset class
  boxModal.className  = 'notification-message w-100 mb-2';
  iconModal.className = 'pesan-notif-icon me-2';

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
  setTimeout(() => {
    boxModal.style.display = 'none';
  }, duration);
}


// **************************
// Tampilkan Modal Edit User
// ************************** 
function showEditModal(userData) {
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
  const akses = ['Login','Setting','FLC','EstiH','WE','Followup','CRM'];
  akses.forEach(aksesName => {
    const val   = userData['akses'+aksesName] || 'N';
    const radio = document.querySelector(`input[name="akses${aksesName}"][value="${val}"]`);
    if (radio) radio.checked = true;
  });

  // Tampilkan modal & ubah mode
  document.getElementById("modalUser").setAttribute("data-mode", "edit");
  new bootstrap.Modal(document.getElementById("modalUser")).show();
}

// **********************
// Validasi Form User
// ********************** 
function validateUserForm() {
    const userId    = document.getElementById('userId').value.trim().toLowerCase();
    document.getElementById('userId').value = userId;
    const userName  = document.getElementById('userName').value.trim().toUpperCase();
    document.getElementById('userName').value = userName;

    const userEmail = document.getElementById('userEmail').value.trim();
    const userHP    = document.getElementById('userHP').value.trim();
    const userPass  = document.getElementById('userPass').value.trim();

    const userIdPattern   = /^[a-z0-9]{6,8}$/;                       // hanya huruf kecil & angka, panjang 6–8
    const userNamePattern = /^[A-Z\s]{3,20}$/;                       // hanya huruf besar & angka, panjang 3–20
    const emailPattern    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hpPattern       = /^[0-9]{10,14}$/;                        // hanya angka, panjang 10–14
    const passwordPattern = /^[a-zA-Z0-9!@#$%^&*()_+=\-{}[\]:;"'<>,.?/\\]{6,8}$/;

    if (!userIdPattern.test(userId)) {
        showPesanModal("warning", " WARNING : User ID huruf kecil/angka 6-8 karakter.");
        return false;
    }
    if (!userNamePattern.test(userName)) {
        showPesanModal("warning", " WARNING : Nama huruf besar dan 3-20 karakter.");
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
        showPesanModal("warning", " WARNING : Pass 6-8 karakter kombinasi huruf,angka,simbol.");
        return false;
    }
    return true;
}

// *****************************
// Filter Log Notifikasi
// *****************************   
function filterLogNotif(status) {
    const rows = document.querySelectorAll('#logNotifTableBody tr');
    rows.forEach(row => {
        const statusText = row.cells[6]?.textContent?.trim().toUpperCase();
        if (status === 'SEMUA' || statusText === status.toUpperCase()) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
