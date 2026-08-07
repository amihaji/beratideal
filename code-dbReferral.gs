/*******************************************************
 * DATABASE REFERRAL
 * Pola SAMA PERSIS seperti Setup / Pendaftaran / FollowUp:
 * - Spreadsheet dibuat SECARA MANUAL oleh user (ID HARUS di-set).
 * - Tidak ada auto-create, tidak ada pencarian by-name via DriveApp
 *   (tidak lambat, tidak bikin file liar di Root Drive).
 *
 * Cara set ID (pilih salah satu):
 *   A) Isi const DB_REFERRAL di baris bawah ini (hardcode,
 *      sama seperti DB_DAFTAR / DB_PROGRAM / DB_USER / DB_WETOOLS).
 *   B) Atau set Script Properties key:
 *        "dbReferral.spreadsheetId" = <ID spreadsheet dbReferral>
 *      (berguna jika satu file Apps Script multi-deploy).
 *******************************************************/
const REFERRAL_SPREADSHEET_NAME = 'dbReferral';
const REFERRAL_SHEET_NAME       = 'REFERRAL';
const REFERRAL_BASE_URL         = 'https://beratidealku.com/?ref=';

// ===== HARDCODE ID DI SINI (POLA STANDAR MODUL LAIN) =====
// Contoh: const DB_REFERRAL = '1abcDEFghiJKLmnoPQRstuVWXyz1234567890abcd';
const DB_REFERRAL = '';

// Script Properties key (opsional, jikalau ID tidak di-hardcode di atas)
const REFERRAL_DB_ID_PROPERTY = 'dbReferral.spreadsheetId';

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || '').trim();
  const callback = params.callback || '';

  if (action === 'saveReferralData') {
    return jsonpResponse_(callback, saveReferralData_(params));
  }

  if (action === 'getReferralData') {
    return jsonpResponse_(callback, getReferralData_(params));
  }

  if (action === 'getReferralSheetInfo') {
    const sheet = getReferralSheet_();
    return jsonpResponse_(callback, buildReferralSheetInfo_(sheet));
  }

  if (action === 'setReferralSpreadsheetId') {
    return jsonpResponse_(callback, setReferralSpreadsheetId_(params));
  }

  return jsonpResponse_(callback, {
    status: 'error',
    message: 'Action tidak valid.'
  });
}

function doPost(e) {
  try {
    const payload = parsePostPayload_(e);
    const action = String((payload && payload.action) || '').trim();

    if (action === 'saveReferralData') {
      return jsonResponse_(saveReferralData_(payload));
    }

    if (action === 'setReferralSpreadsheetId') {
      return jsonResponse_(setReferralSpreadsheetId_(payload));
    }

    return jsonResponse_({
      status: 'error',
      message: 'Action tidak valid.'
    });
  } catch (error) {
    return jsonResponse_({
      status: 'error',
      message: String(error)
    });
  }
}

