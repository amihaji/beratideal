// ============================================================
// FRM KONFIRMASI PEMBAYARAN - KHUSUS PEMESANAN PRODUK BERATIDEAL
// ============================================================
// Alur:
//  1. Ambil noPesanan dari query string ?noPesanan=INV-xxx
//  2. Prefill data dari localStorage.lastOrderData (backup dari jsEstihTools.js)
//     Jika kosong, fallback: JSONP URL_dbEstihtools action=getDataPesananByInvoice
//  3. Ambil data Nama Penerima + AC Penerima + QR Code Image dari sheet TabelBank
//     berdasarkan namaSponsor. Fallback ke Bank Admin jika tak ketemu.
//  4. Toggle tampilan QR Code saat user pilih opsi "QR Code".
//  5. Submit: upload bukti transfer base64 ke backend action=konfirmasiBayarProduk.
//     Backend diharapkan mengirim 3 WA: Admin, Konsumen, Sponsor.
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  const params        = new URLSearchParams(window.location.search);
  const noPesanan     = params.get("noPesanan");
  const konfirmasiBtn = document.getElementById('btnKonfirmasi');
  const formBayar     = document.getElementById('formBayar');

  if (!noPesanan) {
    tampilPesan('error', '❌ No. Pesanan tidak ditemukan. Silakan buat pesanan ulang.');
    return;
  }

  let currentOrderData = null;

  prefillFromBackupOrBackend(noPesanan)
    .then(orderData => {
      currentOrderData = orderData;
      applyOrderDataToForm(orderData);
      return loadBankData(orderData);
    })
    .then(bankInfo => {
      applyBankInfo(bankInfo);
      bindSystemBayarToggle(bankInfo);
    })
    .catch(err => {
      console.error('init frmKonfirmasi error:', err);
      tampilPesan('warning', '⚠️ Sebagian data gagal dimuat otomatis. Anda tetap bisa submit bukti transfer.');
    });

  // Preview gambar bukti transfer
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
  if (formBayar) {
    formBayar.addEventListener("submit", function (e) {
      e.preventDefault();
      const bukti = document.getElementById("buktiTransfer").files[0];
      if (!bukti) {
        tampilPesan('error', 'Silakan upload bukti transfer terlebih dahulu.');
        return;
      }
      konfirmasiBtn.disabled  = true;
      konfirmasiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

      const reader  = new FileReader();
      reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1];
        const sistemBayar  = document.getElementById('sistemBayar').value;
        const namaPenerima = document.getElementById('namaPenerima').value;
        const acPenerima   = document.getElementById('acPenerima').value;
        const nominalRaw   = document.getElementById('nominal').value || '0';
        const nominal      = parseInt(String(nominalRaw).replace(/[^\d]/g, ''), 10) || 0;

        const itemsText = (currentOrderData && currentOrderData.items && currentOrderData.items.length)
          ? currentOrderData.items.map(it => `${it.nama} x${it.qty}`).join(', ')
          : '';

        const payload = {
          action: 'konfirmasiBayarProduk',
          // identitas
          noPesanan: noPesanan,
          tanggal: (currentOrderData && currentOrderData.tanggal) ? currentOrderData.tanggal : document.getElementById('tanggal').value,
          // data sponsor / bank
          namaSponsor: (currentOrderData && currentOrderData.namaSponsor) ? currentOrderData.namaSponsor : '',
          hpSponsor: (currentOrderData && currentOrderData.hpSponsor) ? currentOrderData.hpSponsor : '',
          namaPenerima: namaPenerima,
          acPenerima: acPenerima,
          // data konsumen
          namaKonsumen: (currentOrderData && currentOrderData.namaKonsumen) ? currentOrderData.namaKonsumen : document.getElementById('nama').value,
          hpKonsumen: (currentOrderData && currentOrderData.hpKonsumen) ? currentOrderData.hpKonsumen : document.getElementById('telp').value,
          emailKonsumen: (currentOrderData && currentOrderData.emailKonsumen) ? currentOrderData.emailKonsumen : document.getElementById('email').value,
          // produk & harga
          produkText: itemsText || document.getElementById('program').value,
          metodeBayar: sistemBayar,
          grandTotal: nominal,
          // bukti
          buktiTransferBase64: base64Data
        };

        fetch(URL_dbEstihtools, {
          method: "POST",
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(payload)
        })
        .then(response => response.json().catch(() => ({ success: true, message: 'Terkirim' })))
        .then(res => {
          if (res && res.success !== false) {
            konfirmasiBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
            tampilPesan('success', `✅ ${res.message || 'Pembayaran berhasil dikonfirmasi. Admin & Sponsor segera memproses pesanan Anda.'}`);
            setTimeout(function() {
              window.location.href = 'index.html';
            }, 3500);
          } else {
            tampilPesan('error', res.message || '❌ Gagal mengirim konfirmasi pembayaran.');
            konfirmasiBtn.disabled  = false;
            konfirmasiBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Konfirmasi Pembayaran';
          }
        })
        .catch(error => {
          console.error('Error submit:', error);
          tampilPesan('error', '❌ Gagal koneksi ke server: ' + error.message);
          konfirmasiBtn.disabled  = false;
          konfirmasiBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Konfirmasi Pembayaran';
        });
      };
      reader.readAsDataURL(bukti);
    });
  }
});

