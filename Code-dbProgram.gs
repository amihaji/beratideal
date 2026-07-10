/*******************************************************
/*               DEKLARASI GLOBAL                      *
/*******************************************************/
const DB_PROGRAM        = '12PzCrNdv_0Xxa4a8RBBv4d005hXmYFY5DjqxGl3QbE8';
const ssProgram         = SpreadsheetApp.openById(DB_PROGRAM);
const shProgram         = ssProgram.getSheetByName('PROGRAM');
const shDataKonsumen    = ssProgram.getSheetByName('DATAKONSUMEN');

const DB_USER           = '1oNOSh0L9HkXDpEXGMAZOVRMw7crMGWbuOKUu7f4sSqY';
const ssUser            = SpreadsheetApp.openById(DB_USER);
const shTabelUser       = ssUser.getSheetByName('TabelUser');

const folderDATAIMAGE   = DriveApp.getFolderById("1luBfilKzCmyUBeOD14qcfqpDmPvnMcV_");

/****************************************
/* Fungsi untuk mengambil data di sheet *
/****************************************/
function doGet(e) { 
  const action = e.parameter.action; 
  const callback = e.parameter.callback; 

  if (action === "test") { 
    return createJSONPResponse(callback, { 
      status: "success", 
      message: "Service is working!" 
    }); 
  } 

  if (action === "checkLogin") { 
    return checkLogin(e.parameter); 
  } 

  if (action === "getUserProgress") { 
    return getUserProgress(e.parameter); 
  } 

  if (action === "getLastProgress") { 
    return getLastProgress(e.parameter); 
  } 

  if (action === "getUserCompleteProgress") { 
    return getUserCompleteProgress(e.parameter); 
  } 

  if (action === "getDashboardData") { 
    return getDashboardData(e.parameter); 
  } 

  // PERKENALAN 
  if (action === 'updatePerkenalan') { 
    return updatePerkenalan(e.parameter); 
  } 

  // MATERI 
  if (action === 'updateMateri') { 
    return updateMateri(e.parameter); 
  } 

  // MEAL PLAN UPLOAD IMAGE 
  if (action === 'uploadMealPlan') { 
    return uploadMealPlan(e.parameter); 
  } 

  // MEAL PLAN SIMPAN PER ITEM 
  if (action === 'updateMealItem') { 
    return updateMealItem(e.parameter); 
  } 

  // MEAL PLAN SELESAI 
  if (action === 'updateMealPlan') { 
    return updateMealPlan(e.parameter); 
  } 

  // WORKOUT SIMPAN DATA 
  if (action === 'updateWorkout') { 
    return updateWorkout(e.parameter); 
  } 

  // WORKOUT SELESAI 
  if (action === 'completeWorkout') { 
    return completeWorkout(e.parameter); 
  } 

  // WATER SIMPAN DATA 
  if (action === 'updateWater') { 
    return updateWater(e.parameter); 
  } 

  // WATER SELESAI 
  if (action === 'completeWater') { 
    return completeWater(e.parameter); 
  } 

  // ISTIRAHAT SIMPAN DATA 
  if (action === 'updateIstirahat') { 
    return updateIstirahat(e.parameter); 
  } 

  // ISTIRAHAT SELESAI 
  if (action === 'completeIstirahat') { 
    return completeIstirahat(e.parameter); 
  } 

  // TRACKING SIMPAN DATA 
  if (action === 'updateDataTracking') { 
    return updateDataTracking(e.parameter); 
  } 

  // TRACKING SELESAI (HITUNG + SIMPAN HASIL) 
  if (action === 'completeDataTracking') { 
    return completeDataTracking(e.parameter); 
  } 

  // KIRIM WA COACH 
  if (action === 'kirimWaCoach') { 
    return kirimWaCoach(e.parameter); 
  } 

  // TANYA COACH SELESAI 
  if (action === 'completeTanyaCoach') { 
    return completeTanyaCoach(e.parameter); 
  } 

  // SELESAI MODUL HARI 
  if (action === 'completeModul') { 
    return completeModul(e.parameter); 
  } 

  return createJSONPResponse(callback, { 
    status: "error", 
    message: "Action tidak dikenali" 
  }); 
} 

/*****************************************************
/* Fungsi untuk simpan data baru di sheet dan update *
/*****************************************************/
function doPost(e) { 
  // Teruskan permintaan POST ke doGet() agar dapat bekerja dengan JSONP
  return doGet(e); 
} 

/**********************************
/* Fungsi Login dan Get User Data *
/*********************************/
function checkLogin(data) {
  const callback = data.callback;

  try {
    const userId   = data.userId;
    const userPass = data.userPass;

    const values = shTabelUser.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      const sheetUserId    = values[i][0]; // A: User ID
      const sheetuserName  = values[i][1]; // B: Nama User
      const sheetuserHP    = values[i][3]; // D: Telp User
      const sheetPass      = values[i][4]; // E: Password
      const sheetLevel     = values[i][5]; // F: Level

      if (
        sheetUserId &&
        sheetUserId.toString().toLowerCase() === userId.toLowerCase() &&
        sheetPass === userPass
      ) {
        // ✅ INI KUNCI UTAMA
        return createJSONPResponse(callback, {
          status: 'success',
          loggedIn: true,
          userId: sheetUserId,
          userName: sheetuserName, // 🔥 WAJIB ADA
          userHP: sheetuserHP,
          token: Utilities.getUuid(),
          level: sheetLevel || 'user'
        });
      }
    }

    return createJSONPResponse(callback, {
      status: 'error',
      message: 'User ID atau Password salah'
    });

  } catch (error) {
    return createJSONPResponse(callback, {
      status: 'error',
      message: error.toString()
    });
  }
}

/************************************
* Fungsi Untuk mengambil nilai data *
************************************/
function getUserProgress(data) {
  const callback = data.callback;
  try {
    const userId = data.userId;
    const hariKe = parseInt(data.hariKe) || 1;
    const values = shProgram.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === userId && values[i][2] == hariKe) {
        return createJSONPResponse(callback, {
          materi:          values[i][5] || '',
          sarapan:         values[i][6] || '',
          linkSarapan:     values[i][7] || '',
          cemilanPagi:     values[i][8] || '',
          linkCemilanPagi: values[i][9] || '',
          makanSiang:      values[i][10] || '',
          linkMakanSiang:  values[i][11] || '',
          cemilanSore:     values[i][12] || '',
          linkCemilanSore: values[i][13] || '',
          makanMalam:      values[i][14] || '',
          linkMakanMalam:  values[i][15] || '',
          mealPlan:        values[i][16] || ''
        });
      }
    }
    return createJSONPResponse(callback, {});
    
  } catch (error) {
    return createJSONPResponse(callback, {error: error.toString()});
  }
}

/***************************
* Fungsi Get Last Progress *
****************************/
function getLastProgress(data) {
  const callback = data.callback;
  
  try {
    const userId = data.userId;
    console.log('🔍 Cek progress untuk:', userId);
    const values = shProgram.getDataRange().getValues();
    
    let hasil = {
      success: true,
      perkenalan: false
    };
    
    // Inisialisasi semua field untuk hari 1-10
    for (let h = 1; h <= 10; h++) {
      hasil[`materiHari${h}`] = false;
      hasil[`mealplanHari${h}`] = false;
      hasil[`workoutHari${h}`] = false;
      hasil[`waterHari${h}`] = false;
      hasil[`istirahatHari${h}`] = false;
      hasil[`trackingHari${h}`] = false;
      hasil[`tanyaHari${h}`] = false;
      hasil[`selesaimodulHari${h}`] = false;
    }
    
    for (let i = 1; i < values.length; i++) {
      const rowUserId = values[i][1]; // Kolom B
      const hariKe    = values[i][2]; // Kolom C
      const materi    = values[i][5]; // Kolom F
      const mealplan  = values[i][16]; // Kolom Q
      const workout   = values[i][25]; // Kolom Z
      const water     = values[i][27]; // Kolom AB
      const istirahat = values[i][30]; // Kolom AE
      const tracking  = values[i][48]; // Kolom AW
      const tanya     = values[i][49]; // Kolom AX
      const selesaimodul = values[i][50]; // Kolom AY
      
      if (rowUserId && rowUserId.toString().toLowerCase() === userId.toLowerCase()) {
        
        // PERKENALAN (hari 0)
        if (hariKe === 0 && materi === "OK") {
          hasil.perkenalan = true;
        }
        
        // Untuk hari 1-10
        if (hariKe >= 1 && hariKe <= 10) {
          if (materi === "OK") hasil[`materiHari${hariKe}`] = true;
          if (mealplan === "OK") hasil[`mealplanHari${hariKe}`] = true;
          if (workout === "OK") hasil[`workoutHari${hariKe}`] = true;
          if (water === "OK") hasil[`waterHari${hariKe}`] = true;
          if (istirahat === "OK") hasil[`istirahatHari${hariKe}`] = true;
          if (tracking === "OK") hasil[`trackingHari${hariKe}`] = true;
          if (tanya === "OK") hasil[`tanyaHari${hariKe}`] = true;
          if (selesaimodul === "OK") hasil[`selesaimodulHari${hariKe}`] = true;
        }
      }
    }
    
    console.log('📊 Hasil progress:', hasil);
    return createJSONPResponse(callback, hasil);
    
  } catch (error) {
    console.error('❌ Error:', error);
    return createJSONPResponse(callback, {
      success: false,
      error: error.toString()
    });
  }
}

