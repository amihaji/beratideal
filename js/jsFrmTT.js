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

    // SUMBER KEBENARAN: Ambil mapping kategori -> nama paket LENGKAP dari sheet TabelHarga
    // via backend action getPaketProdukByKategori. Jika request gagal / timeout,
    // pakai FALLBACK_MAP saja sebagai safety net (bukan sumber utama).
    loadPaketMapFromTabelHarga_()
      .catch(function(){ return null; })
      .then(function(paketCtx){
        const paketMap = (paketCtx && paketCtx.mapPaket) ? paketCtx.mapPaket : null;
        const aliasKat = (paketCtx && paketCtx.aliasKategori) ? paketCtx.aliasKategori : null;

        // PRIORITAS 1: Prefill dari URL query params (dikirim via WA/Email)
        //              100% work tanpa perlu request server (JSONP)
        prefillFromQueryParams(params)
          .then(orderData => {
            if (orderData && orderData._prefilled) {
              applyOrderData(orderData, paketMap, aliasKat);
              console.log('✅ Prefill dari URL query params sukses');
            } else {
              // PRIORITAS 2: localStorage
              // PRIORITAS 3: JSONP getDataPesananByInvoice
              prefillOrderData(noPesanan)
                .then(orderData2 => applyOrderData(orderData2, paketMap, aliasKat))
                .catch(err => {
                  console.error('prefill order error:', err);
                  applyOrderData({ noPesanan: noPesanan }, paketMap, aliasKat);
                  tampilPesan('warning', '⚠️ Data pesanan tidak dimuat otomatis. Anda tetap bisa submit bukti terima.');
                });
            }
          })
          .catch(err => {
            console.error('prefill query params error:', err);
            prefillOrderData(noPesanan)
              .then(orderData2 => applyOrderData(orderData2, paketMap, aliasKat))
              .catch(() => applyOrderData({ noPesanan: noPesanan }, paketMap, aliasKat));
          });
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
// Prefill dari URL query params (prioritas tertinggi)
// Data dikirim via WA/Email link dengan encode base64 untuk items
// ============================================================
function prefillFromQueryParams(params) {
  return new Promise((resolve) => {
    try {
      const noPesanan = params.get('noPesanan') || '';
      if (!noPesanan) { resolve({}); return; }

      const orderData = {
        _prefilled: true,
        noPesanan: noPesanan,
        namaKonsumen: params.get('namaKonsumen') || '',
        hpKonsumen: params.get('hpKonsumen') || '',
        namaSponsor: params.get('namaSponsor') || '',
        hpSponsor: params.get('hpSponsor') || '',
        alamat: params.get('alamat') || '',
        kelurahan: params.get('kelurahan') || '',
        kecamatan: params.get('kecamatan') || '',
        kota: params.get('kota') || '',
        propensi: params.get('propensi') || '',
        kategoriPesanan: params.get('kategoriPesanan') || '',
        items: []
      };

      // Decode items dari base64 jika ada
      const itemsB64 = params.get('items');
      if (itemsB64) {
        try {
          // Apps Script: Utilities.base64Encode(itemsStr, UTF_8).
          // JS: atob mengembalikan byte string → didecode dengan decodeURIComponent(escape(...))
          //     agar karakter UTF-8 (mis. tanda kurung, nama dengan char non-ASCII) tidak rusak
          //     dan parsing JSON tidak throw SyntaxError.
          const byteStr = atob(itemsB64);
          const decoded = decodeURIComponent(escape(byteStr));
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) orderData.items = parsed;
        } catch (e) {
          // Fallback: coba atob langsung tanpa escape decode
          try {
            const decoded2 = atob(itemsB64);
            const parsed2 = JSON.parse(decoded2);
            if (Array.isArray(parsed2)) orderData.items = parsed2;
          } catch (e2) {
            console.warn('decode items b64 gagal kedua metode:', e2 && e2.message);
          }
        }
      }

      // Jika field apapun terisi (nama OR items OR namaSponsor), anggap URL prefill valid.
      const hasAnyField = Boolean(orderData.namaKonsumen
        || (orderData.items && orderData.items.length)
        || orderData.namaSponsor
        || orderData.alamat
        || orderData.kota);
      console.log('🔎 prefillFromQueryParams: noPesanan=', noPesanan,
                  'namaKonsumen=', orderData.namaKonsumen,
                  'items.length=', (orderData.items||[]).length);
      if (hasAnyField) {
        resolve(orderData);
      } else {
        resolve({});
      }
    } catch (err) {
      console.error('prefillFromQueryParams error:', err);
      resolve({});
    }
  });
}

// ============================================================
// Ambil mapping kategori -> nama paket LENGKAP dari sheet TabelHarga
// via endpoint getPaketProdukByKategori (single source of truth).
// Menggunakan JSONP pattern (sama dengan getDataPesananByInvoice).
// Mengembalikan { mapPaket, aliasKategori } atau throw error jika timeout/gagal.
// ============================================================
function loadPaketMapFromTabelHarga_() {
  return new Promise(function(resolve, reject) {
    try {
      const cbName = 'cb_paketmap_' + Date.now();
      const script = document.createElement('script');
      const url = URL_dbEstihtools
        + '?action=getPaketProdukByKategori'
        + '&callback=' + cbName;
      const timeoutId = setTimeout(function() {
        try { document.head.removeChild(script); } catch (e) {}
        try { delete window[cbName]; } catch (e) {}
        reject(new Error('timeout getPaketProdukByKategori'));
      }, 4000);

      window[cbName] = function(resp) {
        clearTimeout(timeoutId);
        try { document.head.removeChild(script); } catch (e) {}
        try { delete window[cbName]; } catch (e) {}
        if (!resp || resp.status === 'error') {
          reject(new Error((resp && resp.message) || 'gagal getPaketProdukByKategori'));
          return;
        }
        resolve({
          mapPaket: resp.mapPaket || {},
          aliasKategori: resp.aliasKategori || {}
        });
      };
      script.src = url;
      script.onerror = function() {
        clearTimeout(timeoutId);
        try { document.head.removeChild(script); } catch (e) {}
        try { delete window[cbName]; } catch (e) {}
        reject(new Error('onerror getPaketProdukByKategori'));
      };
      document.head.appendChild(script);
    } catch (err) {
      reject(err);
    }
  });
}

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
          kategoriPesanan: resp.mKategoriPesanan || resp.kategoriPesanan || '',
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

function applyOrderData(orderData, paketMapFromTabelHarga, aliasKategoriFromTabelHarga) {
  document.getElementById('nomorPesanan').value = orderData.noPesanan || "";
  document.getElementById('nama').value         = orderData.namaKonsumen || "";
  document.getElementById('namaSponsor').value  = orderData.namaSponsor  || "";

  const alamatLengkap = [orderData.alamat, orderData.kelurahan, orderData.kecamatan, orderData.kota, orderData.propensi]
    .filter(Boolean).join(', ');
  const alamatEl = document.getElementById('alamat');
  if (alamatEl) alamatEl.value = alamatLengkap;

  const detailEl = document.getElementById('detailProduk');
  if (!detailEl) return;

  // Helper: dapatkan nama dari satu item dengan semua kemungkinan field (case insensitive)
  function getItemName(it) {
    if (!it) return '';
    if (typeof it === 'string') return it.trim();
    return String(
      it.nama ||
      it.mNama ||
      it.mNamaProduk ||
      it.namaProduk ||
      it.mNamaPaket ||
      it.namaPaket ||
      it.mNamaProdukLengkap ||
      it.mNamaPkt ||
      it.product ||
      it.itemName ||
      ''
    ).trim();
  }
  function getItemKategori(it) {
    if (!it || typeof it !== 'object') return '';
    return String(
      it.kategori ||
      it.mKategori ||
      it.kategoriPesanan ||
      it.mKategoriPesanan ||
      it.category ||
      ''
    ).trim().toLowerCase();
  }
  function getItemQty(it) {
    if (!it || typeof it !== 'object') return 0;
    return (
      Number(it.qty) ||
      Number(it.jumlah) ||
      Number(it.mJumlah) ||
      Number(it.mJml) ||
      Number(it.quantity) ||
      0
    );
  }

  console.log('🔎 applyOrderData: orderData=', orderData,
              'paketMapFromTabelHarga=', paketMapFromTabelHarga,
              'aliasKategoriFromTabelHarga=', aliasKategoriFromTabelHarga);

  // Normalisasi items: ambil setidaknya nama (bisa dari banyak sumber field)
  const normalized = (orderData.items || [])
    .map(function(it) { return { nama: getItemName(it), kategori: getItemKategori(it), qty: getItemQty(it) }; })
    .filter(function(it) { return it.nama || it.kategori; });

  // SUMBER KEBENARAN: PAKET MAP DARI SHEET TabelHarga (via getPaketProdukByKategori)
  // Fallback HANYA jika request sheet TabelHarga gagal.
  const FALLBACK_MAP = {
    lansia:  "Paket Manula (Formula 1, PP3, Multivitamin, Herbalifeline, Tas Produk)",
    dewasa:  "Paket Usia Dewasa (Formula 1, PP3, Aloe Vera, Teh NRG, Tas Produk)",
    remaja:  "Paket Usia Remaja (Formula 1, PP3, Aloe Vera, Teh NRG, Tas Produk)",
    sarapan: "Paket Start Now Pack ( F1, Aloe Vera, Teh Concentrate, Tas Produk)",
    naikbb:  "Paket Muscle Gain (RS Pro24, Formula 1, PP3, Aloe Vera, Teh Concentrate, Mixed Viber, Tas Produk)",
    turunbb: "Paket Weight Losss (Formula 1, PP3, Aloe Vera, Teh Concentrate, Mixed Fiber, Cell U Loss, Tas Produk)"
  };
  const FALLBACK_ALIAS = {
    'manula':'lansia','usiadewasa':'dewasa','usiaremaja':'remaja',
    'startnow':'sarapan','startnowpack':'sarapan','musclegain':'naikbb',
    'weightloss':'turunbb','weightlosss':'turunbb','naikbb':'naikbb','turunbb':'turunbb',
    'lansia':'lansia','dewasa':'dewasa','remaja':'remaja','sarapan':'sarapan',
    'usia dewasa':'dewasa','usia remaja':'remaja','start now':'sarapan',
    'start now pack':'sarapan','muscle gain':'naikbb','weight loss':'turunbb',
    'weight losss':'turunbb','naik bb':'naikbb','turun bb':'turunbb'
  };
  const PAKET_MAP = Object.assign(
    {},
    FALLBACK_MAP,
    (paketMapFromTabelHarga && typeof paketMapFromTabelHarga === 'object') ? paketMapFromTabelHarga : {}
  );
  // Alias gabungan: alias dari sheet TabelHarga diutamakan (override fallback alias)
  const ALIAS_KAT = Object.assign(
    {},
    FALLBACK_ALIAS,
    (aliasKategoriFromTabelHarga && typeof aliasKategoriFromTabelHarga === 'object') ? aliasKategoriFromTabelHarga : {}
  );

  // Normalizer kategori: persis sama dengan backend normalizeKat_
  // trim lowercase -> hapus spasi -> lookup alias
  function normalizeKat_(k) {
    var raw = String(k || '').trim().toLowerCase();
    if (!raw) return '';
    var compact = raw.replace(/\s+/g, '');
    // cek 3 layer: raw, compact, alias of raw/compact
    if (PAKET_MAP[raw]) return raw;
    if (PAKET_MAP[compact]) return compact;
    if (ALIAS_KAT[raw]) {
      var r1 = ALIAS_KAT[raw];
      if (PAKET_MAP[r1]) return r1;
    }
    if (ALIAS_KAT[compact]) {
      var r2 = ALIAS_KAT[compact];
      if (PAKET_MAP[r2]) return r2;
    }
    return '';
  }

  // 🔎 PRIORITAS KATEGORI (MENJAGA AGAR TIDAK TAMPIL SEMUA PAKET):
  // ------------------------------------------------------------------
  // User request: Detail Produk JANGAN tampilkan semua paket, CUKUP
  // yang konsumen BELI saja.
  //
  // Rule prioritas (sangat ketat):
  //   1. TERTINGGI = orderData.kategoriPesanan  (single value dari
  //      localStorage.pesananKategori di frmProduk.html).
  //      JIKA ADA → HANYA GUNAKAN INI SAJA, JANGAN lihat items-level kategori
  //      (karena item-level kadang fieldnya tidak konsisten antar sheet dan
  //       bisa menyebabkan kebetulan match ke SEMUA kategori 6 paket).
  //   2. HANYA JIKA kategoriPesanan KOSONG → baru gabung dari kategori item per item.
  // ------------------------------------------------------------------
  let kategoriDariItems = [];
  if (orderData.kategoriPesanan) {
    const resolved = normalizeKat_(orderData.kategoriPesanan);
    if (resolved) kategoriDariItems = [resolved];  // HANYA 1 nilai, tidak digabung items
    console.log('🔎 applyOrderData: PAKAI kategoriPesanan (prioritas tertinggi):', kategoriDariItems);
  } else {
    // Hanya jika kategoriPesanan tidak ada, baru gabung kategori dari tiap item
    normalized.forEach(function(it){
      if (!it.kategori) return;
      const resolved = normalizeKat_(it.kategori);
      if (resolved && !kategoriDariItems.includes(resolved)) kategoriDariItems.push(resolved);
    });
    console.log('🔎 applyOrderData: PAKAI kategori dari tiap item (kategoriPesanan kosong):', kategoriDariItems);
  }

  const resolvedPaketList = [];
  kategoriDariItems.forEach(function(k){
    if (PAKET_MAP[k]) {
      if (!resolvedPaketList.includes(PAKET_MAP[k])) resolvedPaketList.push(PAKET_MAP[k]);
    }
  });

  console.log('🔎 applyOrderData kategoriDariItems=', kategoriDariItems,
              'resolvedPaketList=', resolvedPaketList,
              'normalized=', normalized);

  // SCENARIO A: Ada kategori yang match ke paket → tampilkan NAMA PAKET LENGKAP
  if (resolvedPaketList.length) {
    detailEl.value = resolvedPaketList.join('\n');
    return;
  }

  // SCENARIO B: Tidak ada kategori tapi ada nama items → tampilkan nama produk TANPA x1
  const daftarNamaProduk = normalized.map(function(it){ return it.nama; }).filter(Boolean);
  if (daftarNamaProduk.length) {
    detailEl.value = daftarNamaProduk.join('\n');
    return;
  }

  // SCENARIO C: items normalized kosong TAPI orderData.items asli (belum ternormalisasi) punya data → coba langsung
  if (orderData.items && orderData.items.length && orderData.items.map) {
    const langsung = orderData.items.map(function(it){
      if (typeof it === 'string') return it.trim();
      return '';
    }).filter(Boolean);
    if (langsung.length) { detailEl.value = langsung.join('\n'); return; }
  }

  // SCENARIO D: items dari query params tidak ada → mungkin data dari JSONP resp.items
  // pakai object asli items asli lagi
  const rawItems = orderData.items || [];
  if (rawItems.length) {
    const namaMentah = rawItems.map(function(x){
      if (!x) return '';
      if (typeof x === 'string') return x.trim();
      // ambil semua nilai string dari object, yang panjang >1 karakter (bukan flag boolean/number)
      var vals = [];
      for (var k in x) {
        if (Object.prototype.hasOwnProperty.call(x, k)) {
          var v = x[k];
          if (typeof v === 'string' && v.trim().length > 1 && !v.startsWith('http')) vals.push(v.trim());
        }
      }
      return vals.join(' ');
    }).filter(Boolean);
    if (namaMentah.length) { detailEl.value = namaMentah.join('\n'); return; }
  }

  // SCENARIO E: Semua percobaan di atas gagal → Detail Produk tetap terisi placeholder
  //             agar user tidak bingung "kenapa kosong". Bisa dihapus user mau ubah.
  detailEl.value = '-';
  console.warn('⚠️ Detail Produk tidak bisa diisi otomatis. orderData:', orderData);
}

function tampilPesan(tipe, pesan) {
  const msg = document.getElementById("formMessage");
  if (!msg) return;
  const alertClass = tipe === 'error' ? 'alert alert-danger' : 'alert alert-success';
  msg.innerHTML = `<div class="${alertClass}">${pesan}</div>`;
}