function saveReferralData_(payload) {
  const sheet = getReferralSheet_();
  const values = sheet.getDataRange().getValues();
  const userId = normalizeText_(payload.userId).toLowerCase();
  const requesterUserId = normalizeText_(payload.requesterUserId).toLowerCase();
  const headers = (values.length > 0) ? values[0] : [];

  // #region debug-point referral-save-fake-success saveReferralData_ init
  var backendDebug = {
    payloadIn: {
      userId: normalizeText_(payload.userId),
      requesterUserId: normalizeText_(payload.requesterUserId),
      nama: normalizeText_(payload.nama),
      jenkel: normalizeText_(payload.jenkel),
      tglLahir: normalizeText_(payload.tglLahir),
      refLink: normalizeText_(payload.refLink),
      propinsi: normalizeText_(payload.propinsi),
      action: normalizeText_(payload.action),
      sourceSheet: normalizeText_(payload.sourceSheet),
      mode: normalizeText_(payload.mode)
    },
    sheetMeta: null,
    valuesRows: values.length,
    headersCount: headers.length,
    headers: headers.slice(0, 32),
    ownerCheck: null,
    targetRow: null,
    isUpdate: null,
    rowLength: null,
    writeMode: null,
    beforeFlush: null,
    afterFlushReadback: null
  };
  // #endregion

  if (!userId) {
    return {
      status: 'error',
      message: 'User ID tidak boleh kosong.',
      _backendDebug: backendDebug
    };
  }

  if (requesterUserId && requesterUserId !== userId) {
    // #region debug-point referral-save-fake-success saveReferralData_ owner fail
    backendDebug.ownerCheck = { requesterUserId: requesterUserId, userId: userId, pass: false };
    // #endregion
    return {
      status: 'error',
      message: 'Aksi simpan Referral hanya boleh dilakukan oleh user pemilik data yang sedang login.',
      _backendDebug: backendDebug
    };
  }
  // #region debug-point referral-save-fake-success saveReferralData_ owner pass
  backendDebug.ownerCheck = { requesterUserId: requesterUserId, userId: userId, pass: true };
  // #endregion

  const now = new Date();
  const slug = createReferralSlug_(payload.refLink || payload.referralSlug || userId);
  const referralUrl = buildReferralUrl_(slug);
  let targetRow = 0;
  let createdAt = now;
  let isUpdate = false;

  for (let i = 1; i < values.length; i++) {
    if (normalizeText_(values[i][2]).toLowerCase() === userId) {
      targetRow = i + 1;
      createdAt = values[i][1] || now;
      isUpdate = true;
      break;
    }
  }

  const row = [
    now,
    createdAt,
    userId,
    normalizeText_(payload.nama),
    normalizeText_(payload.jenkel),
    normalizeDateText_(payload.tglLahir),
    normalizeText_(payload.telp),
    normalizeText_(payload.email),
    normalizeText_(payload.alamat),
    normalizeText_(payload.kelurahan),
    normalizeText_(payload.kecamatan),
    normalizeText_(payload.kota),
    normalizeText_(payload.propinsi),
    normalizeText_(payload.acNama1),
    normalizeText_(payload.namaBank1),
    normalizeText_(payload.acBank1),
    normalizeText_(payload.acNama2),
    normalizeText_(payload.namaBank2),
    normalizeText_(payload.acBank2),
    slug,
    referralUrl,
    normalizeText_(payload.sourceSheet || 'DAFTAR'),
    normalizeText_(payload.mode || 'input'),
    'AKTIF'
  ];

  // #region debug-point referral-save-fake-success saveReferralData_ pre write
  backendDebug.targetRow = targetRow;
  backendDebug.isUpdate = isUpdate;
  backendDebug.rowLength = row.length;
  backendDebug.sheetMeta = buildReferralSheetMeta_(sheet);
  // #endregion

  if (targetRow) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    // #region debug-point referral-save-fake-success saveReferralData_ write update
    backendDebug.writeMode = 'update';
    // #endregion
  } else {
    sheet.appendRow(row);
    targetRow = sheet.getLastRow();
    // #region debug-point referral-save-fake-success saveReferralData_ write append
    backendDebug.writeMode = 'append';
    backendDebug.targetRowAfterAppend = targetRow;
    // #endregion
  }

  SpreadsheetApp.flush();
  const persistedRow = sheet.getRange(targetRow, 1, 1, row.length).getValues()[0];

  // #region debug-point referral-save-fake-success saveReferralData_ post flush
  backendDebug.beforeFlush = {
    userId: row[2],
    nama: row[3],
    jenkel: row[4],
    tglLahir: row[5],
    refLink: row[19]
  };
  backendDebug.afterFlushReadback = {
    targetRow: targetRow,
    userId: normalizeText_(persistedRow[2]),
    nama: normalizeText_(persistedRow[3]),
    jenkel: normalizeText_(persistedRow[4]),
    tglLahir: normalizeText_(persistedRow[5]),
    refLink: normalizeText_(persistedRow[19]),
    rowLength: persistedRow.length
  };
  // #endregion

  return {
    status: 'success',
    message: isUpdate ? 'Data Referral berhasil diperbarui.' : 'Data Referral berhasil disimpan.',
    data: mapReferralRow_(persistedRow, targetRow),
    meta: buildReferralSheetMeta_(sheet),
    _backendDebug: backendDebug
  };
}