/****************************************
* Fungsi Perkenalan - Buka Kunci Modul *
****************************************/
function updatePerkenalan(data) {
  const callback = data.callback;
  
  try {
    const userId   = data.userId;
    const userName = data.userName;
        
    // Cari row untuk user di hari 0 (perkenalan)
    const values = shProgram.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === userId && values[i][2] == 0) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const now = new Date();
    if (rowIndex !== -1) {
      // Update existing row
      shProgram.getRange(rowIndex, 1).setValue(now); // Kolom A: Tgl Aktifitas
      shProgram.getRange(rowIndex, 6).setValue("OK"); // Kolom F: Materi (perkenalan)
      
    } else {
      // Buat row baru untuk perkenalan (hari 0)
      const newRow = [
        now,     // A : (1): Tgl Aktifitas
        userId,         // B : (2): User ID
        0,         // C : (3): Hari ke
        '',             // D : (4): Target Program
        userName,  // E : (5): Nama Konsumen
        "OK",             // F : (6): Materi
        '',             // G	 : (7): Sarapan
        '',             // H	 : (8): Link Sarapan
        '',             // I : (9): Cemilan Pagi
        '',             // J	 : (10): Link CemilanPagi
        '',             // K : (11): Makan Siang
        '',             // L : (12): Link MakanSiang
        '',             // M : (13): Cemilan Sore
        '',             // N : (14): Link CemilanSore
        '',             // O : (15): Makan Malam
        '',             // P	 : (16): Link MakanMalam
        '',             // Q : (17): Meal Plan              
        '',             // R : (18): Kardio
        '',             // S : (19): Link Kardio
        '',             // T : (20): Durasi Start
        '',             // U : (21): Durasi Stop
        '',             // V : (22): Resisten
        '',             // W : (23): Jumlah Set
        '',             // X : (24): Jumlah Repetisi
        '',             // Y : (25): Durasi Menit
        '',             // Z : (26): Workout
        '',             // AA : (27): Asupan Air
        ''              // AB : (28): Water
      ];
      shProgram.appendRow(newRow);
    }
    
    return createJSONPResponse(callback, "OK");
  } catch (error) {
    return createJSONPResponse(callback, error.toString());
  }
}

/*******************************
* Materi Video - Update Status *
********************************/
function updateMateri(data) {
  const callback = data.callback;
  
  try {
    const userId   = data.userId;
    const hariKe   = parseInt(data.hariKe);
    
    if (!userId || !hariKe) {
      return createJSONPResponse(callback, {success: false, message: "Data tidak lengkap"});
    }
    
    // Ambil Nama User dari sheet "TabelUser" (KOLOM B)
    let namaKonsumen = "";
    const userData   = shTabelUser.getDataRange().getValues();
    
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][0] && userData[i][0].toString().trim().toLowerCase() === userId.toLowerCase()) {
        namaKonsumen = userData[i][1] || ""; // Kolom B (index 1) = Nama User
        console.log("✅ Nama ditemukan di TabelUser: " + namaKonsumen);
        break;
      }
    }
    
    // Ambil nama konsumen dari sheet "DATAKONSUMEN" berdasarkan nama
    let targetProgram = "";
    if (namaKonsumen) {
      const konsumenData = shDataKonsumen.getDataRange().getValues();
      let found = false;
      
      for (let i = 1; i < konsumenData.length; i++) {
        const namaDiSheet = konsumenData[i][4] || ""; // Kolom E (index 4) = Nama konsumen
        
        // Cek dengan case-insensitive dan trim whitespace
        if (namaDiSheet && namaDiSheet.toString().trim().toLowerCase() === namaKonsumen.trim().toLowerCase()) {
          targetProgram = konsumenData[i][2] || ""; // Kolom C (index 2) = Program
          console.log("✅ Program ditemukan: " + targetProgram + " untuk nama: " + namaKonsumen);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log("⚠️ Nama '" + namaKonsumen + "' tidak ditemukan di DATAKONSUMEN");
        
        // Coba cari dengan partial match jika tidak ketemu exact match
        for (let i = 1; i < konsumenData.length; i++) {
          const namaDiSheet = konsumenData[i][4] || "";
          if (namaDiSheet && namaKonsumen.toLowerCase().includes(namaDiSheet.toString().toLowerCase()) || 
              namaDiSheet.toString().toLowerCase().includes(namaKonsumen.toLowerCase())) {
            targetProgram = konsumenData[i][2] || "";
            console.log("✅ Program ditemukan (partial match): " + targetProgram + " untuk: " + namaKonsumen);
            break;
          }
        }
      }
    } else {
      console.log("❌ Nama konsumen tidak ditemukan untuk userId: " + userId);
    }
    
    // Update atau Buat Baris di sheet program
    const programData = shProgram.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < programData.length; i++) {
      if (programData[i][1] && programData[i][1].toString().toLowerCase() === userId.toLowerCase() && 
          programData[i][2] == hariKe) {
        rowIndex = i + 1;
        console.log("✅ Data ditemukan di baris: " + rowIndex);
        break;
      }
    }
    
    const now = new Date();
    
    if (rowIndex !== -1) {
      // Update row yang ada
      if (targetProgram) {
        shProgram.getRange(rowIndex, 4).setValue(targetProgram); // Kolom D: Target Program
      }
      if (namaKonsumen) {
        shProgram.getRange(rowIndex, 5).setValue(namaKonsumen); // Kolom E: Nama Konsumen
      }
      shProgram.getRange(rowIndex, 6).setValue("OK"); // Kolom F: Materi
      shProgram.getRange(rowIndex, 1).setValue(now); // Kolom A: Tgl Aktifitas
      
      console.log("✅ Data diupdate: Program='" + targetProgram + "', Nama='" + namaKonsumen + "'");
    } else {
      // Buat row baru
      const newRow = [
        now,           // A : (1): Tgl Aktifitas
        userId,         // B : (2): User ID
        hariKe,         // C : (3): Hari ke
        targetProgram, // D : (4): Target Program
        namaKonsumen,  // E : (5): Nama Konsumen
        "OK",             // F : (6): Materi
        '',             // G	 : (7): Sarapan
        '',             // H	 : (8): Link Sarapan
        '',             // I : (9): Cemilan Pagi
        '',             // J	 : (10): Link CemilanPagi
        '',             // K : (11): Makan Siang
        '',             // L : (12): Link MakanSiang
        '',             // M : (13): Cemilan Sore
        '',             // N : (14): Link CemilanSore
        '',             // O : (15): Makan Malam
        '',             // P	 : (16): Link MakanMalam
        '',             // Q : (17): Meal Plan              
        '',             // R : (18): Kardio
        '',             // S : (19): Link Kardio
        '',             // T : (20): Durasi Start
        '',             // U : (21): Durasi Stop
        '',             // V : (22): Resisten
        '',             // W : (23): Jumlah Set
        '',             // X : (24): Jumlah Repetisi
        '',             // Y : (25): Durasi Menit
        '',             // Z : (26): Workout
        '',             // AA : (27): Asupan Air
        ''              // AB : (28): Water
      ];
      shProgram.appendRow(newRow);
      console.log("✅ Row baru dibuat: Program='" + targetProgram + "', Nama='" + namaKonsumen + "'");
    }
    return createJSONPResponse(callback, "OK");
    
  } catch (error) {
    console.error("❌ Error updateMateri: " + error.toString());
    return createJSONPResponse(callback, {success: false, message: error.toString()});
  }
}

