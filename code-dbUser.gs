/*********************************************************************************************
Aplikasi user beratideal GitHUB

Dibuat dengan menggunakan : 
- HTML Bootstrap versi 5.0
- CSS dan JScript
- Google Script Aplication

Terdiri atas beberapa file :
- Database : Sheet "TabelUser"
- loginBeratideal.html (program untuk login) ditempatkan di GitHUB
- formUser.html ditempatkan di GitHUB
- code.gs (program server side)

Fitur Aplikasi untuk hak akses :
- Login	: untuk mengakses aplikasi
- Setting	: Konfigurasi User
- FC	: aplikasi Fat Challenge
- dashAdmin	: aplikasi Dashboard Admin
- dasMember	: aplikasi Dashboard Member
- dashWE : Untuk Followup peserta dari aplikasi WE
- CRM	: Aplikasi untuk menegement peserta
- COACH : yang berhak untuk melakukan edukasi
**********************************************************************************************/

/*******************************************************
/*               DEKLARASI GLOBAL                      *
/*******************************************************/
const SHEET_ID        = '1oNOSh0L9HkXDpEXGMAZOVRMw7crMGWbuOKUu7f4sSqY';
const SHEET_USER_NAME = "TabelUser";
const SHEET_LOG_NOTIF = "LogNotif";
const ss              = SpreadsheetApp.openById(SHEET_ID);
const userSheet       = ss.getSheetByName(SHEET_USER_NAME);
const logSheet        = ss.getSheetByName(SHEET_LOG_NOTIF);
const CACHE           = CacheService.getScriptCache();

