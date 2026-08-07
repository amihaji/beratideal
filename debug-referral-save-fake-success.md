# Debug Session: referral-save-fake-success
- **Status**: [OPEN]
- **Issue**: Setelah klik tombol `Simpan` Referral, muncul pesan "Data Referral berhasil diperbarui" tetapi data tidak muncul / tidak berubah di Google Sheet REFERRAL.
- **Debug Server**: Akan dijalankan di lokal (port auto-detect) dengan endpoint `/event`.
- **Log File**: `.dbg/trae-debug-log-referral-save-fake-success.ndjson`

## Reproduction Steps
1. Buka `formDashboard.html` lalu login user pemilik data Referral.
2. Pindah ke tab Referral → klik `Input` atau `Edit` → isi/update data → buat slug Link Referral jika perlu.
3. Klik tombol `Simpan`.
4. Amati pesan status → buka Sheet REFERRAL yang diharapkan → data tidak berubah / baris baru tidak muncul.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Expected Signal |
|----|------------|------------|--------|-----------------|
| A | Deployment Apps Script dbReferral yang aktif masih versi lawas (tanpa `SpreadsheetApp.flush()` / tanpa pengecekan owner), respons `success` dikirim sebelum benar-benar menulis sheet. | High | Low | Backend log `before_flush` dan `after_flush` menunjukkan data tidak berubah di `persistedRow` atau tidak sampai ke tahap write. |
| B | Header sheet REFERRAL di spreadsheet tidak sinkron dengan mapping kolom backend, sehingga `setValues/appendRow` "berhasil" tapi data tertulis ke kolom yang salah / tidak terdeteksi saat read-back. | High | Low | Backend log `headers_diff` atau `row_length_mismatch`; kolom mapping beda antara `ensureReferralSheetHeader_` vs sheet aktif. |
| C | Frontend di browser masih kode cache lama: `refreshedData` null tapi UI fallback ke `response.data || payload` lalu menampilkan sukses tanpa verifikasi read-back. | Medium | Low | Frontend tidak mengirim log `verify_start` / `verify_check_*` — alias blok verifikasi tidak jalan. |
| D | `URL_dbReferral` di frontend mengarah ke deployment Apps Script lain (spreadsheet berbeda) daripada yang biasa user cek. | Medium | Low | Backend log `sheet_meta` → `spreadsheetId / sheetName` beda dengan spreadsheet yang dianggap user sebagai target. |
| E | Error network / JSONP redirect Google Apps Script ditangkap secara salah dan dianggap "success" oleh callback lawas (false positive dari cache redirect). | Medium | Medium | Frontend log `jsonp_script_onerror` tapi callback tetap ke-trigger; atau `response` tidak punya status success tapi di-ignore. |

## Instrumentation Plan
1. **Frontend `jsReferral.js`**:
   - `referralSaveJsonp`: log `jsonp_start`, `jsonp_callback`, `jsonp_onerror`.
   - `collectFormData`: log payload yang dikumpulkan (cukup field kunci).
   - `handleSave`: log `save_start`, `after_save_response`, `verify_start`, `verify_check_userid`, `verify_check_slug`, `verify_check_tgllahir`, `save_result_success/save_result_fail`.
2. **Backend `code-dbReferral.gs`**:
   - `saveReferralData_`: log `save_backend_start`, `owner_check`, `target_row_found`, `before_flush`, `after_flush_readback`, `sheet_meta`.
   - `getReferralData_`: log `get_data_start`, `get_data_hit/miss`.

## Log Evidence
(Belum ada)

## Verification Conclusion
(Belum ada)
