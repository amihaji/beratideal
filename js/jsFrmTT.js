// ***************************************************
// FORM TANDA TERIMA PRODUK - KHUSUS PEMESANAN PRODUK BERATIDEAL
// Target API: URL_dbEstihtools action=tandaTerimaProduk
// ***************************************************
document.addEventListener('DOMContentLoaded', function () {
    const params    = new URLSearchParams(window.location.search);
    const noPesanan = params.get("noPesanan");
    const submitBtn = document.getElementById('btnSubmit');

    document.getElementById('tanggalTerima').value = new Date().toLocaleDateString('id-ID');

    if (!noPesanan) {
      tampilPesan('error', '❌ Data tidak ditemukan. Silakan gunakan link yang benar.');
      return;
    }

    prefillOrderData(noPesanan)
      .then(orderData => applyOrderData(orderData))
      .catch(err => {
        console.error('prefill order error:', err);
        tampilPesan('warning', '⚠️ Data pesanan tidak dimuat otomatis. Anda tetap bisa submit bukti terima.');
      });

    // Preview gambar bukti produk
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
    const form = document.getElementById("formTandaTerima");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        const buktiProduk = document.getElementById("buktiProduk").files[0];
        const pernyataan  = document.getElementById("pernyataan").checked;

        if (!buktiProduk) {
          tampilPesan('error', 'Silakan upload foto produk yang diterima.');
          return;
        }
        if (!pernyataan) {
          tampilPesan('error', 'Silakan centang pernyataan bahwa produk telah diterima dengan baik.');
          return;
        }

        const reader  = new FileReader();
        reader.onload = function(e) {
          const base64Data = e.target.result.split(',')[1];
          const formData = new URLSearchParams();
          formData.append("action", "tandaTerimaProduk");
          formData.append("fileProduk", base64Data);
          formData.append("noPesanan", noPesanan);
          formData.append("tanggalTerima", document.getElementById('tanggalTerima').value);
          formData.append("namaKonsumen", document.getElementById('nama').value || "");
          formData.append("namaSponsor",  document.getElementById('namaSponsor').value || "");

          submitBtn.disabled  = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

          fetch(URL_dbEstihtools, {
            method: "POST",
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
          })
          .then(response => response.json().catch(() => ({ success: true, message: 'Terkirim' })))
          .then(res => {
            if (res && res.success !== false) {
              submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
              tampilPesan('success', '✅ Tanda terima produk berhasil dikirim. Terima kasih!');
              setTimeout(function() {
                window.location.href = 'index.html';
              }, 3000);
            } else {
              tampilPesan('error', res.message || '❌ Gagal mengirim tanda terima.');
              submitBtn.disabled  = false;
              submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Tanda Terima Produk';
            }
          })
          .catch(error => {
            console.error('Error:', error);
            tampilPesan('error', '❌ Gagal koneksi ke server: ' + error.message);
            submitBtn.disabled  = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Tanda Terima Produk';
          });
        };
        reader.readAsDataURL(buktiProduk);
      });
    }
});

// ============================================================
// Prefill order: coba dari localStorage.lastOrderData (jika noPesanan cocok)
// fallback: JSONP URL_dbEstihtools action=getDataPesananByInvoice
// ============================================================
function prefillOrderData(noPesanan) {
  return new Promise((resolve) => {
    try {
      const raw = localStorage.getItem('lastOrderData');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.noPesanan === noPesanan) {
          resolve(parsed);
          return;
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const cbName = 'cb_tt_' + Date.now();
      const script = document.createElement('script');
      const url = URL_dbEstihtools
        + '?action=getDataPesananByInvoice'
        + '&invoice=' + encodeURIComponent(noPesanan)
        + '&callback=' + cbName;

      const timeoutId = setTimeout(() => {
        try { document.head.removeChild(script); } catch (e) {}
        delete window[cbName];
        resolve({ noPesanan: noPesanan });
      }, 5000);

      window[cbName] = function(resp) {
        clearTimeout(timeoutId);
        try { document.head.removeChild(script); } catch (e) {}
        delete window[cbName];
        if (!resp || resp.status === 'error') {
          resolve({ noPesanan: noPesanan });
          return;
        }
        resolve({
          noPesanan: resp.mInvoice || noPesanan,
          tanggal: resp.mDate || '',
          namaSponsor: resp.mDistributorName || '',
          hpSponsor: resp.mDistributorPhone || '',
          namaKonsumen: resp.mConsumerName || '',
          hpKonsumen: resp.mConsumerPhone || '',
          emailKonsumen: resp.mConsumerEmail || '',
          alamat: resp.mAlamat || '',
          kelurahan: resp.mKelurahan || '',
          kecamatan: resp.mKecamatan || '',
          kota: resp.mKota || '',
          propensi: resp.mPropensi || '',
          grandTotal: resp.mTotalPrice || 0,
          items: Array.isArray(resp.items) ? resp.items : []
        });
      };
      script.src = url;
      script.onerror = function() {
        clearTimeout(timeoutId);
        try { document.head.removeChild(script); } catch (e) {}
        delete window[cbName];
        resolve({ noPesanan: noPesanan });
      };
      document.head.appendChild(script);
    } catch (err) {
      resolve({ noPesanan: noPesanan });
    }
  });
}

function applyOrderData(orderData) {
  document.getElementById('nomorPesanan').value = orderData.noPesanan || "";
  document.getElementById('nama').value         = orderData.namaKonsumen || "";
  document.getElementById('namaSponsor').value  = orderData.namaSponsor  || "";

  const alamatLengkap = [orderData.alamat, orderData.kelurahan, orderData.kecamatan, orderData.kota, orderData.propensi]
    .filter(Boolean).join(', ');
  const alamatEl = document.getElementById('alamat');
  if (alamatEl) alamatEl.value = alamatLengkap;

  const detailEl = document.getElementById('detailProduk');
  if (detailEl && orderData.items && orderData.items.length) {
    detailEl.value = orderData.items.map(it => `${it.nama} x${it.qty}`).join('\n');
  } else if (detailEl) {
    detailEl.value = '';
  }
}

function tampilPesan(tipe, pesan) {
  const msg = document.getElementById("formMessage");
  if (!msg) return;
  const alertClass = tipe === 'error' ? 'alert alert-danger' : 'alert alert-success';
  msg.innerHTML = `<div class="${alertClass}">${pesan}</div>`;
}
