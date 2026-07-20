// ******************************************** 
// Memanggail data inputan ke dalam form bayar
// ********************************************
document.addEventListener('DOMContentLoaded', function () {
    // Ambil noPesanan dari query string
    const params        = new URLSearchParams(window.location.search);
    const noPesanan     = params.get("noPesanan");
    const konfirmasiBtn = document.getElementById('btnKonfirmasi');
            
    if (!noPesanan) {
      //alert("Data tidak ditemukan. Silakan daftar ulang.");
      tampilPesan('error', '❌ Data tidak ditemukan. Silahkan daftar ulang');
      return;
    }
  
    // 1. Ambil data dari Apps Script via noPesanan
    fetch(URL_dbDaftarBeratideal + "?noPesanan=" + noPesanan)
    .then(res => res.json())
      .then(data => {
        if (data.error) {
          //alert("Data tidak ditemukan di server.");
          tampilPesan('error', '❌ Data tidak ditemukan diserver');
          return;
        }

        const mapping = {
          tanggal: "tanggal",
          noPesanan: "nomorPesanan",
          program: "program",
          harga: "harga",
          nama: "nama",
          alamat: "alamat",
          telp: "telp",
          email: "email",
          kelurahan: "kelurahan",
          kecamatan: "kecamatan",
          kota: "kota",
          propinsi: "propinsi",
          pembayaran: "sistemBayar",
          namaPenerima: "namaPenerima",
          acPenerima: "acPenerima",
          nominal: "nominal"
        };
       
        // Format tanggal
        Object.entries(mapping).forEach(([key, id]) => {
          const el = document.getElementById(id);
          if (el) {
            // Format tanggal jika field adalah tanggal
            if (key === "tanggal" && data[key]) {
              const date  = new Date(data[key]);
              const day   = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year  = date.getFullYear();
              el.value = `${day}-${month}-${year}`;
            } else {
              el.value = data[key] || "";
            }
          }
        });
 
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        tampilPesan('error', 'Gagal mengambil data dari server.');
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
  
    // Submit konfirmasi
    document.getElementById("formBayar").addEventListener("submit", function (e) {
      e.preventDefault();
      const bukti = document.getElementById("buktiTransfer").files[0];
      if (!bukti) {
        tampilPesan('error', 'Silakan upload bukti transfer.');
        return;
      }

      // Convert file to base64
      const reader  = new FileReader();
      reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1]; // Remove data:image/jpeg;base64,
        
        // Kirim data sebagai form-urlencoded 
        const formData = new URLSearchParams();
        formData.append("file", base64Data);
        formData.append("noPesanan", noPesanan);

        // Tampilkan spinner di tombol konfirmasi
        konfirmasiBtn.disabled  = true;
        konfirmasiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

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

            // Tombol konfirmasi menampilkan pesan
            konfirmasiBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
            tampilPesan('success', '✅ Pembayaran berhasil dikonfirmasi. Admin segera menghubungi');
      
            // Setelah Konfirmasi Pembayaran kembali ke home
            setTimeout(function() {
              // kembali ke landingpage
              window.location.href = 'index.html';
            }, 3000); // delay 3 detik (3000 milidetik)

          } else {
            tampilPesan('error', res.message || '❌ Gagal mengupdate pembayaran.');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          tampilPesan('error', '❌ Gagal koneksi ke server: ' + error.message);
        });
      };
      reader.readAsDataURL(bukti);
    });
});

/************************
* Fungsi tampilkan pesan
************************/
function tampilPesan(tipe, pesan) {
  const msg = document.getElementById("formMessage");
  const alertClass = tipe === 'error' ? 'alert alert-danger' : 'alert alert-success' ;
  msg.innerHTML = `<div class="${alertClass}">${pesan}</div>`;
}