/****************************
* Meal Plan Upload & Status *
*****************************/
function uploadMealPlan(data) {
  const callback = data.callback;
  
  try {
    const sheet    = shProgram;
    const userId   = data.userId;
    const userName = data.userName;
    const hariKe   = parseInt(data.hariKe);
    const mealType = data.mealType;
    // const fileData = data.fileData;
    const fileData = data.file || data.fileData;
    
    // Upload file ke Drive jika ada
    let fileUrl = "";
    if (fileData) {
      try {
        const fileName = `${userId}_MP${hariKe}${capitalizeFirst(mealType)}.jpg`;
        const blob     = Utilities.newBlob(Utilities.base64Decode(fileData), "image/jpeg", fileName);
        const file     = folderDATAIMAGE.createFile(blob);
        fileUrl        = file.getUrl();
      } catch (fileError) {
        console.error("File upload error:", fileError);
        // Lanjut tanpa file URL
      }
    }
    
    // Mapping kolom berdasarkan meal type
    const mealMap = {
      'sarapan': { status: 7, link: 8 },
      'cemilanPagi': { status: 9, link: 10 },
      'makanSiang': { status: 11, link: 12 },
      'cemilanSore': { status: 13, link: 14 },
      'makanMalam': { status: 15, link: 16 }
    };
    
    const mapping = mealMap[mealType];
    if (!mapping) {
      return createJSONPResponse(callback, {success: false, message: "Meal type tidak valid"});
    }
    
    // Cari atau buat row
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === userId && values[i][2] == hariKe) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const now = new Date();
    if (rowIndex !== -1) {
      // Update existing row
      sheet.getRange(rowIndex, mapping.status).setValue("OK");
      sheet.getRange(rowIndex, mapping.link).setValue(fileUrl);
      sheet.getRange(rowIndex, 1).setValue(now);
    } else {
      // Buat row baru
      const newRow = [
        now,     // A : (1): Tgl Aktifitas
        userId,         // B : (2): User ID
        hariKe,         // C : (3): Hari ke
        '',             // D : (4): Target Program
        userName,  // E : (5): Nama Konsumen
        '',             // F : (6): Materi
        '',             // G	 : (7): Sarapan
        '',             // H	 : (8): Link Sarapan
        '',             // I : (9): Cemilan Pagi
        '',             // J	 : (10): Link CemilanPagi
        '',             // K : (11): Makan Siang
        '',             // L : (12): Link MakanSiang
        '',             // M : (13): Cemilan Sore
        '',             // N : (14): Link CemilanSore
        '',             // O : (15): Makan Malam
        '',             // P	 : (16): Link MakanMalam
        '',             // Q : (17): Meal Plan              
        '',             // R : (18): Kardio
        '',             // S : (19): Link Kardio
        '',             // T : (20): Durasi Start
        '',             // U : (21): Durasi Stop
        '',             // V : (22): Resisten
        '',             // W : (23): Jumlah Set
        '',             // X : (24): Jumlah Repetisi
        '',             // Y : (25): Durasi Menit
        '',             // Z : (26): Workout
        '',             // AA : (27): Asupan Air
        ''              // AB : (28): Water
      ];

      // Set status dan link untuk meal type tertentu
      newRow[mapping.status - 1] = "OK";
      newRow[mapping.link - 1] = fileUrl;
      
      sheet.appendRow(newRow);
    }
    
    return createJSONPResponse(callback, {
      success: true,
      fileUrl: fileUrl,
      message: "Meal plan berhasil disimpan"
    });
    
  } catch (error) {
    return createJSONPResponse(callback, {success: false, message: error.toString()});
  }
}

/********************************
 * Fungsi Update Item Meal Plan *
 ********************************/
function updateMealItem(data) {
  const callback = data.callback;
  
  try {
    const sheet    = shProgram;
    const userId   = data.userId;
    const hariKe   = parseInt(data.hariKe);
    const mealType = data.mealType;
    
    const mealMap = {
      'sarapan': 7,
      'cemilanPagi': 9,
      'makanSiang': 11,
      'cemilanSore': 13,
      'makanMalam': 15
    };
    
    const colIndex = mealMap[mealType];
    if (!colIndex) return createJSONPResponse(callback, "Invalid meal type");
    
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === userId && values[i][2] == hariKe) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, colIndex).setValue("OK");
      sheet.getRange(rowIndex, 1).setValue(new Date());
    }
    
    return createJSONPResponse(callback, "OK");
       
  } catch (error) {
    return createJSONPResponse(callback, error.toString());
  }
}

/***************************
 * Fungsi Update Meal Plan *
 ***************************/
function updateMealPlan(data) {
  const callback = data.callback;
  
  try {
    const sheet    = shProgram;
    const userId   = data.userId;
    // const userName = data.userName;
    const hariKe   = parseInt(data.hariKe);
    
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === userId && values[i][2] == hariKe) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 17).setValue("OK"); // Kolom Q: Meal Plan
      sheet.getRange(rowIndex, 1).setValue(new Date());
    }
    
    return createJSONPResponse(callback, "OK");
      
  } catch (error) {
    return createJSONPResponse(callback, error.toString());
  }
}

/****************************
* WORKOUT - Upload & Status *
*****************************/
function updateWorkout(param) { 
  const callback = param.callback;
  try { 
    const sheet    = shProgram; 
    const userId   = param.userId; 
    const userName = param.userName || ""; 
    const hariKe   = parseInt(param.hariKe, 10); 
    const workoutData = JSON.parse(param.workoutData || "{}"); 

    if (!userId || !hariKe) { 
      throw new Error("Data workout tidak lengkap"); 
    } 

    // UPLOAD FILE KARDIO (FIX NAMA FILE) 
    let kardioFileUrl = ""; 
    if (param.kardioFile) { 
      const kardioType = workoutData.kardioType || "Kardio"; 
      const safeType   = kardioType.replace(/\s+/g, ''); 
      const fileName   = `${userId}_KA${hariKe}${safeType}.jpg`; 

      const blob = Utilities.newBlob( 
        Utilities.base64Decode(param.kardioFile), 
        "image/jpeg", 
        fileName 
      ); 

      const file = folderDATAIMAGE.createFile(blob); 
      kardioFileUrl = file.getUrl(); 
    } 

    // CARI ROW USER + HARI 
    const values = sheet.getDataRange().getValues(); 
    let rowIndex = -1; 

    for (let i = 1; i < values.length; i++) { 
      if (values[i][1] === userId && values[i][2] == hariKe) { 
        rowIndex = i + 1; 
        break; 
      } 
    } 

    const now = new Date(); 

    // UPDATE / INSERT 
    if (rowIndex !== -1) { 
      sheet.getRange(rowIndex, 1).setValue(now); 
      sheet.getRange(rowIndex, 18).setValue(workoutData.kardioType || ""); 
      sheet.getRange(rowIndex, 19).setValue(kardioFileUrl || ""); 
      sheet.getRange(rowIndex, 20).setValue(workoutData.startTime || ""); 
      sheet.getRange(rowIndex, 21).setValue(workoutData.stopTime || ""); 
      sheet.getRange(rowIndex, 22).setValue(workoutData.resistenExercises || ""); 
      sheet.getRange(rowIndex, 23).setValue(workoutData.totalSet || 0); 
      sheet.getRange(rowIndex, 24).setValue(workoutData.totalReps || 0); 
      sheet.getRange(rowIndex, 25).setValue(workoutData.totalMinutes || 0); 
    } else { 
      sheet.appendRow([ 
        now, userId, hariKe, "", userName, 
        "", "", "", "", "", "", "", "", "", "", "", "", 
        workoutData.kardioType || "", 
        kardioFileUrl || "", 
        workoutData.startTime || "", 
        workoutData.stopTime || "", 
        workoutData.resistenExercises || "", 
        workoutData.totalSet || 0, 
        workoutData.totalReps || 0, 
        workoutData.totalMinutes || 0, 
        "", "", "" 
      ]); 
    } 

    return createJSONPResponse(callback, { 
      success: true, 
      kardioFileUrl: kardioFileUrl 
    }); 

  } catch (error) { 
    return createJSONPResponse(callback, { 
      success: false, 
      message: error.toString() 
    }); 
  } 
} 

/************************
 * Komplit Data Workout *
 ************************/
function completeWorkout(data) {
  const callback = data.callback;
  const userId   = data.userId;
  const hariKe   = parseInt(data.hariKe, 10);

  if (!userId || !hariKe) {
    const err = { success: false, message: "Data tidak lengkap" };
    return createJSONPResponse(callback, err);
  }

  const row = findOrCreateProgramRow(userId, hariKe);

  // Kolom Z = status workout
  shProgram.getRange(row, 26).setValue("OK");
  shProgram.getRange(row, 1).setValue(new Date());

  const result = {
    success: true,
    message: "Workout sudah selesai"
  };

  return createJSONPResponse(callback, result);
}

/*************************
* Simpan Waktu Istirahat *
**************************/
function updateIstirahat(param) { 
  const callback = param.callback;
  const userId     = param.userId; 
  const hariKe     = param.hariKe; 
  const jamMulai   = param.jamMulai; 
  const kualitas   = param.kualitas; 

  if (!userId || !hariKe || !jamMulai || !kualitas) { 
    return createJSONPResponse(callback, { success: false }); 
  } 

  const row = findOrCreateProgramRow(userId, hariKe); 
  shProgram.getRange(row, 29).setValue(jamMulai); // AC 
  shProgram.getRange(row, 30).setValue(kualitas); // AD 
  return createJSONPResponse(callback, { success: true }); 
} 

