/*******************************************************
/*               DEKLARASI GLOBAL                      *
/*******************************************************/
const TokenFonnte         = "NPUQeEn4zATP628wK7au";
const DB_PROGRAM          = '12PzCrNdv_0Xxa4a8RBBv4d005hXmYFY5DjqxGl3QbE8';
const DB_USER             = '1oNOSh0L9HkXDpEXGMAZOVRMw7crMGWbuOKUu7f4sSqY';
const DB_ESTIHTOOLS       = '15c7FVZ-zfTtGTAMxgCb2HkmDdetybQtbpa4xqqUZ70E';   // ID database dbEstihTools
const DATAINVOICE         = '1Sin4KLBYGFEzrmVH_2iEHIOoDQd_hBJJ';              // ID tempat menyimpan file invoice
const DATASTRUK           = '1qyF_aBaLkKBxxT8PWnofAX3UGc50ztef';              // ID tempat menyimpan file struk pembayaran
const SHEET_PRODUK_NAME   = "TabelHarga";      // Sheet untuk Tabel Harga
const SHEET_KATEGORI_NAME = "TabelKategori";   // Sheet untuk Tabel Kategori
const SHEET_BYKIRIM_NAME  = "TabelByKirim";    // Sheet untuk Tabel By pengiriman
const SHEET_PESANAN_NAME  = "DataPesanan";
const ss                  = SpreadsheetApp.openById(DB_ESTIHTOOLS);
const produkSheet         = ss.getSheetByName(SHEET_PRODUK_NAME);
const kategoriSheet       = ss.getSheetByName(SHEET_KATEGORI_NAME);
const byKirimSheet        = ss.getSheetByName(SHEET_BYKIRIM_NAME); 
const CACHE               = CacheService.getScriptCache();

