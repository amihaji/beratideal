/*********************************************************************************************
Aplikasi Survey Kebugaran - WETools Versi 5.0 GitHUB

Dibuat dengan menggunakan : 
- HTML Bootstrap versi 5.0
- CSS dan JScript
- Google Script Aplication

Terdiri atas beberapa file :
- Database : Sheet "SurveyData", "DataWE"
- index.html (program utama) ditempatkan di GitHUB
- DashWE.html ditempatkan di GitHUB
- code.gs (program server side)
- templatePDF.html (untuk menampilkan hasil ke bentuk file PDF, di tempatkan di Google script)

Fitur Aplikasi:
- Form Input Survey Kebugaran
- Menghasilkan file pdf
- File pdf dapat dikirim ke email dan wa
- Penambahan Inputan untuk Data Sponsor/Pengundang
- Hasil Survey TIDAK ditampilkan ke layar
- Tampilan lebih Responsive 
- Form Dashboard WE : Lihat, Edit dan Hapus
- Tambah Fiture Kirim WA Follow UP : Isi Pesan, Pilih Record untuk kirim WA
- Tambah Fiture Emoticon untuk kirim pesan
**********************************************************************************************/

/*******************************************************
/*               DEKLARASI GLOBAL                      *
/*******************************************************/
const DB_WETOOLS         = '1Oto0_yxgJID5GD08EwE4509_A5MSN7vXp3havvUoAco';   // ID dbWETools
const SH_SURVEY          = "SurveyData";                                     // Nama Sheet  
const SH_WELLNESS        = "DataWE";                                         // Nama Sheet  
const FOLDER_HASILSURVEY = "11Pf4TNesubzJvQ3kL4PJx8SE44SeZM9E";
const FONNTE_URL         = "https://api.fonnte.com/send";
const FONNTE_TOKEN       = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN') || "9yeq3JusFP9YZobuYTai";

const ss = SpreadsheetApp.openById(DB_WETOOLS);
const surveySheet = ss.getSheetByName(SH_SURVEY);
const weSheet     = ss.getSheetByName(SH_WELLNESS);
const CACHE       = CacheService.getScriptCache();

/*******************************************************
/*          ROUTING UTAMA (GET & POST)                 *
/*******************************************************/
function doGet(e) {
  const action = e.parameter.action;

  // Routing untuk GET requests
  if (action === 'getDataWE')       return handleGetDataWE(e);
  if (action === 'getSingleRecord') return handleGetSingleRecord(e);
  if (action === 'sendFollowUpWA')  return handleSendFollowUpWA(e);
  // Fallback ke proses survey
  return handleSurvey(e);
}

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;

    // Post Untuk Data Survey
    if (action === 'editData')          return handleEditData(data);
    if (action === 'deleteData')        return handleDeleteData(data);
    if (action === "kirimHasilSurvey")  return handleKirimHasilSurvey(data);

    return jsonResponse({ status: "error", message: "Action tidak dikenal" });
  } catch (error) {
    return jsonResponse({ status: "error", message: `doPost Error: ${error.message}` });
  }
}

/*******************************************************
/*              FUNGSI-FUNGSI HANDLER                  *
/*******************************************************/

function handleLogoutUser(data) {
    if (data.token) CACHE.remove(data.token);
    return jsonResponse({ status: 'success', message: 'Logout berhasil' });
}

// -- HANDLER UNTUK DASHBOARD --
function handleGetDataWE(e) {
    //if (!isTokenValid(e.parameter.token)) {
    //  return jsonpResponse(e.parameter.callback, { status: 'error', message: 'Sesi tidak valid' });
    //}

    let allData   = weSheet.getDataRange().getValues();
    const headers = allData.shift();
    
    if (e.parameter.filter) {
        const keyword = String(e.parameter.filter).toLowerCase().trim().replace(/\s+/g, ' ');
        allData = allData.filter(row => {
            const nama = String(row[1] || '').toLowerCase().trim().replace(/\s+/g, ' ');
            return nama.includes(keyword);
        });
    }
    
    const dataWithIndex = allData.map((row, index) => [index + 2, ...row]);
    
    return jsonpResponse(e.parameter.callback, { status: 'success', data: dataWithIndex });
}

function handleGetSingleRecord(e) {
    //if (!isTokenValid(e.parameter.token)) {
    //  return jsonpResponse(e.parameter.callback, { status: 'error', message: 'Sesi tidak valid' });
    //}
    const rowIndex = parseInt(e.parameter.rowIndex, 10);
    const rowData  = weSheet.getRange(rowIndex, 1, 1, weSheet.getLastColumn()).getValues()[0];
    
    // Konversi rowData array ke objek yang dimengerti prosesSurvey
    const dataObject = {
      mNama:           rowData[1], 
      mNomorHp:        rowData[2], 
      mEmail:          rowData[3], 
      mUmur:           rowData[4],
      mJenisKelamin:   rowData[5], 
      mBeratBadan:     rowData[6], 
      mTinggiBadan:    rowData[7],
      mLingkarPerut:   rowData[8], 
      mAktivitasFisik: rowData[9], 
      
      mSarapan:        rowData[10],
      mMenu:           rowData[11],
      mNgantuk:        rowData[12],
      mLelah:          rowData[13],
      mLambung:        rowData[14],
      mLapar:          rowData[15],
      mAir:            rowData[16],
      mKonsumsi:       rowData[17],
      mBab:            rowData[18],
      mKeram:          rowData[19],
      mTidur:          rowData[20],
      mOlahraga:       rowData[21],
      mBak:            rowData[22],
      mKerutan:        rowData[23],
      mSulit:          rowData[24],
      mBBNaik:         rowData[25],
      mRokok:          rowData[26],
      mAlkohol:        rowData[27],

      mSponsor:        rowData[28], 
      mHpSponsor:      rowData[29]

    };

    // Kita hitung ulang data agar konsisten
    const [bbIdeal, imt, lemakTubuh, lemakPerut, massaOtot, bmr, kalori, protein, skor] = hitungParameter(dataObject);
    
    const responseData = {
        tanggal: Utilities.formatDate(new Date(rowData[0]), Session.getScriptTimeZone(), "dd MMMM yyyy"),
        nama:      rowData[1], 
        hp:        rowData[2], 
        email:     rowData[3], 
        umur:      rowData[4], 
        jk:        rowData[5],
        berat:     rowData[6], 
        tinggi:    rowData[7], 
        lingkar:   rowData[8], 
        aktivitas: rowData[9],

        fungsional: getFungsionalList(dataObject),
        
        evaluasi: getEvaluasiList(dataObject, { 
          bbIdeal, 
          imt, 
          lemakTubuh, 
          lemakPerut, 
          massaOtot, 
          bmr, 
          kalori, 
          protein 
        }),
        persen: ((skor / 18) * 100).toFixed(1) + "%",
        kesimpulan:  rowData[39],
        rekomendasi: rowData[40]
    };
    
    return jsonpResponse(e.parameter.callback, { status: 'success', data: responseData });
}

function handleSendFollowUpWA(e) {
    const target = e.parameter.target || '';
    const message = e.parameter.message || '';

    if (!message.trim()) {
        return jsonpResponse(e.parameter.callback, { status: 'error', message: 'Pesan follow up kosong.' });
    }

    const result = sendWhatsAppFonnte(target, message);
    if (result.success) {
        return jsonpResponse(e.parameter.callback, {
            status: 'success',
            message: 'Pesan WA berhasil dikirim.',
            data: result
        });
    }

    return jsonpResponse(e.parameter.callback, {
        status: 'error',
        message: result.message || 'Pesan WA gagal dikirim.',
        data: result
    });
}