/********************
* Selesai Istirahat *
*********************/
function completeIstirahat(param) { 
  const callback = param.callback;
  const userId = param.userId; 
  const hariKe = param.hariKe; 

  if (!userId || !hariKe) { 
    return createJSONPResponse(callback, { success: false }); 
  } 

  const row = findOrCreateProgramRow(userId, hariKe); 
  shProgram.getRange(row, 31).setValue("OK"); // Kolom 31 "AE"  
  return createJSONPResponse(callback, { success: true }); 
} 

/************************
* Simpan Water Reminder *
************************/
function updateWater(param) { 
  const callback = param.callback;
  const userId = param.userId; 
  const hariKe = param.hariKe; 
  const asupanAir = param.asupanAir; 

  if (!userId || !hariKe || !asupanAir) { 
    return createJSONPResponse(callback, { success: false }); 
  } 

  const row = findOrCreateProgramRow(userId, hariKe); 
  shProgram.getRange(row, 27).setValue(asupanAir);        // Kolom 27 "AA" 
  return createJSONPResponse(callback, { success: true }); 
} 

/************************
* Simpan Water Reminder *
*************************/
function completeWater(param) { 
  const callback = param.callback;
  const userId = param.userId; 
  const hariKe = param.hariKe; 

  if (!userId || !hariKe) { 
    return createJSONPResponse(callback, { success: false }); 
  } 

  const row = findOrCreateProgramRow(userId, hariKe); 
  shProgram.getRange(row, 28).setValue("OK");            // Kolom 28 "AB" 
  return createJSONPResponse(callback, { success: true }); 
} 

/***********************
* Simpan Data Tracking *
************************/
function updateDataTracking(param) { 
  const callback = param.callback;
  const userId         = param.userId; 
  const hariKe         = parseInt(param.hariKe); 
  const jenisKelamin   = param.jenisKelamin; 
  const usia           = param.usia; 
  const tinggiBadan    = param.tinggiBadan; 
  const beratBadan     = param.beratBadan; 
  const lingkarPerut   = param.lingkarPerut; 
  const aktivitasFisik = param.aktivitasFisik; 

  if (!userId || !hariKe) { 
    return createJSONPResponse(callback, { success: false, message: "Data tidak lengkap" }); 
  } 

  const row = findOrCreateProgramRow(userId, hariKe); 
  shProgram.getRange(row, 32).setValue(jenisKelamin);   // AF 
  shProgram.getRange(row, 33).setValue(usia);           // AG 
  shProgram.getRange(row, 34).setValue(tinggiBadan);    // AH 
  shProgram.getRange(row, 35).setValue(beratBadan);     // AI 
  shProgram.getRange(row, 36).setValue(lingkarPerut);   // AJ 
  shProgram.getRange(row, 37).setValue(aktivitasFisik); // AK 
  shProgram.getRange(row, 1).setValue(new Date());      // Update timestamp 
  return createJSONPResponse(callback, { success: true, message: "OK" }); 
} 

/************************
* Selesai Data Tracking *
*************************/
function completeDataTracking(param) { 
  const callback = param.callback;
  const userId = param.userId; 
  const hariKe = parseInt(param.hariKe, 10); 

  if (!userId || !hariKe) { 
    return createJSONPResponse(callback, { success: false }); 
  } 

  const row = findOrCreateProgramRow(userId, hariKe); 
  // Ambil Data Input (AF–AK) 
  const jenisKelamin   = shProgram.getRange(row, 32).getValue(); // AF 
  const usia           = shProgram.getRange(row, 33).getValue(); // AG 
  const tinggiBadan    = shProgram.getRange(row, 34).getValue(); // AH 
  const beratBadan     = shProgram.getRange(row, 35).getValue(); // AI 
  const lingkarPerut   = shProgram.getRange(row, 36).getValue(); // AJ 
  const aktivitasFisik = shProgram.getRange(row, 37).getValue(); // AK 

  if (!jenisKelamin || !usia || !tinggiBadan || !beratBadan || !lingkarPerut || !aktivitasFisik) { 
    return createJSONPResponse(callback, { success: false }); 
  } 

  // Jalankan rumus 
  const hasil = hitungParameter({ 
    mJenisKelamin: jenisKelamin, 
    mUmur: Number(usia), 
    mTinggiBadan: Number(tinggiBadan), 
    mBeratBadan: Number(beratBadan), 
    mLingkarPerut: Number(lingkarPerut), 
    mAktivitasFisik: aktivitasFisik 
  }); 

  const bbIdeal    = hasil[0]; 
  const imt        = hasil[1]; 
  const lemakTubuh = hasil[2]; 
  const lemakPerut = hasil[3]; 
  const massaOtot  = hasil[4]; 
  const bmr        = hasil[5]; 
  const kalori     = hasil[6]; 
  const protein    = hasil[7]; 
  const skor       = hasil[8]; 

  // Tentukan kesimpulan 
  let kesimpulan = ''; 
  let rekomendasi = ''; 
  // Jadi maksimal skor = 3, dikeranakan Data tracking hanya ada di Hari ke 1, 5 dan 10
  if (skor >= 3) { 
    kesimpulan = 'Kondisi sangat baik'; 
    rekomendasi = 'Pertahankan pola hidup sehat'; 
  } else if (skor >= 2) { 
    kesimpulan = 'Cukup baik'; 
    rekomendasi = 'Tingkatkan konsistensi olahraga'; 
  } else { 
    kesimpulan = 'Perlu perbaikan'; 
    rekomendasi = 'Perbaiki pola makan dan aktivitas fisik'; 
  } 

  // Simpan hasil ke Sheet (AL–AV) 
  shProgram.getRange(row, 38).setValue(bbIdeal);     // AL 
  shProgram.getRange(row, 39).setValue(imt);         // AM 
  shProgram.getRange(row, 40).setValue(lemakTubuh);  // AN 
  shProgram.getRange(row, 41).setValue(lemakPerut);  // AO 
  shProgram.getRange(row, 42).setValue(massaOtot);   // AP 
  shProgram.getRange(row, 43).setValue(bmr);         // AQ 
  shProgram.getRange(row, 44).setValue(kalori);      // AR 
  shProgram.getRange(row, 45).setValue(protein);     // AS 
  shProgram.getRange(row, 46).setValue(skor);        // AT 
  shProgram.getRange(row, 47).setValue(kesimpulan);  // AU 
  shProgram.getRange(row, 48).setValue(rekomendasi); // AV 

  // Tandai selesai di kolom AW 
  shProgram.getRange(row, 49).setValue("OK"); 

  return createJSONPResponse(callback, { success: true }); 
} 

/**********************
* Selesai Tanya Coach *
**********************/
function completeTanyaCoach(param) { 
  const callback = param.callback;
  const userId = param.userId; 
  const hariKe = parseInt(param.hariKe, 10); 

  if (!userId || !hariKe) { 
    return createJSONPResponse(callback, { success: false }); 
  } 

  const row = findOrCreateProgramRow(userId, hariKe); 
  // Tandai selesai di kolom AX  
  shProgram.getRange(row, 50).setValue("OK"); 
  shProgram.getRange(row, 1).setValue(new Date()); 
  return createJSONPResponse(callback, { success: true }); 
} 

/***********************
* Selesai Modul Hari Ke
************************/
function completeModul(param) { 
  const callback = param.callback;
  const userId = param.userId; 
  const hariKe = parseInt(param.hariKe,10); 
  if (!userId || !hariKe) { 
    return createJSONPResponse(callback, { success: false }); 
  } 

  const row = findOrCreateProgramRow(userId, hariKe); 
  // Ambil status aktivitas 
  const mealPlan  = shProgram.getRange(row,17).getValue(); // Q 
  const workout   = shProgram.getRange(row,26).getValue(); // Z 
  const water     = shProgram.getRange(row,28).getValue(); // AB 
  const istirahat = shProgram.getRange(row,31).getValue(); // AE 

  // Hitung point 
  let totalPoint = 0; 
  if (mealPlan === "OK")  totalPoint += 15; 
  if (workout === "OK")   totalPoint += 15; 
  if (water === "OK")     totalPoint += 5; 
  if (istirahat === "OK") totalPoint += 15; 

  // 🔥 PERBAIKAN: Pastikan point yang dihitung adalah 50 (maksimum per hari)
  // jika semua aktivitas selesai, totalPoint = 15+15+5+15 = 50
  
  // 🔥 PERBAIKAN: Simpan status selesai modul DAN point
  shProgram.getRange(row,51).setValue("OK");          // AY - Selesai Modul
  shProgram.getRange(row,52).setValue(totalPoint);    // AZ - Total Point
  shProgram.getRange(row,1).setValue(new Date());     // A - Timestamp

  // 🔥 PERBAIKAN: Setelah menyimpan point, hitung total point dari semua modul
  // Ini akan dihitung ulang oleh getDashboardData
  // Tapi kita perlu memastikan data di kolom AZ terisi dengan benar

  return createJSONPResponse(callback, { 
    success:true, 
    totalPoint:totalPoint 
  }); 
}

