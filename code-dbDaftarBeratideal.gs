/*******************************************************
/*               DEKLARASI GLOBAL                      *
/*******************************************************/
const DB_DAFTAR         = '1Kqi2rnXgNByYEKW3eT5rivnH4KfuL-94C-ep15_BFHg';
const ss                = SpreadsheetApp.openById(DB_DAFTAR);
const shDaftar          = ss.getSheetByName('DAFTAR');
const PUBLIC_BASE_URL   = 'https://amihaji.github.io/beratideal';

const DB_PROGRAM        = '12PzCrNdv_0Xxa4a8RBBv4d005hXmYFY5DjqxGl3QbE8';
const ssProgram         = SpreadsheetApp.openById(DB_PROGRAM);
const shDataKonsumen    = ssProgram.getSheetByName('DATAKONSUMEN');

const folderDATASTRUK   = DriveApp.getFolderById("1qyF_aBaLkKBxxT8PWnofAX3UGc50ztef");
const folderTANDATERIMA = DriveApp.getFolderById("1B2HIfleUBug0utiyE04LwW5MeWw0ap5X");

/****************************************
/* Fungsi untuk mengambil data di sheet *
/****************************************/
function doGet(e) {
  const sheet = shDaftar;
 
  // Jika ada parameter noPesanan → ambil data pendaftar
  if (e && e.parameter && e.parameter.noPesanan) {
    const noPesanan = e.parameter.noPesanan;
    const data      = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === noPesanan) { // kolom B = noPesanan
        return ContentService.createTextOutput(JSON.stringify({
          tanggal:      data[i][0],
          noPesanan:    data[i][1],
          program:      data[i][2],
          harga:        data[i][3],
          nama:         data[i][4],
          alamat:       data[i][5],
          telp:         data[i][6],
          email:        data[i][7],
          kelurahan:    data[i][8],
          kecamatan:    data[i][9],
          kota:         data[i][10],
          propinsi:     data[i][11],
          pembayaran:   data[i][12],
          namaPenerima: data[i][13],
          acPenerima:   data[i][14],
          nominal:      data[i][15]
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // kalau noPesanan tidak ketemu
    return ContentService.createTextOutput(JSON.stringify({ error: "NoPesanan tidak ditemukan" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // fallback jika tidak ada parameter noPesanan
  return ContentService.createTextOutput("OK");
}

/*****************************************************
/* Fungsi untuk simpan data baru di sheet dan update *
/*****************************************************/
function doPost(e) {
  const sheet = shDaftar;
  
  // ****************************************************
  //  1. HANDLE FORM TANDA TERIMA (Upload bukti produk) 
  // ****************************************************
  if (e.parameter.noPesanan && e.parameter.fileProduk && e.parameter.action === "tandaTerima") {
    Logger.log("TANDA TERIMA DITERIMA: " + JSON.stringify(e.parameter));
    
    const noPesanan = e.parameter.noPesanan;
    const fileData  = e.parameter.fileProduk;
    
    // Upload file ke Drive (gunakan folder TANDATERIMA)
    const folder   = folderTANDATERIMA; 
    const blob     = Utilities.newBlob(Utilities.base64Decode(fileData), "image/jpeg", "produk_" + noPesanan + ".jpg");
    const file     = folder.createFile(blob);
    const fileLink = file.getUrl();
    
    // Update spreadsheet - Kolom V, W, X
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === noPesanan) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      const now = new Date();
      sheet.getRange(rowIndex, 22).setValue(now);      // Kolom V - Tgl Terima
      sheet.getRange(rowIndex, 23).setValue(fileLink); // Kolom W - Link Bukti Produk
      sheet.getRange(rowIndex, 24).setValue("OK");     // Kolom X - Status Terima
      
      kirimKonfirmasiTandaTerima(noPesanan, now, fileLink);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        fileLink: fileLink,
        message: "Tanda terima berhasil dikonfirmasi"
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: "NoPesanan tidak ditemukan: " + noPesanan 
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // **********************************************
  //  2. HANDLE FORM BAYAR (Upload bukti transfer) 
  // **********************************************
  if (e.parameter.noPesanan && e.parameter.file) {
    Logger.log("BUKTI TRANSFER DITERIMA: " + JSON.stringify(e.parameter));
    
    const noPesanan = e.parameter.noPesanan;
    const fileData  = e.parameter.file;
    
    // Upload file ke Drive (gunakan folder DATASTRUK)
    const folder   = folderDATASTRUK;
    const blob     = Utilities.newBlob(Utilities.base64Decode(fileData), "image/jpeg", "bukti_" + noPesanan + ".jpg");
    const file     = folder.createFile(blob);
    const fileLink = file.getUrl();
    
    // Update spreadsheet - Kolom S, T, U
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === noPesanan) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      const now = new Date();
      sheet.getRange(rowIndex, 19).setValue(now);      // Kolom S - Tgl Bayar
      sheet.getRange(rowIndex, 20).setValue(fileLink); // Kolom T - Link Bukti Transfer
      sheet.getRange(rowIndex, 21).setValue("OK");     // Kolom U - Status Bayar
      
      kirimKonfirmasiAdmin(noPesanan, now, fileLink);
      const tandaTerimaLink = getLinkFormTandaTerima(noPesanan);
      let notifPesertaStatus = "OK";
      let notifPesertaMessage = "Link tanda terima berhasil dikirim ke WA peserta";
      
      try {
        kirimLinkTandaTerimaKePeserta(noPesanan);
      } catch (error) {
        notifPesertaStatus = "NOT";
        notifPesertaMessage = "Pembayaran berhasil dikonfirmasi, tetapi link tanda terima gagal dikirim ke WA peserta";
        Logger.log("Gagal kirim link tanda terima ke peserta: " + error.message);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        fileLink: fileLink,
        tandaTerimaLink: tandaTerimaLink,
        notifPesertaStatus: notifPesertaStatus,
        message: notifPesertaMessage
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: "NoPesanan tidak ditemukan: " + noPesanan 
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // *******************************************
  //  3. HANDLE FORM DAFTAR (Pendaftaran baru) 
  // *******************************************
  // Jika tidak ada file dan tidak ada action → ini request dari formDaftar
  const data = e.parameter;
  const row = [
    new Date(),
    data.noPesanan,
    data.program,
    Number(data.harga),
    data.nama,
    data.alamat,
    data.telp,
    data.email,
    data.kelurahan,
    data.kecamatan,
    data.kota,
    data.propinsi,
    data.pembayaran,
    data.namaPenerima,
    data.acPenerima,
    Number(data.nominal),
    'PENDING',         // Kolom Q - Status WA
    'PENDING',         // Kolom R - Status Email
    'PENDING',         // Kolom S - Tgl Bayar
    'PENDING',         // Kolom T - Link Bukti Transfer
    'PENDING',         // Kolom U - Status Bayar
    'PENDING',         // Kolom V - Tgl Terima
    'PENDING',         // Kolom W - Link Bukti Produk
    'PENDING',         // Kolom X - Status Terima
    data.mSponsor,     // Kolom y - Nama Sponsor "Hesty Husain"
    data.mHpSponsor    // Kolom z - tlp Sponsor  "81241318600" 
  ];
  // Simpan Data Baru di Sheet Daftar
  sheet.appendRow(row);

  // Simpan Data Baru di Sheet DataKonsumen
   const dtKonsumen = shDataKonsumen;
   const brs = [
    new Date(),
    data.noPesanan,
    data.program,
    Number(data.harga),
    data.nama,
    data.alamat,
    data.telp,
    data.email,
    data.kelurahan,
    data.kecamatan,
    data.kota,
    data.propinsi,
    '-',             // Kolom M - User ID
    '-',             // Kolom N - Jenis Kelamin
    '-',             // Kolom O - Tgl Lahir
    '-',             // Kolom P - Testimoni
    '-',             // Kolom Q - Feedback
    '-',             // Kolom R - Download Sertifikat
    '-',             // Kolom S - Produk
    data.mSponsor,   // Kolom T - Nama Sponsor	"Hesty Husain"
    data.mHpSponsor, // Kolom U - HP Sponsor	  "81241318600" 
    '-',             // Kolom V - Level Sponsor	
    '-',             // Kolom W - Email Sponsor	
    '-',             // Kolom X - Nama Coach
    '-'              // Kolom Y - WA Coach
  ];
  dtKonsumen.appendRow(brs); 

  try {
    // Kirim pesan WA pendaftaran
    kirimWA(data.noPesanan);
    sheet.getRange(sheet.getLastRow(), 17).setValue("OK");
  } catch (error) {
    sheet.getRange(sheet.getLastRow(), 17).setValue("NOT");
  }

  try {
    // Kirim email pendaftaran
    kirimEmail(data.noPesanan);
    sheet.getRange(sheet.getLastRow(), 18).setValue("OK");
  } catch (error) {
    sheet.getRange(sheet.getLastRow(), 18).setValue("NOT");
  }

  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

/**********************************************************************
/* Fungsi untuk kirim konfirmasi pembayaran ke Admin via WA dan Email *
/**********************************************************************/
function kirimKonfirmasiAdmin(noPesanan, tglBayar, fileLink) {
  const sheet = shDaftar;
  const data  = sheet.getDataRange().getValues();
  let row = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === noPesanan) {
      row = data[i];
      break;
    }
  }
  if (!row) return;

  // Kirim WA Konfirmasi Pembayaran ke Admin
  const nama    = row[4];
  const pesanWA = 
    `*KONFIRMASI PEMBAYARAN*` +
    `\n-----------------------------------------------` +
    `\nNo Pesanan : ${noPesanan}` +
    `\nNama : ${nama}` +
    `\nTgl Bayar : ${Utilities.formatDate(tglBayar, Session.getScriptTimeZone(), "dd/MM/yyyy")}` +
    `\n\nBukti Struk : ${fileLink}` +
    `\n\n---------------------------------` +
    `\nMohon segera dicek !`;  
                                        
  // Kirim WA via Fonnte
  const TokenFonnte = "NPUQeEn4zATP628wK7au";         // 6281149908600 Admin Send 
  const url         = "https://api.fonnte.com/send";

  const options_admin1 = {
    method: "post",
    headers: { "Authorization": TokenFonnte },
    payload: { target: "8114499640", message: pesanWA }
  };

  const options_admin2 = {
    method: "post",
    headers: { "Authorization": TokenFonnte },
    payload: { target: "81241318600", message: pesanWA }
  };

  UrlFetchApp.fetch(url, options_admin1);
  //UrlFetchApp.fetch(url, options_admin2);

  // Kirim eMail Konfirmasi Pembayaran ke Admin
  const pesanEmail     = `Konfirmasi Pembayaran - ${nama}`;
  const body = `
    <p><strong>KONFIRMASI PEMBAYARAN</strong>
    <br>------------------------------------------
    <br>No Pesanan : ${noPesanan}
    <br>Nama : ${nama} 
    <br>Tgl Bayar : ${Utilities.formatDate(tglBayar, Session.getScriptTimeZone(), "dd/MM/yyyy")}
    <p><a href="${fileLink}" style="font-weight:bold; color: #0b5ed7;" target="_blank">👉 Klik di sini untuk bukti pembayaran</a>
    <br>Harap Segera di followup</br>
  `;

    MailApp.sendEmail({
    to: "amihaji@gmail.com",            
    subject: pesanEmail,
    htmlBody: body
  });
}

/*************************************
/* Fungsi untuk kirim WA Pendaftaran *
/*************************************/
function kirimWA(noOrder) {
  const sheet = shDaftar;
  const data  = sheet.getDataRange().getValues();

  // Cek No Pesanan
  let baris = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === noOrder) { // kolom B = noPesanan
      baris = i;
      break;
    }
  }

  if (baris === -1) {
    Logger.log("No Pesanan tidak ditemukan: " + noOrder);
    return;
  }

  const row = data[baris];
  // Field yang warna abu-abu tidak terpakai, 
  // Jangan dihapus karna untuk mengetahui letak posisi kolom field yang isinya akan di ambil
  const [
    tglDaftar, noPesanan, program, harga, nama, alamat, telp, email,
    kelurahan, kecamatan, kota, propinsi, pembayaran, namaPenerima, acPenerima, nominal, 
    statusWA, statusEmail, tglBayar, linkBuktiTransfer, statusBayar 
    ] = row;

  const tglDaftarFormatted = (tglDaftar instanceof Date)
    ? Utilities.formatDate(tglDaftar, Session.getScriptTimeZone(), "dd/MM/yyyy")
    : "Tanggal Tidak Diketahui";

  const linkKonfirmasi = getLinkFormKonfirmasiBayar(noPesanan);
  const TokenFonnte    = "NPUQeEn4zATP628wK7au";         // 6281149908600 Admin Send 
  const url            = "https://api.fonnte.com/send";
  const fTlpK          = normalizeWhatsAppNumber(telp);

  const fPesanWA =
    '*KONFIRMASI PENDAFTARAN*' +
    '\n---------------------------------------------' +
    '\nTgl Daftar : ' + tglDaftarFormatted +
    '\n\nTerima kasih,' +
    '\nKak '+ nama +
    '\nTelah mendaftar Kelas Online'+
    '\nFit Challenge www.beratidealku.com' +
    '\n\nSilahkan konfirmasi pembayaran di link ini 👇' +
    `\n${linkKonfirmasi}` +
    '\n\nUntuk info lebih lanjut silahkan menghubungi:' +
    '\nMember Independen' + 
    '\nHesty Husain' + 
    '\nWA: 081241318600' +
    '\nTerima kasih 🙏\n' +
    '\n---------------------------------------------' +
    '\n*Copyright by* : \nwww.beratidealku.com \n' +
    '\n*Map Klub Nutrisi* : \nbit.ly/LokasiKlubKita \n' +
    '\n*Disclaimer* : Hasil yang dicapai setiap individu berbeda-beda';

  const options_konsumen = {
    method: "post",
    headers: { "Authorization": TokenFonnte },
    payload: { target: fTlpK, message: fPesanWA }
  };

  const options_admin1 = {
    method: "post",
    headers: { "Authorization": TokenFonnte },
    payload: { target: "8114499640", message: fPesanWA }
  };

  const options_admin2 = {
    method: "post",
    headers: { "Authorization": TokenFonnte },
    payload: { target: "81241318600", message: fPesanWA }
  };

  UrlFetchApp.fetch(url, options_konsumen);
  UrlFetchApp.fetch(url, options_admin1);
  //UrlFetchApp.fetch(url, options_admin2);
}

/****************************************
/* Fungsi untuk kirim email Pendaftaran *
/****************************************/
function kirimEmail(noOrder) {
  const sheet = shDaftar;
  const data  = sheet.getDataRange().getValues();

  // Cek No Pesanan
  let baris = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === noOrder) { // kolom B = noPesanan
      baris = i;
      break;
    }
  }

  if (baris === -1) {
    Logger.log("No Pesanan tidak ditemukan: " + noOrder);
    return;
  }

  const row = data[baris];
  // Field yang warna abu-abu tidak terpakai, 
  // Jangan dihapus karna untuk mengetahui letak posisi kolom field yang isinya akan di ambil
  const [
    tglDaftar, noPesanan, program, harga, nama, alamat, telp, email,
    kelurahan, kecamatan, kota, propinsi, pembayaran, namaPenerima, acPenerima, nominal,
    statusWA, statusEmail, tglBayar, linkBuktiTransfer, statusBayar 
  ] = row;

  const tglDaftarFormatted = (tglDaftar instanceof Date)
    ? Utilities.formatDate(tglDaftar, Session.getScriptTimeZone(), "dd/MM/yyyy")
    : "Tanggal Tidak Diketahui";

  const linkKonfirmasi = getLinkFormKonfirmasiBayar(noPesanan);
  const subject        = `Konfirmasi Pendaftaran - ${nama}`;
  const body = `
    <p><strong>KONFIRMASI PENDAFTARAN FIT CHALLENGE</strong>
    <p>Tgl Daftar : ${tglDaftarFormatted}
    <br>Terima kasih kak <strong>${nama},</strong>
    <br>Telah mendaftar untuk Akses Kelas Online FIT Challenge www.beratidealku.com</br>
    <p>Silahkan konfirmasi pembayaran di link ini :
       <a href="${linkKonfirmasi}" style="font-weight:bold; color: #0b5ed7;" target="_blank">
       <br>👉 Klik di sini untuk konfirmasi pembayaran</a>
    <br>Untuk info lebih lanjut silahkan menghubungi:
    <br>Member Independen
    <br>Hesty Husain
    <br>WA: 081241318600
    <br>Terima kasih 🙏
    <p>----------------------------------------------------
    <br><strong>Copyright by : <a href="www.beratidealku.com">www.beratidealku.com</a></strong>
    <br><strong>Lokasi Map NC : <a href="bit.ly/LokasiKlubKita">klubKITA</a></strong> 
    <br><strong>Disclaimer :</strong> Hasil yang dicapai setiap individu berbeda-beda</strong>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: body
  });
}

/********************************************
/* Helper untuk link dan nomor WhatsApp     *
/********************************************/
function getLinkFormKonfirmasiBayar(noPesanan) {
  return `${PUBLIC_BASE_URL}/formKonfirmasiBayar.html?noPesanan=${encodeURIComponent(noPesanan)}`;
}

function getLinkFormTandaTerima(noPesanan) {
  return `${PUBLIC_BASE_URL}/formTandaTerima.html?noPesanan=${encodeURIComponent(noPesanan)}`;
}

function normalizeWhatsAppNumber(phone) {
  const rawPhone = String(phone || '').replace(/\D/g, '');
  if (!rawPhone) {
    throw new Error("Nomor WhatsApp peserta tidak tersedia");
  }

  if (rawPhone.startsWith('62')) {
    return rawPhone;
  }

  if (rawPhone.startsWith('0')) {
    return '62' + rawPhone.replace(/^0+/, '');
  }

  return '62' + rawPhone;
}

/*****************************************
/* Untuk upload file ke folder DATASTRUK *
/*****************************************/
function uploadToDrive(fileBlob) {
  const folder = folderDATASTRUK ;
  const file   = folder.createFile(fileBlob);
  return file.getUrl(); // Link file yang diupload
}

/**********************************************************************
/* Fungsi untuk kirim konfirmasi tanda terima ke Admin via WA dan Email *
/**********************************************************************/
function kirimKonfirmasiTandaTerima(noPesanan, tglTerima, fileLink) {
  const sheet = shDaftar;
  const data  = sheet.getDataRange().getValues();
  let row = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === noPesanan) {
      row = data[i];
      break;
    }
  }
  if (!row) return;

  // Kirim WA Konfirmasi Tanda Terima ke Admin
  const nama    = row[4];
  const pesanWA = 
    `*KONFIRMASI TANDA TERIMA PRODUK*` +
    `\n-----------------------------------------------` +
    `\nNo Pesanan : ${noPesanan}` +
    `\nNama : ${nama}` +
    `\nTgl Terima : ${Utilities.formatDate(tglTerima, Session.getScriptTimeZone(), "dd/MM/yyyy")}` +
    `\n\nBukti Produk : ${fileLink}` +
    `\n\n---------------------------------` +
    `\nProduk telah diterima dengan baik!`;  
                                        
  // Kirim WA via Fonnte
  const TokenFonnte = "NPUQeEn4zATP628wK7au";         // 6281149908600 Admin Send 
  const url         = "https://api.fonnte.com/send";

  const options_admin1 = {
    method: "post",
    headers: { "Authorization": TokenFonnte },
    payload: { target: "8114499640", message: pesanWA }
  };

  const options_admin2 = {
    method: "post",
    headers: { "Authorization": TokenFonnte },
    payload: { target: "81241318600", message: pesanWA }
  };

  UrlFetchApp.fetch(url, options_admin1);
  //UrlFetchApp.fetch(url, options_admin2);

  // Kirim eMail Konfirmasi Tanda Terima ke Admin
  const pesanEmail = `Konfirmasi Tanda Terima Produk - ${nama}`;
  const body = `
    <p><strong>KONFIRMASI TANDA TERIMA PRODUK</strong>
    <br>------------------------------------------
    <br>No Pesanan : ${noPesanan}
    <br>Nama : ${nama} 
    <br>Tgl Terima : ${Utilities.formatDate(tglTerima, Session.getScriptTimeZone(), "dd/MM/yyyy")}
    <p><a href="${fileLink}" style="font-weight:bold; color: #0b5ed7;" target="_blank">👉 Klik di sini untuk bukti produk diterima</a>
    <br>Produk telah diterima dengan baik oleh konsumen</br>
  `;

  MailApp.sendEmail({
    to: "amihaji@gmail.com",            
    subject: pesanEmail,
    htmlBody: body
  });
}

/*************************************************************
/* Kirim link form tanda terima otomatis ke WA peserta       *
/*************************************************************/
function kirimLinkTandaTerimaKePeserta(noPesanan) {
  const sheet = shDaftar;
  const data  = sheet.getDataRange().getValues();
  let row = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === noPesanan) {
      row = data[i];
      break;
    }
  }

  if (!row) {
    throw new Error("No Pesanan tidak ditemukan: " + noPesanan);
  }

  const nama            = row[4];
  const telp            = row[6];
  const normalizedPhone = normalizeWhatsAppNumber(telp);
  const linkTandaTerima = getLinkFormTandaTerima(noPesanan);
  const TokenFonnte     = "NPUQeEn4zATP628wK7au";
  const url             = "https://api.fonnte.com/send";

  const pesanWA =
    '*FORM TANDA TERIMA PRODUK*' +
    '\n---------------------------------------------' +
    '\nHalo Kak ' + nama + ',' +
    '\nNo Pesanan : ' + noPesanan +
    '\n\nPembayaran Anda telah kami terima.' +
    '\nJika produk sudah diterima, silakan isi form tanda terima melalui link berikut:' +
    `\n${linkTandaTerima}` +
    '\n\nTerima kasih.' +
    '\n---------------------------------------------' +
    '\nwww.beratidealku.com';

  const options = {
    method: "post",
    headers: { "Authorization": TokenFonnte },
    payload: { target: normalizedPhone, message: pesanWA }
  };

  UrlFetchApp.fetch(url, options);

  return {
    phone: normalizedPhone,
    link: linkTandaTerima
  };
}

