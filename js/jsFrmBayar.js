// *************************************************** 
// FORM KONFIRMASI PEMBAYARAN - KHUSUS PENDAFTARAN
// Target API: URL_dbDaftarBeratideal (sheet DAFTAR pendaftaran)
// ***************************************************
document.addEventListener('DOMContentLoaded', function () {
    const params        = new URLSearchParams(window.location.search);
    const noPesanan     = params.get("noPesanan") || (function(){ try { return localStorage.getItem('noPesanan') || ''; } catch(e){ return ''; } })();
    const konfirmasiBtn = document.getElementById('btnKonfirmasi');
    const formBayar     = document.getElementById('formBayar');

    if (!noPesanan) {
      tampilPesan('error', '❌ No. Pesanan tidak ditemukan. Silakan buat pendaftaran ulang.');
      return;
    }

    // 1. Ambil data dari Apps Script via noPesanan (PENDAFTARAN)
    fetch(URL_dbDaftarBeratideal + "?noPesanan=" + encodeURIComponent(noPesanan))
    .then(res => res.json())
      .then(data => {
        if (data.error) {
          tampilPesan('error', '❌ Data pendaftaran tidak ditemukan di server.');
          return;
        }

        // Isi data ke form
        document.getElementById('tanggal').value       = data.tanggal      || "";
        document.getElementById('nomorPesanan').value  = data.noPesanan    || "";
        document.getElementById('program').value       = data.program      || "";
        document.getElementById('harga').value         = data.harga ? Number(data.harga).toLocaleString('id-ID') : "";
        document.getElementById('nama').value          = data.nama         || "";
        document.getElementById('alamat').value        = data.alamat       || "";
        document.getElementById('telp').value          = data.telp         || "";
        document.getElementById('email').value         = data.email        || "";
        document.getElementById('kelurahan').value     = data.kelurahan    || "";
        document.getElementById('kecamatan').value     = data.kecamatan    || "";
        document.getElementById('kota').value          = data.kota         || "";
        document.getElementById('propinsi').value      = data.propinsi     || "";
        document.getElementById('pembayaran').value    = data.pembayaran   || "";
        document.getElementById('namaPenerima').value  = data.namaPenerima || "";
        document.getElementById('acPenerima').value    = data.acPenerima   || "";
        document.getElementById('nominal').value       = data.nominal ? Number(data.nominal).toLocaleString('id-ID') : "";
      })
      .catch(error => {
        console.error('Error fetching data pendaftaran:', error);
        tampilPesan('warning', '⚠️ Gagal mengambil data pendaftaran otomatis. Anda tetap bisa upload bukti transfer.');
      });

    // 2. Preview gambar bukti transfer
    document.getElementById("buktiTransfer").addEventListener("change", function () {
      const file = this.files[0];
      const preview = document.getElementById("preview");
      preview.innerHTML = "";
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = function (e) {
          preview.innerHTML = `<img src="${e.target.result}" class="img-fluid rounded border" style="max-height:250px;" alt="Preview">`;
        };
        reader.readAsDataURL(file);
      }
    });
  
    // Submit konfirmasi pembayaran pendaftaran
    if (formBayar) {
      formBayar.addEventListener("submit", function (e) {
        e.preventDefault();
        const bukti = document.getElementById("buktiTransfer").files[0];
        if (!bukti) {
          tampilPesan('error', 'Silakan upload bukti transfer terlebih dahulu.');
          return;
        }

        const reader  = new FileReader();
        reader.onload = function(e) {
          const base64Data = e.target.result.split(',')[1];

          const formData = new URLSearchParams();
          formData.append("file", base64Data);
          formData.append("noPesanan", noPesanan);

          konfirmasiBtn.disabled  = true;
          konfirmasiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

          fetch(URL_dbDaftarBeratideal, {
            method: "POST",
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
          })
          .then(response => response.json())
          .then(res => {
            if (res.success) {
              const tambahanLink = res.tandaTerimaLink
                ? `<br><small>Link tanda terima: <a href="${res.tandaTerimaLink}" target="_blank" rel="noopener noreferrer">formTandaTerima.html</a></small>`
                : '';
              konfirmasiBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
              tampilPesan('success', `✅ ${res.message || 'Pembayaran berhasil dikonfirmasi. Admin segera menghubungi.'}${tambahanLink}`);
              setTimeout(function() {
                window.location.href = 'index.html';
              }, 3000);
            } else {
              tampilPesan('error', res.message || '❌ Gagal mengupdate pembayaran.');
              konfirmasiBtn.disabled  = false;
              konfirmasiBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Konfirmasi Pembayaran';
            }
          })
          .catch(error => {
            console.error('Error:', error);
            tampilPesan('error', '❌ Gagal koneksi ke server: ' + error.message);
            konfirmasiBtn.disabled  = false;
            konfirmasiBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Konfirmasi Pembayaran';
          });
        };
        reader.readAsDataURL(bukti);
      });
    }
});

/************************
* Fungsi tampilkan pesan
************************/
function tampilPesan(tipe, pesan) {
  const msg = document.getElementById("formMessage");
  if (!msg) return;
  const alertClass = tipe === 'error' ? 'alert alert-danger' : 'alert alert-success';
  msg.innerHTML = `<div class="${alertClass}">${pesan}</div>`;
}