/***********************
* Kirim Pesan WA Coach *
************************/
function kirimWaCoach(param) { 
  const callback = param.callback;
  const TokenFonnte  = "NPUQeEn4zATP628wK7au";         // 6281149908600 Admin Send 
  const url          = "https://api.fonnte.com/send"; 
  const pesan        = param.pesan 
  const tanggal      = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMMM yyyy"); 
  const noWaKonsumen = "62" + String(param.noKonsumen || param.noWaKonsumen).replace(/^0+/, ""); 
  const noWaCoach    = "62" + String(param.noCoach || param.noWaCoach).replace(/^0+/, ""); 

  const optionsKonsumen = { 
    method: "post", 
    headers: { "Authorization": TokenFonnte }, 
    payload: { target: noWaKonsumen, message: "*Notif Pertanyaan Anda*\n" + pesan } 
  }; 

  const optionsCoach = { 
    method: "post", 
    headers: { "Authorization": TokenFonnte }, 
    payload: { target: noWaCoach, message: pesan } 
  }; 

  try { 
    UrlFetchApp.fetch(url, optionsKonsumen); 
    console.log("Pesan WA terkirim ke konsumen:", noWaKonsumen); 
    UrlFetchApp.fetch(url, optionsCoach); 
    console.log("Pesan WA terkirim ke coach:", noWaCoach); 
    return createJSONPResponse(callback, { success: true }); 
  } catch (error) { 
    console.error("Gagal kirim WA ke konsumen:", error); 
    console.error("Gagal kirim WA ke Coach:", error); 
    return createJSONPResponse(callback, {success: false, error: error.toString()}); 
  } 
} 

/*******************************
* Fungsi Get Complete Progress *
********************************/
function getUserCompleteProgress(data) {
  const callback = data.callback;
  try {
    const userId = data.userId;
    const hariKe = parseInt(data.hariKe) || 1;
    const values = shProgram.getDataRange().getValues();

    // 🔑 Ambil Nomor HP dari TabelUser
    let userHP = "";
    const userValues = shTabelUser.getDataRange().getValues();
    for (let i = 1; i < userValues.length; i++) {
      if (userValues[i][0] && userValues[i][0].toString().toLowerCase() === userId.toLowerCase()) {
        userHP = userValues[i][3] || "";         // Kolom D = Telp User
        break;
      }
    }

    let hasil = {
      success: true,
      userId: userId,
      hariKe: hariKe,
      userHP: userHP,
      namaKonsumen: '',
      perkenalan: false,
      
      workoutData: {
        kardio: '',
        linkKardio: '',
        startTime: '',
        stopTime: '',
        resisten: '',
        totalSet: '',
        totalReps: '',
        totalMinutes: ''
      }
    };

    // Inisialisasi semua field untuk hari 1-10
    for (let h = 1; h <= 10; h++) {
      hasil[`materiHari${h}`] = false;
      hasil[`mealplanHari${h}`] = false;
      hasil[`workoutHari${h}`] = false;
      hasil[`waterHari${h}`] = false;
      hasil[`istirahatHari${h}`] = false;
      hasil[`trackingHari${h}`] = false;
      hasil[`tanyaHari${h}`] = false;
      hasil[`selesaimodulHari${h}`] = false;
    }

    for (let i = 1; i < values.length; i++) {
      const rowUserId = values[i][1]; // B = User ID
      const rowHariKe = values[i][2]; // C = Hari Ke

      if (
        rowUserId &&
        rowUserId.toString().toLowerCase() === userId.toLowerCase()
      ) {
        // 🔑 Nama Konsumen (Kolom E)
        if (!hasil.namaKonsumen && values[i][4]) {
          hasil.namaKonsumen = values[i][4];
        }

        // Hari 0 → Perkenalan
        if (rowHariKe === 0 && values[i][5] === "OK") {
          hasil.perkenalan = true;
        }

        // Untuk hari 1-10
        if (rowHariKe >= 1 && rowHariKe <= 10) {
          const h = rowHariKe;
          if (values[i][5]  === "OK") hasil[`materiHari${h}`] = true;        // F  "Materi"
          if (values[i][16] === "OK") hasil[`mealplanHari${h}`] = true;      // Q  "Meal Plan"
          if (values[i][25] === "OK") hasil[`workoutHari${h}`] = true;       // Z  "Workout"
          if (values[i][27] === "OK") hasil[`waterHari${h}`] = true;         // AB "Water"
          if (values[i][30] === "OK") hasil[`istirahatHari${h}`] = true;     // AE "Istirahat"
          if (values[i][48] === "OK") hasil[`trackingHari${h}`] = true;      // AW "Data Tracking"
          if (values[i][49] === "OK") hasil[`tanyaHari${h}`] = true;         // AX "Tanya Coach"
          if (values[i][50] === "OK") hasil[`selesaimodulHari${h}`] = true;  // AY "Selesai Modul"
          
          // Workout detail (untuk hari yang diminta)
          if (h === hariKe && hasil[`workoutHari${h}`]) {
            hasil.workoutData = {
              kardio: values[i][17] || '',
              linkKardio: values[i][18] || '',
              startTime: values[i][19] || '',
              stopTime: values[i][20] || '',
              resisten: values[i][21] || '',
              totalSet: values[i][22] || '',
              totalReps: values[i][23] || '',
              totalMinutes: values[i][24] || ''
            };
          }
        }
      }
    }

    return createJSONPResponse(callback, hasil);
  } catch (error) {
    return createJSONPResponse(callback, {
      success: false,
      error: error.toString()
    });
  }
}

/*****************************************
 * Get Dashboard Data dari Sheet PROGRAM *
 *****************************************/