/******************************************
* Handle GET request (untuk dropdown dsb.)
*******************************************/
function doGet(e) {
  const action   = e.parameter.action;
  const callback = e.parameter.callback;

  try {
    if (action === "getDiscounts") {
      return buildDoGetResponse(getDiscounts(), callback);
    }

    if (action === "getProducts") {
      return buildDoGetResponse(getProducts(), callback);
    }

    if (action === "getShippingOptions") {
      return buildDoGetResponse(getShippingOptions(), callback);
    }

    if (action === "getProductDetails") {
      const noStok = e.parameter.noStok;
      return buildDoGetResponse(getProductDetails(noStok), callback);
    }

    if (action === "getVoucherByPoint") {
      const totalPoint = Number(e.parameter.totalPoint || 0) || 0;
      return buildDoGetResponse(getVoucherByPoint(totalPoint), callback);
    }

    if (action === "getBankBySponsor") {
      const namaSponsor = String(e.parameter.namaSponsor || '').trim();
      return buildDoGetResponse(getBankBySponsor(namaSponsor), callback);
    }

    if (action === "getDataPesananByInvoice") {
      const invoice = String(e.parameter.invoice || '').trim();
      return buildDoGetResponse(getDataPesananByInvoice(invoice), callback);
    }

    if (action === "getPaketProdukByKategori") {
      return buildDoGetResponse(getPaketProdukByKategori(), callback);
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
    
    return buildDoGetResponse({ status: "error", message: "Unknown action" }, callback);

  } catch (err) {
    return buildDoGetResponse({ status: "error", message: err.message }, callback);
  }
}

function buildDoGetResponse(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/************************************************
* Handle POST request (untuk kirim order / setup)
*************************************************/
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("Tidak ada data post yang diterima");
    }

    let data;
    const contentType = String(e.postData.type || '').toLowerCase();

    // Coba parse sebagai JSON terlebih dahulu
    try {
      data = JSON.parse(e.postData.contents);
    } catch (jsonErr) {
      // Jika bukan JSON, parse sebagai application/x-www-form-urlencoded
      data = {};
      try {
        const params = e.parameter || {};
        for (const key in params) {
          if (params.hasOwnProperty(key)) {
            data[key] = params[key];
          }
        }
      } catch (formErr) {
        throw new Error("Format data tidak dikenal (bukan JSON maupun form-urlencoded)");
      }
    }

    Logger.log("doPost: action = " + (data.action || '(none)'));

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

    // === Case 6: konfirmasi pembayaran produk ===
    else if (data.action === "konfirmasiBayarProduk") {
      return handleKonfirmasiBayarProduk(data);
    }

    // === Case 7: tanda terima produk (frmTT.html) ===
    else if (data.action === "tandaTerimaProduk") {
      return handleTandaTerimaProduk(data);
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

    const normalizeNoStok_ = (v) => String(v || '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .toUpperCase()
      .replace(/[‐‑‒–—−]/g, '-')
      .replace(/\s+/g, '');

    return data.slice(1).map(row => ({ 
        NoStok: normalizeNoStok_(row[0]),
        Kategori: row[1],
        NamaProduk: row[2],
        HargaEceran: parseFloat(row[5]) || 0
    }));
}

/*******************************************************************************
* Fungsi Pencarian No Stok untuk mengambil Harga Produk dari sheet "TabelHarga"
*******************************************************************************/
function getProductDetails(noStok) {
    const sheet = ss.getSheetByName("TabelHarga");
    const data = sheet.getDataRange().getValues();

    const normalizeNoStok_ = (v) => String(v || '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .toUpperCase()
      .replace(/[‐‑‒–—−]/g, '-')
      .replace(/\s+/g, '');

    const targetNoStok = normalizeNoStok_(noStok);
    if (!targetNoStok) {
        throw new Error("No Stok kosong");
    }

    const product = data.slice(1).find(row => {
        const rowNoStok = normalizeNoStok_(row[0]);
        return rowNoStok === targetNoStok;
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

function getVoucherByPoint(totalPoint) {
  const sheet = ss.getSheetByName('TabelVoucer');
  if (!sheet) return { status: 'error', message: "Sheet 'TabelVoucer' tidak ditemukan!" };
  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return { status: 'success', potongan: 0, keterangan: '' };

  const parseIntLoose = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && !isNaN(value)) return Math.floor(value);
    const digits = String(value).replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  let bestPoint = -1;
  let bestPotongan = 0;
  let bestKet = '';

  for (let i = 1; i < data.length; i++) {
    const row = data[i] || [];
    const point = parseIntLoose(row[0]);
    const potongan = parseIntLoose(row[1]);
    const ket = String(row[2] || '').trim();
    if (point <= totalPoint && point > bestPoint) {
      bestPoint = point;
      bestPotongan = potongan;
      bestKet = ket;
    }
  }

  if (bestPoint < 0) return { status: 'success', potongan: 0, keterangan: '' };
  return { status: 'success', potongan: bestPotongan, keterangan: bestKet, point: bestPoint };
}

/*******************************************************************************
* Fungsi: getPaketProdukByKategori
* Membaca sheet TabelHarga, group produk per Kategori (kolom B), lalu membuat
* teks nama paket LENGKAP: "Paket [Nama Kategori] ( Produk1, Produk2, ... )"
* Ini adalah sumber kebenaran TUNGGAL (single source of truth), menggantikan
* hardcode PAKET_MAP di frontend jsFrmTT.js.
*
* Structure TabelHarga (sesuai function getProducts):
*   A = NoStok, B = Kategori, C = NamaProduk, D=?, E=?, F = HargaEceran
*
* Return:
*   {
*     status: "success",
*     mapPaket: { 'lansia': "Paket Manula (...)",
*                 'dewasa': "Paket Usia Dewasa (...)",
*                 ... semua kategori unik dari sheet TabelHarga ... }
*     aliasKategori: { 'manula': 'lansia', ... }  -> mapping compact
*     daftarProdukByKategori: { 'lansia': [NamaProduk1, NamaProduk2, ...], ... }
*   }
*******************************************************************************/
function getPaketProdukByKategori() {
  try {
    const sheet = ss.getSheetByName(SHEET_PRODUK_NAME); // "TabelHarga"
    if (!sheet) return { status: 'error', message: "Sheet 'TabelHarga' tidak ditemukan!", mapPaket: {}, aliasKategori: {}, daftarProdukByKategori: {} };
    const data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) {
      return { status: 'error', message: 'Data TabelHarga kosong', mapPaket: {}, aliasKategori: {}, daftarProdukByKategori: {} };
    }

    // Step 1: Group NamaProduk (kolom C) per Kategori (kolom B)
    //   Key: normalized kategori compact; value: { labelKategori: string, produk: [string,...] }
    const normalizeKat_ = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
    const normalizeLabel_ = (v) => String(v || '').trim().replace(/\s+/g, ' ');

    const rawGroups = {}; // { keyNormalized: { labelKategori, produk: [] } }
    for (let i = 1; i < data.length; i++) {
      const katRaw = data[i][1];
      const namaProduk = normalizeLabel_(data[i][2]);
      if (!katRaw || !namaProduk) continue;
      const key = normalizeKat_(katRaw);
      if (!key) continue;
      if (!rawGroups[key]) {
        rawGroups[key] = {
          labelKategori: normalizeLabel_(katRaw),
          produk: []
        };
      }
      if (!rawGroups[key].produk.includes(namaProduk)) {
        rawGroups[key].produk.push(namaProduk);
      }
    }

    // Step 2: Buat prefix "Paket " berdasarkan label kategori,
    //         tapi gunakan nama PAKET FRIENDLY sesuai mapping sebelumnya bila
    //         tersedia (fallback, karena mungkin di sheet kolom B cuma "Lansia").
    //         Prioritas: nama dari sheet dulu -> fallback alias friendly name.
    const FRIENDLY_PREFIX = {
      'lansia':      'Paket Manula',
      'manula':      'Paket Manula',
      'usiadewasa':  'Paket Usia Dewasa',
      'dewasa':      'Paket Usia Dewasa',
      'usiaremaja':  'Paket Usia Remaja',
      'remaja':      'Paket Usia Remaja',
      'sarapan':     'Paket Start Now Pack',
      'startnow':    'Paket Start Now Pack',
      'startnowpack':'Paket Start Now Pack',
      'musclegain':  'Paket Muscle Gain',
      'naikbb':      'Paket Muscle Gain',
      'weightloss':  'Paket Weight Losss',
      'weightlosss': 'Paket Weight Losss',
      'turunbb':     'Paket Weight Losss'
    };
    function getPrefixByKey(key, labelKat) {
      if (FRIENDLY_PREFIX[key]) return FRIENDLY_PREFIX[key];
      // Jika tidak ada alias, coba prefix dari nama kategori
      const s = (labelKat || key || '').trim();
      if (!s) return 'Paket';
      const upperFirst = s.charAt(0).toUpperCase() + s.slice(1);
      return 'Paket ' + upperFirst;
    }

    // Step 3: Build mapPaket, daftarProdukByKategori, dan aliasKategori
    const mapPaket = {};
    const daftarProdukByKategori = {};
    const aliasKategori = {};
    const keys = Object.keys(rawGroups);
    keys.sort();

    // aliasKategori: setiap kategori punya 2 key (original normalized + alias text manusiawi jika ada)
    keys.forEach(function(key) {
      const g = rawGroups[key];
      const prefix = getPrefixByKey(key, g.labelKategori);
      const produkList = g.produk.slice();
      const isiProduk = produkList.length ? produkList.join(', ') : '';
      const namaPaketLengkap = isiProduk ? (prefix + ' ( ' + isiProduk + ' )') : prefix;
      mapPaket[key] = namaPaketLengkap;
      daftarProdukByKategori[key] = produkList;
      // alias dari labelKategori (jika berbeda key)
      const labelKey = normalizeKat_(g.labelKategori);
      if (labelKey && labelKey !== key) aliasKategori[labelKey] = key;
      // alias friendly (jika key sendiri tidak match tapi alias manusiawi match)
      Object.keys(FRIENDLY_PREFIX).forEach(function(alias) {
        if (FRIENDLY_PREFIX[alias] === prefix && !mapPaket[alias]) {
          aliasKategori[alias] = key;
        }
      });
    });

    Logger.log('✅ getPaketProdukByKategori sukses: ' + keys.length + ' kategori');
    return {
      status: 'success',
      mapPaket: mapPaket,
      aliasKategori: aliasKategori,
      daftarProdukByKategori: daftarProdukByKategori
    };

  } catch (err) {
    Logger.log('getPaketProdukByKategori ERROR: ' + err.message);
    return { status: 'error', message: err.message, mapPaket: {}, aliasKategori: {}, daftarProdukByKategori: {} };
  }
}

function getBankBySponsor(namaSponsor) {
  const sheet = ss.getSheetByName('TabelBank');
  if (!sheet) return { status: 'error', message: "Sheet 'TabelBank' tidak ditemukan!" };
  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return { status: 'error', message: 'Data bank kosong' };

  const normalizeText_ = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const target = normalizeText_(namaSponsor);
  if (!target) return { status: 'error', message: 'Nama sponsor kosong' };

  const idxSponsor = 0;
  const idxHpSponsor = 1;
  const idxNamaBank = 2;
  const idxAc = 3;
  const idxNamaPenerima = 4;

  const banks = [];
  let hpSponsor = '';

  for (let i = 1; i < data.length; i++) {
    const row = data[i] || [];
    const rowSponsor = normalizeText_(row[idxSponsor]);
    if (!rowSponsor) continue;
    if (rowSponsor !== target) continue;

    const hp = String(row[idxHpSponsor] || '').trim();
    if (!hpSponsor && hp) hpSponsor = hp;

    const namaBank = String(row[idxNamaBank] || '').trim();
    const acPenerima = String(row[idxAc] || '').trim();
    const namaPenerima = String(row[idxNamaPenerima] || '').trim();
    if (!namaBank) continue;

    banks.push({
      namaBank: namaBank,
      acPenerima: acPenerima,
      namaPenerima: namaPenerima,
      hpSponsor: hp
    });
  }

  if (!banks.length) return { status: 'error', message: 'Data bank sponsor tidak ditemukan' };
  return {
    status: 'success',
    hpSponsor: hpSponsor,
    banks: banks,
    namaBank: banks[0].namaBank,
    namaPenerima: banks[0].namaPenerima,
    acPenerima: banks[0].acPenerima
  };
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

  const safeNumber_ = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const totalVoucher = safeNumber_(orderData.mVoucher || 0);

  // Struktur kolom DataPesanan (dbEstiHTools-V8.ods, terbaru):
  //  1 Tgl Invoice, 2 Nama Sponsor, 3 HP Sponsor, 4 Nama Konsumen, 5 HP Konsumen,
  //  6 Email Konsumen, 7 No Invoice, 8 No Item, 9 No Stok, 10 Kategori, 11 Nama Produk,
  //  12 VP, 13 Harga Eceran, 14 Diskon, 15 Voucer, 16 Jumlah, 17 Tot VP,
  //  18 By Pengiriman, 19 Pajak, 20 Harga, 21 Total Harga, 22 Alamat, 23 Kelurahan,
  //  24 Kecamatan, 25 Kota, 26 Propensi, 27 link URL file PDF, 28 Metode Bayar,
  //  29 Nama Bank, 30 Nama Penerima, 31 AC Penerima, 32 Nominal Transfer,
  //  33 Status WA, 34 Status Email, 35 Tgl Bayar, 36 Link Bukti Transfer,
  //  37 Status Bayar, 38 Tgl Terima, 39 Link Bukti Produk, 40 Status Terima
  const newRows = orderData.items.map((item, idx) => {
    const qty = safeNumber_(item.mJumlah || 0);
    const hargaEceranPerUnit = safeNumber_(item.mHargaEceran || 0);
    const setelahDiskonPerUnit = safeNumber_(item.mSetelahDiskon || 0);
    const diskonPerUnit = Math.max(0, hargaEceranPerUnit - setelahDiskonPerUnit);
    const diskonNominal = diskonPerUnit * qty;

    const voucherRow = (idx === 0) ? totalVoucher : 0;
    const hargaRow = Math.max(0, (setelahDiskonPerUnit * qty) - voucherRow);

    return [
      orderData.mDate,                     // 1  Tgl Invoice
      orderData.mDistributorName,          // 2  Nama Sponsor
      orderData.mDistributorPhone,         // 3  HP Sponsor
      orderData.mConsumerName,             // 4  Nama Konsumen
      orderData.mConsumerPhone,            // 5  HP Konsumen
      orderData.mConsumerEmail,            // 6  Email Konsumen
      orderData.mInvoice,                  // 7  No Invoice
      item.mNoItem,                        // 8  No Item
      item.mNoStok,                        // 9  No Stok
      item.mKategori,                      // 10 Kategori
      item.mNamaProduk,                    // 11 Nama Produk
      safeNumber_(item.mVp || 0),          // 12 VP
      hargaEceranPerUnit,                  // 13 Harga Eceran
      diskonNominal,                       // 14 Diskon
      voucherRow,                          // 15 Voucer
      qty,                                 // 16 Jumlah
      safeNumber_(item.mTotVP || 0),       // 17 Tot VP
      safeNumber_(orderData.mByKirim || 0),// 18 By Pengiriman
      safeNumber_(orderData.mPajak || 0),  // 19 Pajak
      hargaRow,                            // 20 Harga (eceran - diskon - voucer)
      safeNumber_(orderData.mTotalPrice || 0), // 21 Total Harga (harga + pajak + by kirim)
      orderData.mAlamat || "",             // 22 Alamat
      orderData.mKelurahan || "",          // 23 Kelurahan
      orderData.mKecamatan || "",          // 24 Kecamatan
      orderData.mKota || "",               // 25 Kota
      orderData.mPropensi || "",           // 26 Propensi
      "",                                  // 27 link URL file PDF
      "",                                  // 28 Metode Bayar
      "",                                  // 29 Nama Bank
      "",                                  // 30 Nama Penerima
      "",                                  // 31 AC Penerima
      "",                                  // 32 Nominal Transfer
      "",                                  // 33 Status WA
      "",                                  // 34 Status Email
      "",                                  // 35 Tgl Bayar
      "",                                  // 36 Link Bukti Transfer
      "",                                  // 37 Status Bayar
      "",                                  // 38 Tgl Terima
      "",                                  // 39 Link Bukti Produk
      ""                                   // 40 Status Terima
    ];
  });

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
      const subject = `Daftar Pesanan Produk ${data.mInvoice}`;
      const htmlBody = `
        <h2>Daftar Pesanan Produk</h2>
        <br>Terima kasih kak ${data.mConsumerName}</br>
        <br>Terlampir daftar pesanan produk.</br>
        <br>Total Harga : Rp. ${formatCurrency(data.mTotalPrice)}</br>
        <p>Silahkan download rincian pesanan anda: <a href="${mFileUrl}">Klik ini untuk Download !</a></p>
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
  var t1 = '*Daftar Pesanan Produk*';
  var t2 = '\n---------------------------------------------';
  var t3 = '\nTgl : ' + mTgl;
  var t4 = '\nHalo Kak ' + data.mConsumerName;
  var t5 = '\nPesanan Produk : ' ;
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
  // var t16 = '\n\n*Survey Kebugaran, klik ini:*\nbit.ly/Cek_Kebugaran_Anda';
  // var t17 = '\n\n*Map Klub Nutrisi, klik ini:*\nbit.ly/LokasiKlubKita';

  const pesan = t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8 + t9 + t10 + t11 + t12 + t13 + t14 + t15;

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

/***********************************************************
* Fungsi: getDataPesananByInvoice
* Ambil data pesanan dari sheet DataPesanan berdasarkan No. Invoice
* Digunakan untuk prefill frmKonfirmasi.html ketika localStorage kosong
************************************************************/
function getDataPesananByInvoice(invoice) {
  try {
    const sheet = ss.getSheetByName(SHEET_PESANAN_NAME);
    if (!sheet) return { status: 'error', message: 'Sheet DataPesanan tidak ditemukan' };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'error', message: 'Data pesanan kosong' };

    const target = String(invoice || '').trim();
    if (!target) return { status: 'error', message: 'Invoice kosong' };

    let found = null;
    const items = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[6] || '').trim() !== target) continue;

      if (!found) {
        found = {
          status: 'success',
          mDate: row[0] || '',
          mDistributorName: row[1] || '',
          mDistributorPhone: row[2] || '',
          mConsumerName: row[3] || '',
          mConsumerPhone: row[4] || '',
          mConsumerEmail: row[5] || '',
          mInvoice: row[6] || '',
          mAlamat: row[21] || '',
          mKelurahan: row[22] || '',
          mKecamatan: row[23] || '',
          mKota: row[24] || '',
          mPropensi: row[25] || '',
          mByKirim: Number(row[17] || 0),
          mPajak: Number(row[18] || 0),
          mTotalPrice: Number(row[20] || 0),
          mVoucher: 0,
          items: []
        };
        let totalVoucher = 0;
        for (let j = 1; j < data.length; j++) {
          if (String(data[j][6] || '').trim() === target) {
            totalVoucher += Number(data[j][14] || 0);
          }
        }
        found.mVoucher = totalVoucher;
      }

      items.push({
        noItem: row[7] || '',
        noStok: row[8] || '',
        kategori: row[9] || '',
        nama: row[10] || '',
        vp: Number(row[11] || 0),
        hargaEceran: Number(row[12] || 0),
        diskon: Number(row[13] || 0),
        voucher: Number(row[14] || 0),
        qty: Number(row[15] || 0),
        totVP: Number(row[16] || 0),
        harga: Number(row[19] || 0)
      });
    }

    if (!found) return { status: 'error', message: 'Pesanan dengan invoice ' + target + ' tidak ditemukan' };

    found.items = items;
    return found;

  } catch (err) {
    Logger.log('getDataPesananByInvoice ERROR: ' + err.message);
    return { status: 'error', message: err.message };
  }
}

/***********************************************************
* Fungsi: cleanPhoneNumber_
* Bersihkan nomor HP: hilangkan leading 0, spasi, strip, dll
************************************************************/
function cleanPhoneNumber_(hp) {
  let cleaned = String(hp || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('62')) cleaned = cleaned.substring(2);
  return cleaned;
}

/***********************************************************
* Fungsi: uploadBuktiTransferToDrive_
* Upload base64 gambar bukti transfer ke folder DATASTRUK
* Jika DATASTRUK kosong (belum diisi ID-nya), fallback ke DATAINVOICE
* Mengembalikan URL file Drive (public anyone with link)
************************************************************/
function uploadBuktiTransferToDrive_(base64Data, invoice) {
  try {
    if (!base64Data) return '';

    // Pilih folder tujuan: DATASTRUK jika diisi,否则 fallback ke DATAINVOICE
    const folderId = (DATASTRUK && String(DATASTRUK).trim()) ? DATASTRUK : DATAINVOICE;
    const folder = DriveApp.getFolderById(folderId);
    //const fileName = `BUKTI_${invoice}_${Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss")}.jpg`;
    const fileName = `BUKTI_${invoice}.jpg`;

    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, 'image/jpeg', fileName);
    const file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    Logger.log('Bukti transfer berhasil diupload ke folder ' + folder.getName() + ': ' + file.getUrl());
    return file.getUrl();

  } catch (err) {
    Logger.log('uploadBuktiTransferToDrive_ ERROR: ' + err.message);
    return '';
  }
}

/***********************************************************
* Fungsi: generatePdfInvoiceProduk_
* Generate PDF Invoice dari template email (reuse logic sendEmail)
* Nama file PDF sama dengan No. Invoice
* Mengembalikan URL file PDF di Drive
************************************************************/
function generatePdfInvoiceProduk_(orderData) {
  try {
    Logger.log('generatePdfInvoiceProduk_ START, invoice: ' + orderData.mInvoice);

    // Normalisasi supaya template selalu punya mOrderData.mItems
    if (!orderData.mItems && orderData.items) {
      orderData.mItems = orderData.items;
    }

    const items  = Array.isArray(orderData.mItems) ? orderData.mItems : [];
    const totals = items.reduce((acc, it) => {
      acc.jumlah += Number(it.mJumlah || it.qty || 0);
      acc.vp     += Number(it.mTotVP || it.totVP || 0);
      acc.harga  += Number(it.mHarga || it.harga || 0);
      return acc;
    }, { jumlah: 0, vp: 0, harga: 0 });

    orderData.mTotalJumlah = totals.jumlah;
    orderData.mTotalVP     = totals.vp;
    orderData.mTotalHarga  = totals.harga;

    // Load template
    const htmlTemplate      = HtmlService.createTemplateFromFile('emailTemplate');
    htmlTemplate.mOrderData = orderData;
    const htmlContent       = htmlTemplate.evaluate().getContent();

    // Buat PDF di folder "DataInvoice" Google Drive
    const folder = DriveApp.getFolderById(DATAINVOICE);
    const fileName = `${orderData.mInvoice}.pdf`;
    const blob     = Utilities.newBlob(htmlContent, 'text/html', fileName);
    const pdf      = blob.getAs('application/pdf').setName(fileName);
    const file     = folder.createFile(pdf);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const mFileUrl = file.getUrl();
    Logger.log('PDF Invoice berhasil dibuat: ' + mFileUrl);
    return mFileUrl;

  } catch (err) {
    Logger.log('generatePdfInvoiceProduk_ ERROR: ' + err.message);
    throw new Error('Gagal generate PDF: ' + err.message);
  }
}

/***********************************************************
* Fungsi: updateDataPesananKolomBayar_
* Update kolom AA sampai AK (27-37) di sheet DataPesanan
* untuk semua baris dengan No. Invoice yang sama
************************************************************/
function updateDataPesananKolomBayar_(invoice, pembayaran) {
  try {
    const sheet = ss.getSheetByName(SHEET_PESANAN_NAME);
    if (!sheet) throw new Error('Sheet DataPesanan tidak ditemukan');

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    const colInvoiceIdx = 6;
    const target = String(invoice || '').trim();

    const rowIndexes = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colInvoiceIdx] || '').trim() === target) {
        rowIndexes.push(i + 1);
      }
    }

    // Kolom (1-based):
    // 27 = AA  link URL file PDF
    // 28 = AB  Metode Bayar
    // 29 = AC  Nama Bank
    // 30 = AD  Nama Penerima
    // 31 = AE  AC Penerima
    // 32 = AF  Nominal Transfer
    // 33 = AG  Status WA
    // 34 = AH  Status Email
    // 35 = AI  Tgl Bayar
    // 36 = AJ  Link Bukti Transfer
    // 37 = AK  Status Bayar

    for (const rowIndex of rowIndexes) {
      sheet.getRange(rowIndex, 27).setValue(pembayaran.linkPdf || '');
      sheet.getRange(rowIndex, 28).setValue(pembayaran.metodeBayar || '');
      sheet.getRange(rowIndex, 29).setValue(pembayaran.namaBank || '');
      sheet.getRange(rowIndex, 30).setValue(pembayaran.namaPenerima || '');
      sheet.getRange(rowIndex, 31).setValue(pembayaran.acPenerima || '');
      sheet.getRange(rowIndex, 32).setValue(pembayaran.nominalTransfer || 0);
      sheet.getRange(rowIndex, 33).setValue(pembayaran.statusWA || '');
      sheet.getRange(rowIndex, 34).setValue(pembayaran.statusEmail || '');
      sheet.getRange(rowIndex, 35).setValue(pembayaran.tglBayar || '');
      sheet.getRange(rowIndex, 36).setValue(pembayaran.linkBukti || '');
      sheet.getRange(rowIndex, 37).setValue(pembayaran.statusBayar || '');
    }

    Logger.log('Update kolom bayar sukses untuk invoice: ' + invoice + ', baris: ' + rowIndexes.length);

  } catch (err) {
    Logger.log('updateDataPesananKolomBayar_ ERROR: ' + err.message);
    throw err;
  }
}

