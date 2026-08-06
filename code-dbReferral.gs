/*******************************************************
 * DATABASE REFERRAL
 * Spreadsheet akan dibuat otomatis dengan nama dbReferral
 *******************************************************/
const REFERRAL_SPREADSHEET_NAME = 'dbReferral';
const REFERRAL_SHEET_NAME       = 'REFERRAL';
const REFERRAL_BASE_URL         = 'https://beratidealku.com/?ref=';
const REFERRAL_DB_ID_KEY        = '1pRH1h9xsaMjtqU-wx5o1mNuMQP_rVfN8024eBNyo1Kw';

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || '').trim();
  const callback = params.callback || '';

  if (action === 'getReferralData') {
    return jsonpResponse_(callback, getReferralData_(params));
  }

  if (action === 'getReferralSheetInfo') {
    const sheet = getReferralSheet_();
    return jsonpResponse_(callback, {
      status: 'success',
      spreadsheetId: sheet.getParent().getId(),
      spreadsheetName: sheet.getParent().getName(),
      sheetName: sheet.getName()
    });
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

  if (!userId) {
    return {
      status: 'error',
      message: 'User ID tidak boleh kosong.'
    };
  }

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
    normalizeText_(payload.tglLahir),
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

  if (targetRow) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    targetRow = sheet.getLastRow();
  }

  SpreadsheetApp.flush();
  const persistedRow = sheet.getRange(targetRow, 1, 1, row.length).getValues()[0];

  return {
    status: 'success',
    message: isUpdate ? 'Data Referral berhasil diperbarui.' : 'Data Referral berhasil disimpan.',
    data: mapReferralRow_(persistedRow, targetRow),
    meta: buildReferralSheetMeta_(sheet)
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
    sheetName: sheet.getName()
  };
}

function getReferralSheet_() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty(REFERRAL_DB_ID_KEY);
  let spreadsheet;

  if (spreadsheetId) {
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (error) {
      spreadsheet = null;
    }
  }

  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create(REFERRAL_SPREADSHEET_NAME);
    properties.setProperty(REFERRAL_DB_ID_KEY, spreadsheet.getId());
  }

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