function getDashboardData(data) {
  const callback = data.callback;
  const userId = data.userId;
  
  if (!userId) {
    return createJSONPResponse(callback, { success: false, message: "User ID required" });
  }
  
  const values = shProgram.getDataRange().getValues();
  let result = {
    success: true,
    profile: {},
    trackingData: [],
    trackingDataForEval: [],
    evaluasi: {},
    totalPoint: 0,
    modulTerakhir: 0,
    modulSelesai: '0',
    pointPerHari: {}  // 🔥 TAMBAHKAN INI
  };
  
  // Simpan semua data tracking
  var semuaTrackingData = [];
  var dataHari1 = null;
  var dataHari5 = null;
  var dataHari10 = null;
  var modulTerakhir = 0;
  var profileData = {};
  
  // 🔥 VARIABEL UNTUK MENGHITUNG ULANG TOTAL POINT
  var rekomputedTotalPoint = 0;
  var pointPerHariData = {};
  
  for (var i = 1; i < values.length; i++) {
    var rowUserId = values[i][1]; // Kolom B
    var hariKe = values[i][2];     // Kolom C
    
    if (rowUserId && rowUserId.toString().toLowerCase() === userId.toLowerCase()) {
      
      // Profile (ambil dari hari ke-1)
      if (hariKe == 1) {
        profileData = {
          namaKonsumen: values[i][4] || '',
          jenisKelamin: values[i][31] || '',
          usia: values[i][32] || '',
          tinggiBadan: values[i][33] || '',
          aktivitasFisik: values[i][36] || ''
        };
        result.profile = profileData;
      }
      
      // Cek Modul Terakhir yang sudah selesai
      if (values[i][50] === "OK") {
        if (hariKe > modulTerakhir) {
          modulTerakhir = hariKe;
        }
      }
      
      // Ambil data tracking untuk hari ke 1,5,10
      var beratBadan = values[i][34] || '';  // AI
      var lingkarPerut = values[i][35] || ''; // AJ
      
      // Simpan data untuk grafik (SEMUA data yang ada)
      if ([1, 5, 10].indexOf(hariKe) !== -1) {
        var isDataAda = (beratBadan !== '' && beratBadan !== 0) || 
                         (lingkarPerut !== '' && lingkarPerut !== 0);
        if (isDataAda) {
          var dataItem = {
            hariKe: hariKe,
            hari: getHariName(hariKe),
            beratBadan: parseFloat(beratBadan) || 0,
            lingkarPerut: parseFloat(lingkarPerut) || 0
          };
          semuaTrackingData.push(dataItem);
          
          if (hariKe == 1) dataHari1 = dataItem;
          if (hariKe == 5) dataHari5 = dataItem;
          if (hariKe == 10) dataHari10 = dataItem;
        }
      }
      
      // === HITUNG TOTAL POINT DARI SEMUA MODUL YANG SUDAH SELESAI ===
      if (hariKe >= 1 && hariKe <= 10) {
        var isModulSelesai = (values[i][50] === "OK"); // Kolom AY = "Selesai Modul"
        var pointHariIni = parseFloat(values[i][51]) || 0; // Kolom AZ = point hari ini
        
        // 🔥 PERBAIKAN 1: Jika modul selesai, hitung total point
        if (isModulSelesai) {
          // Jika pointHariIni sudah ada, gunakan nilai tersebut
          if (pointHariIni > 0) {
            rekomputedTotalPoint += pointHariIni;
            pointPerHariData[hariKe] = pointHariIni;
          } else {
            // 🔥 PERBAIKAN 2: Jika pointHariIni = 0, hitung ulang dari aktivitas
            // Hitung point berdasarkan aktivitas yang selesai
            var mealPlan  = values[i][16] === "OK" ? 15 : 0;
            var workout   = values[i][25] === "OK" ? 15 : 0;
            var water     = values[i][27] === "OK" ? 5 : 0;
            var istirahat = values[i][30] === "OK" ? 15 : 0;
            var computedPoint = mealPlan + workout + water + istirahat;
            
            // 🔥 PERBAIKAN 3: Simpan hasil perhitungan ulang ke kolom AZ
            var rowIndex = i + 1; // Karena i dimulai dari 1 (index 0 = header)
            if (computedPoint > 0) {
              shProgram.getRange(rowIndex, 52).setValue(computedPoint); // Kolom AZ
              shProgram.getRange(rowIndex, 1).setValue(new Date()); // Update timestamp
            }
            
            rekomputedTotalPoint += computedPoint;
            pointPerHariData[hariKe] = computedPoint;
          }
        }
      }

      // Ambil data evaluasi dari hari ke-10
      if (hariKe == 10) {
        result.evaluasi = {
          bbIdeal: values[i][37] || '',
          imt: values[i][38] || '',
          lemakTubuh: values[i][39] || '',
          lemakPerut: values[i][40] || '',
          massaOtot: values[i][41] || '',
          bmr: values[i][42] || '',
          kalori: values[i][43] || '',
          protein: values[i][44] || '',
          kesimpulan: values[i][46] || '',
          rekomendasi: values[i][47] || ''
        };
      }
    }
  }
  
  // 🔥 PERBAIKAN 4: Gunakan rekomputedTotalPoint sebagai totalPoint
  result.totalPoint = rekomputedTotalPoint;
  result.pointPerHari = pointPerHariData; // 🔥 TAMBAHKAN INI
  
  // Urutkan data tracking berdasarkan hari
  semuaTrackingData.sort(function(a, b) {
    return a.hariKe - b.hariKe;
  });
  
  // Kirim semua data untuk Grafik
  result.trackingData = semuaTrackingData;
  
  // Tentukan modul selesai
  var modulSelesai = '0';
  var dataTrackingUntukEvaluasi = null;
  
  if (modulTerakhir >= 10) {
    modulSelesai = '10';
    dataTrackingUntukEvaluasi = dataHari10 || dataHari5 || dataHari1;
  } else if (modulTerakhir >= 5) {
    modulSelesai = '5-9';
    dataTrackingUntukEvaluasi = dataHari5 || dataHari1;
  } else if (modulTerakhir >= 1) {
    modulSelesai = '1-4';
    dataTrackingUntukEvaluasi = dataHari1;
  }
  
  result.modulTerakhir = modulTerakhir;
  result.modulSelesai = modulSelesai;
  
  // Tentukan data tracking untuk evaluasi
  result.trackingDataForEval = dataTrackingUntukEvaluasi;
  
  // Jika modul 1-9, hitung ulang parameter dari data tracking
  if (modulSelesai === '1-4' || modulSelesai === '5-9') {
    if (dataTrackingUntukEvaluasi) {
      var berat = dataTrackingUntukEvaluasi.beratBadan || 0;
      var lingkar = dataTrackingUntukEvaluasi.lingkarPerut || 0;
      var tinggi = parseFloat(profileData.tinggiBadan) || 0;
      var umur = parseFloat(profileData.usia) || 0;
      var jenkel = profileData.jenisKelamin || 'Pria';
      var aktivitas = profileData.aktivitasFisik || 'Sedikit/Tidak Olahraga';
      
      var bbIdeal = calculateBBIdeal(tinggi, umur);
      var imt = calculateIMT(berat, tinggi);
      var lemakTubuh = calculateLemakTubuh(berat, tinggi, umur, jenkel);
      var lemakPerut = calculateLemakPerut(lingkar);
      var massaOtot = calculateMassaOtot(jenkel, berat);
      var bmr = calculateBMR(berat, tinggi, umur, jenkel);
      var kalori = calculateKalori(parseFloat(bmr), aktivitas);
      var protein = calculateProtein(berat, jenkel, aktivitas);
      var skor = calculateSkor(imt, lemakTubuh, lemakPerut, jenkel);
      
      var labelHari = modulSelesai === '1-4' ? 'Hari ke-1' : 'Hari ke-5';
      
      result.evaluasi = {
        beratBadan: berat,
        lingkarPerut: lingkar,
        label: labelHari,
        bbIdeal: bbIdeal,
        imt: imt,
        lemakTubuh: lemakTubuh,
        lemakPerut: lemakPerut,
        massaOtot: massaOtot,
        bmr: bmr,
        kalori: kalori,
        protein: protein,
        skor: skor,
        kesimpulan: 'Data sementara - Selesaikan Modul ke-10 untuk evaluasi final',
        rekomendasi: 'Lanjutkan program hingga selesai untuk mendapatkan rekomendasi yang lebih akurat'
      };
    }
  }
  
  // JIka Modul 10, tetap gunakan data evaluasi dari sheet
  if (modulSelesai === '10') {
    if (dataTrackingUntukEvaluasi) {
      result.evaluasi.beratBadan = dataTrackingUntukEvaluasi.beratBadan || '-';
      result.evaluasi.lingkarPerut = dataTrackingUntukEvaluasi.lingkarPerut || '-';
      result.evaluasi.label = 'Hari ke-10';
    }
  }
  
  console.log('📊 Dashboard Final:', {
    modulSelesai: modulSelesai,
    totalPoint: result.totalPoint,
    pointPerHari: result.pointPerHari,
    trackingData: result.trackingData,
    trackingDataForEval: result.trackingDataForEval,
    evaluasiKeys: Object.keys(result.evaluasi)
  });
  
  return createJSONPResponse(callback, result);
}

