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
| A | Frontend mengirim payload berbeda dari yang terlihat di form saat klik Simpan | High | Low | Rejected |
| B | Backend menulis ke baris lain atau baris lama sehingga verifikasi membaca record yang salah | High | Medium | Rejected |
| C | Data memang tersimpan, tetapi format/nilai tertentu berubah saat transit sehingga terlihat seperti tidak tersimpan | Medium | Low | Rejected |
| D | Spreadsheet/sheet yang dicek pengguna bukan target write aktual pada request yang sedang diuji, atau pengguna mengharapkan append row padahal sistem melakukan update row existing | Medium | Low | Confirmed |
| E | Ada cache/reload state frontend yang menampilkan data lama setelah write berhasil | Medium | Medium | Rejected |

## Log Evidence
Instrumentation aktif di frontend `js/jsReferral.js` pada titik:
- `A`: payload simpan sebelum POST
- `B`: hasil verifikasi GET dan mismatch/success verifier
- `C`: respons mentah dan respons sukses dari POST

Temuan kunci:
- Payload yang dikirim saat klik `Simpan` untuk `userId=amihaji` berisi `recordId=2`, `refLink=klik`, `alamat=Abdulkadir No 4`, `kelurahan=ujung`, `kecamatan=pandang`, `kota=makassar`, `propinsi=sulsel`.
- Respons POST mengembalikan `recordId=2` dan `updatedAt=2026-08-06T07:12:17.557Z`.
- GET verifikasi setelah simpan juga mengembalikan `recordId=2` dan `updatedAt=2026-08-06T07:12:17.557Z`.
- Endpoint live `getReferralData&userId=amihaji` mengembalikan data yang sama dengan hasil simpan terakhir pada spreadsheet `dbReferral`, sheet `REFERRAL`.

## Verification Conclusion
Masalah utama bukan kegagalan write. Sistem Referral memang melakukan **update ke baris existing berdasarkan `userId`**, bukan append baris baru. Untuk `amihaji`, backend menulis ke `recordId=2`. Jika pengguna memeriksa bagian bawah sheet untuk mencari baris baru, akan terlihat seolah data tidak tersimpan.
