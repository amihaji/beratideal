# Debug Session: referral-save-false-success
- **Status**: [OPEN]
- **Issue**: Klik "Simpan" pada halaman Referral menampilkan pesan sukses, tetapi data yang diharapkan pengguna terlihat tidak tersimpan atau tidak berubah di sheet `REFERRAL`.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: `.dbg/trae-debug-log-referral-save-false-success.ndjson`

## Reproduction Steps
1. Buka halaman Dashboard pada menu Referral.
2. Ubah data Referral lalu klik tombol `Simpan`.
3. Amati pesan di UI.
4. Cek sheet `REFERRAL` pada spreadsheet `dbReferral`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Frontend mengirim payload berbeda dari yang terlihat di form saat klik Simpan | High | Low | Pending |
| B | Backend menulis ke baris lain atau baris lama sehingga verifikasi membaca record yang salah | High | Medium | Pending |
| C | Data memang tersimpan, tetapi format/nilai tertentu berubah saat transit sehingga terlihat seperti tidak tersimpan | Medium | Low | Pending |
| D | Spreadsheet/sheet yang dicek pengguna bukan target write aktual pada request yang sedang diuji | Medium | Low | Pending |
| E | Ada cache/reload state frontend yang menampilkan data lama setelah write berhasil | Medium | Medium | Pending |

## Log Evidence
Instrumentation aktif di frontend `js/jsReferral.js` pada titik:
- `A`: payload simpan sebelum POST
- `B`: hasil verifikasi GET dan mismatch/success verifier
- `C`: respons mentah dan respons sukses dari POST

## Verification Conclusion
Pending.
