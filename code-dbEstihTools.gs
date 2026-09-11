/*******************************************************
/*               DEKLARASI GLOBAL                      *
/*******************************************************/
const DB_ESTIHTOOLS       = '15c7FVZ-zfTtGTAMxgCb2HkmDdetybQtbpa4xqqUZ70E';
const DATAINVOICE         = '1Sin4KLBYGFEzrmVH_2iEHIOoDQd_hBJJ?usp=sharing';
const SHEET_PRODUK_NAME   = "TabelHarga";
const SHEET_KATEGORI_NAME = "TabelKategori";
const SHEET_BYKIRIM_NAME  = "TabelByKirim"; // Sheet baru untuk biaya pengiriman
const SHEET_PESANAN_NAME  = "DataPesanan";
const ss                  = SpreadsheetApp.openById(DB_ESTIHTOOLS);
const produkSheet         = ss.getSheetByName(SHEET_PRODUK_NAME);
const kategoriSheet       = ss.getSheetByName(SHEET_KATEGORI_NAME);
const byKirimSheet        = ss.getSheetByName(SHEET_BYKIRIM_NAME); // Sheet untuk biaya pengiriman
const CACHE               = CacheService.getScriptCache();

/******************************************
* Handle GET request (untuk dropdown dsb.)
*******************************************/
function doGet(e) {
  const action   = e.parameter.action;
  const callback = e.parameter.callback || "callback";

  try {
    if (action === "getDiscounts") {
      return ContentService.createTextOutput(JSON.stringify(getDiscounts()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getProducts") {
      return ContentService.createTextOutput(JSON.stringify(getProducts()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getShippingOptions") {
      return ContentService.createTextOutput(JSON.stringify(getShippingOptions()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getProductDetails") {
      const noStok = e.parameter.noStok;
      return ContentService.createTextOutput(JSON.stringify(getProductDetails(noStok)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- Tabel Harga ---
    if (action === 'getTabelProduk')           return handleGetTabelProduk(e);
    if (action === 'addProduk')                return handleAddProduk(e);
    if (action === 'editProduk')               return handleEditProduk(e);
    if (action === 'deleteProduk')             return handleDeleteProduk(e);
    if (action === 'getTabelDropdownKategori') return handleGetDropdownKategori(e);

    // --- Tabel ByKirim (Biaya Pengiriman) ---
    if (action === 'getTabelByKirim')   return handleGetTabelByKirim(e);
    if (action === 'addByKirim')        return handleAddByKirim(e);
    if (action === 'editByKirim')       return handleEditByKirim(e);
    if (action === 'deleteByKirim')     return handleDeleteByKirim(e);

    // --- Tabel Kategori ---
    if (action === 'getTabelKategori')  return handleGetKategori(e);
    if (action === 'addKategori')       return handleAddKategori(e);
    if (action === 'editKategori')      return handleEditKategori(e);
    if (action === 'deleteKategori')    return handleDeleteKategori(e);


    // --- Import Data Excel ---
    if (action === 'importExcelBatch') return handleImportExcelBatch(e);

    // --- Export Tabel Harga langsung tanpa membuat file di Drive ---
    if (action === 'exportTabelHargaDirectXLSX') return handleExportTabelHargaDirectXLSX(e);
    
    return ContentService.createTextOutput(JSON.stringify({ error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(`${callback}(${JSON.stringify({ status: "error", message: err.message })})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

/************************************************
* Handle POST request (untuk kirim order / setup)
*************************************************/
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("Tidak ada data post yang diterima");
    }

    const data = JSON.parse(e.postData.contents);
    Logger.log("doPost: action = " + data.action);

    // === Case 1: kirim data (PDF, Email, WA) ===
    if (data.action === "kirimData") {
      return processKirimData(data);
    }

    // === Case 2: simpan order ke sheet DataPesanan ===
    else if (data.action === "saveOrder") {
      saveOrder(data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: "success", message: "Data order berhasil disimpan" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // === Case 3: setup produk (add / edit / delete) ===
    else if (data.action === "setupProduk") {
      if (data.mode === 'addProduk') return handleAddProduk(data);
      if (data.mode === 'editProduk') return handleEditProduk(data);
      if (data.mode === 'deleteProduk') return handleDeleteProduk(data);
    }

    // === Case 4: setup biaya pengiriman (add / edit / delete) ===
    else if (data.action === "setupByKirim") {
      if (data.mode === 'addByKirim') return handleAddByKirim(data);
      if (data.mode === 'editByKirim') return handleEditByKirim(data);
      if (data.mode === 'deleteByKirim') return handleDeleteByKirim(data);
    }

    // === Case 5: setup kategori (add / edit / delete) ===
    else if (data.action === "setupKategori") {
      if (data.mode === 'addKategori') return handleAddKategori(data);
      if (data.mode === 'editKategori') return handleEditKategori(data);
      if (data.mode === 'deleteKategori') return handleDeleteKategori(data);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Action tidak dikenal: " + data.action })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost ERROR: " + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// **********************************
// KUMPULAN FUNGSI UNTUK ESTIHTOOLS
// **********************************

/***********************************
* Fungsi untuk memproses kirim data
***********************************/
function processKirimData(data) {
  try {
    Logger.log("processKirimData START, invoice: " + data.mInvoice);

    // 1) Simpan ke DataPesanan
    saveOrder(data);

    // Pastikan ada mItems (bukan items)
    if (!data.mItems && data.items) {
      data.mItems = data.items; 
    }

    let fileUrl = "";
    try {
      fileUrl = sendEmail(data);

      if (fileUrl) {
        updatePesananPdfLink_(data.mInvoice, fileUrl);
      }

      if (fileUrl && (data.mConsumerPhone || data.mDistributorPhone)) {
        kirimDataKonsumen(data, fileUrl);
      }
    } catch (err) {
      Logger.log("processKirimData EMAIL/WA ERROR: " + err.message);
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: "Data berhasil diproses",
        fileUrl: fileUrl
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("processKirimData ERROR: " + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**************************************************************
* Fungsi untuk mengambil level diskon, pada sheet "TabelDiskon"
***************************************************************/
function getDiscounts() {
    const sheet = ss.getSheetByName('TabelDiskon');
    if (!sheet) throw new Error("Sheet 'TabelDiskon' tidak ditemukan!");
    const data  = sheet.getDataRange().getValues();
    return data.slice(1).map(row => ({ Level: row[0], Diskon: row[1] }));
}

/******************************************************************************
* Fungsi untuk mengambil nilai No Stok dan Nama Produk, pada sheet "TabelHarga"
*******************************************************************************/
function getProducts() {
    const sheet = ss.getSheetByName('TabelHarga');
    // if (!sheet) throw new Error("Sheet 'TabelHarga' tidak ditemukan!");
    const data  = sheet.getDataRange().getValues();
    return data.slice(1).map(row => ({ 
        NoStok: row[0].toString(), // Konversi ke string
        NamaProduk: row[2] 
    }));
}

/*******************************************************************************
* Fungsi Pencarian No Stok untuk mengambil Harga Produk dari sheet "TabelHarga"
*******************************************************************************/
function getProductDetails(noStok) {
    const sheet = ss.getSheetByName("TabelHarga");
    const data = sheet.getDataRange().getValues();

    const product = data.slice(1).find(row => {
        const rowNoStok = row[0]?.toString().trim();
        return rowNoStok === noStok.toString().trim();
    });
    
    if (!product) {
        throw new Error("Produk dengan No Stok " + noStok + " tidak ditemukan");
    }
    
    return {
        NoStok:      product[0],                  // Kolom A: No Stok
        Kategori:    product[1],                  // Kolom B: Kategori
        NamaProduk:  product[2],                  // Kolom C: Nama Produk
        VP:          parseFloat(product[3]) || 0, // Kolom D: Volume Point
        HargaEceran: parseFloat(product[5]) || 0, // Kolom F: Harga Eceran
        Member25:    parseFloat(product[6]) || 0, // Kolom G: Member 25% 
        SC35:        parseFloat(product[7]) || 0, // Kolom H: SC 35%
        SB42:        parseFloat(product[8]) || 0, // Kolom I: SB 42%
        SPV50:       parseFloat(product[9]) || 0  // Kolom J: SPV 50% 
    };
}

/************************************************************************************
* Fungsi untuk mengambil nilai harga dari jenis pengiriman, pada sheet "TabelByKirim"
*************************************************************************************/
function getShippingOptions() {
    const sheet = ss.getSheetByName('TabelByKirim');
    // if (!sheet) throw new Error("Sheet 'TabelByKirim' tidak ditemukan!");
    const data  = sheet.getDataRange().getValues();
    return data.slice(1).map(row => ({ 
        JenisPengiriman: row[0], 
        Biaya: row[1] 
    }));
}

/****************************************************
* Fungsi untuk menyimpan data di sheet DataPesanan
*****************************************************/
function saveOrder(orderData) {
  const sheet = ss.getSheetByName(SHEET_PESANAN_NAME);
  if (!sheet) throw new Error(`Sheet '${SHEET_PESANAN_NAME}' tidak ditemukan!`);

  // Hapus data lama dengan invoice yang sama (jika ada)
  const allData    = sheet.getDataRange().getValues();
  const rowsToKeep = [allData[0]]; // header
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][6] !== orderData.mInvoice) { // Kolom G = Invoice
      rowsToKeep.push(allData[i]);
    }
  }
  
  // Clear dan tulis ulang data yang ingin disimpan
  sheet.clearContents();
  if (rowsToKeep.length > 0) {
    sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
  }

  // Tambahkan semua item baru dari orderData
  const newRows = orderData.items.map(item => [
    orderData.mDate,                     // A: Tanggal
    orderData.mDistributorName,          // B: Nama Member
    orderData.mDistributorPhone,         // C: No HP Member
    orderData.mConsumerName,             // D: Nama Konsumen
    orderData.mConsumerPhone,            // E: No HP Konsumen
    orderData.mConsumerEmail,            // F: Email Konsumen
    orderData.mInvoice,                  // G: No Invoice
    item.mNoItem,                        // H: No Item
    item.mNoStok,                        // I: No Stok
    item.mKategori,                      // J: Kategori
    item.mNamaProduk,                    // K: Nama Produk
    item.mVp,                            // L: VP (nilai asli per item)
    orderData.mDiskon,                   // M: Diskon
    item.mHargaEceran,                   // N: Harga Eceran
    item.mSetelahDiskon,                 // O: Setelah Diskon
    item.mJumlah,                        // P: Jumlah
    item.mTotVP,                         // Q: Tot VP (sudah dihitung dengan benar)
    orderData.mByKirim,                  // R: By Pengiriman
    orderData.mPajak,                    // S: Pajak
    item.mHarga,                         // T: Harga (sudah dihitung dengan benar)
    orderData.mTotalPrice,               // U: Grand Total Harga
    orderData.mAlamat || "",             // V: Alamat
    orderData.mKelurahan || "",          // W: Kelurahan
    orderData.mKecamatan || "",          // X: Kecamatan
    orderData.mKota || "",               // Y: Kota
    orderData.mPropensi || ""            // Z: Propensi
  ]);

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: "success", message: "Pesanan berhasil disimpan" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function updatePesananPdfLink_(invoice, fileUrl) {
  const sheet = ss.getSheetByName(SHEET_PESANAN_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const colInvoiceIdx = 6;
  const colLinkPdf = 27;

  const rowIndexes = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][colInvoiceIdx] === invoice) {
      rowIndexes.push(i + 1);
    }
  }

  for (const rowIndex of rowIndexes) {
    sheet.getRange(rowIndex, colLinkPdf).setValue(fileUrl);
  }
}

/******************************************************************************
* Fungsi format angka untuk hilangkan karakter non-digit kecuali titik desimal
*******************************************************************************/
function formatNumber(value) {
  if (typeof value === 'string') {
    value = value.replace(/[^\d]/g, '');
    value = parseInt(value, 10);
  }
  return value || 0;
}

/*************************************************
* Fungsi format angka untuk menormalkan ke angka
*************************************************/
function normalizeNumber(value) {
  if (typeof value === 'string') {
    // Hilangkan semua karakter non-digit kecuali titik desimal
    value = value.replace(/[^\d.]/g, '');
    
    // Jika ada titik desimal, pastikan hanya satu
    const parts = value.split('.');
    if (parts.length > 1) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Konversi ke number
    value = parseFloat(value) || 0;
  }
  
  // Bulatkan ke 2 desimal jika perlu
  return Math.round(value * 100) / 100;
}

/*************************************************************
* Fungsi untuk memperbarui nomor item di sheet "DataPesanan"
**************************************************************/
function updateItemNumbersInSheet(invoiceToUpdate) {
    const sheet = ss.getSheetByName(SHEET_PESANAN_NAME);
    const data  = sheet.getDataRange().getValues();
    
    // Filter data berdasarkan No Simulasi (Invoice) yang sama
    const filteredData = data.slice(1).filter(row => row[6] === invoiceToUpdate); // Kolom G: No. Simulasi (Invoice)

    // Urutkan data berdasarkan No Item (kolom H, index 7)
    filteredData.sort((a, b) => a[7] - b[7]);

    // Update nomor item hanya untuk data dengan No Simulasi (Invoice) yang sama
    let itemCounter = 1;
    for (let i = 1; i < data.length; i++) {
        const currentInvoice = data[i][6]; // Kolom G: No. Invoice
        if (currentInvoice === invoiceToUpdate) {
            sheet.getRange(i + 1, 8).setValue(itemCounter); // Kolom H di index 8 (No Item) update dgn nomor urut baru
            itemCounter++;
        }
    }
    console.log("Nomor item di sheet 'DataPesanan' berhasil diperbarui untuk No Simulasi: " + invoiceToUpdate);
}

/*************************************************
* Fungsi untuk format currency standart Indonesia
**************************************************/
function formatCurrency(amount) {
    if (isNaN(amount)) return "0,00"; // Handle NaN
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/****************************************
* Mengirim email dengan link URl file pdf
*****************************************/
function sendEmail(data) {
  try {
    Logger.log("=== SEND EMAIL MULAI ===");
    Logger.log("Invoice: " + data.mInvoice);

    // Normalisasi supaya template selalu punya mOrderData.mItems
    if (!data.mItems && data.items) {
      data.mItems = data.items;
    }

    const items  = Array.isArray(data.mItems) ? data.mItems : [];
    const totals = items.reduce((acc, it) => {
      acc.jumlah += Number(it.mJumlah) || 0;
      acc.vp     += Number(it.mTotVP)  || 0;
      acc.harga  += Number(it.mHarga)  || 0;
      return acc;
    }, { jumlah: 0, vp: 0, harga: 0 });

    data.mTotalJumlah = totals.jumlah;
    data.mTotalVP     = totals.vp;
    data.mTotalHarga  = totals.harga;
    Logger.log(`TOTALS -> jumlah: ${data.mTotalJumlah}, vp: ${data.mTotalVP}, harga: ${data.mTotalHarga}`);
    
    // 1) Load template
    const htmlTemplate      = HtmlService.createTemplateFromFile('emailTemplate');
    htmlTemplate.mOrderData = data;  // penting: pakai mOrderData sesuai template
    const htmlContent       = htmlTemplate.evaluate().getContent();
    Logger.log("Template berhasil di-load");

    // 2) Buat PDF di folder "DataInvoice" Google Drive
    const folderId = DATAINVOICE ;
    const folder   = DriveApp.getFolderById(folderId);
    Logger.log("Folder ditemukan: " + folder.getName());

    const fileName = `NO_${data.mInvoice}.pdf`;
    const blob     = Utilities.newBlob(htmlContent, 'text/html', fileName);
    const pdf      = blob.getAs('application/pdf').setName(fileName);
    const file     = folder.createFile(pdf);
    const mFileUrl = file.getUrl();
    Logger.log("PDF berhasil dibuat: " + mFileUrl);

    // 3) Kirim email kalau ada alamat konsumen
    if (data.mConsumerEmail) {
      const subject = `Simulasi Estimasi Harga ${data.mInvoice}`;
      const htmlBody = `
        <h2>EstiHTools - Estimasi Harga Produk</h2>
        <br>Terima kasih kak ${data.mConsumerName}</br>
        <br>Terlampir Simulasi untuk pesanannya.</br>
        <br>Total Estimasi Harga : Rp. ${formatCurrency(data.mTotalPrice)}</br>
        <p>Silahkan download rincian hasil simulasi anda: <a href="${mFileUrl}">Klik ini untuk Download !</a></p>
        <br>Untuk melakukan order, silahkan akses myHerbalife.com. Gunakan user dan password anda atau menghubungi :</br>
        <br>Member Independen</br>
        <br>${data.mDistributorName}</br>
        <br>Contact HP : ${data.mDistributorPhone}</br>
        <p>Terima kasih</p>
      `;

      MailApp.sendEmail({
        to: data.mConsumerEmail,
        subject: subject,
        htmlBody: htmlBody
        // attachments: [file.getAs(MimeType.PDF)] // kalau mau lampirkan file PDF juga
      });

      Logger.log("Email terkirim ke: " + data.mConsumerEmail);
    } else {
      Logger.log("Email konsumen tidak tersedia, skip email");
    }

    Logger.log("=== SEND EMAIL SELESAI ===");
    return mFileUrl;

  } catch (error) {
    Logger.log("sendEmail ERROR: " + error.message);
    throw new Error("Gagal mengirim email: " + error.message);
  }
}

/**************************
* Kirim Data Konsumen ke WA 
***************************/
function kirimDataKonsumen(orderData, mFileUrl) {
  try {
    const data = {
      mDate: orderData.mDate,
      mInvoice: orderData.mInvoice,
      mDistributorName: orderData.mDistributorName,
      mDistributorPhone: orderData.mDistributorPhone,
      mConsumerName: orderData.mConsumerName,
      mConsumerPhone: orderData.mConsumerPhone,
      mConsumerEmail: orderData.mConsumerEmail,
      mFileUrl: mFileUrl,   // link PDF dari sendEmail
      mTotalPrice: orderData.mTotalPrice
    };

    Logger.log("kirimDataKonsumen START, invoice: " + data.mInvoice + ", fileUrl: " + mFileUrl);
    kirimWA(data);
   
    Logger.log("kirimDataKonsumen SELESAI");
  } catch (err) {
    Logger.log("kirimDataKonsumen ERROR: " + err.message);
    throw err;
  }
}

/*********************************************
* Fungsi untuk mengirim WA melalui API Fonnte
**********************************************/
function kirimWA(data) {
  Logger.log("kirimWA START, tujuan: " + data.mConsumerPhone);

  // Format tanggal
  const dateObj = (data.mDate instanceof Date) ? data.mDate : new Date(data.mDate);
  const safeDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const mBulan = safeDate.getMonth() + 1;
  const mTgl   = safeDate.getDate() + "-" + mBulan + "-" + safeDate.getFullYear();

  // Gabungkan teks yang akan dikirim
  var t1 = '*Estimasi Harga Produk*';
  var t2 = '\n---------------------------------------------';
  var t3 = '\nTgl : ' + mTgl;
  var t4 = '\nHalo Kak ' + data.mConsumerName;
  var t5 = '\nSimulasi Estimasi Harga : ' ;
  var t6 = '\nNo : ' + data.mInvoice;
  var t7 = '\nTotal Harga Rp : '+ formatCurrency(data.mTotalPrice);
  var t8 = '\n\n*Silahkan download* :\n'+ data.mFileUrl ;  
  var t9 = '\n\nUntuk Order, silahkan akses myHerbalife.com \nGunakan user dan password anda atau menghubungi :\n'
  var t10 = '\nMember Independen';
  var t11 = '\n'+ data.mDistributorName;
  var t12 = '\nContact : ' + data.mDistributorPhone;
  var t13 = '\n\Terima kasih';
  var t14 = '\n\n---------------------------------------------';
  var t15 = '\n*Copyright by :*\nwww.beratidealku.com';
  var t16 = '\n\n*Survey Kebugaran, klik ini:*\nbit.ly/Cek_Kebugaran_Anda';
  var t17 = '\n\n*Map Klub Nutrisi, klik ini:*\nbit.ly/LokasiKlubKita';

  const pesan = t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8 + t9 + t10 + t11 + t12 + t13 + t14 + t15 + t16 + t17;

  var tlpDist = data.mDistributorPhone;
  var tlpCust = data.mConsumerPhone;
  //var TokenFonnte = "sojED2r4!xte+qkLrkCW"   // token fonnte utk nomor 08114499640
  var TokenFonnte = "9yeq3JusFP9YZobuYTai";    // token fonnt  utk Nomor 081149908600
  var url = "https://api.fonnte.com/send";
  
  // kirim pesan ke konsumen
  var options_konsumen = {
      "method": "post",
      "headers": {
          "Authorization": TokenFonnte
      },
      "payload": {
          "target": "62"+tlpCust,
          "message": pesan
      }
  };

  // kirim pesan ke distributor
  var options_distributor = {
      "method": "post",
      "headers": {
          "Authorization": TokenFonnte
      },
      "payload": {
          "target": "62"+tlpDist,
          "message": pesan
      }
  };

  var response = UrlFetchApp.fetch(url, options_konsumen);        // Kirim ke konsumen
  var response = UrlFetchApp.fetch(url, options_distributor);     // Kirim ke distributor
  Logger.log(response.getContentText());
}

// ***********************************
// KUMPULAN FUNGSI UNTUK SETUP PRODUK
// ***********************************

/****************************************
*  Handle Get Setup Tabel Harga Produk
****************************************/
function handleGetTabelProduk(e) {
  const data = produkSheet.getRange(2, 1, produkSheet.getLastRow() - 1, produkSheet.getLastColumn()).getValues();
  const callback = e.parameter.callback || 'callback';
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function jsonpResponse(callback, obj) {
  callback = callback || 'callback';
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/****************************************
* Tambah Produk pada Tabel Harga Produk
****************************************/
function handleAddProduk(e) {
  // e bisa berupa Event atau plain object (ketika dipanggil dari doPost)
  const params   = e.parameter || e;
  const callback = params.callback || 'callback';

  const noStok       = (params.noStok || '').toString().trim();
  const namaKategori = params.namaKategori || '';
  const namaProduk   = params.namaProduk || '';
  const volumePoint  = params.volumePoint || '0';
  const hargaDasar   = params.hargaDasar || '0';
  const hargaEceran  = params.hargaEceran || '0';
  const member25     = params.member25 || '0';
  const sc35         = params.sc35 || '0';
  const sb42         = params.sb42 || '0';
  const spv50        = params.spv50 || '0';

  // normalisasi angka (fungsi normalizeNumber sudah ada di file)
  const vpNum   = normalizeNumber(volumePoint);
  const hdNum   = normalizeNumber(hargaDasar);
  const heNum   = normalizeNumber(hargaEceran);
  const m25Num  = normalizeNumber(member25);
  const sc35Num = normalizeNumber(sc35);
  const sb42Num = normalizeNumber(sb42);
  const spv50N  = normalizeNumber(spv50);

  // simpan ke sheet produk (produkSheet dideklarasikan global di file)
  produkSheet.appendRow([ noStok, namaKategori, namaProduk, vpNum, hdNum, heNum, m25Num, sc35Num, sb42Num, spv50N ]);

  return jsonpResponse(callback, { status: 'success', message: 'Produk berhasil ditambahkan' });
}

/**************************************
* Edit Produk pada Tabel Harga Produk
**************************************/
function handleEditProduk(e) {
  const params   = e.parameter || e;
  const callback = params.callback || 'callback';
  const noStok   = (params.noStok || '').toString().trim();
  if (!noStok) return jsonpResponse(callback, { status: 'error', message: 'No Stok tidak ditemukan' });

  const namaKategori = params.namaKategori || '';
  const namaProduk   = params.namaProduk || '';
  const volumePoint  = params.volumePoint || '0';
  const hargaDasar   = params.hargaDasar || '0';
  const hargaEceran  = params.hargaEceran || '0';
  const member25     = params.member25 || '0';
  const sc35         = params.sc35 || '0';
  const sb42         = params.sb42 || '0';
  const spv50        = params.spv50 || '0';

  const vpNum   = normalizeNumber(volumePoint);
  const hdNum   = normalizeNumber(hargaDasar);
  const heNum   = normalizeNumber(hargaEceran);
  const m25Num  = normalizeNumber(member25);
  const sc35Num = normalizeNumber(sc35);
  const sb42Num = normalizeNumber(sb42);
  const spv50N  = normalizeNumber(spv50);

  const data = produkSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === noStok) {
      // update seluruh baris kolom A..J
      produkSheet.getRange(i + 1, 1, 1, 10).setValues([[
        noStok, namaKategori, namaProduk, vpNum, hdNum, heNum, m25Num, sc35Num, sb42Num, spv50N
      ]]);
      return jsonpResponse(callback, { status: 'success', message: 'Produk berhasil diupdate' });
    }
  }

  return jsonpResponse(callback, { status: 'error', message: 'Produk tidak ditemukan' });
}

/**************************************
* Hapus Produk pada Tabel Harga Produk
***************************************/
function handleDeleteProduk(e) {
  const params   = e.parameter || e;
  const callback = params.callback || 'callback';
  const noStok   = (params.noStok || '').toString().trim();

  if (!noStok) return jsonpResponse(callback, { status: 'error', message: 'No Stok tidak ditemukan' });

  const data = produkSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === noStok) {
      produkSheet.deleteRow(i + 1);
      return jsonpResponse(callback, { status: 'success', message: 'Produk berhasil dihapus' });
    }
  }
  return jsonpResponse(callback, { status: 'error', message: 'Produk tidak ditemukan di Sheet' });
}

/***************************************
* Get Nama Ketegori Dari Tabel Kategori 
***************************************/
function handleGetDropdownKategori(e) {
  const callback = e.parameter.callback || 'callback';
  //const sheet    = ss.getSheetByName("TabelKategori");
  //const data     = sheet.getDataRange().getValues();
  const data     = kategoriSheet.getDataRange().getValues();

  // Buat array objek {kode, kategori}, skip header
  const result = data.slice(1).map(row => ({
    kode: row[0],
    kategori: row[1]
  }));

  return jsonpResponse(callback, { data: result });
}

// **********************************
// KUMPULAN FUNGSI UNTUK IMPORT DATA
// **********************************

/***********************************
* Handler untuk import Excel batch
************************************/
function handleImportExcelBatch(e) {
  try {
    const sheet = produkSheet;
    if (!sheet) throw new Error("Sheet 'TabelHarga' tidak ditemukan");

    const data = JSON.parse(decodeURIComponent(e.parameter.data || "{}"));
    const batchData = data.data || [];
    const isFirstBatch = data.first === true;
    const callback = e.parameter.callback || 'callback';

    if (batchData.length === 0) {
      throw new Error("Tidak ada data dalam batch");
    }

    // Hapus semua data lama hanya pada batch pertama
    if (isFirstBatch) {
      sheet.clearContents();
      // Tambahkan header
      const headers = ["NoStok", "Kategori", "NamaProduk", "VP", "HargaDasar", 
                      "HargaEceran", "Member25", "SC35", "SB42", "SPV50"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header sebagai text juga
      sheet.getRange(1, 1, 1, 1).setNumberFormat('@');
    }

    // Format data untuk disimpan
    const formattedData = batchData.map(item => [
      formatNoStok(item.noStok),        // Kolom A: NoStok - sebagai TEXT
      item.kategori || '',              // Kolom B: Kategori
      item.namaProduk || '',            // Kolom C: NamaProduk
      item.vp || 0,                     // Kolom D: VP
      item.hargaDasar || 0,             // Kolom E: HargaDasar
      item.hargaEceran || 0,            // Kolom F: HargaEceran
      item.member25 || 0,               // Kolom G: Member25
      item.sc35 || 0,                   // Kolom H: SC35
      item.sb42 || 0,                   // Kolom I: SB42
      item.spv50 || 0                   // Kolom J: SPV50
    ]);

    console.log("Formatted data untuk disimpan:", formattedData.slice(0, 3));

    // Simpan ke sheet
    const lastRow = Math.max(sheet.getLastRow(), 1);
    const targetRange = sheet.getRange(lastRow + 1, 1, formattedData.length, 10);
    
    // Set values dengan format text untuk kolom NoStok
    targetRange.setValues(formattedData);

    // Format kolom
    formatSheetColumns(sheet, lastRow + 1, formattedData.length);

    const result = {
      status: "success",
      message: `Berhasil import ${formattedData.length} data`,
      total: formattedData.length
    };

    return ContentService.createTextOutput(`${callback}(${JSON.stringify(result)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);

  } catch (err) {
    console.error("Import Excel batch error:", err.message);
    const errorResult = { 
      status: "error", 
      message: err.message 
    };
    
    return ContentService.createTextOutput(`${e.parameter.callback}(${JSON.stringify(errorResult)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

/*****************************************
* Helper function untuk format nomor stok
*****************************************/
function formatNoStok(value) {
  if (!value) return '';
  
  let strValue = String(value).trim();
  
  // Jika mengandung slash (seperti "03/NA"), biarkan as is
  if (strValue.includes('/')) {
    return strValue;
  }
  
  // Jika numerik, format dengan leading zeros
  if (/^\d+$/.test(strValue)) {
    return strValue.padStart(4, '0');
  }
  
  // Jika sudah berupa string dengan huruf, biarkan as is
  return strValue;
}

/*****************************************
* Helper function untuk formatting kolom
*****************************************/
function formatSheetColumns(sheet, startRow, rowCount) {
  if (rowCount === 0) return;
  
  // Format NoStok sebagai text (kolom A) - JANGAN gunakan number format
  const noStokRange = sheet.getRange(startRow, 1, rowCount, 1);
  noStokRange.setNumberFormat('@'); // Format sebagai text
  
  // Format VP (kolom D) - 2 desimal
  const vpRange = sheet.getRange(startRow, 4, rowCount, 1);
  vpRange.setNumberFormat('#,##0.00');
  
  // Format harga (kolom E-J) - currency Indonesia
  const hargaRange = sheet.getRange(startRow, 5, rowCount, 6);
  hargaRange.setNumberFormat('#,##0.00');
}


// **********************************
// KUMPUILAN FUNGSI UNTUK EXPORT DATA
// **********************************

/*********************************************************
* Fungsi untuk Export Direct (tanpa simpan di google drive)
**********************************************************/
function handleExportTabelHargaDirectXLSX(e) {
  try {
    const sheet = produkSheet;
    if (!sheet) {
      throw new Error("Sheet 'TabelHarga' tidak ditemukan");
    }

    const callback = e.parameter.callback || 'callback';
    
    // Ambil semua data dari sheet
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    if (data.length <= 1) {
      throw new Error("Tidak ada data untuk diexport");
    }

    // Format data untuk memastikan NoStok sebagai text
    const formattedData = formatDataForXLSXExport(data);
    
    // Create Excel file using proper method
    const excelData = createExcelFileProper(formattedData);
    
    const result = {
      status: "success",
      message: "File Excel export berhasil dibuat",
      data: excelData,
      filename: `TabelHarga_Export_${Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss")}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    return ContentService.createTextOutput(`${callback}(${JSON.stringify(result)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);

  } catch (err) {
    console.error("Export error:", err.message);
    const errorResult = { 
      status: "error", 
      message: err.message 
    };
    
    return ContentService.createTextOutput(`${e.parameter.callback}(${JSON.stringify(errorResult)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

/*************************************************
* Create Excel File Properly dengan format NoStok
**************************************************/
function createExcelFileProper(data) {
  // Create temporary spreadsheet
  const tempSpreadsheet = SpreadsheetApp.create("TabelHarga_Export_Temp");
  const tempSheet = tempSpreadsheet.getActiveSheet();
  
  // Set data - pastikan NoStok sebagai text dengan menambahkan apostrophe
  const dataWithTextFormat = data.map((row, rowIndex) => {
    if (rowIndex === 0) return row; // Skip header
    
    const newRow = [...row];
    // Untuk kolom NoStok (index 0), tambahkan apostrophe untuk memaksa text format
    if (newRow[0] && typeof newRow[0] === 'string') {
      newRow[0] = "'" + newRow[0]; // Tambahkan apostrophe di depan
    }
    return newRow;
  });
  
  tempSheet.getRange(1, 1, dataWithTextFormat.length, dataWithTextFormat[0].length).setValues(dataWithTextFormat);
  
  // Format columns
  formatXLSXSheet(tempSheet, dataWithTextFormat[0].length);
  
  // Export as proper Excel file
  const url = `https://docs.google.com/spreadsheets/d/${tempSpreadsheet.getId()}/export?format=xlsx&gid=${tempSpreadsheet.getSheetId()}`;
  const response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
    },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error("Gagal export file Excel: " + response.getContentText());
  }
  
  const excelBlob = response.getBlob();
  const base64Content = Utilities.base64Encode(excelBlob.getBytes());
  
  // Delete temporary spreadsheet
  DriveApp.getFileById(tempSpreadsheet.getId()).setTrashed(true);
  
  return base64Content;
}

/****************************************************
* Format Data untuk XLSX Export (NoStok sebagai text)
****************************************************/
function formatDataForXLSXExport(data) {
  if (data.length === 0) return data;
  
  const formattedData = [];
  
  // Header row (tetap sama)
  formattedData.push(data[0]);
  
  // Data rows - format NoStok sebagai text dengan handling khusus
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const formattedRow = [...row]; // Copy row
    
    // Kolom NoStok (index 0) - format sebagai text
    if (formattedRow[0] !== undefined && formattedRow[0] !== null && formattedRow[0] !== '') {
      let noStokValue = String(formattedRow[0]);
      
      // Handle berbagai format NoStok
      noStokValue = formatNoStokForExport(noStokValue);
      
      formattedRow[0] = noStokValue;
    }
    
    formattedData.push(formattedRow);
  }
  
  return formattedData;
}

/**********************************************
* Format NoStok untuk Export (Handling Khusus)
***********************************************/
function formatNoStokForExport(noStokValue) {
  // Bersihkan value dari spasi
  let cleanedValue = String(noStokValue).trim();
  
  // Jika mengandung karakter non-digit (/, -, dll), biarkan asli
  if (/[^0-9]/.test(cleanedValue)) {
    return cleanedValue; // Kembalikan value asli untuk format seperti "03/NA", "01-NA"
  }
  
  // Jika hanya angka, format dengan leading zeros
  if (/^\d+$/.test(cleanedValue)) {
    // Hilangkan leading zeros yang sudah ada untuk menghindari duplikasi
    cleanedValue = String(parseInt(cleanedValue, 10));
    // Tambahkan leading zeros untuk membuat 4 digit
    return cleanedValue.padStart(4, '0');
  }
  
  // Default: return value asli
  return cleanedValue;
}

/**************************************************
* Format XLSX Sheet - Pastikan NoStok sebagai text
***************************************************/
function formatXLSXSheet(sheet, numColumns) {
  // Format header
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#003366");
  headerRange.setFontColor("white");
  
  // Format kolom NoStok sebagai text - PASTIKAN INI DIEKSEKUSI
  if (numColumns >= 1) {
    const noStokRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
    noStokRange.setNumberFormat('@'); // Format sebagai text
    noStokRange.setHorizontalAlignment("left"); // Align left untuk text
  }
  
  // Format kolom angka
  if (numColumns >= 4) {
    // Format VP (kolom D)
    const vpRange = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1);
    vpRange.setNumberFormat('#,##0.00');
    vpRange.setHorizontalAlignment("right"); // Align right untuk angka
    
    // Format harga (kolom E-J)
    if (numColumns >= 10) {
      const hargaRange = sheet.getRange(2, 5, sheet.getLastRow() - 1, 6);
      hargaRange.setNumberFormat('#,##0.00');
      hargaRange.setHorizontalAlignment("right"); // Align right untuk angka
    }
  }
  
  // Auto resize columns
  for (let i = 1; i <= numColumns; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // Freeze header row
  sheet.setFrozenRows(1);
}

// **********************************
// KUMPULAN FUNGSI UNTUK BY KIRIM
// **********************************

/**********************************
* Handle Get Setup Tabel By Kirim
**********************************/
function handleGetTabelByKirim(e) {
  const data = byKirimSheet.getRange(2, 1, byKirimSheet.getLastRow() - 1, byKirimSheet.getLastColumn()).getValues();
  const callback = e.parameter.callback || 'callback';
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/*********************************
* Tambah Data pada Tabel By Kirim
*********************************/
function handleAddByKirim(e) {
  // e bisa berupa Event atau plain object (ketika dipanggil dari doPost)
  const params   = e.parameter || e;
  const callback = params.callback || 'callback';

  const jenisPengiriman = (params.jenisPengiriman || '').toString().trim();
  const biaya           = params.biaya || '0';

  // normalisasi angka (fungsi normalizeNumber sudah ada di file)
  const biayaNum = normalizeNumber(biaya);

  // simpan ke sheet byKirim
  byKirimSheet.appendRow([ jenisPengiriman, biayaNum ]);

  return jsonpResponse(callback, { status: 'success', message: 'Biaya pengiriman berhasil ditambahkan' });
}

/********************************
* Edit Data pada Tabel By Kirim
*********************************/
function handleEditByKirim(e) {
  const params   = e.parameter || e;
  const callback = params.callback || 'callback';
  const rowIndex = parseInt(params.rowIndex || '0');
  const jenisPengiriman = (params.jenisPengiriman || '').toString().trim();
  const biaya           = params.biaya || '0';

  if (rowIndex < 0) return jsonpResponse(callback, { status: 'error', message: 'Index tidak valid' });

  const biayaNum = normalizeNumber(biaya);

  const data = byKirimSheet.getDataRange().getValues();
  
  // Pastikan rowIndex valid (tidak melebihi jumlah data)
  if (rowIndex + 1 < data.length) {
    // update baris (tambah 2 karena header dan index dimulai dari 0)
    byKirimSheet.getRange(rowIndex + 2, 1, 1, 2).setValues([[ 
      jenisPengiriman, biayaNum
    ]]);
    return jsonpResponse(callback, { status: 'success', message: 'Biaya pengiriman berhasil diupdate' });
  }

  return jsonpResponse(callback, { status: 'error', message: 'Data tidak ditemukan' });
}

/********************************
* Hapus Data pada Tabel By Kirim
*********************************/
function handleDeleteByKirim(e) {
  const params   = e.parameter || e;
  const callback = params.callback || 'callback';
  const rowIndex = parseInt(params.rowIndex || '0');

  if (rowIndex < 0) return jsonpResponse(callback, { status: 'error', message: 'Index tidak valid' });

  const data = byKirimSheet.getDataRange().getValues();
  
  // Pastikan rowIndex valid (tidak melebihi jumlah data)
  if (rowIndex + 1 < data.length) {
    byKirimSheet.deleteRow(rowIndex + 2); // +2 karena header dan index dimulai dari 0
    return jsonpResponse(callback, { status: 'success', message: 'Biaya pengiriman berhasil dihapus' });
  }
  
  return jsonpResponse(callback, { status: 'error', message: 'Data tidak ditemukan di Sheet' });
}


// **********************************
// KUMPULAN FUNGSI UNTUK KATEGORI
// **********************************

/**********************************
* Handle Get Setup Tabel Kategori
**********************************/
function handleGetKategori(e) {
  try {
    const data = kategoriSheet.getRange(2, 1, kategoriSheet.getLastRow() - 1, kategoriSheet.getLastColumn()).getValues();
    // Filter baris kosong
    const filteredData = data.filter(row => row[0] && row[1]);
    
    const callback = e.parameter.callback || 'callback';
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(filteredData) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    Logger.log("Error in handleGetKategori: " + error.toString());
    const callback = e.parameter.callback || 'callback';
    return ContentService.createTextOutput(callback + '(' + JSON.stringify({status: "error", message: error.toString()}) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

/*********************************
* Tambah Data pada Tabel Kategori
*********************************/
function handleAddKategori(e) {
  try {
    // e bisa berupa Event atau plain object (ketika dipanggil dari doPost)
    const params = e.parameter || e;
    const callback = params.callback || 'callback';

    const kode = (params.kode || '').toString().trim();
    const kategori = (params.kategori || '').toString().trim();

    // Validasi input
    if (!kode || !kategori) {
      return jsonpResponse(callback, { status: 'error', message: 'Kode dan Kategori harus diisi' });
    }

    // Cek duplikasi kode
    const existingData = kategoriSheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][0] === kode) {
        return jsonpResponse(callback, { status: 'error', message: 'Kode sudah ada, gunakan kode yang berbeda' });
      }
    }

    // simpan ke sheet kategori
    kategoriSheet.appendRow([kode, kategori]);

    return jsonpResponse(callback, { status: 'success', message: 'Kategori berhasil ditambahkan' });
  } catch (error) {
    Logger.log("Error in handleAddKategori: " + error.toString());
    const callback = (e.parameter || e).callback || 'callback';
    return jsonpResponse(callback, { status: 'error', message: error.toString() });
  }
}

/********************************
* Edit Data pada Tabel Kategori
*********************************/
function handleEditKategori(e) {
  try {
    const params = e.parameter || e;
    const callback = params.callback || 'callback';
    const rowIndex = parseInt(params.rowIndex || '0');
    const kode = (params.kode || '').toString().trim();
    const kategori = (params.kategori || '').toString().trim();

    if (rowIndex < 0) return jsonpResponse(callback, { status: 'error', message: 'Index tidak valid' });

    // Validasi input
    if (!kode || !kategori) {
      return jsonpResponse(callback, { status: 'error', message: 'Kode dan Kategori harus diisi' });
    }

    const data = kategoriSheet.getDataRange().getValues();
    
    // Pastikan rowIndex valid (tidak melebihi jumlah data)
    if (rowIndex + 1 < data.length) {
      // Cek duplikasi kode (kecuali untuk baris yang sedang diedit)
      for (let i = 1; i < data.length; i++) {
        if (i !== rowIndex + 1 && data[i][0] === kode) {
          return jsonpResponse(callback, { status: 'error', message: 'Kode sudah ada, gunakan kode yang berbeda' });
        }
      }
      
      // update baris (tambah 2 karena header dan index dimulai dari 0)
      kategoriSheet.getRange(rowIndex + 2, 1, 1, 2).setValues([[kode, kategori]]);
      return jsonpResponse(callback, { status: 'success', message: 'Kategori berhasil diupdate' });
    }

    return jsonpResponse(callback, { status: 'error', message: 'Data tidak ditemukan' });
  } catch (error) {
    Logger.log("Error in handleEditKategori: " + error.toString());
    const callback = (e.parameter || e).callback || 'callback';
    return jsonpResponse(callback, { status: 'error', message: error.toString() });
  }
}

/********************************
* Hapus Data pada Tabel Kategori
*********************************/
function handleDeleteKategori(e) {
  try {
    const params = e.parameter || e;
    const callback = params.callback || 'callback';
    const rowIndex = parseInt(params.rowIndex || '0');

    if (rowIndex < 0) return jsonpResponse(callback, { status: 'error', message: 'Index tidak valid' });

    const data = kategoriSheet.getDataRange().getValues();
    
    // Pastikan rowIndex valid (tidak melebihi jumlah data)
    if (rowIndex + 1 < data.length) {
      kategoriSheet.deleteRow(rowIndex + 2); // +2 karena header dan index dimulai dari 0
      return jsonpResponse(callback, { status: 'success', message: 'Kategori berhasil dihapus' });
    }
    
    return jsonpResponse(callback, { status: 'error', message: 'Data tidak ditemukan di Sheet' });
  } catch (error) {
    Logger.log("Error in handleDeleteKategori: " + error.toString());
    const callback = (e.parameter || e).callback || 'callback';
    return jsonpResponse(callback, { status: 'error', message: error.toString() });
  }
}

/******************************************
* Fungsi Bantu untuk Response JSONP
*******************************************/
function jsonpResponse(callback, data) {
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