/***********************************************************
* Fungsi: uploadBuktiProdukToDrive_
* Upload base64 gambar bukti produk diterima ke folder DATASTRUK
* (fallback ke DATAINVOICE)
* Mengembalikan URL file Drive (public anyone with link)
************************************************************/
function uploadBuktiProdukToDrive_(base64Data, invoice) {
  try {
    if (!base64Data) return '';

    const folderId = (DATASTRUK && String(DATASTRUK).trim()) ? DATASTRUK : DATAINVOICE;
    const folder = DriveApp.getFolderById(folderId);
    // const fileName = `TERIMA_${invoice}_${Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss")}.jpg`;
    const fileName = `TERIMA_${invoice}.jpg`;

    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, 'image/jpeg', fileName);
    const file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    Logger.log('Bukti produk berhasil diupload: ' + file.getUrl());
    return file.getUrl();

  } catch (err) {
    Logger.log('uploadBuktiProdukToDrive_ ERROR: ' + err.message);
    return '';
  }
}

/***********************************************************
* Fungsi: updateDataPesananKolomTerima_
* Update kolom AL, AM, AN (38, 39, 40) di sheet DataPesanan
* untuk semua baris dengan No. Invoice yang sama:
*   AL (38) = Tgl Terima
*   AM (39) = Link Bukti Produk
*   AN (40) = Status Terima ("OK")
************************************************************/
function updateDataPesananKolomTerima_(invoice, terima) {
  try {
    const sheet = ss.getSheetByName(SHEET_PESANAN_NAME);
    if (!sheet) throw new Error('Sheet DataPesanan tidak ditemukan');

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    const colInvoiceIdx = 6;
    const target = String(invoice || '').trim();

    const rowIndexes = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colInvoiceIdx] || '').trim() === target) {
        rowIndexes.push(i + 1);
      }
    }

    // 38 = AL Tgl Terima
    // 39 = AM Link Bukti Produk
    // 40 = AN Status Terima ("OK")
    for (const rowIndex of rowIndexes) {
      sheet.getRange(rowIndex, 38).setValue(terima.tglTerima || '');
      sheet.getRange(rowIndex, 39).setValue(terima.linkBuktiProduk || '');
      sheet.getRange(rowIndex, 40).setValue(terima.statusTerima || '');
    }

    Logger.log('Update kolom terima sukses untuk invoice: ' + invoice + ', baris: ' + rowIndexes.length);

  } catch (err) {
    Logger.log('updateDataPesananKolomTerima_ ERROR: ' + err.message);
    throw err;
  }
}

