// *************************************************** 
// Memanggail data inputan ke dalam form tanda terima
// ***************************************************
document.addEventListener('DOMContentLoaded', function () {
    // Ambil noPesanan dari query string
    const params        = new URLSearchParams(window.location.search);
    const noPesanan     = params.get("noPesanan");
    const submitBtn     = document.getElementById('btnSubmit');
    
    // Set tanggal terima
    document.getElementById('tanggalTerima').value = new Date().toLocaleDateString('id-ID');
            
    if (!noPesanan) {
      tampilPesan('error', '❌ Data tidak ditemukan. Silakan gunakan link yang benar.');
      return;
    }

    // 1. Ambil data dari Apps Script via noPesanan
    fetch(URL_dbDaftarBeratideal + "?noPesanan=" + noPesanan)
    .then(res => res.json())
      .then(data => {
        if (data.error) {
          tampilPesan('error', '❌ Data tidak ditemukan di server.');
          return;
        }

        // Isi data ke form
        document.getElementById('nomorPesanan').value = data.noPesanan || "";
        document.getElementById('nama').value = data.nama || "";
        
        // Format alamat lengkap
        const alamatLengkap = `${data.alamat || ''}, ${data.kelurahan || ''}, ${data.kecamatan || ''}, ${data.kota || ''}, ${data.propinsi || ''}`;
        document.getElementById('alamat').value = alamatLengkap;
 
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        tampilPesan('error', 'Gagal mengambil data dari server.');
      });

    // 2. Preview gambar bukti produk
    document.getElementById("buktiProduk").addEventListener("change", function () {
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
  
    // Submit form
    document.getElementById("formTandaTerima").addEventListener("submit", function (e) {
      e.preventDefault();
      
      const buktiProduk = document.getElementById("buktiProduk").files[0];
      const pernyataan = document.getElementById("pernyataan").checked;
      
      if (!buktiProduk) {
        tampilPesan('error', 'Silakan upload foto produk yang diterima.');
        return;
      }
      
      if (!pernyataan) {
        tampilPesan('error', 'Silakan centang pernyataan bahwa produk telah diterima dengan baik.');
        return;
      }

      // Convert file to base64
      const reader  = new FileReader();
      reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1]; // Remove data:image/jpeg;base64,
        
        // Kirim data sebagai form-urlencoded 
        const formData = new URLSearchParams();
        formData.append("fileProduk", base64Data);
        formData.append("noPesanan", noPesanan);
        formData.append("action", "tandaTerima"); // Flag untuk membedakan action

        // Tampilkan spinner di tombol submit
        submitBtn.disabled  = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

        fetch(URL_dbDaftarBeratideal, {
          method: "POST",
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        })
        .then(response => response.json())
        .then(res => {
          if (res.success) {
            // Tombol submit menampilkan pesan
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
            tampilPesan('success', '✅ Tanda terima berhasil dikirim. Terima kasih!');
      
            // Kembali ke home setelah 3 detik
            setTimeout(function() {
              window.location.href = 'index.html';
            }, 3000);

          } else {
            tampilPesan('error', res.message || '❌ Gagal mengirim tanda terima.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Tanda Terima';
          }
        })
        .catch(error => {
          console.error('Error:', error);
          tampilPesan('error', '❌ Gagal koneksi ke server: ' + error.message);
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Tanda Terima';
        });
      };
      reader.readAsDataURL(buktiProduk);
    });
});

/************************
* Fungsi tampilkan pesan
************************/
function tampilPesan(tipe, pesan) {
  const msg = document.getElementById("formMessage");
  const alertClass = tipe === 'error' ? 'alert alert-danger' : 'alert alert-success';
  msg.innerHTML = `<div class="${alertClass}">${pesan}</div>`;
}