function handleEditData(data) {
    //if (!isUserAdmin(data.token)) return jsonResponse({ status: 'error', message: 'Akses ditolak' });

    const rowIndex = data.rowIndex;
    // Update berdasarkan mapping kolom yang diberikan
    weSheet.getRange(rowIndex, 2).setValue(data.nama);       // Kolom B
    weSheet.getRange(rowIndex, 3).setValue(data.nomorHp);    // Kolom C
    weSheet.getRange(rowIndex, 4).setValue(data.email);      // Kolom D
    weSheet.getRange(rowIndex, 29).setValue(data.sponsor);   // Kolom AC
    weSheet.getRange(rowIndex, 30).setValue(data.hpSponsor); // Kolom AD

    // Juga update di surveySheet jika diperlukan
    //surveySheet.getRange(rowIndex, 2).setValue(data.nama);
    //surveySheet.getRange(rowIndex, 3).setValue(data.nomorHp);
    //surveySheet.getRange(rowIndex, 4).setValue(data.email);
    //surveySheet.getRange(rowIndex, 29).setValue(data.sponsor);
    //surveySheet.getRange(rowIndex, 30).setValue(data.hpSponsor);
    
    return jsonResponse({ status: 'success', message: 'Data berhasil diperbarui' });
}

function handleDeleteData(data) {
    //if (!isUserAdmin(data.token)) return jsonResponse({ status: 'error', message: 'Akses ditolak' });
    
    weSheet.deleteRow(parseInt(data.rowIndex, 10));
    //surveySheet.deleteRow(parseInt(data.rowIndex, 10)); // Hapus juga dari surveySheet
    
    return jsonResponse({ status: 'success', message: 'Data berhasil dihapus' });
}

// -- HANDLER UNTUK SURVEY & PDF --
function handleSurvey(e) {
  try {
    const hasilSurvey = prosesSurvey(e.parameter);
    return jsonpResponse(e.parameter.callback, hasilSurvey);
  } catch (error) {
    return jsonpResponse(e.parameter.callback, { status: "error", message: error.message });
  }
}

function handleKirimHasilSurvey(requestData) {
    const data    = requestData.data;
    const fileUrl = buatPDF(data, new Date());
    
    kirimWA(data.hp, data.nama, fileUrl, data.sponsor, data.hpSponsor);
    if (data.email) {
        kirimEmail(data.email, data.nama, fileUrl, data.sponsor, data.hpSponsor);
    }
    
    const lastRowSurvey = surveySheet.getLastRow();
    surveySheet.getRange(lastRowSurvey, 42).setValue(fileUrl);
    
    const lastRowWE = weSheet.getLastRow();
    weSheet.getRange(lastRowWE, 42).setValue(fileUrl);

    return jsonResponse({ status: "success", message: "Hasil terkirim", url: fileUrl });
}

/*******************************************************
/*               FUNGSI-FUNGSI UTILITY                 *
/*******************************************************/
function isTokenValid(token) {
    return CACHE.get(token) !== null;
}

function isUserAdmin(token) {
    const cached = CACHE.get(token);
    if (!cached) return false;
    const user = JSON.parse(cached);
    return user.level === 'Admin';
}