function getReferralData_(params) {
  const sheet = getReferralSheet_();
  const values = sheet.getDataRange().getValues();
  const userId = normalizeText_(params.userId).toLowerCase();

  if (!userId) {
    return {
      status: 'error',
      message: 'User ID tidak boleh kosong.'
    };
  }

  for (let i = values.length - 1; i >= 1; i--) {
    if (normalizeText_(values[i][2]).toLowerCase() === userId) {
      return {
        status: 'success',
        data: mapReferralRow_(values[i], i + 1),
        meta: buildReferralSheetMeta_(sheet)
      };
    }
  }

  return {
    status: 'success',
    data: null,
    message: 'Data Referral belum tersedia.',
    meta: buildReferralSheetMeta_(sheet)
  };
}

function mapReferralRow_(row, rowNumber) {
  return {
    recordId: String(rowNumber || ''),
    updatedAt: row[0] || '',
    createdAt: row[1] || '',
    userId: normalizeText_(row[2]),
    nama: normalizeText_(row[3]),
    jenkel: normalizeText_(row[4]),
    tglLahir: normalizeText_(row[5]),
    telp: normalizeText_(row[6]),
    email: normalizeText_(row[7]),
    alamat: normalizeText_(row[8]),
    kelurahan: normalizeText_(row[9]),
    kecamatan: normalizeText_(row[10]),
    kota: normalizeText_(row[11]),
    propinsi: normalizeText_(row[12]),
    acNama1: normalizeText_(row[13]),
    namaBank1: normalizeText_(row[14]),
    acBank1: normalizeText_(row[15]),
    acNama2: normalizeText_(row[16]),
    namaBank2: normalizeText_(row[17]),
    acBank2: normalizeText_(row[18]),
    refLink: normalizeText_(row[19]),
    referralUrl: normalizeText_(row[20]),
    sourceSheet: normalizeText_(row[21]),
    mode: normalizeText_(row[22]),
    status: normalizeText_(row[23])
  };
}

function buildReferralSheetMeta_(sheet) {
  const spreadsheet = sheet.getParent();
  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    sheetName: sheet.getName(),
    sheetId: sheet.getSheetId()
  };
}

function buildReferralSheetInfo_(sheet) {
  const meta = buildReferralSheetMeta_(sheet);
  return {
    status: 'success',
    spreadsheetId: meta.spreadsheetId,
    spreadsheetName: meta.spreadsheetName,
    sheetName: meta.sheetName,
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(meta.spreadsheetId) + '/edit#gid=' + encodeURIComponent(String(sheet.getSheetId())),
    sheetId: sheet.getSheetId(),
    lastRow: sheet.getLastRow(),
    lastColumn: sheet.getLastColumn()
  };
}

function setReferralSpreadsheetId_(payload) {
  const p = payload || {};
  const properties = PropertiesService.getScriptProperties();

  const id = normalizeText_(p.spreadsheetId);
  if (!id) {
    return {
      status: 'error',
      message: 'Parameter spreadsheetId wajib diisi.'
    };
  }

  var spreadsheet = null;
  try {
    spreadsheet = SpreadsheetApp.openById(id);
  } catch (err) {
    return {
      status: 'error',
      message: 'Spreadsheet ID tidak bisa dibuka: ' + String(err && err.message || err)
    };
  }

  var sheet = spreadsheet.getSheetByName(REFERRAL_SHEET_NAME);
  if (!sheet) {
    try {
      sheet = spreadsheet.insertSheet(REFERRAL_SHEET_NAME);
    } catch (err2) {
      return { status: 'error', message: 'Sheet "' + REFERRAL_SHEET_NAME + '" tidak ada di spreadsheet tersebut dan gagal dibuat otomatis: ' + String(err2 && err2.message || err2) };
    }
  }
  ensureReferralSheetHeader_(sheet);
  cleanupDefaultSheet_(spreadsheet);

  try {
    properties.setProperty(REFERRAL_DB_ID_PROPERTY, id);
  } catch (err3) {
    return { status: 'error', message: 'Gagal menyimpan ke Script Properties: ' + String(err3 && err3.message || err3) };
  }

  return buildReferralSheetInfo_(sheet);
}