function BACKUP_getDashboardData(data) {
  const callback = data.callback;
  const userId = data.userId;
  
  if (!userId) {
    return createJSONPResponse(callback, { success: false, message: "User ID required" });
  }
  
  const values = shProgram.getDataRange().getValues();
  let result = {
    success: true,
    profile: {},
    trackingData: [],         // Untuk grafik - SEMUA data tracking
    trackingDataForEval: [],  // Untuk evaluasi - data yang sesuai modul
    evaluasi: {},
    totalPoint: 0,
    modulTerakhir: 0,
    modulSelesai: '0'
  };
  
  // Simpan semua data tracking
  var semuaTrackingData = [];
  var dataHari1 = null;
  var dataHari5 = null;
  var dataHari10 = null;
  var modulTerakhir = 0;
  var profileData = {};
  
  // 🔥 VARIABEL UNTUK MENGHITUNG ULANG TOTAL POINT
  var rekomputedTotalPoint = 0;
  var pointPerHari = {};
  
  for (var i = 1; i < values.length; i++) {
    var rowUserId = values[i][1]; // Kolom B
    var hariKe = values[i][2];     // Kolom C
    
    if (rowUserId && rowUserId.toString().toLowerCase() === userId.toLowerCase()) {
      
      // Profile (ambil dari hari ke-1)
      if (hariKe == 1) {
        profileData = {
          namaKonsumen: values[i][4] || '',
          jenisKelamin: values[i][31] || '',
          usia: values[i][32] || '',
          tinggiBadan: values[i][33] || '',
          aktivitasFisik: values[i][36] || ''
        };
        result.profile = profileData;
      }
      
      // Cek Modul Terakhir yang sudah selesai
      if (values[i][50] === "OK") {
        if (hariKe > modulTerakhir) {
          modulTerakhir = hariKe;
        }
      }
      
      // Ambil data tracking untuk hari ke 1,5,10
      var beratBadan = values[i][34] || '';  // AI
      var lingkarPerut = values[i][35] || ''; // AJ
      
      // Simpan data untuk grafik (SEMUA data yang ada)
      if ([1, 5, 10].indexOf(hariKe) !== -1) {
        var isDataAda = (beratBadan !== '' && beratBadan !== 0) || 
                         (lingkarPerut !== '' && lingkarPerut !== 0);
        if (isDataAda) {
          var dataItem = {
            hariKe: hariKe,
            hari: getHariName(hariKe),
            beratBadan: parseFloat(beratBadan) || 0,
            lingkarPerut: parseFloat(lingkarPerut) || 0
          };
          semuaTrackingData.push(dataItem);
          
          if (hariKe == 1) dataHari1 = dataItem;
          if (hariKe == 5) dataHari5 = dataItem;
          if (hariKe == 10) dataHari10 = dataItem;
        }
      }
      
      // === HITUNG TOTAL POINT DARI SEMUA MODUL YANG SUDAH SELESAI ===
      if (hariKe >= 1 && hariKe <= 10) {
        var isModulSelesai = (values[i][50] === "OK"); // Kolom AY = "Selesai Modul"
        var pointHariIni = parseFloat(values[i][51]) || 0; // Kolom AZ = point hari ini
        
        // 🔥 PERBAIKAN 1: Jika modul selesai, hitung total point
        if (isModulSelesai) {
          // Jika pointHariIni sudah ada, gunakan nilai tersebut
          if (pointHariIni > 0) {
            rekomputedTotalPoint += pointHariIni;
            pointPerHari[hariKe] = pointHariIni;
          } else {
            // 🔥 PERBAIKAN 2: Jika pointHariIni = 0, hitung ulang dari aktivitas
            // Hitung point berdasarkan aktivitas yang selesai
            var mealPlan  = values[i][16] === "OK" ? 15 : 0;
            var workout   = values[i][25] === "OK" ? 15 : 0;
            var water     = values[i][27] === "OK" ? 5 : 0;
            var istirahat = values[i][30] === "OK" ? 15 : 0;
            var computedPoint = mealPlan + workout + water + istirahat;
            
            // 🔥 PERBAIKAN 3: Simpan hasil perhitungan ulang ke kolom AZ
            var rowIndex = i + 1; // Karena i dimulai dari 1 (index 0 = header)
            if (computedPoint > 0) {
              shProgram.getRange(rowIndex, 52).setValue(computedPoint); // Kolom AZ
              shProgram.getRange(rowIndex, 1).setValue(new Date()); // Update timestamp
            }
            
            rekomputedTotalPoint += computedPoint;
            pointPerHari[hariKe] = computedPoint;
          }
        }
      }

      // Ambil data evaluasi dari hari ke-10
      if (hariKe == 10) {
        result.evaluasi = {
          bbIdeal: values[i][37] || '',
          imt: values[i][38] || '',
          lemakTubuh: values[i][39] || '',
          lemakPerut: values[i][40] || '',
          massaOtot: values[i][41] || '',
          bmr: values[i][42] || '',
          kalori: values[i][43] || '',
          protein: values[i][44] || '',
          kesimpulan: values[i][46] || '',
          rekomendasi: values[i][47] || ''
        };
        // Jika evaluasi dari hari ke-10 ada, gunakan total point yang sudah dihitung
        var pointDiHari10 = parseFloat(values[i][51]) || 0;
        if (pointDiHari10 > 0 && rekomputedTotalPoint === 0) {
          // Fallback: jika rekomputedTotalPoint masih 0, gunakan point dari hari 10
          // Tapi lebih baik tetap pakai rekomputedTotalPoint yang sudah dihitung dari semua hari
        }
      }
    }
  }
  
  // 🔥 PERBAIKAN 4: Gunakan rekomputedTotalPoint sebagai totalPoint
  result.totalPoint = rekomputedTotalPoint;
  
  // Urutkan data tracking berdasarkan hari
  semuaTrackingData.sort(function(a, b) {
    return a.hariKe - b.hariKe;
  });
  
  // Kirim semua data untuk Grafik
  result.trackingData = semuaTrackingData;
  
  // Tentukan modul selesai
  var modulSelesai = '0';
  var dataTrackingUntukEvaluasi = null;
  
  if (modulTerakhir >= 10) {
    modulSelesai = '10';
    dataTrackingUntukEvaluasi = dataHari10 || dataHari5 || dataHari1;
  } else if (modulTerakhir >= 5) {
    modulSelesai = '5-9';
    dataTrackingUntukEvaluasi = dataHari5 || dataHari1;
  } else if (modulTerakhir >= 1) {
    modulSelesai = '1-4';
    dataTrackingUntukEvaluasi = dataHari1;
  }
  
  result.modulTerakhir = modulTerakhir;
  result.modulSelesai = modulSelesai;
  
  // Tentukan data tracking untuk evaluasi
  result.trackingDataForEval = dataTrackingUntukEvaluasi;
  
  // Jika modul 1-9, hitung ulang parameter dari data tracking
  if (modulSelesai === '1-4' || modulSelesai === '5-9') {
    if (dataTrackingUntukEvaluasi) {
      var berat = dataTrackingUntukEvaluasi.beratBadan || 0;
      var lingkar = dataTrackingUntukEvaluasi.lingkarPerut || 0;
      var tinggi = parseFloat(profileData.tinggiBadan) || 0;
      var umur = parseFloat(profileData.usia) || 0;
      var jenkel = profileData.jenisKelamin || 'Pria';
      var aktivitas = profileData.aktivitasFisik || 'Sedikit/Tidak Olahraga';
      
      var bbIdeal = calculateBBIdeal(tinggi, umur);
      var imt = calculateIMT(berat, tinggi);
      var lemakTubuh = calculateLemakTubuh(berat, tinggi, umur, jenkel);
      var lemakPerut = calculateLemakPerut(lingkar);
      var massaOtot = calculateMassaOtot(jenkel, berat);
      var bmr = calculateBMR(berat, tinggi, umur, jenkel);
      var kalori = calculateKalori(parseFloat(bmr), aktivitas);
      var protein = calculateProtein(berat, jenkel, aktivitas);
      var skor = calculateSkor(imt, lemakTubuh, lemakPerut, jenkel);
      
      var labelHari = modulSelesai === '1-4' ? 'Hari ke-1' : 'Hari ke-5';
      
      result.evaluasi = {
        beratBadan: berat,
        lingkarPerut: lingkar,
        label: labelHari,
        bbIdeal: bbIdeal,
        imt: imt,
        lemakTubuh: lemakTubuh,
        lemakPerut: lemakPerut,
        massaOtot: massaOtot,
        bmr: bmr,
        kalori: kalori,
        protein: protein,
        skor: skor,
        kesimpulan: 'Data sementara - Selesaikan Modul ke-10 untuk evaluasi final',
        rekomendasi: 'Lanjutkan program hingga selesai untuk mendapatkan rekomendasi yang lebih akurat'
      };
    }
  }
  
  // JIka Modul 10, tetap gunakan data evaluasi dari sheet
  if (modulSelesai === '10') {
    if (dataTrackingUntukEvaluasi) {
      result.evaluasi.beratBadan = dataTrackingUntukEvaluasi.beratBadan || '-';
      result.evaluasi.lingkarPerut = dataTrackingUntukEvaluasi.lingkarPerut || '-';
      result.evaluasi.label = 'Hari ke-10';
    }
  }
  
  console.log('📊 Dashboard Final:', {
    modulSelesai: modulSelesai,
    totalPoint: result.totalPoint,
    pointPerHari: pointPerHari,
    trackingData: result.trackingData,
    trackingDataForEval: result.trackingDataForEval,
    evaluasiKeys: Object.keys(result.evaluasi)
  });
  
  return createJSONPResponse(callback, result);
}

/****************************
 * Cari dan buat record baru *
 ****************************/
function findOrCreateProgramRow(userId, hariKe) {
  const lastRow = shProgram.getLastRow();
  if (lastRow >= 2) {
    const data = shProgram.getRange(2, 2, lastRow - 1, 2).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] == userId && data[i][1] == hariKe) {
        return i + 2;
      }
    }
  }
  // Buat baris baru
  const row = shProgram.getLastRow() + 1;
  shProgram.getRange(row, 1, 1, 37).setValues([[
    new Date(),     // A : Tgl Aktifitas
    userId,         // B : User ID
    hariKe,         // C : Hari ke
    '',             // D : Target Program
    '',             // E : Nama Konsumen
    '',             // F : Materi
    '',             // G : Sarapan
    '',             // H : Link Sarapan
    '',             // I : Cemilan Pagi
    '',             // J : Link CemilanPagi
    '',             // K : Makan Siang
    '',             // L : Link MakanSiang
    '',             // M : Cemilan Sore
    '',             // N : Link CemilanSore
    '',             // O : Makan Malam
    '',             // P : Link MakanMalam
    '',             // Q : Meal Plan
    '',             // R : Kardio
    '',             // S : Link Kardio
    '',             // T : Durasi Start
    '',             // U : Durasi Stop
    '',             // V : Resisten
    '',             // W : Jumlah Set
    '',             // X : Jumlah Repetisi
    '',             // Y : Durasi Menit
    '',             // Z : Workout
    '',             // AA : Asupan Air
    '',             // AB : Water
    '',             // AC : Waktu
    '',             // AD : Jam
    '',             // AE : Istirahat
    '',             // AF : Jenis Kelamin
    '',             // AG : Usia
    '',             // AH : Tinggi Badan
    '',             // AI : Berat Badan
    '',             // AJ : Lingkar Perut
    '',             // AK : Aktivitas Fisik
    
    '',             // AL : BB Ideal
    '',             // AM : IMT
    '',             // AN : Lemak Tubuh
    '',             // AO : Lemak Perut
    '',             // AP : Massa Otot
    '',             // AQ : BMR
    '',             // AR : Kalori
    '',             // AS : Protein
    '',             // AT : Total Skoring
    '',             // AU : Kesimpulan
    '',             // AV : Rekomendasi
    '',             // AW : Data Tracking
    '',             // AX : Tanya Coach
    '',             // AY : Selesai Modul
    ''              // AZ : Jumlah Point

  ]]);
  return row;
}