/***********************************************************
* Fungsi: handleTandaTerimaProduk
* Handler action=tandaTerimaProduk dari frmTT.html
* Alur:
*  1. Upload gambar bukti produk ke Drive → dapat link
*  2. Update kolom AL, AM, AN di sheet DataPesanan
*  3. Kirim WA ke Admin (notifikasi tanda terima)
*  4. Kirim Email ke Admin (notifikasi tanda terima)
*  5. Response sukses ke frontend
************************************************************/
function handleTandaTerimaProduk(data) {
  try {
    Logger.log('=== handleTandaTerimaProduk START ===');

    const noPesanan = String(data.noPesanan || '').trim();
    if (!noPesanan) throw new Error('No. Pesanan tidak boleh kosong');

    // 1. Upload bukti produk ke Drive
    const linkBukti = uploadBuktiProdukToDrive_(data.fileProduk, noPesanan);

    // 2. Ambil data dari sheet (untuk dapat nama konsumen, sponsor, dll untuk notif)
    let pesananInfo = null;
    try { pesananInfo = getDataPesananByInvoice(noPesanan); } catch (e) { pesananInfo = null; }

    const tglTerima = String(data.tanggalTerima || '').trim()
      || Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy");

    // 3. Update sheet DataPesanan kolom AL, AM, AN
    const terima = {
      tglTerima: tglTerima,
      linkBuktiProduk: linkBukti,
      statusTerima: 'OK'
    };
    updateDataPesananKolomTerima_(noPesanan, terima);

    // 4. Kirim Notifikasi WA ke Admin (jika ada pesananInfo)
    try {
      if (pesananInfo && pesananInfo.status !== 'error') {
        const dateObj = new Date();
        const mBulan  = dateObj.getMonth() + 1;
        const mTgl    = dateObj.getDate() + "-" + mBulan + "-" + dateObj.getFullYear();

        const namaKonsumen = data.namaKonsumen || pesananInfo.mConsumerName || '';
        const namaSponsor  = data.namaSponsor  || pesananInfo.mDistributorName || '';

        const t1  = '*Tanda Terima Produk - Beratidealku*';
        const t2  = '\n---------------------------------------------';
        const t3  = '\nTgl Submit : ' + mTgl;
        const t4  = '\nTgl Terima Produk : ' + tglTerima;
        const t5  = '\n*No. Pesanan :* ' + noPesanan;
        const t6  = '\n*Nama Konsumen :* ' + namaKonsumen;
        const t7  = '\n*Nama Sponsor   :* ' + namaSponsor;
        const t8  = '\n\n*Bukti Produk Diterima :*\n' + (linkBukti || '-');
        const t9  = '\n\n---------------------------------------------';
        const t10 = '\n*Copyright by :*\nwww.beratidealku.com';

        const pesanWA = t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8 + t9 + t10;

        // const TokenFonnte = "NPUQeEn4zATP628wK7au";
        const urlWA = "https://api.fonnte.com/send";

        const options_a1 = {
          method: "post",
          headers: { "Authorization": TokenFonnte },
          payload: { target: "8114499640", message: pesanWA }
        };
        //const options_a2 = {
        //  method: "post",
        //  headers: { "Authorization": TokenFonnte },
        //  payload: { target: "81241318600", message: pesanWA }
        //};
        UrlFetchApp.fetch(urlWA, options_a1);
        //UrlFetchApp.fetch(urlWA, options_a2);

        Logger.log('✅ WA Notif Tanda Terima ke Admin terkirim');
      }
    } catch (eWA) {
      Logger.log('⚠️ WA Notif Tanda Terima GAGAL: ' + eWA.message);
    }

    // 5. Kirim Notifikasi Email ke Admin
    try {
      const namaKonsumen = data.namaKonsumen || (pesananInfo && pesananInfo.mConsumerName ? pesananInfo.mConsumerName : '');
      const namaSponsor  = data.namaSponsor  || (pesananInfo && pesananInfo.mDistributorName ? pesananInfo.mDistributorName : '');
      const hpKonsumen   = (pesananInfo && pesananInfo.mConsumerPhone) ? pesananInfo.mConsumerPhone : '';

      const subjectEmail = `Tanda Terima Produk - ${noPesanan}`;
      const bodyEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #041e55;">Tanda Terima Produk - Beratidealku</h2>
          <hr>
          <table style="width: 100%; margin: 15px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; width: 40%;"><strong>No. Pesanan</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${noPesanan}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa;"><strong>Tgl Terima</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${tglTerima}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa;"><strong>Nama Konsumen</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${namaKonsumen}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa;"><strong>HP Konsumen</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${hpKonsumen || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa;"><strong>Nama Sponsor</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${namaSponsor}</td>
            </tr>
          </table>
          <p><strong>Bukti Produk Diterima:</strong><br>
            <a href="${linkBukti}" target="_blank" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;" rel="noopener noreferrer">
              <i class="fas fa-image"></i> Lihat Bukti Produk
            </a>
          </p>
          <p style="margin-top: 10px; font-size: 14px; color: #6c757d;">
            Atau salin link: <a href="${linkBukti}" target="_blank" rel="noopener noreferrer">${linkBukti}</a>
          </p>
          <hr>
          <p style="font-size: 12px; color: #6c757d;">
            <strong>Copyright by:</strong> <a href="https://www.beratidealku.com" target="_blank">www.beratidealku.com</a>
          </p>
        </div>
      `;

      MailApp.sendEmail({
        to: "amihaji@gmail.com",
        subject: subjectEmail,
        htmlBody: bodyEmail
      });
      Logger.log('✅ Email Notif Tanda Terima ke Admin terkirim');
    } catch (eEmail) {
      Logger.log('⚠️ Email Notif Tanda Terima GAGAL: ' + eEmail.message);
    }

    Logger.log('=== handleTandaTerimaProduk SELESAI ===');

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Tanda terima produk berhasil disimpan.',
        noPesanan: noPesanan,
        linkBuktiProduk: linkBukti,
        tglTerima: tglTerima
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('handleTandaTerimaProduk ERROR: ' + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: 'Gagal memproses tanda terima: ' + err.message
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/***********************************************************
* Fungsi: kirimWAPesananProdukKonsumen_
* Kirim WA ke Konsumen tentang "Pesanan Produk" 
* Isi: Ringkasan pesanan + Link Invoice (pdfLink) + Link Tanda Terima (ttLink)
* Mengembalikan TRUE jika Fonnte response JSON.status === true
************************************************************/
function kirimWAPesananProdukKonsumen_(orderData, pdfLink, ttLink) {
  try {
    const rawHp = String(orderData.hpKonsumen || orderData.mConsumerPhone || '').trim();
    if (!rawHp) {
      Logger.log('❌ WA Konsumen: HP Kosong, skip');
      return false;
    }

    // Format nomor HP SAMA PERSIS dengan fungsi asli kirimWA() di code-dbDaftarBeratideal.gs
    let hpKonsumen = rawHp.replace(/\D/g, '');
    if (hpKonsumen.startsWith('62')) {
      // sudah 62
    } else if (hpKonsumen.startsWith('0')) {
      hpKonsumen = '62' + hpKonsumen.replace(/^0+/, '');
    } else {
      hpKonsumen = '62' + hpKonsumen;
    }
    if (hpKonsumen === '62' || hpKonsumen.length < 8) {
      Logger.log('❌ WA Konsumen: HP tidak valid -> ' + rawHp);
      return false;
    }

    const dateObj = new Date();
    const mBulan  = dateObj.getMonth() + 1;
    const mTgl    = dateObj.getDate() + "-" + mBulan + "-" + dateObj.getFullYear();

    const t1  = '*Pesanan Produk - Beratidealku*';
    const t2  = '\n---------------------------------------------';
    const t3  = '\nTgl : ' + mTgl;
    const t4  = '\nHalo Kak *' + (orderData.namaKonsumen || orderData.mConsumerName || '') + '*';
    const t5  = '\nTerima kasih telah melakukan konfirmasi pembayaran untuk pesanan:';
    const t6  = '\n*No. Pesanan :* ' + orderData.noPesanan;
    const t7  = '\n*Total Bayar : Rp. ' + formatCurrency(orderData.grandTotal || orderData.mTotalPrice || 0) + '*';
    const t8  = '\n\n*Download Invoice :*\n' + (pdfLink || '-');
    const t9  = '\n\n*Silahkan isi form tanda terima, jika barang telah diterima:*\n' + (ttLink || '-');
    const t10 = '\n\nSimpan link diatas sebagai bukti. Admin & Sponsor segera memproses pengiriman produk Anda.';
    const t11 = '\n\nKontak Sponsor :';
    const t12 = '\n*' + (orderData.namaSponsor || orderData.mDistributorName || '') + '*';
    const t13 = '\nHP : ' + (orderData.hpSponsor || orderData.mDistributorPhone || '-');
    const t14 = '\n\n---------------------------------------------';
    const t15 = '\n*Copyright by :*\nwww.beratidealku.com';

    const pesan = t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8 + t9 + t10 + t11 + t12 + t13 + t14 + t15;

    // PAKAI TOKEN & URL SAMA PERSIS dengan code-dbDaftarBeratideal.gs yang WORKING
    // const TokenFonnte = "NPUQeEn4zATP628wK7au";
    const url = "https://api.fonnte.com/send";

    const options_konsumen = {
      method: "post",
      headers: { "Authorization": TokenFonnte },
      payload: { target: hpKonsumen, message: pesan }
    };

    const options_admin1 = {
      method: "post",
      headers: { "Authorization": TokenFonnte },
      payload: { target: "8114499640", message: pesan }
    };

    const options_admin2 = {
      method: "post",
      headers: { "Authorization": TokenFonnte },
      payload: { target: "81241318600", message: pesan }
    };

    Logger.log('📤 WA Konsumen -> ' + hpKonsumen + ' | invoice: ' + orderData.noPesanan);
    let success = false;
    try {
      const r1 = UrlFetchApp.fetch(url, options_konsumen);
      Logger.log('📥 Response Konsumen HTTP ' + r1.getResponseCode() + ': ' + r1.getContentText().substring(0, 200));
      success = (r1.getResponseCode() >= 200 && r1.getResponseCode() < 300);
    } catch (e) {
      Logger.log('❌ WA Konsumen fetch error: ' + e.message);
      success = false;
    }

    // TIDAK DI AKTIFKAN Kirim CC ke Admin (jangan sampai mengganggu status sukses konsumen)
    //try { UrlFetchApp.fetch(url, options_admin1); } catch (e) { Logger.log('⚠️ CC Admin1 WA gagal: ' + e.message); }
    //try { UrlFetchApp.fetch(url, options_admin2); } catch (e) { Logger.log('⚠️ CC Admin2 WA gagal: ' + e.message); }

    if (success) {
      Logger.log('✅ WA Konsumen BERHASIL terkirim');
    } else {
      Logger.log('❌ WA Konsumen GAGAL terkirim');
    }
    return success;

  } catch (err) {
    Logger.log('❌ WA Konsumen ERROR: ' + err.message + '\n' + err.stack);
    return false;
  }
}

/***********************************************************
* Fungsi: kirimWAPesananProdukSponsor_
* Kirim WA ke Sponsor tentang "Pesanan Konsumen"
* Isi: Notifikasi pesanan baru + Link Invoice (pdfLink) + Link Bukti Bayar (buktiLink)
* Mengembalikan TRUE jika Fonnte response JSON.status === true
************************************************************/
function kirimWAPesananProdukSponsor_(orderData, pdfLink, buktiLink) {
  try {
    const rawHp = String(orderData.hpSponsor || orderData.mDistributorPhone || '').trim();
    if (!rawHp) {
      Logger.log('❌ WA Sponsor: HP Kosong, skip');
      return false;
    }

    // Format nomor HP SAMA PERSIS dengan fungsi asli kirimWA() di code-dbDaftarBeratideal.gs
    let hpSponsor = rawHp.replace(/\D/g, '');
    if (hpSponsor.startsWith('62')) {
      // sudah 62
    } else if (hpSponsor.startsWith('0')) {
      hpSponsor = '62' + hpSponsor.replace(/^0+/, '');
    } else {
      hpSponsor = '62' + hpSponsor;
    }
    if (hpSponsor === '62' || hpSponsor.length < 8) {
      Logger.log('❌ WA Sponsor: HP tidak valid -> ' + rawHp);
      return false;
    }

    const dateObj = new Date();
    const mBulan  = dateObj.getMonth() + 1;
    const mTgl    = dateObj.getDate() + "-" + mBulan + "-" + dateObj.getFullYear();

    const t1  = '*Pesanan Konsumen - Beratidealku*';
    const t2  = '\n---------------------------------------------';
    const t3  = '\nTgl : ' + mTgl;
    const t4  = '\nHalo Kak *' + (orderData.namaSponsor || orderData.mDistributorName || '') + '*';
    const t5  = '\nAda pesanan baru dari konsumen Anda:';
    const t6  = '\n*Nama Konsumen :* ' + (orderData.namaKonsumen || orderData.mConsumerName || '');
    const t7  = '\n*No. Pesanan   :* ' + orderData.noPesanan;
    const t8  = '\n*Total Bayar   : Rp. ' + formatCurrency(orderData.grandTotal || orderData.mTotalPrice || 0) + '*';
    const t9  = '\n\n*Download Invoice :*\n' + (pdfLink || '-');
    const t9a = '\n\n*Bukti Transfer :*\n' + (buktiLink || '-');
    const t10 = '\n\nSilakan segera proses dan koordinasi pengiriman produk dengan konsumen yang bersangkutan. Terima kasih.';
    const t11 = '\n\n---------------------------------------------';
    const t12 = '\n*Copyright by :*\nwww.beratidealku.com';

    const pesan = t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8 + t9 + t9a + t10 + t11 + t12;

    // PAKAI TOKEN & URL SAMA PERSIS dengan code-dbDaftarBeratideal.gs yang WORKING
    // const TokenFonnte = "NPUQeEn4zATP628wK7au";
    const url = "https://api.fonnte.com/send";

    const options_sponsor = {
      method: "post",
      headers: { "Authorization": TokenFonnte },
      payload: { target: hpSponsor, message: pesan }
    };

    const options_admin1 = {
      method: "post",
      headers: { "Authorization": TokenFonnte },
      payload: { target: "8114499640", message: pesan }
    };

    const options_admin2 = {
      method: "post",
      headers: { "Authorization": TokenFonnte },
      payload: { target: "81241318600", message: pesan }
    };

    Logger.log('📤 WA Sponsor -> ' + hpSponsor + ' | invoice: ' + orderData.noPesanan);
    let success = false;
    try {
      const r1 = UrlFetchApp.fetch(url, options_sponsor);
      Logger.log('📥 Response Sponsor HTTP ' + r1.getResponseCode() + ': ' + r1.getContentText().substring(0, 200));
      success = (r1.getResponseCode() >= 200 && r1.getResponseCode() < 300);
    } catch (e) {
      Logger.log('❌ WA Sponsor fetch error: ' + e.message);
      success = false;
    }

    // Kirim CC ke Admin (jangan sampai mengganggu status sukses sponsor)
    try { UrlFetchApp.fetch(url, options_admin1); } catch (e) { Logger.log('⚠️ CC Admin1 WA gagal: ' + e.message); }
    //try { UrlFetchApp.fetch(url, options_admin2); } catch (e) { Logger.log('⚠️ CC Admin2 WA gagal: ' + e.message); }

    if (success) {
      Logger.log('✅ WA Sponsor BERHASIL terkirim');
    } else {
      Logger.log('❌ WA Sponsor GAGAL terkirim');
    }
    return success;

  } catch (err) {
    Logger.log('❌ WA Sponsor ERROR: ' + err.message + '\n' + err.stack);
    return false;
  }
}

/***********************************************************
* Fungsi: kirimEmailPesananProdukKonsumen_
* Kirim Email ke Konsumen tentang "Pesanan Produk"
* Isi: Ringkasan pesanan + Link Tanda Terima (ttLink)
* Mengembalikan TRUE jika sukses
************************************************************/
function kirimEmailPesananProdukKonsumen_(orderData, pdfLink, ttLink) {
  try {
    const email = String(orderData.emailKonsumen || orderData.mConsumerEmail || '').trim();
    if (!email) {
      Logger.log('❌ Email Konsumen: Kosong, skip');
      return false;
    }

    const namaKonsumen = orderData.namaKonsumen || orderData.mConsumerName || '';
    const namaSponsor  = orderData.namaSponsor  || orderData.mDistributorName || '';
    const hpSponsor    = orderData.hpSponsor    || orderData.mDistributorPhone || '-';
    const noPesanan    = orderData.noPesanan || '';
    const grandTotal   = formatCurrency(orderData.grandTotal || orderData.mTotalPrice || 0);

    const dateObj = new Date();
    const mBulan  = dateObj.getMonth() + 1;
    const mTgl    = dateObj.getDate() + "-" + mBulan + "-" + dateObj.getFullYear();

    const subject = `Konfirmasi Pembayaran Produk - ${noPesanan}`;

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #041e55;">Konfirmasi Pembayaran Produk - Beratidealku</h2>
        <p style="color: #495057;"><strong>Tanggal:</strong> ${mTgl}</p>
        <hr>
        <p>Halo Kak <strong>${namaKonsumen}</strong>,</p>
        <p>Terima kasih telah melakukan konfirmasi pembayaran untuk pesanan produk:</p>
        <table style="width: 100%; margin: 15px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; width: 40%;"><strong>No. Pesanan</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${noPesanan}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa;"><strong>Total Bayar</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6; color: #041e55; font-weight: bold;">Rp. ${grandTotal}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          <strong>Silahkan isi form Tanda Terima Produk di link berikut setelah barang diterima:</strong><br>
          <a href="${ttLink}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #041e55; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-box"></i> Isi Form Tanda Terima Produk
          </a>
        </p>
        <p style="margin-top: 10px; font-size: 14px; color: #6c757d;">
          Atau salin link ini: <a href="${ttLink}" target="_blank" rel="noopener noreferrer">${ttLink}</a>
        </p>
        <p>
          <strong>Download Invoice:</strong><br>
          <a href="${pdfLink}" target="_blank" rel="noopener noreferrer">${pdfLink}</a>
        </p>
        <p>Simpan link diatas sebagai bukti. Admin & Sponsor segera memproses pengiriman produk Anda.</p>
        <hr>
        <p><strong>Kontak Sponsor:</strong><br>
          ${namaSponsor}<br>
          HP: ${hpSponsor}
        </p>
        <hr>
        <p style="font-size: 12px; color: #6c757d;">
          <strong>Copyright by:</strong> <a href="https://www.beratidealku.com" target="_blank">www.beratidealku.com</a><br>
          <strong>Disclaimer:</strong> Hasil yang dicapai setiap individu berbeda-beda
        </p>
      </div>
    `;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: body
    });

    Logger.log('✅ Email Konsumen BERHASIL terkirim ke: ' + email);
    return true;

  } catch (err) {
    Logger.log('❌ Email Konsumen ERROR: ' + err.message + '\n' + err.stack);
    return false;
  }
}

