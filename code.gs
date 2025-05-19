function doPost(e) {
  // Ganti ID Spreadsheet dan nama sheet sesuai kebutuhan Anda
  var ss    = SpreadsheetApp.openById('1vlt6JrwE4hINO0YeKwnSnQv4gR2X4D45N_v-Zl8gQKU');
  var sheet = ss.getSheetByName('PENDAFTAR');
  var data  = {};

  // Parsing multipart form data (FormData)
  if (e.postData && e.postData.type && e.postData.type.indexOf("multipart") > -1) {
    var formData = Utilities.parseMultipart(e.postData.contents, e.postData.type);

    // Ambil semua field selain file
    for (var key in formData) {
      if (formData[key] && typeof formData[key].getBytes !== "function") {
        data[key] = formData[key];
      }
    }
    }

  // Simpan data ke Google Sheets
  sheet.appendRow([
    new Date(),                  // Tanggal submit
    data.no_pesanan,             // No Pesanan
    data.nama,                   // Nama
    data.tgl_lahir,              // Tgl Lahir
    data.jenis_kelamin,          // Jenis Kelamin
    data.email,                  // Email
    data.tlp,                    // Tlp
    data.alamat,                 // Alamat
    data.kecamatan,              // Kecamatan
    data.kelurahan,              // Kelurahan
    data.kota,                   // Kota
    data.propinsi,               // Propinsi
    data.program,                // Program
    data.harga_program,          // Harga Program
    data.ongkir,                 // Ekspedisi
    data.by_kirim,               // By Kirim
    data.total_biaya,            // Total Biaya
    data.bank_asal,              // Bank Asal
    data.norek_asal,             // No Rekening Asal
    data.bank_tujuan,            // Bank Tujuan
    data.norek_tujuan,           // No Rekening Tujuan
    data.tgl_transfer,           // Tgl Transfer
    data.transfer_dana,          // Transfer Dana
   
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({status: 'success', link_file_upload: fileUrl}))
    .setMimeType(ContentService.MimeType.JSON);
}