/************************
/* KUMPULAN FUNGSI BANTU
*************************/

/***************
* Respon Sukses
****************/
function responseSuccess(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'success',
      message: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/***************
* Respon Error
****************/
function responseError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'error',
      message: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/*********************
 * Fungsi Huruf Besar
 * *******************/
function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/*************************
 * Respone Callback jSonp
 *************************/
function createJSONPResponse(callback, data) {
  if (callback && callback !== 'undefined') {
    // Jika ada callback, kembalikan JSONP
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // Jika tidak ada callback, kembalikan JSON biasa
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/************************
 * Respone jSonp Object
 ************************/
function responseJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**************************
* Helper untuk nama hari
**************************/
function getHariName(hariKe) {
  var names = { 1: 'Hari 1', 5: 'Hari 5', 10: 'Hari 10' };
  return names[hariKe] || 'Hari ' + hariKe;
}

/***************************************** 
/* KUMPULAN FUNGSI PERHITUNGAN KALKULASI *
/*****************************************/

/********************************************
/* Fungsi untuk menghitung seluruh parameter
/********************************************/
function hitungParameter(data) {
  const bbIdeal    = calculateBBIdeal(data.mTinggiBadan, data.mUmur);
  const imt        = calculateIMT(data.mBeratBadan, data.mTinggiBadan);
  const lemakTubuh = calculateLemakTubuh(data.mBeratBadan, data.mTinggiBadan, data.mUmur, data.mJenisKelamin);
  const lemakPerut = calculateLemakPerut(data.mLingkarPerut);
  const massaOtot  = calculateMassaOtot(data.mJenisKelamin, data.mBeratBadan);
  const bmr        = calculateBMR(data.mBeratBadan, data.mTinggiBadan, data.mUmur, data.mJenisKelamin);
  const kalori     = calculateKalori(bmr, data.mAktivitasFisik);
  const protein    = calculateProtein(data.mBeratBadan, data.mJenisKelamin, data.mAktivitasFisik);
  const skor       = calculateSkor(imt, lemakTubuh, lemakPerut, data.mJenisKelamin);
  return [bbIdeal, imt, lemakTubuh, lemakPerut, massaOtot, bmr, kalori, protein, skor];
}

/*********************************************
/* Fungsi untuk menghitung berat badan ideal *
/*********************************************/
function calculateBBIdeal(tinggi, umur) {
  if (umur >= 40) {
    return Number((tinggi - 100).toFixed(1));
  } else {
    return Number(((tinggi - 100) * 0.9).toFixed(1));
  }
}

/*******************************
/* Fungsi untuk menghitung IMT *
/*******************************/
function calculateIMT(berat, tinggi) {
  const tinggiMeter = tinggi / 100;
  return (berat / (tinggiMeter * tinggiMeter)).toFixed(1);
}

/***************************************
/* Fungsi untuk menghitung Lemak Tubuh * 
/***************************************/
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

/******************************************************
/* Fungsi untuk menghitung Lemak Perut (Lingkar Perut) *
/******************************************************/
function calculateLemakPerut(lingkarPerut) {
  return parseFloat(lingkarPerut);
}

/****************************************************************
/* Fungsi Untuk Menghitung Massa Otot (Massa Tubuh Tanpa Lemak) *
/****************************************************************/
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

/*******************************
/* Fungsi untuk menghitung BMR *
/*******************************/
function calculateBMR(berat, tinggi, umur, jenkel) {  
  if (jenkel === "Pria") {
    //return (88.362 + (13.397 * berat) + (4.799 * tinggi) - (5.677 * umur)).toFixed(0);
    bmr = (88.362 + (13.397 * berat) + (4.799 * tinggi) - (5.677 * umur)).toFixed(0);
  } else {
    //return (447.593 + (9.247 * berat) + (3.098 * tinggi) - (4.330 * umur)).toFixed(0);
    bmr = (447.593 + (9.247 * berat) + (3.098 * tinggi) - (4.330 * umur)).toFixed(0);
  }
  return (bmr);
}

/********************************************
/* Fungsi untuk menghitung kebutuhan Kalori *
/********************************************/
function calculateKalori(bmr, aktivitas) {
  const faktor = {
    "Sedikit/Tidak Olahraga": 1.2,
    "Olahraga ringan 1-3 hari/minggu": 1.375,
    "Olahraga moderat 3-5 hari/minggu": 1.550,
    "Olahraga berat 6-7 hari per minggu": 1.725,
    "Olahraga sangat aktif + Kegiatan fisik" : 1.9
  };
  kalori = (bmr * (faktor[aktivitas] || 1.2)).toFixed(0);
  return (kalori);
}

/*********************************************
/* Fungsi untuk menghitung kebutuhan Protein *
/*********************************************/
function calculateProtein(berat, jenkel, aktifitas) {
  const faktorProtein = {
    "Sedikit/Tidak Olahraga": jenkel === "Pria" ? 1.0 : 0.8,
    "Olahraga ringan 1-3 hari/minggu": jenkel === "Pria" ? 1.2 : 1.0,
    "Olahraga moderat 3-5 hari/minggu": jenkel === "Pria" ? 1.4 : 1.2,
    "Olahraga berat 6-7 hari per minggu": jenkel === "Pria" ? 1.6 : 1.4,
    "Olahraga sangat aktif + Kegiatan fisik": jenkel === "Pria" ? 2.0 : 1.8
  };
  protein = (berat * (faktorProtein[aktifitas] || 1.2)).toFixed(0);
  return (protein);
}

/**************************************
/* Fungsi untuk menghitung nilai skor *
/**************************************/
function calculateSkor(imt, lemakTubuh, lemakPerut, jenkel) {
  // Inisialisasi skor awal
  let skorIMT = 0;
  let skorLemakTubuh = 0;
  let skorLemakPerut = 0;
  
  // 1. Perhitungan skor IMT
  // Jika IMT = 18.5 sampai 24.9, maka skorIMT = 1, jika tidak skorIMT = 0
  if (imt >= 18.5 && imt <= 24.9) {
    skorIMT = 1;
  } else {
    skorIMT = 0;
  }
  
  // 2. Perhitungan skor lemak tubuh
  // Pastikan jenis kelamin dalam format yang konsisten
  jenkel = jenkel.trim().charAt(0).toUpperCase() + jenkel.trim().slice(1).toLowerCase();
  
  if (jenkel === "Pria") {
    // Jika jenkel="pria" dan lemakTubuh = 10 sampai 20, maka skorLemakTubuh = 1
    if (lemakTubuh >= 10 && lemakTubuh <= 20) {
      skorLemakTubuh = 1;
    } else {
      skorLemakTubuh = 0;
    }
  } else if (jenkel === "Wanita") {
    // Jika jenkel="wanita" dan lemakTubuh = 18 sampai 28, maka skorLemakTubuh = 1
    if (lemakTubuh >= 18 && lemakTubuh <= 28) {
      skorLemakTubuh = 1;
    } else {
      skorLemakTubuh = 0;
    }
  }
  
  // 3. Perhitungan skor lemak perut
  if (jenkel === "Pria") {
    // Jika jenkel="pria" dan lemakPerut < 90, maka skorLemakPerut = 1
    if (lemakPerut < 90) {
      skorLemakPerut = 1;
    } else {
      skorLemakPerut = 0;
    }
  } else if (jenkel === "Wanita") {
    // Jika jenkel="wanita" dan lemakPerut < 80, maka skorLemakPerut = 1
    if (lemakPerut < 80) {
      skorLemakPerut = 1;
    } else {
      skorLemakPerut = 0;
    }
  }
  
  // Rumus skor = skorIMT + skorLemakTubuh + skorLemakPerut
  const skor = skorIMT + skorLemakTubuh + skorLemakPerut;
  return (skor);
}