/***********************************************************
* Fungsi: kirimEmailPesananProdukSponsor_
* Kirim Email ke Sponsor tentang "Pesanan Konsumen"
* Isi: Notifikasi pesanan baru + Link Invoice (pdfLink) + Link Bukti Bayar (buktiLink)
* Mengembalikan TRUE jika sukses
************************************************************/
function kirimEmailPesananProdukSponsor_(orderData, pdfLink, buktiLink, emailSponsor) {
  try {
    const email = String(emailSponsor || '').trim();
    if (!email) {
      Logger.log('❌ Email Sponsor: Kosong, skip');
      return false;
    }

    const namaKonsumen = orderData.namaKonsumen || orderData.mConsumerName || '';
    const hpKonsumen   = orderData.hpKonsumen   || orderData.mConsumerPhone || '-';
    const namaSponsor  = orderData.namaSponsor  || orderData.mDistributorName || '';
    const noPesanan    = orderData.noPesanan || '';
    const grandTotal   = formatCurrency(orderData.grandTotal || orderData.mTotalPrice || 0);

    const dateObj = new Date();
    const mBulan  = dateObj.getMonth() + 1;
    const mTgl    = dateObj.getDate() + "-" + mBulan + "-" + dateObj.getFullYear();

    const subject = `Pesanan Konsumen Baru - ${noPesanan}`;

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #041e55;">Notifikasi Pesanan Konsumen - Beratidealku</h2>
        <p style="color: #495057;"><strong>Tanggal:</strong> ${mTgl}</p>
        <hr>
        <p>Halo Kak <strong>${namaSponsor}</strong>,</p>
        <p>Ada pesanan baru dari konsumen Anda:</p>
        <table style="width: 100%; margin: 15px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; width: 40%;"><strong>Nama Konsumen</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${namaKonsumen}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa;"><strong>No. Pesanan</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${noPesanan}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa;"><strong>HP Konsumen</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${hpKonsumen}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa;"><strong>Total Bayar</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6; color: #041e55; font-weight: bold;">Rp. ${grandTotal}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          <strong>Bukti Transfer Konsumen:</strong><br>
          <a href="${buktiLink}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-image"></i> Lihat Bukti Transfer
          </a>
        </p>
        <p style="margin-top: 10px; font-size: 14px; color: #6c757d;">
          Atau salin link: <a href="${buktiLink}" target="_blank" rel="noopener noreferrer">${buktiLink}</a>
        </p>
        <p>
          <strong>Download Invoice:</strong><br>
          <a href="${pdfLink}" target="_blank" rel="noopener noreferrer">${pdfLink}</a>
        </p>
        <p>Silakan segera proses dan koordinasi pengiriman produk dengan konsumen yang bersangkutan. Terima kasih.</p>
        <hr>
        <p style="font-size: 12px; color: #6c757d;">
          <strong>Copyright by:</strong> <a href="https://www.beratidealku.com" target="_blank">www.beratidealku.com</a>
        </p>
      </div>
    `;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: body
    });

    Logger.log('✅ Email Sponsor BERHASIL terkirim ke: ' + email);
    return true;

  } catch (err) {
    Logger.log('❌ Email Sponsor ERROR: ' + err.message + '\n' + err.stack);
    return false;
  }
}

/***********************************************************
* Fungsi: handleKonfirmasiBayarProduk
* Handler utama action=konfirmasiBayarProduk dari frmKonfirmasi.html
* Alur:
*  1. Ambil data pesanan lama dari sheet
*  2. Upload bukti transfer ke Drive
*  3. Generate PDF invoice → dapat URL
*  4. Generate link frmTT.html (tanda terima)
*  5. Update kolom AA-AK di sheet DataPesanan
*  6. Kirim WA ke Konsumen (invoice + tanda terima)
*  7. Kirim WA ke Sponsor (invoice + bukti bayar)
*  8. Kirim Email ke Konsumen (link tanda terima)
*  9. Kirim Email ke Sponsor (link bukti bayar)
* 10. Beri response sukses ke frontend
************************************************************/
function handleKonfirmasiBayarProduk(data) {
  try {
    Logger.log('=== handleKonfirmasiBayarProduk START ===');
    Logger.log('No. Pesanan: ' + data.noPesanan);

    const noPesanan = String(data.noPesanan || '').trim();
    if (!noPesanan) throw new Error('No. Pesanan tidak boleh kosong');

    // 1. Ambil data pesanan dari sheet (untuk mendapatkan items detail, dll)
    const pesananFromSheet = getDataPesananByInvoice(noPesanan);
    const itemsSheet = (pesananFromSheet && pesananFromSheet.items) ? pesananFromSheet.items : [];

    // Parse items dari frontend (jika ada)
    let itemsFrontend = [];
    try {
      if (data.items) {
        itemsFrontend = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
      }
    } catch (e) { itemsFrontend = []; }

    const items = (itemsSheet && itemsSheet.length) ? itemsSheet : itemsFrontend;

    // Build orderData lengkap untuk generate PDF
    const safeNum = (v) => Number(v) || 0;
    const orderDataForPdf = {
      mDate: data.tanggal || pesananFromSheet.mDate || Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy"),
      mInvoice: noPesanan,
      mDistributorName: data.namaSponsor || pesananFromSheet.mDistributorName || '',
      mDistributorPhone: data.hpSponsor || pesananFromSheet.mDistributorPhone || '',
      mConsumerName: data.namaKonsumen || pesananFromSheet.mConsumerName || '',
      mConsumerPhone: data.hpKonsumen || pesananFromSheet.mConsumerPhone || '',
      mConsumerEmail: data.emailKonsumen || pesananFromSheet.mConsumerEmail || '',
      mAlamat: data.alamat || pesananFromSheet.mAlamat || '',
      mKelurahan: data.kelurahan || pesananFromSheet.mKelurahan || '',
      mKecamatan: data.kecamatan || pesananFromSheet.mKecamatan || '',
      mKota: data.kota || pesananFromSheet.mKota || '',
      mPropensi: data.propensi || pesananFromSheet.mPropensi || '',
      mByKirim: safeNum(data.byKirim || pesananFromSheet.mByKirim),
      mPajak: safeNum(data.pajak || pesananFromSheet.mPajak),
      mTotalPrice: safeNum(data.grandTotal || pesananFromSheet.mTotalPrice),
      mVoucher: safeNum(data.voucher || pesananFromSheet.mVoucher),
      mDiskonValue: safeNum(data.diskon || 0),
      mItems: items.map((it, idx) => ({
        mNoItem: idx + 1,
        mNoStok: it.noStok || it.mNoStok || '',
        mKategori: it.kategori || it.mKategori || '',
        mNamaProduk: it.nama || it.mNamaProduk || '',
        mVp: safeNum(it.vp || it.mVp),
        mHargaEceran: safeNum(it.hargaEceran || it.mHargaEceran),
        mSetelahDiskon: safeNum((it.hargaEceran || it.mHargaEceran || 0)) - safeNum((it.diskon || 0) / safeNum(it.qty || 1)),
        mJumlah: safeNum(it.qty || it.mJumlah),
        mVoucher: safeNum(it.voucher || 0),
        mTotVP: safeNum(it.totVP || it.mTotVP),
        mHarga: safeNum(it.harga || it.mHarga)
      }))
    };

    // 2. Upload bukti transfer ke Drive
    const buktiLink = uploadBuktiTransferToDrive_(data.buktiTransferBase64, noPesanan);
    Logger.log('Link bukti transfer: ' + buktiLink);

    // 3. Generate PDF invoice
    const pdfLink = generatePdfInvoiceProduk_(orderDataForPdf);
    Logger.log('Link PDF: ' + pdfLink);

    // 4. Generate link tanda terima produk frmTT.html
    //    Diisi BASE_URL lengkap dengan domain publik hosting (tanpa trailing slash)
    //    Contoh: 'https://beratidealku.com' atau 'https://amihaji.github.io/beratideal'
    //    NOTE: Google Apps Script TIDAK memiliki URLSearchParams (API browser saja).
    //          Build query string MANUAL dengan encodeURIComponent.
    const BASE_URL = 'https://amihaji.github.io/beratideal';
    function _enc(s) { return encodeURIComponent(String(s == null ? '' : s)); }
    let ttQs  = 'noPesanan='    + _enc(noPesanan);
    ttQs     += '&namaKonsumen=' + _enc(orderDataForPdf.mConsumerName || '');
    ttQs     += '&hpKonsumen='   + _enc(orderDataForPdf.mConsumerPhone || '');
    ttQs     += '&namaSponsor='  + _enc(orderDataForPdf.mDistributorName || '');
    ttQs     += '&hpSponsor='    + _enc(orderDataForPdf.mDistributorPhone || '');
    ttQs     += '&alamat='       + _enc(orderDataForPdf.mAlamat || '');
    ttQs     += '&kelurahan='    + _enc(orderDataForPdf.mKelurahan || '');
    ttQs     += '&kecamatan='    + _enc(orderDataForPdf.mKecamatan || '');
    ttQs     += '&kota='         + _enc(orderDataForPdf.mKota || '');
    ttQs     += '&propensi='     + _enc(orderDataForPdf.mPropensi || '');
    try {
      if (Array.isArray(orderDataForPdf.mItems) && orderDataForPdf.mItems.length) {
        const itemsStr = JSON.stringify(orderDataForPdf.mItems.map(function(it) {
          var namaItem = String(it.mNamaProduk || it.mNama || it.nama || '').trim();
          // fallback: nama field lain kadang beda
          if (!namaItem && typeof it === 'object') {
            namaItem = String(it.mNamaPkt || it.mNamaPaket || it.mNamaProdukLengkap || it.namaProduk || it.namaPaket || '').trim();
          }
          return {
            nama: namaItem,
            qty: it.mJumlah || it.qty || it.mJml || it.jumlah || 0,
            kategori: String(it.mKategori || it.kategori || it.mKategoriPesanan || it.kategoriPesanan || '').trim()
          };
        }));
        ttQs += '&items=' + _enc(Utilities.base64Encode(itemsStr, Utilities.Charset.UTF_8));
      }
    } catch (eItems) { Logger.log('⚠️ items encode skip: ' + eItems.message); }
    const ttLink = BASE_URL + '/frmTT.html?' + ttQs;
    Logger.log('Link Tanda Terima: ' + ttLink);

    // 5. Update kolom AA-AK di sheet DataPesanan
    // PENTING: Simpan ke sheet DULU, sebelum kirim notifikasi.
    //          Meskipun WA/Email gagal, DATA PEMBAYARAN TETAP TERSIMPAN.
    const nominalTransfer = safeNum(data.grandTotal || orderDataForPdf.mTotalPrice);
    const tglBayar = Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy HH:mm:ss");

    const pembayaran = {
      linkPdf: pdfLink,
      metodeBayar: String(data.metodeBayar || 'Transfer'),
      namaBank: String(data.namaBank || ''),
      namaPenerima: String(data.namaPenerima || ''),
      acPenerima: String(data.acPenerima || ''),
      nominalTransfer: nominalTransfer,
      statusWA: 'PENDING',
      statusEmail: 'PENDING',
      tglBayar: tglBayar,
      linkBukti: buktiLink,
      statusBayar: 'OK'
    };
    updateDataPesananKolomBayar_(noPesanan, pembayaran);
    Logger.log('✅ Data konfirmasi bayar TERSIMPAN di sheet: ' + noPesanan);

    // 6 & 7. Kirim WA ke Konsumen dan Sponsor
    // BUNGKUS dengan try/catch terpisah: JANGAN SAMPAI WA GAGAL => crash handler
    let waKonsumenOK = false, waSponsorOK = false;
    try {
      waKonsumenOK = kirimWAPesananProdukKonsumen_({
        noPesanan: noPesanan,
        namaKonsumen: orderDataForPdf.mConsumerName,
        hpKonsumen: orderDataForPdf.mConsumerPhone,
        emailKonsumen: orderDataForPdf.mConsumerEmail,
        namaSponsor: orderDataForPdf.mDistributorName,
        hpSponsor: orderDataForPdf.mDistributorPhone,
        grandTotal: orderDataForPdf.mTotalPrice
      }, pdfLink, ttLink);
    } catch (eWA1) { Logger.log('❌ WA Konsumen exc: ' + eWA1.message); waKonsumenOK = false; }
    try {
      waSponsorOK = kirimWAPesananProdukSponsor_({
        noPesanan: noPesanan,
        namaKonsumen: orderDataForPdf.mConsumerName,
        hpKonsumen: orderDataForPdf.mConsumerPhone,
        namaSponsor: orderDataForPdf.mDistributorName,
        hpSponsor: orderDataForPdf.mDistributorPhone,
        grandTotal: orderDataForPdf.mTotalPrice
      }, pdfLink, buktiLink);
    } catch (eWA2) { Logger.log('❌ WA Sponsor exc: ' + eWA2.message); waSponsorOK = false; }

    const statusWA = (waKonsumenOK && waSponsorOK) ? 'OK' : (waKonsumenOK ? 'OK-KONS' : (waSponsorOK ? 'OK-SPON' : 'GAGAL'));

    // 8 & 9. Kirim Email ke Konsumen dan Sponsor
    // BUNGKUS dengan try/catch terpisah: JANGAN SAMPAI EMAIL GAGAL => crash handler
    const namaSponsorForEmail = String(orderDataForPdf.mDistributorName || '').trim();
    let emailSponsor = '';
    try {
      if (namaSponsorForEmail) {
        // Prioritas 1: Cari di TabelUser (DB_USER) - Kolom B Nama, Kolom C Email
        try {
          // const DB_USER = '1oNOSh0L9HkXDpEXGMAZOVRMw7crMGWbuOKUu7f4sSqY';
          const ssUser = SpreadsheetApp.openById(DB_USER);
          const shTU = ssUser.getSheetByName('TabelUser');
          if (shTU) {
            const tuData = shTU.getDataRange().getValues();
            for (let i = 1; i < tuData.length; i++) {
              const namaRow = String(tuData[i][1] || '').trim();
              if (namaRow.toLowerCase() === namaSponsorForEmail.toLowerCase()) {
                emailSponsor = String(tuData[i][2] || '').trim();
                if (emailSponsor) break;
              }
            }
          }
        } catch (eTU) { Logger.log('⚠️ lookup TabelUser skip: ' + eTU.message); }
        // Prioritas 2: Cari di DATAKONSUMEN (DB_PROGRAM) - Kolom E Nama, Kolom H Email
        if (!emailSponsor) {
          try {
            // const DB_PROGRAM = '12PzCrNdv_0Xxa4a8RBBv4d005hXmYFY5DjqxGl3QbE8';
            const ssProgram = SpreadsheetApp.openById(DB_PROGRAM);
            const shDK = ssProgram.getSheetByName('DATAKONSUMEN');
            if (shDK) {
              const dkData = shDK.getDataRange().getValues();
              for (let i = 1; i < dkData.length; i++) {
                const namaRow = String(dkData[i][4] || '').trim();
                if (namaRow.toLowerCase() === namaSponsorForEmail.toLowerCase()) {
                  emailSponsor = String(dkData[i][7] || '').trim();
                  if (emailSponsor) break;
                }
              }
            }
          } catch (eDK) { Logger.log('⚠️ lookup DATAKONSUMEN skip: ' + eDK.message); }
        }
      }
    } catch (eLookup) {
      Logger.log('⚠️ Lookup email sponsor gagal: ' + eLookup.message);
    }
    if (!emailSponsor && pesananFromSheet && pesananFromSheet.mDistributorEmail) {
      emailSponsor = String(pesananFromSheet.mDistributorEmail || '').trim();
    }

    let emailKonsumenOK = false, emailSponsorOK = false;
    try {
      emailKonsumenOK = kirimEmailPesananProdukKonsumen_({
        noPesanan: noPesanan,
        namaKonsumen: orderDataForPdf.mConsumerName,
        hpKonsumen: orderDataForPdf.mConsumerPhone,
        emailKonsumen: orderDataForPdf.mConsumerEmail,
        namaSponsor: orderDataForPdf.mDistributorName,
        hpSponsor: orderDataForPdf.mDistributorPhone,
        grandTotal: orderDataForPdf.mTotalPrice
      }, pdfLink, ttLink);
    } catch (eEM1) { Logger.log('❌ Email Konsumen exc: ' + eEM1.message); emailKonsumenOK = false; }
    try {
      emailSponsorOK = kirimEmailPesananProdukSponsor_({
        noPesanan: noPesanan,
        namaKonsumen: orderDataForPdf.mConsumerName,
        hpKonsumen: orderDataForPdf.mConsumerPhone,
        namaSponsor: orderDataForPdf.mDistributorName,
        hpSponsor: orderDataForPdf.mDistributorPhone,
        grandTotal: orderDataForPdf.mTotalPrice
      }, pdfLink, buktiLink, emailSponsor);
    } catch (eEM2) { Logger.log('❌ Email Sponsor exc: ' + eEM2.message); emailSponsorOK = false; }

    const statusEmail = (emailKonsumenOK && emailSponsorOK) ? 'OK' : (emailKonsumenOK ? 'OK-KONS' : (emailSponsorOK ? 'OK-SPON' : 'GAGAL'));

    // UPDATE kembali kolom status WA & Email setelah notifikasi selesai
    try {
      const pembayaranUpdate = {
        linkPdf: pdfLink,
        metodeBayar: String(data.metodeBayar || 'Transfer'),
        namaBank: String(data.namaBank || ''),
        namaPenerima: String(data.namaPenerima || ''),
        acPenerima: String(data.acPenerima || ''),
        nominalTransfer: nominalTransfer,
        statusWA: statusWA,
        statusEmail: statusEmail,
        tglBayar: tglBayar,
        linkBukti: buktiLink,
        statusBayar: 'OK'
      };
      updateDataPesananKolomBayar_(noPesanan, pembayaranUpdate);
    } catch (eUpd) { Logger.log('⚠️ Update status notifikasi gagal (data sudah tersimpan): ' + eUpd.message); }

    Logger.log('=== handleKonfirmasiBayarProduk SELESAI ===');

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: 'Konfirmasi pembayaran berhasil. Notifikasi WA ' + statusWA + ', Email ' + statusEmail + '.',
        noPesanan: noPesanan,
        pdfLink: pdfLink,
        buktiLink: buktiLink,
        ttLink: ttLink,
        statusWA: statusWA,
        statusEmail: statusEmail
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('handleKonfirmasiBayarProduk ERROR: ' + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: 'Gagal memproses konfirmasi: ' + err.message
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