function jsonResponse(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(callback, obj) {
    return ContentService.createTextOutput(`${callback}(${JSON.stringify(obj)})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function normalizeWhatsAppNumber(rawNumber) {
  const digits = String(rawNumber || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.replace(/^0+/, '');
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

function sendWhatsAppFonnte(target, message) {
  const normalizedTarget = normalizeWhatsAppNumber(target);

  if (!FONNTE_TOKEN) {
    return {
      success: false,
      target: normalizedTarget || String(target || ''),
      message: 'Token Fonnte belum diatur di Apps Script.'
    };
  }

  if (!normalizedTarget || normalizedTarget.length < 10) {
    return {
      success: false,
      target: normalizedTarget || String(target || ''),
      message: 'Nomor WhatsApp tidak valid.'
    };
  }

  try {
    const response = UrlFetchApp.fetch(FONNTE_URL, {
      method: 'post',
      headers: { Authorization: FONNTE_TOKEN },
      payload: {
        target: normalizedTarget,
        message: message
      },
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText() || '';
    let parsed = null;

    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      parsed = null;
    }

    const apiStatus = parsed && typeof parsed.status !== 'undefined' ? Boolean(parsed.status) : responseCode >= 200 && responseCode < 300;
    const apiMessage = parsed && (parsed.reason || parsed.message) ? (parsed.reason || parsed.message) : responseText;
    const friendlyMessage = /unknown token/i.test(String(apiMessage || ''))
      ? 'Token Fonnte tidak valid atau sudah expired.'
      : (apiMessage || 'Respons Fonnte tidak sukses.');

    return {
      success: apiStatus,
      target: normalizedTarget,
      code: responseCode,
      message: apiStatus ? 'Pesan WA berhasil diproses.' : friendlyMessage,
      response: parsed || responseText
    };
  } catch (error) {
    return {
      success: false,
      target: normalizedTarget,
      message: error.message || 'Terjadi kesalahan saat menghubungi Fonnte.'
    };
  }
}

/******************************************* 
/* Fungsi ini untuk memproses hasil survey *
/******************************************/
function prosesSurvey(data) {
  if (!surveySheet) {
    throw new Error(`surveySheet '${SHEET_SURVEY_NAME}' tidak ditemukan`);
  }
   
  const [
    bbIdeal, imt, lemakTubuh, lemakPerut, massaOtot, bmr, kalori, protein, skor
  ] = hitungParameter(data);

  const timestamp        = new Date();  
  const formatTgl        = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd MMMM yyyy");
  const hasilLemakTubuh  = getEvaluasiLemakTubuh(lemakTubuh, data.mJenisKelamin);
  const hasilMassaOtot   = getEvaluasiMassaOtot(massaOtot, data.mJenisKelamin, data.mUmur);
  const hasilKesimpulan  = getKesimpulan(skor);
  const hasilRekomendasi = getRekomendasi(skor, hasilMassaOtot.mMO, hasilLemakTubuh.mLT);
     
  const rowData = [
    formatTgl, 
    data.mNama, 
    data.mNomorHp, 
    data.mEmail || "", 
    data.mUmur, 
    data.mJenisKelamin, 
    data.mBeratBadan, 
    data.mTinggiBadan, 
    data.mLingkarPerut, 
    data.mAktivitasFisik,  
    data.mSarapan, 
    data.mMenu, 
    data.mNgantuk, 
    data.mLelah, 
    data.mLambung, 
    data.mLapar, 
    data.mAir, 
    data.mKonsumsi, 
    data.mBab, 
    data.mKeram, 
    data.mTidur, 
    data.mOlahraga, 
    data.mBak, 
    data.mKerutan,
    data.mSulit, 
    data.mBBNaik, 
    data.mRokok, 
    data.mAlkohol,
    data.mSponsor || "HESTY HUSAIN", 
    data.mHpSponsor || "81241318600", 
    bbIdeal, 
    imt, 
    lemakTubuh, 
    lemakPerut, 
    massaOtot, 
    bmr, 
    kalori, 
    protein, 
    skor,
    hasilKesimpulan.teks, 
    hasilRekomendasi.teks,
    "" // Kolom PDF akan diisi nanti oleh doPost
  ];
  surveySheet.appendRow(rowData);   // Simpan data di sheet "SurveyData"
  weSheet.appendRow(rowData);       // Simpan data di sheet "DataWE"

  return {
    status: "success",
    data: {
      tanggal:    formatTgl,
      nama:       data.mNama,
      hp:         data.mNomorHp,
      email:      data.mEmail,
      umur:       data.mUmur,
      jk:         data.mJenisKelamin,
      berat:      data.mBeratBadan,
      tinggi:     data.mTinggiBadan,
      lingkar:    data.mLingkarPerut,
      aktivitas:  data.mAktivitasFisik,
      fungsional: getFungsionalList(data),
      sponsor:    data.mSponsor,
      hpSponsor:  data.mHpSponsor, 
      evaluasi:   getEvaluasiList(data, {
        bbIdeal, imt, lemakTubuh, lemakPerut, massaOtot, bmr, kalori, protein
      }),
      persen: ((skor / 18) * 100).toFixed(1) + "%",
      kesimpulan: hasilKesimpulan.teks,
      rekomendasi: hasilRekomendasi.teks
    }
  };
}

/***************************************** 
/* Kumpulan Fungsi Perhitungan Kalkulasi *
/****************************************/

// Fungsi untuk menghitung seluruh parameter
function hitungParameter(data) {
  const bbIdeal    = calculateBBIdeal(data.mTinggiBadan, data.mUmur);
  const imt        = calculateIMT(data.mBeratBadan, data.mTinggiBadan);
  const lemakTubuh = calculateLemakTubuh(data.mBeratBadan, data.mTinggiBadan, data.mUmur, data.mJenisKelamin);
  const lemakPerut = calculateLemakPerut(data.mLingkarPerut);
  const massaOtot  = calculateMassaOtot(data.mJenisKelamin, data.mBeratBadan);
  const bmr        = calculateBMR(data.mBeratBadan, data.mTinggiBadan, data.mUmur, data.mJenisKelamin);
  const kalori     = calculateKalori(bmr, data.mAktivitasFisik);
  const protein    = calculateProtein(data.mBeratBadan, data.mJenisKelamin, data.mAktivitasFisik);
  const skor       = Number(calculateSkor(data));
  return [bbIdeal, imt, lemakTubuh, lemakPerut, massaOtot, bmr, kalori, protein, skor];
}

// Fungsi untuk menghitung berat badan ideal
function calculateBBIdeal(tinggi, usia) {
  if (usia >= 40) {
    return Number((tinggi - 100).toFixed(1));
  } else {
    return Number(((tinggi - 100) * 0.9).toFixed(1));
  }
}

// Fungsi untuk menghitung IMT
function calculateIMT(berat, tinggi) {
  const tinggiMeter = tinggi / 100;
  return (berat / (tinggiMeter * tinggiMeter)).toFixed(1);
}

// Fungsi untuk menghitung Lemak Tubuh
function calculateLemakTubuh(berat, tinggi, umur, jenkel) {
  const tinggiMeter = tinggi / 100;
  const imt = berat / (tinggiMeter * tinggiMeter);
  let lemakTubuh;
  jenkel = jenkel.trim().charAt(0).toUpperCase() + jenkel.trim().slice(1).toLowerCase();
  if (jenkel === "Pria") {
    lemakTubuh = (1.2 * imt + 0.23 * umur - 10.8 - 5.4).toFixed(0);
  } else { // Asumsi Wanita jika bukan Pria
    lemakTubuh = (1.2 * imt + 0.23 * umur - 5.4 - 2).toFixed(0);
  }
  return (lemakTubuh);
}

// Fungsi untuk menghitung Lemak Perut(Lingkar Perut)
function calculateLemakPerut(lingkarPerut) {
  return parseFloat(lingkarPerut);
}

// Fungsi Untuk Menghitung Massa Otot (Massa Tubuh Tanpa Lemak)
function calculateMassaOtot(jenkel, beratBadan) {
  beratBadan = Number(beratBadan);
  jenkel = jenkel.trim().charAt(0).toUpperCase() + jenkel.trim().slice(1).toLowerCase();
  if (jenkel === "Pria") {
    massaOtot =  (0.8 * beratBadan).toFixed(0);
  } else { // Asumsi Wanita jika bukan Pria
    massaOtot =  (0.7 * beratBadan).toFixed(0);
  }  
  return (massaOtot); 
}

// Fungsi untuk menghitung BMR
function calculateBMR(berat, tinggi, umur, jenkel) {  
  if (jenkel === "Pria") {
    //return (88.362 + (13.397 * berat) + (4.799 * tinggi) - (5.677 * umur)).toFixed(0);
    bmr = (88.362 + (13.397 * berat) + (4.799 * tinggi) - (5.677 * umur)).toFixed(0);
  } else {
    //return (447.593 + (9.247 * berat) + (3.098 * tinggi) - (4.330 * umur)).toFixed(0);
    bmr = (447.593 + (9.247 * berat) + (3.098 * tinggi) - (4.330 * umur)).toFixed(0);
  }
  return (bmr)
}

// Fungsi untuk menghitung kebutuhan Kalori
function calculateKalori(bmr, aktivitas) {
  const faktor = {
    "Sedikit/Tidak Olahraga": 1.2,
    "Olahraga ringan 1-3 hari/minggu": 1.375,
    "Olahraga moderat 3-5 hari/minggu": 1.550,
    "Olahraga berat 6-7 hari per minggu": 1.725,
    "Olahraga sangat aktif + Kegiatan fisik" : 1.9
  };
  //return (bmr * (faktor[aktivitas] || 1.2)).toFixed(0);
  kalori = (bmr * (faktor[aktivitas] || 1.2)).toFixed(0);
  return (kalori);
}

// Fungsi untuk menghitung kebutuhan Protein
function calculateProtein(berat, jenkel, aktifitas) {
  const faktorProtein = {
    "Sedikit/Tidak Olahraga": jenkel === "Pria" ? 1.0 : 0.8,
    "Olahraga ringan 1-3 hari/minggu": jenkel === "Pria" ? 1.2 : 1.0,
    "Olahraga moderat 3-5 hari/minggu": jenkel === "Pria" ? 1.4 : 1.2,
    "Olahraga berat 6-7 hari per minggu": jenkel === "Pria" ? 1.6 : 1.4,
    "Olahraga sangat aktif + Kegiatan fisik": jenkel === "Pria" ? 2.0 : 1.8
  };
  //return (berat * (faktorProtein[aktifitas] || 1.2)).toFixed(0);
  protein = (berat * (faktorProtein[aktifitas] || 1.2)).toFixed(0);
  return (protein);
}

// Fungsi untuk menghitung nilai skor
function calculateSkor(data) {
  const pertanyaan = [
    { field: "mSarapan",  nilai: 1 }, { field: "mMenu",     nilai: 0 },
    { field: "mNgantuk",  nilai: 0 }, { field: "mLelah",    nilai: 0 },
    { field: "mLambung",  nilai: 0 }, { field: "mLapar",    nilai: 0 },
    { field: "mAir",      nilai: 1 }, { field: "mKonsumsi", nilai: 0 },
    { field: "mBab",      nilai: 0 }, { field: "mKeram",    nilai: 0 },
    { field: "mTidur",    nilai: 1 }, { field: "mOlahraga", nilai: 1 },
    { field: "mBak",      nilai: 0 }, { field: "mKerutan",  nilai: 0 },
    { field: "mSulit",    nilai: 0 }, { field: "mBBNaik",   nilai: 0 },
    { field: "mRokok",    nilai: 0 }, { field: "mAlkohol",  nilai: 0 }
  ];
  return pertanyaan.reduce((skor, q) => {
    const jawaban = data[q.field];
    if ((jawaban === "Ya" && q.nilai === 1) || (jawaban === "Tidak" && q.nilai === 0)) {
      return skor + 1;
    }
    return skor;
  }, 0);
}

/*********************************************** 
/*  Fungsi untuk menampilkan Status Fungsional *
/**********************************************/
function getFungsionalList(data) {
  return [
    { label: "1. Sarapan Setiap Pagi", jawaban: data.mSarapan },
    { label: "2. Untuk menu sarapan, pilihan anda nasi goreng, roti, kue & sejenis", jawaban: data.mMenu },
    { label: "3. Sering merasa ngantuk terutama setelah makan", jawaban: data.mNgantuk },
    { label: "4. Sering lelah, lesu dan kurang berstamina", jawaban: data.mLelah },
    { label: "5. Sering merasakan gangguan lambung", jawaban: data.mLambung },
    { label: "6. Sering merasa lapar atau haus", jawaban: data.mLapar },
    { label: "7. Minum air putih 8 gelas/hari", jawaban: data.mAir },
    { label: "8. Mengkonsumsi makanan instant, minuman manis, ultra processed food & sejenisnya", jawaban: data.mKonsumsi },
    { label: "9. BAB tidak lancar", jawaban: data.mBab },
    { label: "10. Sering keram / kesemutan", jawaban: data.mKeram },
    { label: "11. Tidur malam paling lambat pukul 10 malam, selama 6-8 jam/hari", jawaban: data.mTidur },
    { label: "12. Berolahraga minimum 30 menit setiap 3-5 hari dalam seminggu", jawaban: data.mOlahraga },
    { label: "13. Kurang minum tetapi sering buang air kecil", jawaban: data.mBak }, 
    { label: "14. Kerutan di kulit wajah sebelum usia 40 tahun", jawaban: data.mKerutan }, 
    { label: "15. Sulit tidur / cemas / kurang konsentrasi", jawaban: data.mSulit },
    { label: "16. Berat badan naik 3kg dalam 3 bulan", jawaban: data.mBBNaik },
    { label: "17. Merokok (termasuk rokok elektrik)", jawaban: data.mRokok },
    { label: "18. Minum alkohol", jawaban: data.mAlkohol }
  ];
}

/***************************** 
/* Kumpulan Fungsi Evaluasi  *
/****************************/

// Fungsi untuk menampilkan evaluasi Berat Ideal
function getEvaluasiBBIdeal(bbIdeal, beratSekarang) {
  const selisih = (Number(beratSekarang) - Number(bbIdeal)).toFixed(1);
  if (Number(beratSekarang) < Number(bbIdeal)) {
    return { ideal: bbIdeal.toFixed(1), penjelasan: "Kekurangan berat badan " + Math.abs(selisih) + " kg" };
  } else if (Number(beratSekarang) === Number(bbIdeal)) {
    return { ideal: bbIdeal.toFixed(1), penjelasan: "Berat badan ideal" };
  } else {
    return { ideal: bbIdeal.toFixed(1), penjelasan: "Kelebihan berat badan " + selisih + " kg" };
  }
}

// Fungsi untuk menampilkan evaluasi IMT
function getEvaluasiIMT(imt, jenkel) {
  if (jenkel === "Pria") {
    if (imt < 18.5) 
      return { ideal: "18.5 - 24.9", penjelasan: "Kurus (underweight)" };
    else if (imt <= 24.9) 
      return { ideal: "18.5 - 24.9", penjelasan: "Normal" };
    else if (imt <= 29.9) 
      return { ideal: "18.5 - 24.9", penjelasan: "Kelebihan Berat Badan (overweight)" };
    else 
      return { ideal: "18.5 - 24.9", penjelasan: "Kegemukan (obesitas)" };
  } else {
    if (imt < 18) 
      return { ideal: "18 - 24.4", penjelasan: "Kurus (underweight)" };
    else if (imt <= 24.4) 
      return { ideal: "18 - 24.4", penjelasan: "Normal" };
    else if (imt <= 29.9) 
      return { ideal: "18 - 24.4", penjelasan: "Kelebihan Berat Badan (overweight)" };
    else 
      return { ideal: "18 - 24.4", penjelasan: "Kegemukan (obesitas)" };
  }
}

// Fungsi untuk menampilkan evaluasi lemak Perut (Lingkar Perut/Ukuran Celana)
function getEvaluasiLemakPerut(lingkarPerut, jenkel) {
  if (jenkel === "Pria") {
    return lingkarPerut < 90 ? { ideal: "< 90", penjelasan: "Ideal" } : { ideal: "< 90", penjelasan: "Resiko tinggi penyakit degeneratif" };
  } else {
    return lingkarPerut < 80 ? { ideal: "< 80", penjelasan: "Ideal" } : { ideal: "< 80", penjelasan: "Resiko tinggi penyakit degeneratif" };
  }
}

// Fungsi untuk menampilkan evaluasi lemak Tubuh
function getEvaluasiLemakTubuh(lemak, jenkel) {
  let ideal = "", penjelasan = "", mLT = "";
  // Pastikan 'lemak' adalah angka sebelum dibandingkan
  const lemakAngka = Number(lemak); 

  if (jenkel === "Pria") {
    ideal = "10 - 25";
    if (lemakAngka < 10) { penjelasan = "Terlalu rendah"; mLT = "rendah"; }
    else if (lemakAngka <= 25) { penjelasan = "Ideal"; mLT = "ideal"; }
    else { penjelasan = "Tinggi"; mLT = "tinggi"; }
  } else { // Asumsi Wanita
    ideal = "18 - 30";
    if (lemakAngka < 18) { penjelasan = "Terlalu rendah"; mLT = "rendah"; }
    else if (lemakAngka <= 30) { penjelasan = "Ideal"; mLT = "ideal"; }
    else { penjelasan = "Tinggi"; mLT = "tinggi"; }
  }
  return { ideal, penjelasan, mLT };
}

// Fungsi menampilkan evaluasi Massa otot (massa tubuh tanpa lemak)
function getEvaluasiMassaOtot(massaOtot, jenkel, usia) {
  let ideal = "", penjelasan = "", mMO = "";
  const massaOtotAngka = Number(massaOtot);
  const usiaAngka      = Number(usia);

  if (jenkel === "Pria") {
    if (usiaAngka <= 35) { 
      ideal = "40 - 44"; 
      if (massaOtotAngka < 40)
       { mMO = "kurang"; } 
      else if (massaOtotAngka <= 44)
       { mMO = "cukup"; } 
      else
       { mMO = "baik"; }
    }
    else if (usiaAngka <= 55) { 
      ideal = "36 - 40"; 
      if (massaOtotAngka < 36)
       { mMO = "kurang"; } 
      else if (massaOtotAngka <= 40) 
       { mMO = "cukup"; }
      else
       { mMO = "baik"; }
    }
    else if (usiaAngka <= 75) { 
      ideal = "32 - 35"; 
      if (massaOtotAngka < 32) 
       { mMO = "kurang"; }
      else if (massaOtotAngka <= 35)
       { mMO = "cukup"; }
      else
       { mMO = "baik"; }
    }
    else {
      ideal = "31 - 35";
      if (massaOtotAngka < 31)
       { mMO = "kurang"; }
      else if (massaOtotAngka <= 35)
       { mMO = "cukup"; }
      else
       { mMO = "baik"; }
    }
  } else { // Wanita
    if (usiaAngka <= 35) {
      ideal = "31 - 33";
      if (massaOtotAngka < 31)
       { mMO = "kurang"; }
      else if (massaOtotAngka <= 33)
       { mMO = "cukup"; }
      else
       { mMO = "baik"; }
    }
    else if (usiaAngka <= 55) {
      ideal = "29 - 31";
      if (massaOtotAngka < 29)
       { mMO = "kurang"; } 
      else if (massaOtotAngka <= 31)
       { mMO = "cukup"; }
      else
       { mMO = "baik"; }
    }
    else if (usiaAngka <= 75) {
      ideal = "27 - 30"; 
      if (massaOtotAngka < 27)
       { mMO = "kurang"; }
      else if (massaOtotAngka <= 30)
       { mMO = "cukup"; }
      else { mMO = "baik"; }
    }
    else {
      ideal = "26 - 30"; 
      if (massaOtotAngka < 26)
       { mMO = "kurang"; }
      else if (massaOtotAngka <= 30)
       { mMO = "cukup"; }
      else
       { mMO = "baik"; } 
    }
  }
  
  // Tentukan teks penjelasan berdasarkan mMO
  if (mMO === 'kurang') penjelasan = "Level stamina kurang, mudah lelah";
  else if (mMO === 'cukup') penjelasan = "Level stamina ideal";
  else if (mMO === 'baik') penjelasan = "Level stamina sangat baik";
  return { ideal, penjelasan, mMO };
}

// Fungsi menampilkan evaluasi BMR
function getEvaluasiBMR(bmr, jenkel) {
  const penjelasanText = "Nilai BMR : Merupakan jumlah kalori yang dibutuhkan tubuh untuk menjalankan fungsi dasar saat istirahat";
  if (jenkel === "Pria") {
    if (bmr < 1500) 
      return { ideal: "1500 - 1800", penjelasan: "Rendah, " + penjelasanText };
    else if (bmr <= 1800) 
      return { ideal: "1500 - 1800", penjelasan: "Cukup Baik, " + penjelasanText };
    else 
      return { ideal: "1500 - 1800", penjelasan: "Sangat Baik, " + penjelasanText };
  } else {
    if (bmr < 1200) 
      return { ideal: "1200 - 1500", penjelasan: "Rendah, " + penjelasanText };
    else if (bmr <= 1500) 
      return { ideal: "1200 - 1500", penjelasan: "Cukup Baik, " + penjelasanText };
    else 
      return { ideal: "1200 - 1500", penjelasan: "Sangat Baik, " + penjelasanText };
  }
}

// Fungsi menampilkan evaluasi Kalori
function getEvaluasiKalori() {
  return { ideal: "-", penjelasan: "Total asupan kalori yang diperlukan tubuh.\n" +
      "-  Untuk menurunkan Berat Badan, Anda perlu\n"+
      "   mengurangi asupan kalori (DEFISIT KALORI)\n" +      
      "   300-500 kalori.\n" +
      "-  Untuk menaikkan Berat Badan, Anda perlu\n" + 
      "   meningkatkan asupan kalori (SURPLUS KALORI)\n" +
      "   300-500 kalori." 
  };
}

// Fungsi menampilkan evaluasi Protein
function getEvaluasiProtein() {
  return { ideal: "-", penjelasan: "Jumlah asupan protein harian yang dibutuhkan tubuh agar dapat memperbaiki dan membangun kembali jaringan otot setelah beraktivitas" };
}

// Fungsi untuk menampilkan seluruh hasil Evaluasi
function getEvaluasiList(data, params) {
  return [
    (() => { const r = getEvaluasiBBIdeal(params.bbIdeal, data.mBeratBadan); 
    return { param: "Berat Badan", hasil: data.mBeratBadan, ideal: r.ideal, satuan: "kg", penjelasan: r.penjelasan };
    })(),
    
    (() => { const r = getEvaluasiIMT(params.imt, data.mJenisKelamin); 
    return { param: "Body Mass Index (BMI)", hasil: params.imt, ideal: r.ideal, satuan: "kg/m²", penjelasan: r.penjelasan };
    })(),
    
    (() => { const r = getEvaluasiLemakTubuh(params.lemakTubuh, data.mJenisKelamin); 
    return { param: "Lemak Tubuh", hasil: params.lemakTubuh, ideal: r.ideal, satuan: "%", penjelasan: r.penjelasan }; 
    })(),
    
    (() => { const r = getEvaluasiLemakPerut(params.lemakPerut, data.mJenisKelamin); 
    return { param: "Lingkar Perut", hasil: params.lemakPerut, ideal: r.ideal, satuan: "cm", penjelasan: r.penjelasan };
    })(),
    
    (() => { const r = getEvaluasiMassaOtot(params.massaOtot, data.mJenisKelamin, data.mUmur); 
    return { param: "Massa Tubuh Tanpa Lemak", hasil: params.massaOtot, ideal: r.ideal, satuan: "%", penjelasan: r.penjelasan }; 
    })(),
    
    (() => { const r = getEvaluasiBMR(params.bmr, data.mJenisKelamin);
    return { param: "Basal Metabolic Rate (BMR)", hasil: params.bmr, ideal: r.ideal, satuan: "kcal/hari", penjelasan: r.penjelasan }; })(),
    
    (() => { const r = getEvaluasiKalori(); 
    return { param: "Kebutuhan Kalori", hasil: params.kalori, ideal: r.ideal, satuan: "kcal/hari", penjelasan: r.penjelasan }; 
    })(),
    
    (() => { const r = getEvaluasiProtein(); 
    return { param: "Kebutuhan Protein", hasil: params.protein, ideal: r.ideal, satuan: "gr/hari", penjelasan: r.penjelasan };
    })()
  ];
}

// Fungsi untuk menampilkan hasil kesimpulan
function getKesimpulan(skor) {
  if (skor <= 6) return { teks: "Anda BELUM menjalani kebiasaaan hidup sehat dan aktif" };
  if (skor < 12) return { teks: "Anda MASIH PERLU meningkatkan kebiasaaan hidup sehat dan aktif" };
  return { teks: "Anda SUDAH menjalani kebiasaaan hidup sehat dan aktif" };
}

// Fungsi untuk menampilkan hasil rekomnedasi
function getRekomendasi(skor, mMO, mLT) {
  // mMO adalah status massa otot: 'kurang', 'cukup', 'baik'
  // mLT adalah status lemak tubuh: 'rendah', 'ideal', 'tinggi'
  // console.log("Debug Input Rekomendasi → skor:", skor, "| mMO:", mMO, "| mLT:", mLT);

  // Kategori Skor BAIK 
  if (skor >= 12 && skor <= 18) { 
    if (mMO === 'kurang' && mLT === 'rendah') {
      return { teks: "Anda perlu meningkatkan asupan KALORI LEBIH BESAR dari pada kebutuhan harian untuk menaikkan BERAT BADAN, Anda juga perlu mencukupi kebutuhan PROTEIN dan melakukan Latihan Beban rutin 5x seminggu selama 30 menit per sesi untuk meningkatkan MASSA OTOT. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan kebutuhan dan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'rendah') {
      return { teks: "Komposisi LEMAK dan OTOT Anda CUKUP BAIK. Cukupi kebutuhan PROTEIN harian dan Latihan Beban rutin untuk meningkatkan MASSA OTOT. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'baik' && mLT === 'rendah') {
      return { teks: "Pertahankan komposisi Otot & Lemak Anda tetap IDEAL dengan tetap aktif secara fisik dan mencukupi asupan nutrisi harian yang seimbang. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };

    } else if (mMO === 'kurang' && mLT === 'ideal') {
      return { teks: "Lemak Tubuh Anda tidak berlebih, tapi Anda masih perlu meningkatkan massa otot dengan cara mencukupi kebutuhan PROTEIN harian dan Latihan Beban rutin. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'ideal') {
      return { teks: "Komposisi tubuh Anda CUKUP BAIK. Pertahankan pola makan dan latihan untuk menjaga keseimbangan antara massa otot dan kadar lemak tubuh. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'baik' && mLT === 'ideal') {
      return { teks: "Pertahankan komposisi Otot & Lemak Anda tetap IDEAL dengan tetap aktif secara fisik dan mencukupi asupan nutrisi harian yang seimbang. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };

    } else if (mMO === 'kurang' && mLT === 'tinggi') {
      return { teks: "Perlu DEFISIT KALORI, tapi kebutuhan nutrisi harian terutama protein harus terpenuhi. Lakukan kombinasi Latihan Beban rutin dan Kardio. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'tinggi') {
      return { teks: "Perlu DEFISIT KALORI, tapi kebutuhan nutrisi harian terutama protein harus terpenuhi. Lakukan kombinasi Latihan Beban rutin dan Kardio. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'baik' && mLT === 'tinggi') {
      return { teks: "Anda perlu DEFISIT KALORI tapi TETAP memenuhi kebutuhan PROTEIN harian untuk mempertahankan MASSA OTOT. Kombinasikan Latihan Kardio dan OLAHRAGA BEBAN agar kalori aktivitas (output) makin besar. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan kebutuhan dan level kebugaran Anda." };
    }
  } 
  
  // Kategori Skor SEDANG
  else if (skor >= 7 && skor <= 11) {
    if (mMO === 'kurang' && mLT === 'rendah') {
      return { teks: "Anda perlu meningkatkan asupan KALORI LEBIH BESAR dari pada kebutuhan harian untuk menaikkan BERAT BADAN. Cukupi kebutuhan PROTEIN harian dan Latihan Beban rutin untuk meningkatkan MASSA OTOT. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'rendah') {
      return { teks: "Komposisi LEMAK dan OTOT Anda CUKUP BAIK. Cukupi kebutuhan PROTEIN harian dan Latihan Beban rutin untuk meningkatkan MASSA OTOT. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'baik' && mLT === 'rendah') {
      return { teks: "Pertahankan komposisi Otot & Lemak Anda tetap IDEAL dengan tetap aktif secara fisik dan mencukupi asupan nutrisi harian yang seimbang. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };

    } else if (mMO === 'kurang' && mLT === 'ideal') {
      return { teks: "Lemak Tubuh Anda tidak berlebih, tapi Anda masih perlu meningkatkan massa otot dengan cara mencukupi kebutuhan PROTEIN harian dan Latihan Beban rutin. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'ideal') {
      return { teks: "Komposisi tubuh Anda CUKUP BAIK. Pertahankan pola makan dan latihan untuk menjaga keseimbangan antara massa otot dan kadar lemak tubuh. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'baik' && mLT === 'ideal') {
      return { teks: "Pertahankan komposisi Otot & Lemak Anda tetap IDEAL dengan tetap aktif secara fisik dan mencukupi asupan nutrisi harian yang seimbang. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };

    } else if (mMO === 'kurang' && mLT === 'tinggi') {
      return { teks: "Perlu DEFISIT KALORI, tapi kebutuhan nutrisi harian terutama protein harus terpenuhi. Lakukan kombinasi Latihan Beban rutin dan Kardio. Lakukan pola hidup sehat dan aktif secara rutin. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'tinggi') {
      return { teks: "Perlu DEFISIT KALORI, tapi kebutuhan nutrisi harian terutama protein harus terpenuhi. Lakukan kombinasi Latihan Beban rutin dan Kardio. Lakukan pola hidup sehat dan aktif secara rutin. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'baik' && mLT === 'tinggi') {
      return { teks: "Anda perlu DEFISIT KALORI tapi TETAP memenuhi kebutuhan PROTEIN harian untuk mempertahankan MASSA OTOT. Kombinasikan Latihan Kardio dan OLAHRAGA BEBAN agar kalori aktivitas (output) makin besar. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan kebutuhan dan level kebugaran Anda." };
    }
  } 
  
  // Kategori Skor KURANG
  else if (skor >= 0 && skor <= 6) {
    if (mMO === 'kurang' && mLT === 'rendah') {
      return { teks: "Anda masih perlu meningkatkan massa otot dan asupan kalori secara bertahap. Lakukan pola hidup sehat dan aktif secara rutin. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'rendah') {
      return { teks: "Komposisi LEMAK dan OTOT Anda CUKUP BAIK, namun Anda masih perlu konsisten dengan pola hidup sehat dan aktif. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda" };
    } else if (mMO === 'baik' && mLT === 'rendah') {
      return { teks: "Komposisi tubuh Anda cukup Ideal, namun Anda masih perlu konsisten dengan pola hidup sehat dan aktif. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };

    } else if (mMO === 'kurang' && mLT === 'ideal') {
      return { teks: "Anda masih perlu meningkatkan massa otot dan mencukupi asupan nutrisi yang seimbang terutama protein. Lakukan pola hidup sehat dan aktif secara rutin. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'ideal') {
      return { teks: "Komposisi LEMAK dan OTOT Anda CUKUP BAIK, namun Anda masih perlu konsisten dengan pola hidup sehat dan aktif. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'baik' && mLT === 'ideal') {
      return { teks: "Komposisi LEMAK dan OTOT Anda CUKUP BAIK, namun Anda masih perlu konsisten dengan pola hidup sehat dan aktif. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };

    } else if (mMO === 'kurang' && mLT === 'tinggi') {
      return { teks: "Lakukan DEFISIT KALORI namun tetap memenuhi kebutuhan nutrisi terutama PROTEIN dan fokus pada kombinasi latihan beban untuk naikkan massa otot & latihan kardio low impact untuk membantu membakar lemak. Lakukan pola hidup sehat dan aktif secara rutin. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'cukup' && mLT === 'tinggi') {
      return { teks: "Perlu DEFISIT KALORI, tapi kebutuhan nutrisi harian terutama protein harus terpenuhi. Lakukan kombinasi Latihan Beban rutin dan Kardio. Lakukan pola hidup sehat dan aktif secara rutin. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan level kebugaran Anda." };
    } else if (mMO === 'baik' && mLT === 'tinggi') {
      return { teks: "Anda perlu DEFISIT KALORI tapi TETAP memenuhi kebutuhan PROTEIN harian untuk mempertahankan MASSA OTOT. Kombinasikan Latihan Kardio dan OLAHRAGA BEBAN agar kalori aktivitas (output) makin besar. Hubungi Pengundang Anda untuk mendapatkan pola makan (meal plan) dan pola latihan yang sesuai dengan kebutuhan dan level kebugaran Anda." };
    }
  }

  // Fallback jika tidak ada kondisi yang cocok
  return { teks: "! Rekomendasi Tidak ada, Silakan konsultasikan hasil Anda dengan Pengundang Anda untuk mendapatkan arahan lebih lanjut." };
}

/***************************** 
/* Kumpulan Fungsi External  *
/****************************/

function buatPDF(data, tanggal) {  
    // ***********************************************************************
    // Simpan logo beratidealku dari https://www.base64-image.de/ di variabel
    // ***********************************************************************
  
    const ambilLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMcAAAAmCAYAAABwHY/hAAAACXBIWXMAAAsTAAALEwEAmpwYAAALk2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDYwLCAyMDIwLzA1LzEyLTE2OjA0OjE3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTA1LTAzVDE2OjM1OjMwKzA4OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wNS0yMVQxMzo0MDowNyswODowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNC0wNS0yMVQxMzo0MDowNyswODowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4YzJiYTdlNy04MzVkLTQ4NGMtYWMzMC0zYWE2MGE4YjlhYWEiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDo1MWQ4ZTQ0Mi0zMzNjLWIxNDEtYjc4OS05OTY0N2NjMDNmZDQiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpjODAxNjdiZS1kYTU4LWMxNDctOWM3MS0yNjk4ZjkyNjI4ZWMiIHRpZmY6T3JpZW50YXRpb249IjEiIHRpZmY6WFJlc29sdXRpb249IjcyMDAwMC8xMDAwMCIgdGlmZjpZUmVzb2x1dGlvbj0iNzIwMDAwLzEwMDAwIiB0aWZmOlJlc29sdXRpb25Vbml0PSIyIiBleGlmOkNvbG9yU3BhY2U9IjEiIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSIxOTkiIGV4aWY6UGl4ZWxZRGltZW5zaW9uPSIzOCI+IDxwaG90b3Nob3A6VGV4dExheWVycz4gPHJkZjpCYWc+IDxyZGY6bGkgcGhvdG9zaG9wOkxheWVyTmFtZT0iQmVyYXRpZGVhbGt1IiBwaG90b3Nob3A6TGF5ZXJUZXh0PSJCZXJhdGlkZWFsa3UiLz4gPC9yZGY6QmFnPiA8L3Bob3Rvc2hvcDpUZXh0TGF5ZXJzPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmM4MDE2N2JlLWRhNTgtYzE0Ny05YzcxLTI2OThmOTI2MjhlYyIgc3RFdnQ6d2hlbj0iMjAyNC0wNS0wM1QxNjozNTozMCswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjb252ZXJ0ZWQiIHN0RXZ0OnBhcmFtZXRlcnM9ImZyb20gaW1hZ2UvcG5nIHRvIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjFmZjA4OGY0LTliOWUtM2I0NC1iOTQ1LWRmNjg4ZjQ5NDE3NiIgc3RFdnQ6d2hlbj0iMjAyNC0wNS0wM1QxNjo0OToxOCswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoxNTVlZmNkMC02MDNiLWQ2NDgtODdiMS0zMzM2YTZjMzY0NTUiIHN0RXZ0OndoZW49IjIwMjQtMDUtMjFUMTM6NDA6MDcrMDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4yIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AgdG8gaW1hZ2UvcG5nIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJkZXJpdmVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJjb252ZXJ0ZWQgZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6OGMyYmE3ZTctODM1ZC00ODRjLWFjMzAtM2FhNjBhOGI5YWFhIiBzdEV2dDp3aGVuPSIyMDI0LTA1LTIxVDEzOjQwOjA3KzA4OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4g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";


    // **************************************************************************
    // Simpan QR Code MAP Lokasi NC dari https://www.base64-image.de/ di variabel
    // **************************************************************************

    const ambilQRCode = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAB9AAAAfQCAYAAACaOMR5AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsEAAA7BAbiRa+0AAAGHaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49J++7vycgaWQ9J1c1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCc/Pg0KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyI+PHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj48cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpmYWY1YmRkNS1iYTNkLTExZGEtYWQzMS1kMzNkNzUxODJmMWIiIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIj48dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPjwvcmRmOkRlc2NyaXB0aW9uPjwvcmRmOlJERj48L3g6eG1wbWV0YT4NCjw/eHBhY2tldCBlbmQ9J3cnPz4slJgLAACsJUlEQVR4XuzcX2hf933/8bdCqsSd6taqKbJHkQhTUlCd1DZNNra5vZADUUyGnZtsRDGe5rVI3h9G62ap6q1V3SVZBoNNStkUl8nqCIPZtItiiNLQoA2WNVbXzTGrnDVSVqyETvY8JUvtjnx/F59A4c3vRpn5yh/p8bh83X35/jlH53l0WhqNRiMAAAAAAAAAYJ27Lg8AAAAAAAAAsB4J6AAAAAAAAAAgoAMAAAAAAABAIaADAAAAAAAAgIAOAAAAAAAAAIWADgAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACCgAwAAAAAAAEAhoAMAAAAAAACAgA4AAAAAAAAAhYAOAAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAIKADAAAAAAAAQCGgAwAAAAAAAICADgAAAAAAAACFgA4AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAgoAMAAAAAAABAIaADAAAAAAAAgIAOAAAAAAAAAIWADgAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACCgAwAAAAAAAEAhoAMAAAAAAACAgA4AAAAAAAAAhYAOAAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAIKADAAAAAAAAQCGgAwAAAAAAAICADgAAAAAAAACFgA4AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAgoAMAAAAAAABAIaADAAAAAAAAgIAOAAAAAAAAAIWADgAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACCgAwAAAAAAAEAhoAMAAAAAAACAgA4AAAAAAAAAhYAOAAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAIKADAAAAAAAAQCGgAwAAAAAAAICADgAAAAAAAACFgA4AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAgoAMAAAAAAABAIaADAAAAAAAAgIAOAAAAAAAAAIWADgAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACCgAwAAAAAAAEAhoAMAAAAAAACAgA4AAAAAAAAAhYAOAAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAIKADAAAAAAAAQCGgAwAAAAAAAICADgAAAAAAAACFgA4AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAgoAMAAAAAAABAIaADAAAAAAAAgIAOAAAAAAAAAIWADgAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACOgAAAAAAAAAUAjoAAAAAAAAACCgAwAAAAAAAEAhoAMAAAAAAACAgA4AAAAAAAAAhYAOAAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAI6AAAAAAAAABQCOgAAAAAAAAAIKADAAAAAAAAQCGgAwAAAAAAAICADgAAAAAAAACFgA4AAAAAAAAAAjoAAAAAAAAAFAI6AAAAAAAAAAjoAAAAAAAA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8kYymZT5+XkZHx/39bVlWZZks1nJ5/PS29ur3m1Ed3vz4j3PKzr7e6/faxaKRCLy61//2uhvn0gkfF2Il8lk5Pz58zI6OurrcyBXfpfx8XGZn58PxRhrt9uGiMgNN9ygllw5fPiw1s8REbl06ZJauobO9zN93BWVEN1k369KpVJLTmbR+Z28pv7seDwu58+fN1r8oIrFYjI3N+fZ/lj3Md12221qyYjpFJrrrrtOLV1D9xjN732UGLyH6X69Dq8+R5po1mc/AADC5P/953/+53+qRQAAgFZw4403yi233CLf+9735K//+q/lwoUL6pdIIpGQn/70p/LKK6/Ihg0b1Lu1rV27Vu6//375q7/6KxGRqj9TrpzwePrpp2X//v2ycuVK9W5tN954o6xfv17+7//+r+bvumHDBhkaGqr7u95+++1SKpXkwoUL8uc//1m9W2TBc/eLX/xCfvjDH6p3B+bHP/6xrFixQqTG812RSqXkrbfekrVr16p3XSOdTsuqVatk5cqV8vXXXy96DizLkh//+MeyefNmefPNN9uyg3PLli3y7bffim3bi54fv1W6uNWT2rrWrl0rTz75pDz11FPyT//0T/Ldd9+JbdvqlxlLJBKydetW+cUvfiEDAwNy2223efJ6ryeRSNTd98ViMVm/fr288MILnp24FxG577776v5sufIYb7/99kU//5ZbbpFvv/1WSqXSkqPcY7GYbN68WYaGhuS+++5T7w7MXXfdJd/73vdk5cqVdbebRCIh//7v/y7d3d3qXde47bbb5Omnn5aHH35YfvjDH8qlS5eWfA51dHV1yUsvvST/9V//JY8++mjDr52FdLe3Z555JpDXgVvpdLrme0gqlZKuri558803PX3eVDfeeKM8/fTT8oMf/EC+++67qu89C8ViMXnxxRfl0KFDvnfqrly5UhKJhDz77LNXj3FqvUZ1JBIJ+Y//+A/57//+b+nr6/Ms0PNCZduIRCJVX+OVY4Guri7j47mVK1fKo48+Kn/7t3+75DGHKMcdBw4cqLktBvG4F1q5cqXcd999cv/998uf/vQn+eKLL9QvqSmVSsmxY8ekv79fbrzxRvVuERG555575E9/+pP8+c9/XrTdVd4TRkdHZfXq1dfcV8/69evFcZyqz7tlWfLTn/5U3nzzzUXfd+XKlfLII4/I/fffLxcuXKj6PNcSi8VkeHhY3n777UXfuxEbN26UaDQq3333nciVa42rFn4e8HKhypYtW+r+bLny904kEq5+/o033nh1n+Nme/Z7Py0i8sADD8gPfvAD+Zu/+Zsl3/Mqz/G//du/yc9//nP17poq22S137Wi8r508ODBhl+/pizLuvrZs9rrcqHKa+mVV15Z8jUOAEArWnH58uXLahEAAAAAlqtcLidffPGFfPPNN1fHTX7yySdLnhxMJBISiUQkGo3KzTffLHfffbfceuutvodaaA+O48iXX34pH3/8sfz+97+XYrEo8/PzVU+ux2IxWbNmzTXbYjKZVL8M8ESxWJRPPvlEvvrqq7r7SvaT7aNYLMrp06elUChIsVhcdOmcWCwmiURCNm7cKJs2bWpaB62XKr/zmTNnxLbtRWO4K9v/vffeK6lUqi0XXgIAACw3BOgAAAAAAAAAAAAAAHANdAAAAAAAAAAAAAAAygjQAQAAAAAAAAAAAAAgQAcAAAAAAAAAAAAAoIwAHQAAAAAAAAAAAAAAAnQAAAAAAAAAAAAAAMoI0AEAAAAAAAAAAAAAIEAHAAAAAAAAAAAAAKCMAB0AAAAAAAAAAAAAAAJ0AAAAAAAAAAAAAADKCNABAAAAAAAAAAAAACBABwAAAAAAAAAAAACgjAAdAAAAAAAAAAAAAAACdAAAAAAAAAAAAAAAygjQAQAAAAAAAAAAAAAgQAcAAAAAAAAAAAAAoIwAHQAAAAAAAAAAAAAAAnQAAAAAAAAAAAAAAMoI0AEAAAAAAAAAAAAAIEAHAAAAAAAAAAAAAKCMAB0AAAAAAAAAAAAAAAJ0AAAAAAAAAAAAAADKCNABAAAAAAAAAAAAACBABwAAAAAAAAAAAACgjAAdAAAAAAAAAAAAAAACdAAAAAAAAAAAAAAAygjQAQAAAAAAAAAAAAAgQAcAAAAAAAAAAAAAoIwAHQAAAAAAAAAAAAAAAnQAAAAAAAAAAAAAAMoI0AEAAAAAAAAAAAAAIEAHAAAAAAAAAAAAAKCMAB0AAAAAAAAAAAAAAAJ0AAAAAAAAAAAAAADKCNABAAAAAAAAAAAAACBABwAAAAAAAAAAAACgjAAdAAAAAAAAAAAAAAACdAAAAAAAAAAAAAAAygjQAQAAAAAAAAAAAAAgQAcAAAAAAAAAAAAAoIwAHQAAAAAAAAAAAAAAAnQAAAAAAAAAAAAAAMoI0AEAAAAAAAAAAAAAIEAHAAAAAAAAAAAAAKCMAB0AAAAAAAAAAAAAAAJ0AAAAAAAAAAAAAADKCNABAAAAAAAAAAAAACBABwAAAAAAAAAAAACgjAAdAAAAAAAAAAAAAAACdAAAAAAAAAAAAAAAygjQAQAAAAAAAAAAAAAgQAcAAAAAAAAAAAAAoIwAHQAAAAAAAAAAAAAAAnQAAAAAAAAAAAAAAMoI0AEAAAAAAAAAAAAAIEAHAAAAAAAAAAAAAKCMAB0AAAAAAAAAAAAAAAJ0AAAAAAAAAAAAAADKCNABAAAAAAAAAAAAACBABwAAAAAAAAAAAACgjAAdAAAAAAAAAAAAAAACdAAAAAAAAAAAAAAAygjQAQAAAAAAAAAAAAAgQAcAAAAAAAAAAAAAoIwAHQAAAAAAAAAAAAAAAnQAAAAAAAAAAAAAAMoI0AEAAAAAAAAAAAAAIEAHAAAAAAAAAAAAAKCMAB0AAAAAAAAAAAAAAAJ0AAAAAAAAAAAAAADKCNABAAAAAAAAAAAAACBABwAAAAAAAAAAAACgjAAdAAAAAAAAAAAAAAACdAAAAAAAAAAAAAAAygjQAQAAAAAAAAAAAAAQkf8P0Cnv8f1W9RcAAAAASUVORK5CYII=";

  try {
    // Folder ID "HasilSurvey"
    const folderId   = FOLDER_HASILSURVEY;
    const namaBersih = data.nama ? data.nama.replace(/\s+/g, '') : "TanpaNama";
    const fileName   = `Survey-${namaBersih}-${Utilities.formatDate(tanggal, Session.getScriptTimeZone(), "ddMMyyyy")}.pdf`;
    const template   = HtmlService.createTemplateFromFile("templatePDF");

    // Mengirim seluruh objek data dan gambar ke template
    template.data         = data; 
    template.logoBase64   = ambilLogo;
    template.qrCodeBase64 = ambilQRCode;
   
    const htmlContent = template.evaluate().getContent();
    const folder      = DriveApp.getFolderById(folderId);
    
    // Cek file duplikat
    const existingFiles = folder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
      // Jika file sudah ada, hapus yang lama agar bisa diganti
      existingFiles.next().setTrashed(true);
    }

    const pdfFile = folder.createFile(Utilities.newBlob(htmlContent, 'text/html', fileName).getAs('application/pdf'));
    pdfFile.setName(fileName);
    
    console.log("PDF created:", pdfFile.getUrl());
    return pdfFile.getUrl();

  } catch (error) {
    console.error("Gagal membuat PDF: " + error.stack);
    throw new Error("Gagal membuat file PDF: " + error.message);
  }
}

// Fungsi Untuk mengirim email
function kirimEmail(email, nama, fileUrl, mSponsor, mHpSponsor) {
  try {
    const tglSurvey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMMM yyyy");
    const subject   = `Hasil Survey Kebugaran - ${nama}`;
    const body = `
    <p><strong>HASIL EVALUASI KEBUGARAN</strong></p>
    <p>Tgl Survey: ${tglSurvey}
    <br>Terima kasih kak <strong>${nama},</strong>
    <br>Terlampir hasil survey evaluasi kebugaran
    <br>Silahkan : <a href="${fileUrl}">Klik ini untuk lihat hasil surveynya !</a></p>
    <p>Untuk info lebih lanjut silahkan menghubungi:<br>
    <br>Member Independen<br>${mSponsor}
    <br>WA: ${mHpSponsor}
    <br>Terima kasih</p>
    <p>Copyright by : <a href="https://www.beratidealku.com">www.beratidealku.com</a>
    <br>Lokasi Map NC : <a href="https://bit.ly/LokasiKlubKita">klubKITA</a>
    <br><strong>Disclaimer:</strong> Hasil analisa ini hanya bersifat umum saja dan bukan merupakan pengganti diagnosa medis</p>`;

    if (email && email.includes("@")) {
      MailApp.sendEmail({ to: email, subject: subject, htmlBody: body });
      console.log("Email terkirim ke:", email);
    }
  } catch (e) {
    console.error("Gagal kirim email:", e);
  }
}

// Fungsi untuk mengrim WA
function kirimWA(nomorHP, nama, fileUrl, mSponsor, mHpSponsor) {
  const tanggal     = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMMM yyyy");
  const noWaUser    = "62" + String(nomorHP).replace(/^0+/, "");
  const noWaSponsor = "62" + String(mHpSponsor).replace(/^0+/, "");

  const fPesanWA = 
    '*EVALUASI KEBUGARAN*' +
    '\n---------------------------------------------' +
    '\nTgl : ' + tanggal +
    '\n\nHai kak ' + nama +
    '\nTerlampir hasil survey' +
    '\n*Silahkan klik untuk lihat* 👇' +
    '\n' + fileUrl +
    '\n\n*Info lebih lanjut hubungi :*' +
    '\nMember Independen' +
    '\n'+ mSponsor +
    '\nWA : ' + mHpSponsor +
    '\n\nTerima kasih 🙏\n' +
    '\n---------------------------------------------' +
    '\n*Copyright by :*\nwww.beratidealku.com \n' +
    '\n*Map Klub Nutrisi:*\nbit.ly/LokasiKlubKita \n' +
    '\n*Disclaimer*: Hasil analisa ini hanya bersifat umum saja dan bukan merupakan pengganti diagnosa medis';

  const options_konsumen = { 
    method: "post", 
    headers: { "Authorization": FONNTE_TOKEN }, 
    payload: { target: noWaUser, message: fPesanWA } };
  
  const options_member = { 
    method: "post", 
    headers: { "Authorization": FONNTE_TOKEN }, 
    payload: { target: noWaSponsor, message: "*Notifikasi List Baru*\n" + fPesanWA } };

  try {
    UrlFetchApp.fetch(FONNTE_URL, options_konsumen);
    console.log("Pesan WA terkirim ke konsumen:", noWaUser);
  } catch(e) { console.error("Gagal kirim WA ke konsumen:", e); }

  try {
    UrlFetchApp.fetch(FONNTE_URL, options_member);
    console.log("Pesan WA terkirim ke sponsor:", noWaSponsor);
  } catch(e) { console.error("Gagal kirim WA ke sponsor:", e); }
}