// ============================================================
// Helper: Prefill dari localStorage.lastOrderData dulu
// (backup disimpan jsEstihTools.js saat user klik SIMPAN),
// jika kosong fallback ke JSONP URL_dbEstihtools action=getDataPesananByInvoice
// ============================================================
function prefillFromBackupOrBackend(noPesanan) {
  return new Promise((resolve, reject) => {
    let backup = null;
    try {
      const raw = localStorage.getItem('lastOrderData');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (!parsed.noPesanan || parsed.noPesanan === noPesanan)) {
          backup = parsed;
        }
      }
    } catch (e) { backup = null; }

    if (backup && backup.noPesanan) {
      resolve(backup);
      return;
    }

    // Fallback ke backend URL_dbEstihtools via JSONP (action=getDataPesananByInvoice)
    try {
      const cbName = 'cb_inv_' + Date.now();
      const script = document.createElement('script');
      const url = URL_dbEstihtools
        + '?action=getDataPesananByInvoice'
        + '&invoice=' + encodeURIComponent(noPesanan)
        + '&callback=' + cbName;

      const timeoutId = setTimeout(() => {
        try { document.head.removeChild(script); } catch (e) {}
        delete window[cbName];
        // backend belum siap, biarkan form tetap bisa berjalan
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
          byKirim: resp.mByKirim || 0,
          diskon: resp.mDiskon || '',
          voucher: resp.mVoucher || 0,
          pajak: resp.mPajak || 0,
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

// ============================================================
// Helper: Isi form field dengan orderData
// ============================================================
function applyOrderDataToForm(orderData) {
  // ringkasan
  safeSetText('ringkasanNoPesanan', orderData.noPesanan || '-');
  safeSetText('ringkasanNama', orderData.namaKonsumen || '-');
  safeSetText('ringkasanSponsor', orderData.namaSponsor || '-');
  const alamatLengkap = [orderData.alamat, orderData.kelurahan, orderData.kecamatan, orderData.kota, orderData.propensi]
    .filter(Boolean).join(', ') || '-';
  safeSetText('ringkasanAlamat', alamatLengkap);
  const totalItem = (orderData.items && orderData.items.length) ? orderData.items.length : 0;
  safeSetText('ringkasanTotalItem', String(totalItem));
  const grand = parseInt(orderData.grandTotal, 10) || 0;
  safeSetText('ringkasanGrandTotal', formatRupiah(grand));

  // data pesanan
  document.getElementById('tanggal').value      = orderData.tanggal || new Date().toLocaleDateString('id-ID');
  document.getElementById('nomorPesanan').value = orderData.noPesanan || '';
  const produkText = (orderData.items && orderData.items.length)
    ? orderData.items.map(it => `${it.nama} x${it.qty}`).join(', ')
    : '';
  document.getElementById('program').value = produkText;

  // data pengiriman
  document.getElementById('nama').value      = orderData.namaKonsumen || '';
  document.getElementById('alamat').value    = orderData.alamat || '';
  document.getElementById('telp').value      = orderData.hpKonsumen || '';
  document.getElementById('email').value     = orderData.emailKonsumen || '';
  document.getElementById('kelurahan').value = orderData.kelurahan || '';
  document.getElementById('kecamatan').value = orderData.kecamatan || '';
  document.getElementById('kota').value      = orderData.kota || '';
  document.getElementById('propinsi').value  = orderData.propensi || '';

  // nominal awal (bisa di-overlay nanti bila loadBank sukses)
  document.getElementById('nominal').value = formatRupiah(grand);
}

// ============================================================
// Helper: Load data bank sponsor dari URL_dbEstihtools
// action=getBankBySponsor?namaSponsor=xxx via JSONP
// ============================================================
function loadBankData(orderData) {
  return new Promise((resolve) => {
    const namaSponsor = (orderData && orderData.namaSponsor) ? String(orderData.namaSponsor).trim() : '';
    try {
      const cbName = 'cb_bank_' + Date.now();
      const script = document.createElement('script');
      const url = URL_dbEstihtools
        + '?action=getBankBySponsor'
        + '&namaSponsor=' + encodeURIComponent(namaSponsor)
        + '&callback=' + cbName;

      const timeoutId = setTimeout(() => {
        try { document.head.removeChild(script); } catch (e) {}
        delete window[cbName];
        resolve(defaultBankAdmin(orderData));
      }, 5000);

      window[cbName] = function(resp) {
        clearTimeout(timeoutId);
        try { document.head.removeChild(script); } catch (e) {}
        delete window[cbName];
        if (!resp || resp.status === 'error') {
          resolve(defaultBankAdmin(orderData));
          return;
        }
        resolve({
          namaPenerima: resp.namaPenerima || resp.nama || 'HESTY HUSAIN',
          acPenerima: resp.acPenerima || resp.noRek || resp.rekening || '',
          qrCodeUrl: resp.qrCodeUrl || resp.qr || ''
        });
      };
      script.src = url;
      script.onerror = function() {
        clearTimeout(timeoutId);
        try { document.head.removeChild(script); } catch (e) {}
        delete window[cbName];
        resolve(defaultBankAdmin(orderData));
      };
      document.head.appendChild(script);
    } catch (err) {
      resolve(defaultBankAdmin(orderData));
    }
  });
}

function defaultBankAdmin(orderData) {
  return {
    namaPenerima: 'HESTY HUSAIN',
    acPenerima: '',
    qrCodeUrl: 'https://amihaji.github.io/beratideal/images/qris_club_kita.jpeg'
  };
}

// ============================================================
// Helper: Terapkan data bank ke field Nama Penerima / AC
// ============================================================
function applyBankInfo(bankInfo) {
  if (bankInfo && bankInfo.namaPenerima) {
    document.getElementById('namaPenerima').value = bankInfo.namaPenerima;
  }
  if (bankInfo && bankInfo.acPenerima) {
    document.getElementById('acPenerima').value = bankInfo.acPenerima;
  }
  // tampilkan gambar QR
  const img = document.getElementById('qrCodeImg');
  if (img && bankInfo && bankInfo.qrCodeUrl) {
    img.src = bankInfo.qrCodeUrl;
  } else if (img) {
    img.src = 'https://amihaji.github.io/beratideal/images/qris_club_kita.jpeg';
  }
}

// ============================================================
// Helper: Bind event onchange dropdown Metode
// => Toggle tampilan #qrCodeBox
// ============================================================
function bindSystemBayarToggle(bankInfo) {
  const sel = document.getElementById('sistemBayar');
  const box = document.getElementById('qrCodeBox');
  if (!sel || !box) return;

  function apply() {
    const val = sel.value;
    if (val === 'QR Code') {
      box.style.display = 'block';
      if (bankInfo && bankInfo.qrCodeUrl) {
        const img = document.getElementById('qrCodeImg');
        if (img && !img.src) img.src = bankInfo.qrCodeUrl;
      }
    } else {
      box.style.display = 'none';
    }
  }
  sel.addEventListener('change', apply);
  apply();
}

// ============================================================
// Util
// ============================================================
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text != null ? String(text) : '';
}

function formatRupiah(num) {
  const n = parseInt(num, 10) || 0;
  return 'Rp. ' + n.toLocaleString('id-ID');
}

function tampilPesan(tipe, pesan) {
  const msg = document.getElementById("formMessage");
  if (!msg) return;
  const alertClass = tipe === 'error' ? 'alert alert-danger' : 'alert alert-success';
  msg.innerHTML = `<div class="${alertClass}">${pesan}</div>`;
}