function openReferralSpreadsheet_() {
  var id = normalizeText_(DB_REFERRAL);
  if (!id) {
    try {
      id = normalizeText_(PropertiesService.getScriptProperties().getProperty(REFERRAL_DB_ID_PROPERTY));
    } catch (err) {
      id = '';
    }
  }
  if (!id) {
    throw new Error('ID dbReferral BELUM DISET. Isi const DB_REFERRAL di code-dbReferral.gs (pola sama seperti DB_DAFTAR / DB_PROGRAM / DB_USER / DB_WETOOLS), atau set Script Properties key "' + REFERRAL_DB_ID_PROPERTY + '" = <ID spreadsheet dbReferral>.');
  }
  try {
    return SpreadsheetApp.openById(id);
  } catch (err) {
    throw new Error('Gagal buka spreadsheet Referral (id=' + id + '): ' + String(err && err.message || err) + '. Pastikan ID benar dan akun deploy punya akses edit.');
  }
}

function getReferralSheet_() {
  const spreadsheet = openReferralSpreadsheet_();

  let sheet = spreadsheet.getSheetByName(REFERRAL_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(REFERRAL_SHEET_NAME);
  }

  ensureReferralSheetHeader_(sheet);
  cleanupDefaultSheet_(spreadsheet);

  return sheet;
}

function ensureReferralSheetHeader_(sheet) {
  const headers = [[
    'updatedAt',
    'createdAt',
    'userId',
    'nama',
    'jenkel',
    'tglLahir',
    'telp',
    'email',
    'alamat',
    'kelurahan',
    'kecamatan',
    'kota',
    'propinsi',
    'acNama1',
    'namaBank1',
    'acBank1',
    'acNama2',
    'namaBank2',
    'acBank2',
    'refLink',
    'referralUrl',
    'sourceSheet',
    'mode',
    'status'
  ]];

  const currentHeaders = sheet.getRange(1, 1, 1, headers[0].length).getValues()[0];
  const isHeaderMissing = headers[0].some(function (header, index) {
    return String(currentHeaders[index] || '').trim() !== header;
  });

  if (isHeaderMissing) {
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    sheet.setFrozenRows(1);
  }
}

function cleanupDefaultSheet_(spreadsheet) {
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (!defaultSheet) return;

  if (spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(defaultSheet);
  }
}

function createReferralSlug_(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 24);

  return slug || 'referral-link';
}

function buildReferralUrl_(slug) {
  return REFERRAL_BASE_URL + encodeURIComponent(createReferralSlug_(slug));
}

function normalizeText_(value) {
  return String(value || '').trim();
}

function normalizeDateText_(value) {
  const rawValue = normalizeText_(value);
  if (!rawValue) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const parsedDate = new Date(rawValue);
  if (isNaN(parsedDate.getTime())) {
    return rawValue;
  }

  return Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parsePostPayload_(e) {
  if (e && e.postData && e.postData.contents) {
    const rawBody = String(e.postData.contents || '').trim();

    if (!rawBody) {
      return (e && e.parameter) ? e.parameter : {};
    }

    try {
      return JSON.parse(rawBody);
    } catch (error) {
      if (e && e.parameter && Object.keys(e.parameter).length) {
        return e.parameter;
      }

      throw new Error('Payload JSON tidak valid.');
    }
  }

  return (e && e.parameter) ? e.parameter : {};
}

function jsonpResponse_(callback, data) {
  if (callback && callback !== 'undefined') {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