/*******************************************************
/*          ROUTING UTAMA (GET & POST)                 *
/*******************************************************/
function doGet(e) {
  const action   = e.parameter.action;
  const callback = e.parameter.callback || 'callback';

  if (action === 'getLogNotif') {
    const data = getLogNotif();
    return ContentService.createTextOutput(`${callback}(${JSON.stringify(data)})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  if (action === 'deleteAllLogNotif') {
    const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LogNotif');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1); // Sisakan header
    }
    return ContentService.createTextOutput(callback + '(' + JSON.stringify({ status: 'success' }) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  if (action === 'deleteLogNotifByStatus') {
    return deleteLogNotifByStatus(e);
  }

  if (action === 'checkLogin')    return handleCheckLogin(e);
  if (action === 'getTabelUser')  return handleGetTabelUser(e);
  if (action === 'getUserAccess') return handleGetUserAccess(e);
  
  if (action === "addUser")       return handleAddUser(e);
  if (action === 'editUser')      return handleEditUser(e);
  if (action === 'aktifasiUser')  return handleAktifasiUser(e);
  if (action === 'deleteUser')    return handleDeleteUser(e);
  if (action === 'unlockUser')    return handleUnlockUser(e);
  if (action === 'sendNotifUser') return handleSendNotifUser(e);
  return ContentService.createTextOutput("No action").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'addUser')      return handleAddUser(data);
    if (action === 'editUser')     return handleEditUser(data);
    if (action === 'deleteUser')   return handleDeleteUser(e);

    if (action === 'logoutUser')   return handleLogoutUser(data);

    return jsonResponse({ status: "error", message: "Action tidak dikenal" });
  } catch (error) {
    return jsonResponse({ status: "error", message: `doPost Error: ${error.message}` });
  }
}

/********************************
/ HANDLER LOGIN DAN USER CRUD            
    Kolom dan Field
     0 A: User ID
     1 B: Nama
     2 C: Email
     3 D: HP
     4 E: Pass
     5 F: Level
     6 G: Salah
     7 H: Login
     8 I: Fit Challange
     9 J Fit Tracker
     10 K: Analisa
     11 L: Data Peserta
     12 M: Follow We
     13 N: Follow Crm
     14 O: Referall
     15 P: Setup
     16 Q: Log Notif
     17 R: Coach
     18 S: Aksi
/*******************************/

/**********************************
/* Fungsi Login dan Get User Data *
/*********************************/
function handleCheckLogin(e) {
  // 🔥 TAMBAHKAN VALIDASI PARAMETER
  if (!e || !e.parameter) {
    return jsonpResponse('callback', {
      status: 'error',
      loggedIn: false,
      message: 'Parameter tidak lengkap'
    });
  }

  const callback = e.parameter.callback || 'callback';
  const userIdInput   = (e.parameter.userId || "").trim().toLowerCase();
  const userPassInput = (e.parameter.userPass || "").trim();

  // Validasi input
  if (!userIdInput || !userPassInput) {
    return jsonpResponse(callback, {
      status: 'error',
      loggedIn: false,
      message: 'User ID dan Password harus diisi!'
    });
  }

  try {
    // 🔥 PERUBAHAN: Gunakan userSheet (bukan shTabelUser)
    const users = userSheet.getDataRange().getValues();
    users.shift(); // Hapus header

    const userRowIndex = users.findIndex(row => 
      String(row[0]).trim().toLowerCase() === userIdInput
    );

    if (userRowIndex === -1) {
      return jsonpResponse(callback, {
        status: 'error',
        loggedIn: false,
        message: 'User ID tidak terdaftar.'
      });
    }

    const row       = users[userRowIndex];
    const userId    = String(row[0]).trim();                             // A: User ID
    const userName  = String(row[1]).trim();                             // B: Nama User
    const userEmail = String(row[2]).trim();                             // C: Email User
    const userHP    = String(row[3]).trim();                             // D: HP User
    const userPass  = String(row[4]).trim();                             // E: Password
    const userLevel = String(row[5]).trim().toLowerCase() || 'peserta';  // F: Level
    let   userSalah = parseInt(row[6]) || 0;                             // G: Salah
    const sheetRow  = userRowIndex + 2;

    // 🔒 Jika akun sudah terkunci, jangan kirim notif berulang tiap percobaan login berikutnya
    if (userSalah >= 3) {
      return jsonpResponse(callback, {
        status: 'error',
        loggedIn: false,
        message: 'Akun Anda telah terkunci setelah 3x kesalahan. Hubungi Admin.'
      });
    }

    // 🔑 Cek password
    if (userPassInput === userPass) {
      // Reset counter salah
      userSheet.getRange(sheetRow, 7).setValue(0); // Kolom G: Salah

      // Buat token
      const token = Utilities.getUuid();
      
      // Simpan ke cache
      const user = { userId: userId, level: userLevel };
      CACHE.put(token, JSON.stringify(user), 1800);

      // Ambil hak akses dari kolom H-R (index 7-18)
      aksesList = {
        aksesLogin:        String(row[7] || 'N').trim().toUpperCase() || "N",   // Kolom H: Login
        aksesFitChallange: String(row[8] || 'N').trim().toUpperCase() || "N",   // Kolom I: Fit Challange
        aksesFitTracker:   String(row[9] || 'N').trim().toUpperCase() || "N",   // Kolom J: Fit Tracker
        aksesAnalisa:      String(row[10] || 'N').trim().toUpperCase() || "N",  // Kolom K: Analisa
        aksesDataPeserta:  String(row[11] || 'N').trim().toUpperCase() || "N",  // Kolom L: Data Peserta
        aksesFollowWe:     String(row[12] || 'N').trim().toUpperCase() || "N",  // Kolom M: Follow We
        aksesFollowCrm:    String(row[13] || 'N').trim().toUpperCase() || "N",  // Kolom N: Follow Crm
        aksesReferall:     String(row[14] || 'N').trim().toUpperCase() || "N",  // Kolom O: Referall
        aksesSetup:        String(row[15] || 'N').trim().toUpperCase() || "N",  // Kolom P: Setup
        aksesLogNotif:     String(row[16] || 'N').trim().toUpperCase() || "N",  // Kolom Q: Log Notif
        aksesCoach:        String(row[17] || 'N').trim().toUpperCase() || "N",  // Kolom R: Coach
      };

      // 🔥 LOG UNTUK DEBUG
      console.log('✅ Login berhasil:', { userId, userName, userLevel, userHP });

      // ✅ Kirim response sukses
      return jsonpResponse(callback, {
        status: 'success',
        loggedIn: true,
        token: token,
        userId: userId,
        userName: userName,     // 🔑 WAJIB (kolom B)
        userHP: userHP,         // 🔑 WAJIB (kolom D)
        email: userEmail,
        level: userLevel,
        access: aksesList
      });

    } else {
      // ❌ Password salah, tambah counter
      userSalah += 1;
      userSheet.getRange(sheetRow, 7).setValue(userSalah);

      if (userSalah >= 3) {
        kirimNotifAdminLock(userId);
      }
      
      const sisaPercobaan = 3 - userSalah;
      return jsonpResponse(callback, {
        status: 'error',
        loggedIn: false,
        message: `User ID atau Password salah, sudah ${userSalah}x salah. (Sisa ${sisaPercobaan}x percobaan)`
      });
    }
  } catch (error) {
    // 🔥 TANGANI ERROR
    console.error('❌ Error handleCheckLogin:', error);
    return jsonpResponse(callback, {
      status: 'error',
      loggedIn: false,
      message: 'Terjadi kesalahan sistem: ' + error.toString()
    });
  }
}

function handleLogoutUser(data) {
    if (data.token) CACHE.remove(data.token);
    return jsonResponse({ status: 'success', message: 'Logout berhasil' });
}

/*******************************************************
 *            HANDLE GET TABEL USER UNTUK SETUP
 *******************************************************/
function handleGetTabelUser(e) {
  const raw = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, userSheet.getLastColumn()).getValues();
  const data = raw.filter(row => row && String(row[0] || '').trim() !== '');
  const callback = e.parameter.callback || 'callback';
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function handleAddUser(e) {
  const params            = e.parameter;
  const userId            = params.userId || '';
  const userName          = params.userName || '';
  const userEmail         = params.userEmail || '';
  const userHP            = params.userHP || '';
  const userPass          = params.userPass || '';
  const userLevel         = params.userLevel || '';
  const userSalah         = params.userSalah || '0';

  const aksesLogin        = params.aksesLogin || 'N';
  const aksesFitChallange = params.aksesFitChallange || 'N';
  const aksesFitTracker   = params.aksesFitTracker || 'N';
  const aksesAnalisa      = params.aksesAnalisa || 'N';
  const aksesDataPeserta  = params.aksesDataPeserta || 'N';
  const aksesFollowWe     = params.aksesFollowWe || 'N';
  const aksesFollowCrm    = params.aksesFollowCrm || 'N';
  const aksesReferall     = params.aksesReferall || 'N';
  const aksesSetup        = params.aksesSetup || 'N';
  const aksesLogNotif     = params.aksesLogNotif || 'N';
  const aksesCoach        = params.aksesCoach || 'N'; 

  userSheet.appendRow([
    userId, userName, userEmail, userHP, userPass, userLevel, userSalah,
    aksesLogin,aksesFitChallange, aksesFitTracker,aksesAnalisa, aksesDataPeserta,aksesFollowWe, 
    aksesFollowCrm, aksesReferall, aksesSetup, aksesLogNotif, aksesCoach
  ]);

  // Ubah ini agar support JSONP
  return jsonpResponse(params.callback, {
    success: true,
    message: 'User berhasil ditambahkan'
  });
}

function handleEditUser(e) {
  const callback = (e && e.parameter && e.parameter.callback) || 'callback';

  try {
    const userId    = String((e.parameter && e.parameter.userId) || '').trim().toLowerCase();
    const userName  = (e.parameter && e.parameter.userName) || '';
    const userEmail = (e.parameter && e.parameter.userEmail) || '';
    const userHP    = (e.parameter && e.parameter.userHP) || '';
    const userPass  = (e.parameter && e.parameter.userPass) || '';
    const userLevel = (e.parameter && e.parameter.userLevel) || '';
    const userSalah = (e.parameter && e.parameter.userSalah) || '0';

    const aksesLogin        = String((e.parameter && e.parameter.aksesLogin) || 'N').trim().toUpperCase() || 'N';
    const aksesFitChallange = String((e.parameter && e.parameter.aksesFitChallange) || 'N').trim().toUpperCase() || 'N';
    const aksesFitTracker   = String((e.parameter && e.parameter.aksesFitTracker) || 'N').trim().toUpperCase() || 'N';
    const aksesAnalisa      = String((e.parameter && e.parameter.aksesAnalisa) || 'N').trim().toUpperCase() || 'N';
    const aksesDataPeserta  = String((e.parameter && e.parameter.aksesDataPeserta) || 'N').trim().toUpperCase() || 'N';
    const aksesFollowWe     = String((e.parameter && e.parameter.aksesFollowWe) || 'N').trim().toUpperCase() || 'N';
    const aksesFollowCrm    = String((e.parameter && (e.parameter.aksesFollowCrm || e.parameter.aksesDashCrm)) || 'N').trim().toUpperCase() || 'N';
    const aksesReferall     = String((e.parameter && e.parameter.aksesReferall) || 'N').trim().toUpperCase() || 'N';
    const aksesSetup        = String((e.parameter && e.parameter.aksesSetup) || 'N').trim().toUpperCase() || 'N';
    const aksesLogNotif     = String((e.parameter && e.parameter.aksesLogNotif) || 'N').trim().toUpperCase() || 'N';
    const aksesCoach        = String((e.parameter && e.parameter.aksesCoach) || 'N').trim().toUpperCase() || 'N';

    const data = userSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === userId) {
        userSheet.getRange(i + 1, 2, 1, 17).setValues([[
          userName,
          userEmail,
          userHP,
          userPass,
          userLevel,
          userSalah,
          aksesLogin,
          aksesFitChallange,
          aksesFitTracker,
          aksesAnalisa,
          aksesDataPeserta,
          aksesFollowWe,
          aksesFollowCrm,
          aksesReferall,
          aksesSetup,
          aksesLogNotif,
          aksesCoach
        ]]);

        return jsonpResponse(callback, { status: 'success', message: 'User berhasil diupdate' });
      }
    }

    return jsonpResponse(callback, { status: 'error', message: 'User tidak ditemukan' });
  } catch (error) {
    return jsonpResponse(callback, { status: 'error', message: String(error) });
  }
}

function handleDeleteUser(e) {
  const callback = e.parameter.callback || 'callback';
  const userId = e.parameter.userId;

  if (!userId) {
    return jsonpResponse(callback, { status: 'error', message: 'User ID tidak ditemukan' });
  }

  const data = userSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      userSheet.deleteRow(i + 1);
      return jsonpResponse(callback, { status: 'success', message: 'User berhasil dihapus' });
    }
  }

  return jsonpResponse(callback, { status: 'error', message: 'User tidak ditemukan di Sheet' });
}

function handleUnlockUser(e) {
  const userId = String(e.parameter.userId || '').trim();
  const callback = e.parameter.callback || 'cb';  
  if (!userId) {
    return jsonpResponse(callback, { status: 'error', message: 'User ID kosong' });
  }
  const rows = userSheet.getRange(2,1,userSheet.getLastRow()-1,7).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === userId.toLowerCase()) {
      userSheet.getRange(i + 2, 7).setValue(0);
      return jsonpResponse(callback, { status: 'success', message: 'User berhasil di-unlock' });
    }
  }
  return jsonpResponse(callback, { status: 'error', message: 'User tidak ditemukan' });
}

function handleGetUserAccess(e) {
    const userId = e.parameter.userId;
    const token = e.parameter.token;
    const callback = e.parameter.callback || "callback";

    if (!userId || !token) {
        return jsonpResponse(callback, { status: 'error', message: 'User ID atau Token tidak ditemukan.' });
    }

    const cached = CACHE.get(token);
    if (!cached) {
        return jsonpResponse(callback, { status: 'error', message: 'Session expired.' });
    }

    const users   = userSheet.getRange(1, 1, userSheet.getLastRow(), userSheet.getLastColumn()).getValues();
    const headers = users[0];
    const rows    = users.slice(1);
    const userRow = rows.find(row => row[0] === userId);

    if (!userRow) {
        return jsonpResponse(callback, { status: 'error', message: 'User tidak ditemukan.' });
    }

    const access = {};
    for (let i = 7; i < headers.length; i++) {
        const appKey = headers[i].trim().toLowerCase().replace(/\s+/g, '');
        access[appKey] = (userRow[i] || 'N').toUpperCase();
    }

    return jsonpResponse(callback, { status: 'success', access });
}

/*****************************
 * HANDLE GET TABEL LOGNOTIF *
 *****************************/
function getLogNotif() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LogNotif');
  const data  = sheet.getDataRange().getValues();
  data.shift(); // hilangkan header
  return data.reverse(); // tampilkan terbaru di atas
}

function deleteAllLogNotif() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("LogNotif");
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Sheet LogNotif tidak ditemukan."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Semua log notifikasi berhasil dihapus."
  })).setMimeType(ContentService.MimeType.JSON);
}

function deleteLogNotifByStatus(e) {
  const callback = (e.parameter && e.parameter.callback) || 'callback';
  const statusFilter = String((e.parameter && e.parameter.status) || '').trim().toUpperCase();

  if (!statusFilter) {
    return jsonpResponse(callback, {
      status: 'error',
      message: 'Status filter tidak ditemukan.'
    });
  }

  const sheet = logSheet || ss.getSheetByName('LogNotif');
  if (!sheet) {
    return jsonpResponse(callback, {
      status: 'error',
      message: 'Sheet LogNotif tidak ditemukan.'
    });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return jsonpResponse(callback, {
      status: 'success',
      message: `Tidak ada data status "${statusFilter}" untuk dihapus.`
    });
  }

  const statusValues = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
  const rowsToDelete = [];

  for (let i = 0; i < statusValues.length; i++) {
    const rowStatus = String(statusValues[i][0] || '').trim().toUpperCase();
    if (rowStatus === statusFilter) {
      rowsToDelete.push(i + 2);
    }
  }

  if (rowsToDelete.length === 0) {
    return jsonpResponse(callback, {
      status: 'success',
      message: `Tidak ada data status "${statusFilter}" yang cocok untuk dihapus.`
    });
  }

  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    sheet.deleteRow(rowsToDelete[i]);
  }

  return jsonpResponse(callback, {
    status: 'success',
    message: `${rowsToDelete.length} data status "${statusFilter}" berhasil dihapus.`
  });
}

function normalizeWhatsAppNumber(phoneNumber) {
  const digitsOnly = String(phoneNumber || '').replace(/\D/g, '');

  if (!digitsOnly) return '';
  if (digitsOnly.startsWith('62')) return digitsOnly;
  if (digitsOnly.startsWith('0')) return `62${digitsOnly.substring(1)}`;

  return `62${digitsOnly}`;
}

function sendWhatsAppFonnte(phoneNumber, message) {
  const target = normalizeWhatsAppNumber(phoneNumber);
  const TokenFonnte = "NPUQeEn4zATP628wK7au";     // Token No HP :  6281149908600
  const url = "https://api.fonnte.com/send";

  if (!target) {
    return {
      success: false,
      target: '',
      reason: 'Nomor WhatsApp kosong atau tidak valid.',
      raw: ''
    };
  }

  const options = {
    method: 'post',
    payload: {
      target: target,
      message: message,
      countryCode: '0',
      connectOnly: true
    },
    headers: { Authorization: TokenFonnte },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const httpStatus = response.getResponseCode();
  const rawBody = response.getContentText();

  let parsedBody = null;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (parseError) {
    parsedBody = null;
  }

  const apiStatus = parsedBody && (
    typeof parsedBody.status !== 'undefined'
      ? parsedBody.status
      : parsedBody.Status
  );

  const success = httpStatus >= 200 && httpStatus < 300 && apiStatus !== false && apiStatus !== 'false';
  const reason =
    (parsedBody && (parsedBody.reason || parsedBody.message || parsedBody.detail)) ||
    (success ? 'OK' : `HTTP ${httpStatus}`);

  Logger.log('Fonnte response: ' + JSON.stringify({
    target: target,
    httpStatus: httpStatus,
    success: success,
    reason: reason,
    body: rawBody
  }));

  return {
    success: success,
    target: target,
    httpStatus: httpStatus,
    reason: reason,
    raw: rawBody
  };
}

function buildNotifResponse(callback, emailSent, emailError, waResult, successMessage) {
  if (emailSent && waResult.success) {
    return jsonpResponse(callback, {
      status: 'success',
      emailSent: true,
      waSent: true,
      message: successMessage
    });
  }

  if (emailSent || waResult.success) {
    const partialParts = [];
    if (emailSent) partialParts.push('Email berhasil');
    else partialParts.push(`Email gagal: ${emailError}`);

    if (waResult.success) partialParts.push('WA berhasil');
    else partialParts.push(`WA gagal: ${waResult.reason}`);

    return jsonpResponse(callback, {
      status: 'partial',
      emailSent: emailSent,
      waSent: waResult.success,
      message: partialParts.join('. ')
    });
  }

  return jsonpResponse(callback, {
    status: 'error',
    emailSent: false,
    waSent: false,
    message: `Email gagal: ${emailError}. WA gagal: ${waResult.reason}`
  });
}

function appendNotifLog(userId, userName, userEmail, userHP, userPass, statusText) {
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow(['Waktu', 'User ID', 'Nama', 'Email', 'No HP', 'Password', 'Status']);
  }

  logSheet.appendRow([new Date(), userId, userName, userEmail, userHP, userPass, statusText]);
}

/**************************************************************************************
 * Kirim Notifikasi Aktifasi UserID dan Password yang baru dibuat ke WA dan Email User *
**************************************************************************************/
function handleAktifasiUser(e) {
  try {
    const userId    = (e.parameter.userId || '').trim();
    const userName  = (e.parameter.userName || '').trim();
    const userEmail = (e.parameter.userEmail || '').trim();
    const userHP    = (e.parameter.userHP || '').trim();
    const userPass  = (e.parameter.userPass || '').trim();
    const callback  = e.parameter.callback || 'callback';

    if (!userId || !userName || !userEmail || !userHP || !userPass) {
      return jsonpResponse(callback, {
        status: 'error',
        message: 'Data user tidak lengkap.'
      });
    }

    const message =
      `*Informasi Aktifasi User ID*\n` +
      `------------------------------------------------\n` +
      `Hello Kak, ${userName}\n` +
      `User Id : ${userId}\n` +
      `Pass : ${userPass}\n` +
      `Sudah bisa digunakan\n` +
      `Klik link ini untuk mengakses aplikasi\n`+
      `*https://amihaji.github.io/beratideal/loginBeratideal*\n\n`+
      `Harap disimpan dengan baik, jangan berikan ke orang lain\n`+ 
      `Terima Kasih`;

    let emailSent = false;
    let emailError = '';

    try {
      MailApp.sendEmail(userEmail, "Informasi Aktifasi User", message);
      emailSent = true;
    } catch (mailError) {
      emailError = mailError.message || String(mailError);
      Logger.log("Error Mail Aktifasi: " + emailError);
    }

    const waResult = sendWhatsAppFonnte(userHP, message);
    const logStatus = emailSent && waResult.success
      ? "AKTIFASI"
      : emailSent
        ? `AKTIFASI_EMAIL_ONLY | WA: ${waResult.reason}`
        : waResult.success
          ? `AKTIFASI_WA_ONLY | EMAIL: ${emailError}`
          : `AKTIFASI_GAGAL | EMAIL: ${emailError} | WA: ${waResult.reason}`;

    appendNotifLog(userId, userName, userEmail, userHP, userPass, logStatus);

    return buildNotifResponse(
      callback,
      emailSent,
      emailError,
      waResult,
      'Notifikasi Aktifasi terkirim ke Email dan WhatsApp.'
    );

  } catch (error) {
    Logger.log("Error handleInfoNotifUser: " + error);
    return jsonpResponse((e.parameter && e.parameter.callback) || 'callback', {
      status: 'error',
      message: 'Terjadi kesalahan internal: ' + error
    });
  }
}

/**********************************************************************
 * Kirim Notifikasi Reset UserID Sudah dilakukan ke WA dan Email User *
 *********************************************************************/
function handleSendNotifUser(e) {
  try {
    const userId    = (e.parameter.userId || '').trim();
    const userName  = (e.parameter.userName || '').trim();
    const userEmail = (e.parameter.userEmail || '').trim();
    const userHP    = (e.parameter.userHP || '').trim();
    const userPass  = (e.parameter.userPass || '').trim();
    const callback  = e.parameter.callback || 'callback';

    if (!userId || !userName || !userEmail || !userHP || !userPass) {
      return jsonpResponse(callback, {
        status: 'error',
        message: 'Data user tidak lengkap.'
      });
    }

    const message =
      `*Notifikasi Reset User ID*\n` +
      `------------------------------------------------\n` +
      `Hello Kak, ${userName}\n` +
      `User Id : ${userId}\n` +
      `Pass : ${userPass}\n` +
      `Sudah direset, coba login lagi\n` +
      `Terima Kasih`;

    let emailSent = false;
    let emailError = '';

    try {
      MailApp.sendEmail(userEmail, "Notifikasi Reset User ID", message);
      emailSent = true;
    } catch (mailError) {
      emailError = mailError.message || String(mailError);
      Logger.log("Error Mail Reset: " + emailError);
    }

    const waResult = sendWhatsAppFonnte(userHP, message);
    const logStatus = emailSent && waResult.success
      ? "TERESET"
      : emailSent
        ? `TERESET_EMAIL_ONLY | WA: ${waResult.reason}`
        : waResult.success
          ? `TERESET_WA_ONLY | EMAIL: ${emailError}`
          : `TERESET_GAGAL | EMAIL: ${emailError} | WA: ${waResult.reason}`;

    appendNotifLog(userId, userName, userEmail, userHP, userPass, logStatus);

    return buildNotifResponse(
      callback,
      emailSent,
      emailError,
      waResult,
      'Notifikasi reset terkirim ke Email dan WhatsApp.'
    );

  } catch (error) {
    Logger.log("Error handleSendNotifUser: " + error);
    return jsonpResponse((e.parameter && e.parameter.callback) || 'callback', {
      status: 'error',
      message: 'Terjadi kesalahan internal: ' + error
    });
  }
}

/******************************************************************
 * Kirim Notifikasi Terkunci ke Admin jika User Salah Login >= 3x *
 *****************************************************************/
function kirimNotifAdminLock(userId) {
  const data    = userSheet.getDataRange().getValues();
  const userRow = data.find(row => String(row[0]).trim().toLowerCase() === userId.toLowerCase());
  if (!userRow) return;

  const [id, nama, email, hp, pass] = userRow;

  const adminWA    = "8114499640";          // Nomor admin, akan dinormalisasi oleh sendWhatsAppFonnte()
  const adminEmail = "amihaji@gmail.com";   // ✅ Ganti dengan Email Admin
  const pesanAdmin =
    `*Notifikasi User ID Terkunci*\n` +
    `----------------------------------------------\n` +
    `User ID : ${id}\n` +
    `Nama : ${nama}\n` +
    `Email : ${email}\n` +
    `HP : ${hp}\n` +
    `Status : Salah 3X terkunci\n\n` +
    `Silakan reset akun jika perlu.`;

  let emailSent = false;
  let emailError = '';

  try {
    MailApp.sendEmail(adminEmail, "USER TERKUNCI", pesanAdmin);
    emailSent = true;
  } catch (mailError) {
    emailError = mailError.message || String(mailError);
    Logger.log("Error Mail Lock Admin: " + emailError);
  }

  const waResult = sendWhatsAppFonnte(adminWA, pesanAdmin);
  const lockStatus = emailSent && waResult.success
    ? "TERKUNCI"
    : emailSent
      ? `TERKUNCI_EMAIL_ONLY | WA: ${waResult.reason}`
      : waResult.success
        ? `TERKUNCI_WA_ONLY | EMAIL: ${emailError}`
        : `TERKUNCI_GAGAL | EMAIL: ${emailError} | WA: ${waResult.reason}`;

  appendNotifLog(id, nama, email, hp, pass, lockStatus);
}

/*******************************************************
 *         JSON & JSONP RESPONSE BUILDER               *
 *******************************************************/
function BACKUP_jsonResponse(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/***************************
/* Fungsi bantu JSONP     *
/***************************/
function jsonpResponse(callback, data) {
  if (callback && callback !== 'undefined' && callback !== 'callback') {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
