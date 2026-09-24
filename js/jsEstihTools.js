// *******************************
// URL Web App Google Apps Script 
// *******************************
let isEditMode     = false;  // Untuk mendefenisikan mode Edit
let currentEditRow = null;   // Untuk menyimpan referensi row yang sedang diedit
// Untuk memastikan tidak ada event listener ganda
const orderTbody = document.querySelector('#orderTable tbody');
if (orderTbody) {
  orderTbody.replaceWith(orderTbody.cloneNode(true));
}

// ****************************************************************
// MAPPING KATEGORI -> PAKET PRODUK
// ATURAN BARU FLEXIBEL (TIDAK hardcode lagi!):
//   ✅ Data mapping diambil dari SHEET Google Sheets:
//        1) Sheet "TabelKategori"  (Kolom A = kode kategori, Kolom B = label kategori)
//        2) Sheet "TabelHarga"     (Kolom B = Kategori [label], Kolom C = NamaProduk)
//        via backend action getPaketProdukByKategori.
//   ✅ Mapping disimpan di sessionStorage (TTL 10 menit) agar tidak request setiap load,
//      hemat bandwidth dan page lebih cepat.
//   ✅ FALLBACK_MAP: di bawah ini hanya sebagai SAFETY NET (jika server error / timeout),
//      BUKAN sumber kebenaran lagi. Jadi jika kategori baru ditambahkan di sheet,
//      otomatis muncul tanpa ubah kode — cukup update sheet saja.
// ****************************************************************

const PAKET_PRODUK_FALLBACK = {
  lansia:  "Paket Manula (Formula 1, PP3, Multivitamin, Herbalifeline, Tas Produk)",
  dewasa:  "Paket Usia Dewasa (Formula 1, PP3, Aloe Vera, Teh NRG, Tas Produk)",
  remaja:  "Paket Usia Remaja (Formula 1, PP3, Aloe Vera, Teh NRG, Tas Produk)",
  sarapan: "Paket Start Now Pack ( F1, Aloe Vera, Teh Concentrate, Tas Produk)",
  naikBB:  "Paket Muscle Gain (RS Pro24, Formula 1, PP3, Aloe Vera, Teh Concentrate, Mixed Viber, Tas Produk)",
  turunBB: "Paket Fat Loss (Formula 1, PP3, Aloe Vera, Teh Concentrate, Mixed Fiber, Cell U Loss, Tas Produk)"
};

// Diisi async saat DOMContentLoaded (dari getPaketProdukByKategori JSONP).
// Mutabel: bisa di-replace kapan saja (bukan const).
let PAKET_PRODUK_BY_KATEGORI = Object.assign({}, PAKET_PRODUK_FALLBACK);

const PAKET_BY_KATEGORI_CACHE_KEY = 'cache_paket_by_kategori_v1';
const PAKET_BY_KATEGORI_CACHE_TTL = 10 * 1000; // 10 detik (ms)

// Refresh PAKET_PRODUK_BY_KATEGORI dari backend TabelHarga + TabelKategori.
// Hasil disimpan ke sessionStorage (TTL 10 detik).
function refreshPaketByKategoriFromSheet_() {
  return new Promise(function(resolve) {
    try {
      // Step 1: Coba baca dari sessionStorage duluan (jika masih valid).
      try {
        const raw = sessionStorage.getItem(PAKET_BY_KATEGORI_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const ts = Number(parsed && parsed._ts) || 0;
          const age = Date.now() - ts;
          if (age >= 0 && age < PAKET_BY_KATEGORI_CACHE_TTL && parsed.mapPaket && typeof parsed.mapPaket === 'object') {
            PAKET_PRODUK_BY_KATEGORI = Object.assign({}, PAKET_PRODUK_FALLBACK, parsed.mapPaket);
            console.log('✅ PAKET_PRODUK_BY_KATEGORI: pakai cache sessionStorage (age=' + Math.round(age/1000) + 's), jumlah kategori=' + Object.keys(PAKET_PRODUK_BY_KATEGORI).length);
            resolve(true);
            return;
          }
        }
      } catch (eCache) { /* abaikan, lanjut ke network */ }

      // Step 2: Request backend getPaketProdukByKategori (pakai fetchJsonpEstihtools helper).
      fetchJsonpEstihtools('getPaketProdukByKategori', {}).then(function(resp) {
        try {
          if (!resp || resp.status === 'error') {
            throw new Error((resp && resp.message) || 'getPaketProdukByKategori gagal');
          }
          const mapPaket = resp.mapPaket || {};
          // Update global variable (merge dengan fallback agar kategori lama yang tidak di sheet
          // TabelKategori tetap terbaca).
          PAKET_PRODUK_BY_KATEGORI = Object.assign({}, PAKET_PRODUK_FALLBACK, mapPaket);
          // Simpan ke sessionStorage dengan timestamp.
          try {
            sessionStorage.setItem(PAKET_BY_KATEGORI_CACHE_KEY, JSON.stringify({
              _ts: Date.now(),
              mapPaket: PAKET_PRODUK_BY_KATEGORI
            }));
          } catch (eSave) { /* abaikan quota penuh */ }
          console.log('✅ PAKET_PRODUK_BY_KATEGORI: refresh dari TabelKategori + TabelHarga SUKSES, jumlah kategori=' + Object.keys(PAKET_PRODUK_BY_KATEGORI).length);
          resolve(true);
        } catch (errInner) {
          console.warn('⚠️ PAKET_PRODUK_BY_KATEGORI: parse response gagal, pakai FALLBACK_MAP. Error:', errInner);
          PAKET_PRODUK_BY_KATEGORI = Object.assign({}, PAKET_PRODUK_FALLBACK);
          resolve(false);
        }
      }).catch(function(errNet) {
        console.warn('⚠️ PAKET_PRODUK_BY_KATEGORI: network/JSONP error, pakai FALLBACK_MAP. Error:', errNet);
        PAKET_PRODUK_BY_KATEGORI = Object.assign({}, PAKET_PRODUK_FALLBACK);
        resolve(false);
      });
    } catch (errOuter) {
      console.warn('⚠️ PAKET_PRODUK_BY_KATEGORI: wrapper error, pakai FALLBACK_MAP. Error:', errOuter);
      PAKET_PRODUK_BY_KATEGORI = Object.assign({}, PAKET_PRODUK_FALLBACK);
      resolve(false);
    }
  });
}

// ****************************************************************
// Global state untuk conditional behavior level user (peserta/member)
// Diisi oleh initPesananContext() saat DOMContentLoaded pertama.
// ****************************************************************
const pesananState = {
  level: 'peserta',       // default = peserta
  totalPoint: 0,          // total point dari PROGRAM kolom AZ
  voucherAmount: 0,       // nilai voucher potongan (Rp) dari TabelVoucer
  userId: ''              // userId login (dari localStorage.userId)
};

// ****************************************************************
// Helper JSONP ke URL_dbEstihtools (TabelDiskon, TabelByKirim, TabelVoucer, TabelBank, DataPesanan)
// ****************************************************************
function fetchJsonpEstihtools(action, params = {}) {
  return new Promise((resolve) => {
    const callbackName = `est_${action}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    const query = new URLSearchParams({ action, callback: callbackName, ...params });
    script.onerror = () => {
      cleanupJsonp(script, callbackName);
      resolve({ status: 'error', message: 'Gagal menghubungi server Estihtools.' });
    };
    window[callbackName] = (response) => {
      cleanupJsonp(script, callbackName);
      resolve(response || { status: 'error', message: 'Respons server kosong.' });
    };
    script.src = `${URL_dbEstihtools}?${query.toString()}`;
    document.body.appendChild(script);
  });
}

// **********************************************
// Fungsi untuk koneksi dengan Google Apps Script 
// **********************************************
function callAPI(action, params = {}, method = "GET") {
  const url = URL_dbEstihtools;

  if (method === "GET") {
    const requestUrl = new URL(url);
    requestUrl.searchParams.append("action", action);
    Object.keys(params).forEach(key => requestUrl.searchParams.append(key, params[key]));
    return fetch(requestUrl).then(res => res.json());
  } else {
    // POST pakai no-cors → biar lolos blokir CORS GAS
    const payload = JSON.stringify({ action, ...params });
    return fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload
    });
    // NOTE: tidak bisa pakai res.json() karena no-cors
  }
}

function cleanupJsonp(script, callbackName) {
  delete window[callbackName];
  if (script && document.body.contains(script)) {
    document.body.removeChild(script);
  }
}

function fetchJsonpProgram(action, params = {}) {
  return new Promise((resolve) => {
    const callbackName = `estih_cb_${action}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    const query = new URLSearchParams({ action, callback: callbackName, ...params });

    script.onerror = () => {
      cleanupJsonp(script, callbackName);
      resolve({ status: 'error', message: 'Gagal menghubungi server data konsumen.' });
    };

    window[callbackName] = (response) => {
      cleanupJsonp(script, callbackName);
      resolve(response || { status: 'error', message: 'Respons server kosong.' });
    };

    script.src = `${URL_dbProgram}?${query.toString()}`;
    document.body.appendChild(script);
  });
}

function normalizePhoneForInput(value) {
  let v = String(value || '').replace(/\D/g, '');
  if (!v) return '';
  if (v.indexOf('62') === 0) v = v.slice(2);
  v = v.replace(/^0+/, '');
  return v;
}

async function prefillDataKonsumen(options = {}) {
  try {
    const { force = false } = options;
    const userId = String(localStorage.getItem('userId') || '').trim();
    if (!userId) {
      if (force) showNotification('warning', 'PERHATIAN: userId login tidak ditemukan. Silahkan login ulang.');
      return;
    }
    if (!URL_dbProgram) {
      if (force) showNotification('error', 'ERROR: URL_dbProgram belum dikonfigurasi.');
      return;
    }

    const response = await fetchJsonpProgram('getDataKonsumenByUserId', { userId });
    if (!response) {
      if (force) showNotification('error', 'ERROR: Respons dbProgram kosong.');
      return;
    }
    if (response.status !== 'success' || !response.data) {
      if (force) showNotification('warning', `PERHATIAN: Data konsumen tidak ditemukan untuk userId ${userId}.`);
      return;
    }

    const data = response.data;

    const namaSponsorEl = document.getElementById('namaSponsor');
    const hpSponsorEl = document.getElementById('hpSponsor');
    const namaKonsumenEl = document.getElementById('namaKonsumen');
    const hpKonsumenEl = document.getElementById('hpKonsumen');
    const alamatEl = document.getElementById('alamat');
    const kelurahanEl = document.getElementById('kelurahan');
    const kecamatanEl = document.getElementById('kecamatan');
    const kotaEl = document.getElementById('kota');
    const propensiEl = document.getElementById('propensi');

    if (namaKonsumenEl && (force || !namaKonsumenEl.value)) namaKonsumenEl.value = String(data.nama || '').toUpperCase();
    if (alamatEl && (force || !alamatEl.value)) alamatEl.value = String(data.alamat || '').toUpperCase();
    if (hpKonsumenEl && (force || !hpKonsumenEl.value)) hpKonsumenEl.value = normalizePhoneForInput(data.telp);
    if (kelurahanEl && (force || !kelurahanEl.value)) kelurahanEl.value = String(data.kelurahan || '').toUpperCase();
    if (kecamatanEl && (force || !kecamatanEl.value)) kecamatanEl.value = String(data.kecamatan || '').toUpperCase();
    if (kotaEl && (force || !kotaEl.value)) kotaEl.value = String(data.kota || '').toUpperCase();
    if (propensiEl && (force || !propensiEl.value)) propensiEl.value = String(data.propensi || '').toUpperCase();

    if (namaSponsorEl && (force || !namaSponsorEl.value)) namaSponsorEl.value = String(data.namaSponsor || '').toUpperCase();
    if (hpSponsorEl && (force || !hpSponsorEl.value)) hpSponsorEl.value = normalizePhoneForInput(data.hpSponsor);
  } catch (error) {
    console.error(error);
  }
}

// **********************************************
// Inisialisasi saat halaman sudah load sempurna
// Urutan: initPesananContext() -> loadOptions() -> prefillDataKonsumen()
// Catatan: HANYA ADA SATU DOMContentLoaded UTAMA agar loadOptions tidak inject opsi ganda.
// **********************************************
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed - mode pemesanan produk Beratidealku");

    // 🔹 INISIALISASI BOOTSTRAP TOOLTIPS (global di halaman utama, bukan hanya modal)
    //    Sama persis dengan pola tooltips di formDashboard.html FollowupCrm Edit menu
    try {
      if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const allTooltipTriggers = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        allTooltipTriggers.forEach(function(el) {
          var old = bootstrap.Tooltip.getInstance(el);
          if (old) old.dispose();
          new bootstrap.Tooltip(el, {
            trigger: 'hover focus',
            container: 'body',
            placement: 'top'
          });
        });
        console.log('✅ Global tooltips diinisialisasi: jumlah=' + allTooltipTriggers.length);
      }
    } catch (eTt) {
      console.warn('⚠️ Init tooltips gagal (abaikan jika bootstrap belum load):', eTt.message);
    }

    // 🔹 PERTAMA: Refresh mapping PAKET_PRODUK_BY_KATEGORI dari sheet TabelKategori + TabelHarga
    //    (cache 10 detik, fallback ke PAKET_PRODUK_FALLBACK jika error / timeout)
    //    Berjalan async PARALEL dengan initPesananContext supaya tidak delay load form lebih lama
    const paketReady = refreshPaketByKategoriFromSheet_().catch(()=>false);

    // Generate Tanggal dan Invoice
    const mDateField    = document.getElementById('date'); 
    const mInvoiceField = document.getElementById('invoice');
    const mToday        = new Date();
    
    if (mDateField) {
      mDateField.value = mToday.toISOString().split('T')[0];
      mDateField.disabled = true;
    }
    if (mInvoiceField) {
      mInvoiceField.value = `INV-${mToday.getFullYear()}${(mToday.getMonth()+1).toString().padStart(2,'0')}${mToday.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
      mInvoiceField.disabled = true;
    }

    // quantity default = 1 (minimal 1 paket), sesuai requirement 2
    const qtyEl = document.getElementById('quantity');
    if (qtyEl) {
      qtyEl.min = '1';
      if (!qtyEl.value || parseInt(qtyEl.value,10) < 1) qtyEl.value = '1';
    }

    // AMBIL USER CONTEXT (level, totalPoint, namaSponsor, hpSponsor, namaKonsumen)
    // HANYA setelah context didapat -> loadOptions() + prefillDataKonsumen()
    Promise.all([
      paketReady,
      initPesananContext()
    ])
      .then(() => {
        return loadOptions();
      })
      .then(() => {
        return prefillDataKonsumen();
      })
      .then(() => {
        // Set Diskon label di header tabel kolom ke-5 sesuai pilihan awal
        const disSel = document.getElementById('discount');
        if (disSel && disSel.options[disSel.selectedIndex]) {
          document.querySelector('#orderTable th:nth-child(5)').textContent = `Diskon ${disSel.options[disSel.selectedIndex].text}`;
        }
      })
      .catch(err => {
        console.error('init error:', err);
        showNotification('warning', '⚠️ Sebagian data gagal dimuat. Form tetap bisa digunakan.');
      });

    // Event listener untuk edit jumlah item
    const tableBody = document.querySelector('#orderTable tbody');
    if (tableBody) {
        tableBody.addEventListener('input', function(e) {
            if (e.target.classList.contains('qty-input')) {
                const row = e.target.closest('tr');
                const qty = parseInt(e.target.value) || 0;
                const priceAfterDiscount = parseFloat(row.getAttribute('data-harga-setelah-diskon')) || 0;
                row.cells[7].textContent = formatCurrency(priceAfterDiscount * qty);
                updateTotals();
            }
        });
    }

    // Event listener untuk tombol close Ketentuan dan Kebijakan
    const closeKetentuanBtn = document.querySelector('.close');
    if (closeKetentuanBtn) closeKetentuanBtn.addEventListener('click', hideKetentuanModal);
    // Event listener untuk tombol SETUJU Ketentuan dan Kebijakan
    const setujuButtonEl = document.getElementById('setujuButton');
    if (setujuButtonEl) {
      setujuButtonEl.addEventListener('click', function() {
        hideKetentuanModal();
        showNotification('success', 'SUKSES : Anda telah menyetujui ketentuan dan kebijakan');
      });
    }

    // Event listener untuk checkbox Ketentuan dan Kebijakan
    const agreeCheckboxEl = document.getElementById('agreeCheckbox');
    if (agreeCheckboxEl) {
      agreeCheckboxEl.addEventListener('change', function() {
        const setujuButton = document.getElementById('setujuButton');
        if (setujuButton) setujuButton.disabled = !this.checked;
      });
    }

    // Event listener untuk link Ketentuan dan Kebijakan
    const ketentuanLinkEl = document.querySelector('a[href="ketentuan.html"]');
    if (ketentuanLinkEl) {
      ketentuanLinkEl.addEventListener('click', function(event) {
        event.preventDefault();
        showKetentuanModal();
      });
    }      
    
    console.log("Aplikasi siap digunakan - mode pemesanan produk");
    isEditMode = false;
});

// *************************
// Fungsi untuk nambah data
// *************************
function addItem() {
  const mDiscountSelect = document.getElementById('discount');
  const mProductSelect = document.getElementById('product');
  const mQuantity = parseInt(document.getElementById('quantity').value) || 0;
  const mShippingSelect = document.getElementById('shipping');
  const selectedDiscountLabel = mDiscountSelect.options[mDiscountSelect.selectedIndex]
    ? mDiscountSelect.options[mDiscountSelect.selectedIndex].text
    : '';

  // Requirement 2: Jumlah minimal 1 Paket -> notifikasi khusus
  if (mQuantity < 1) {
    showNotification('warning', 'PERHATIAN : Jumlah minimal 1 (satu) Paket');
    return;
  }
  if (!mProductSelect.value || !mDiscountSelect.value || !mShippingSelect.value) {
    showNotification('warning', 'PERHATIAN : Lengkapi pilihan Produk, Jumlah (min. 1 Paket), Diskon dan Pengiriman');
    return;
  }

  fetchJsonpEstihtools("getProductDetails", { noStok: mProductSelect.value }).then(mProductData => {
    if (!mProductData || mProductData.status === 'error') {
      showNotification('error', (mProductData && mProductData.message) ? mProductData.message : 'ERROR: Gagal memuat detail produk');
      return;
    }
    const mTableBody = document.querySelector("#orderTable tbody");
    const mDiscount = mDiscountSelect.value;

    let mPriceAfterDiscount;
    switch (mDiscount) {
      case "0%": mPriceAfterDiscount = mProductData.HargaEceran; break;
      case "25%": mPriceAfterDiscount = mProductData.Member25; break;
      case "35%": mPriceAfterDiscount = mProductData.SC35; break;
      case "42%": mPriceAfterDiscount = mProductData.SB42; break;
      case "50%": mPriceAfterDiscount = mProductData.SPV50; break;
      default: mPriceAfterDiscount = mProductData.HargaEceran;
    }

    const mDiskonNominal = Math.max(0, (Number(mProductData.HargaEceran) || 0) - (Number(mPriceAfterDiscount) || 0));
    const mHarga = mPriceAfterDiscount * mQuantity;
    const mTotVP = mProductData.VP * mQuantity;

    // tambahkan atribut data-kategori, data-vp, dan data-harga ke <tr>
    const mNewRow = `
      <tr data-kategori="${mProductData.Kategori}" 
          data-vp-asli="${mProductData.VP}" 
          data-harga-setelah-diskon="${mPriceAfterDiscount}">
        <td>${mTableBody.rows.length + 1}</td>
        <td>${mProductSelect.value}</td>
        <td>${mProductSelect.options[mProductSelect.selectedIndex].text}</td>
        <td>${formatCurrency(mProductData.HargaEceran)}</td>
        <td>${formatCurrency(mDiskonNominal)}</td>
        <td><input type="number" value="${mQuantity}" min="1" max="999" class="qty-input" style="width:60px"></td>
        <td data-vp-nilai="${mTotVP}">${formatCurrency(mTotVP)}</td>
        <td data-harga-nilai="${mHarga}">${formatCurrency(mHarga)}</td>
        <td class="text-center">
          <span class="delete-icon" onclick="deleteItem(this)">
            <i class="fas fa-times"></i>
          </span>
        </td>
      </tr>
    `;

    mTableBody.insertAdjacentHTML("beforeend", mNewRow);
    document.querySelector('#orderTable th:nth-child(5)').textContent = `Diskon ${selectedDiscountLabel}`;
    document.getElementById("submitButton").disabled = false;
      
    // Perbarui total setelah menambahkan item
    updateTotals();

    callAPI("saveOrder", collectOrderData(), "POST");
    disableFields();

    showSpinner("btnAdd");
    showNotification('success', 'SUKSES : Item berhasil di tambah');
    setTimeout(() => hideSpinner("btnAdd"), 1000); // simulasi selesai proses
  }).catch(error => {
    showNotification('error', 'ERROR : ' + error.message);
  });
}

// *******************
// Fungsi Delete Item 
// *******************
function deleteItem(icon) {
    const row = icon.closest('tr');
    const noStok = row.cells[1].textContent.trim();
    
    // Hapus dari tampilan
    row.remove();
    
    // Update tampilan
    updateItemNumbers();
    updateTotals();
    
    // Hapus dari sheet
    const invoice = document.getElementById("invoice").value;
    callAPI("deleteItem", { noStok: noStok, invoice: invoice }, "POST")
        .then(response => {
            showNotification('success', 'Item berhasil dihapus');
        })
        .catch(error => {
            showNotification('error', 'Gagal menghapus item');
        });
}

// ******************
// Tampilkan spinner
// *****************
function showSpinner(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = true;
  const spinner = btn.querySelector(".spinner-border");
  if (spinner) spinner.style.display = "inline-block";
}

// ********************
// Sembunyikan spinner
// ********************
function hideSpinner(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = false;
  const spinner = btn.querySelector(".spinner-border");
  if (spinner) spinner.style.display = "none";
}

// *********************
// Update Seluruh Total 
// Catatan: Rumus diperbarui agar memperhitungkan Voucher (potongan).
//   grandTotal = Total Harga + By Kirim + Pajak - Voucher
// *********************
function updateTotals() {
  const rows = document.querySelectorAll('#orderTable tbody tr');
  let totalJumlah = 0;
  let totalVP = 0;
  let totalHarga = 0;

    rows.forEach(row => {
    const qtyInput = row.querySelector('.qty-input');
    const qty = qtyInput ? parseInt(qtyInput.value) || 0 : 0;
    const vpPerItem = parseFloat(row.getAttribute('data-vp-asli')) || 0;
    const priceAfterDiscount = parseFloat(row.getAttribute('data-harga-setelah-diskon')) || 0;

    const rowTotalVP = vpPerItem * qty;
    const rowTotalHarga = priceAfterDiscount * qty;

    row.cells[6].textContent = formatCurrency(rowTotalVP);
    row.cells[6].setAttribute('data-vp-nilai', rowTotalVP);
    row.cells[7].textContent = formatCurrency(rowTotalHarga);
    row.cells[7].setAttribute('data-harga-nilai', rowTotalHarga);

    totalJumlah += qty;
    totalVP += rowTotalVP;
    totalHarga += rowTotalHarga;
  });

  document.getElementById('totalJumlah').textContent = totalJumlah;
  document.getElementById('totalVP').textContent = formatCurrency(totalVP);
  document.getElementById('totalHarga').textContent = formatCurrency(totalHarga);

  const shippingCost = parseFloat(document.getElementById('shipping').value) || 0;
  const tax = 0;
  const voucherAmt = (pesananState && pesananState.voucherAmount) ? Number(pesananState.voucherAmount) : 0;
  const grandTotal = Math.max(0, totalHarga + shippingCost + tax - voucherAmt);

  document.getElementById('shippingCost').textContent = formatCurrency(shippingCost);
  document.getElementById('tax').textContent = formatCurrency(tax);

  const voucherCostEl = document.getElementById('voucherCost');
  if (voucherCostEl) {
    voucherCostEl.textContent = voucherAmt > 0 ? `- ${formatCurrency(voucherAmt)}` : formatCurrency(0);
  }

  document.getElementById('totalPrice').textContent = formatCurrency(grandTotal);
}

// *************************
// Validasi inputan di Form 
// ************************* 
function validateForm() {
    const sponsorNameEl  = document.getElementById('namaSponsor');
    const sponsorPhoneEl = document.getElementById('hpSponsor');
    const consumerNameEl = document.getElementById('namaKonsumen');
    const consumerPhoneEl = document.getElementById('hpKonsumen');
    const consumerEmailEl = document.getElementById('emailKonsumen');

    if (!sponsorNameEl || !sponsorPhoneEl || !consumerNameEl || !consumerPhoneEl || !consumerEmailEl) {
        showNotification('error', 'ERROR: Field form tidak lengkap (cek id input HTML)');
        return false;
    }

    const distributorName  = sponsorNameEl.value.trim().toUpperCase();
    sponsorNameEl.value = distributorName;
    const distributorPhone = sponsorPhoneEl.value.trim();
    const consumerName     = consumerNameEl.value.trim().toUpperCase();
    consumerNameEl.value = consumerName;
    const consumerPhone    = consumerPhoneEl.value.trim();
    const consumerEmail    = consumerEmailEl.value.trim();
       
    const userNamePattern  = /^[A-Z\s]{3,30}$/;                 
    const emailPattern     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;     
    const hpPattern        = /^[0-9]{10,14}$/;                 
    
    // 🔹 Cek kalau SEMUA input kosong
    if (!distributorName && !distributorPhone && !consumerName && !consumerPhone && !consumerEmail) {
        showNotification('warning', 'PERHATIAN: Lengkapi data dengan benar sebelum mengirim');
        return false;
    }

    // 🔹 Validasi Distributor (WAJIB)
    if (!userNamePattern.test(distributorName)) {
        showNotifValidasi("warning", " WARNING : Nama Member, huruf besar dan 3-20 karakter.");
        return false;
    }
    if (!hpPattern.test(distributorPhone)) {
        showNotifValidasi("warning", " WARNING : Nomor HP Member, harus 10-14 digit angka.");
        return false;
    }

    // 🔹 Validasi Konsumen (WAJIB)
    if (!userNamePattern.test(consumerName)) {
        showNotifValidasi("warning", " WARNING : Nama Konsumen, huruf besar dan 3-30 karakter.");
        return false;
    }
    if (!hpPattern.test(consumerPhone)) {
        showNotifValidasi("warning", " WARNING : Nomor HP Konsumen, harus 10-14 digit angka.");
        return false;
    }
    if (consumerEmail && !emailPattern.test(consumerEmail)) {
        showNotifValidasi("warning", " WARNING : Format email perbaiki ! (misalnya : test@example.com)");
        return false;
    }

    return true;
}

// **************************
// Fungsi untuk mereset form
// **************************
function resetForm() {
    console.log("Tombol Reset diklik");
    // Reset form input
    document.getElementById('orderForm').reset();
    
    // Kosongkan tabel pesanan
    document.querySelector('#orderTable tbody').innerHTML = '';

    // Set Tanggal  dan invoice baru
    const mDateField     = document.getElementById('date');       
    const mToday         = new Date();
    mDateField.value     = mToday.toISOString().split('T')[0];   // Format: INV-YYYYMMDD-XXX
    const mInvoiceField  = document.getElementById('invoice');
    const mInvoiceNumber = `INV-${mToday.getFullYear()}${(mToday.getMonth()+1).toString().padStart(2,'0')}${mToday.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
    mInvoiceField.value  = mInvoiceNumber;

    // Reset judul kolom "Diskon" + "Label Diskon" pada Tabel Form Rincian Pesanan
    document.querySelector('#orderTable th:nth-child(5)').textContent = "Diskon";

    // Reset semua nilai total ke 0
    document.getElementById('totalVP').textContent       = formatCurrency(0);
    document.getElementById('totalJumlah').textContent   = 0;
    document.getElementById('totalHarga').textContent    = formatCurrency(0);

    // Reset By Pengiriman, Pajak, dan Total Harga
    document.getElementById('shippingCost').textContent  = formatCurrency(0);
    document.getElementById('tax').textContent           = formatCurrency(0);
    document.getElementById('totalPrice').textContent    = formatCurrency(0);

    // saat form direset
    const dataProdukSection = document.getElementById("dataProdukSection");
    if (dataProdukSection) dataProdukSection.style.display = "block";
    const invoiceSection = document.getElementById("invoiceSection");
    if (invoiceSection) invoiceSection.style.display = "block";
    const orderSummary = document.getElementById("orderSummary");
    if (orderSummary) orderSummary.style.display = "block";
    document.getElementById("inputanSection").style.display = "none";
    document.getElementById("submitButton").style.display = "block";        // Tampilkan tombol "Submit"   
    document.getElementById("submitButton").disabled      = true;           // Nonaktifkan tombol "Submit" 
    document.getElementById("kirimButton").style.display  = "none";         // Sembuyikan tombol "Kirim" 
    document.getElementById("kirimButton").disabled       = true;           // Nonaktifkan tombol "Kirim" 
    document.getElementById("btnAdd").disabled            = false;          // Aktifkan tombol "Tambah" 
    document.getElementById("btnReset").disabled          = false;
    showSpinner("btnReset");
    enableFields();    // Enable semua field kecuali Tanggal dan Invoice

    // Pastikan kembali ke mode TAMBAH
    showNotification('success', 'SUKSES : Form telah direset');
    console.log("Form dan tabel berhasil direset. Semua total diatur ke 0.");
    setTimeout(() => hideSpinner("btnReset"), 1000);
}

// ********************************
// Fungsi untuk DISABLE field-field
// ********************************
function disableFields() {
   const fieldsToDisable = ['discount', 'shipping'];
    fieldsToDisable.forEach(fieldId => {
        const field    = document.getElementById(fieldId);
        field.disabled = true;
    });
}

// ********************************
// Fungsi untuk ENABLE field-field
// ********************************
function enableFields() {
    const fieldsToEnable = ['product','quantity','discount','shipping'];
    fieldsToEnable.forEach(fieldId => {
        const field    = document.getElementById(fieldId);
        field.disabled = false;
    });
}

// **********************************************
// Fungsi untuk memanggil pilihan dropdown field
// DISESUAIKAN DENGAN LEVEL USER (peserta vs member)
// Requirement 3, 4, 5:
//   PESERTA : Diskon=0% (fixed disabled), ByKirim=50000 (fixed disabled), VOUCER TAMPIL.
//   MEMBER  : Diskon=dropdown TabelDiskon, ByKirim=dropdown TabelByKirim, VOUCER HIDDEN=0.
// **********************************************
function loadOptions() {
  const level = (pesananState && pesananState.level) ? String(pesananState.level).toLowerCase() : 'peserta';
  const isPeserta = (level !== 'member');

  return new Promise((resolve) => {
    let tasksDone = 0;
    const totalTasks = 4; // diskon + produk + shipping + voucher
    const doneOne = () => {
      tasksDone++;
      if (tasksDone >= totalTasks) resolve();
    };

    // ======================================================================
    // (1) DISKON
    // ======================================================================
    const discountSelect = document.getElementById('discount');
    if (discountSelect) {
      if (isPeserta) {
        // Requirement 3: level peserta -> Diskon=0% (fixed)
        discountSelect.innerHTML = '<option value="0%">0%</option>';
        discountSelect.value = '0%';
        discountSelect.disabled = true;
        doneOne();
      } else {
        // Requirement 3: member -> dropdown TabelDiskon
  fetchJsonpEstihtools("getDiscounts").then(mDiscounts => {
          const list = Array.isArray(mDiscounts) ? mDiscounts : (mDiscounts && Array.isArray(mDiscounts.data) ? mDiscounts.data : []);
          discountSelect.innerHTML = '<option value="">Pilih Level Diskon</option>';
          if (Array.isArray(list)) {
            list.forEach(discount => {
              const option = document.createElement('option');
              option.value = discount.Diskon || '';
              option.textContent = discount.Level || '';
              discountSelect.appendChild(option);
            });
          }
        }).catch(err => {
          console.error("Gagal memuat diskon:", err);
          discountSelect.innerHTML = '<option value="">Pilih Level Diskon</option>';
        }).finally(doneOne);
      }
    } else {
      doneOne();
    }

    // ======================================================================
    // (2) PRODUK + auto fill berdasarkan kategori frmProduk.html
    // ======================================================================
    const productSelect = document.getElementById('product');
    if (productSelect) {
      Promise.all([
        fetchJsonpEstihtools("getTabelDropdownKategori"),
        fetchJsonpEstihtools("getProducts")
      ]).then(([mKategori, mProducts]) => {
        const kategoriList = (mKategori && Array.isArray(mKategori.data)) ? mKategori.data : [];
        const productList = Array.isArray(mProducts) ? mProducts : (mProducts && Array.isArray(mProducts.data) ? mProducts.data : []);
        autoFillProdukByKategori(productList || [], kategoriList || []);
      }).catch(err => {
        console.error("Gagal memuat produk:", err);
        productSelect.innerHTML = '<option value="">Pilih Nama Produk</option>';
        autoFillProdukByKategori([], []);
      }).finally(doneOne);
    } else {
      doneOne();
    }

    // ======================================================================
    // (3) BY KIRIM
    // ======================================================================
    const shippingSelect = document.getElementById('shipping');
    if (shippingSelect) {
      if (isPeserta) {
        // Requirement 5: level peserta -> By Kirim otomatis 50000 (fixed disabled)
        shippingSelect.innerHTML = '<option value="50000">50000</option>';
        shippingSelect.value = '50000';
        shippingSelect.disabled = true;
        doneOne();
      } else {
        // Requirement 5: member -> dropdown TabelByKirim
        fetchJsonpEstihtools("getShippingOptions").then(mShippingOptions => {
          const list = Array.isArray(mShippingOptions) ? mShippingOptions : (mShippingOptions && Array.isArray(mShippingOptions.data) ? mShippingOptions.data : []);
          shippingSelect.innerHTML = '<option value="">Pilih Jenis Pengiriman</option>';
          if (Array.isArray(list)) {
            list.forEach(shipping => {
              const option = document.createElement('option');
              option.value = shipping.Biaya || 0;
              option.textContent = String(shipping.Biaya || 0);
              shippingSelect.appendChild(option);
            });
          }
        }).catch(err => {
          console.error("Gagal memuat pengiriman:", err);
          shippingSelect.innerHTML = '<option value="">Pilih Jenis Pengiriman</option>';
        }).finally(doneOne);
      }
    } else {
      doneOne();
    }

    // ======================================================================
    // (4) VOUCER (conditional PESERTA/MEMBER)
    // ======================================================================
    applyVoucherBasedOnLevel().finally(doneOne);

    // Update total display
    setTimeout(() => {
      if (typeof updateTotals === 'function') updateTotals();
    }, 50);
  });
}

// ============================================================
// Requirement 1: Auto isi field Produk dari localStorage.pesananKategori
// Mencari exact/substring match di daftar produk terlebih dahulu.
// Jika tidak ada, inject opsi manual secara paksa agar value dapat tersimpan.
// ============================================================
function autoFillProdukByKategori(productList, kategoriList = []) {
  try {
    const kategoriKey = String(localStorage.getItem('pesananKategori') || '').trim();
    const productSelect = document.getElementById('product');
    if (!productSelect) return;

    const normalizeKategori_ = (v) => String(v || '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    const normalizeKategoriCompact_ = (v) => normalizeKategori_(v).replace(/\s+/g, '');

    // Helper: lookup PAKET_PRODUK_BY_KATEGORI secara CASE-INSENSITIVE + compact key
    // (backend TabelHarga key biasanya lowercase compact: "naikbb", bukan "naikBB")
    function getPaketLengkapByKey_(key) {
      if (!key) return '';
      if (PAKET_PRODUK_BY_KATEGORI[key]) return PAKET_PRODUK_BY_KATEGORI[key];
      const keyLower = key.toLowerCase();
      if (PAKET_PRODUK_BY_KATEGORI[keyLower]) return PAKET_PRODUK_BY_KATEGORI[keyLower];
      const keyCompact = keyLower.replace(/\s+/g, '');
      if (PAKET_PRODUK_BY_KATEGORI[keyCompact]) return PAKET_PRODUK_BY_KATEGORI[keyCompact];
      // Terakhir: cari di seluruh key PAKET_PRODUK_BY_KATEGORI, compare compact
      var keys = Object.keys(PAKET_PRODUK_BY_KATEGORI || {});
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k && k.toLowerCase().replace(/\s+/g, '') === keyCompact) return PAKET_PRODUK_BY_KATEGORI[k];
      }
      return '';
    }

    const keyNorm = normalizeKategoriCompact_(kategoriKey);
    let kategoriTarget = kategoriKey;
    if (keyNorm && Array.isArray(kategoriList)) {
      const match = kategoriList.find(k =>
        normalizeKategoriCompact_(k && k.kode) === keyNorm ||
        normalizeKategoriCompact_(k && k.kategori) === keyNorm
      );
      if (match && match.kategori) kategoriTarget = match.kategori;
    }
    const paketLengkap = getPaketLengkapByKey_(kategoriKey);
    if (kategoriTarget === kategoriKey && paketLengkap) {
      kategoriTarget = paketLengkap;
    }

    const normalizeText_ = (v) => String(v || '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    const allProducts = Array.isArray(productList) ? productList : [];
    const targetNameNorm = normalizeText_(kategoriTarget);
    let recommendedNoStok = '';

    if (keyNorm && targetNameNorm && allProducts.length) {
      const exact = allProducts.find(p => normalizeText_(p && p.NamaProduk) === targetNameNorm);
      if (exact && exact.NoStok) {
        recommendedNoStok = String(exact.NoStok);
      } else {
        // Jika exact match dengan teks paket lengkap gagal, coba match dengan nama paket pendek
        // mis. "start now" cari NamaProduk yang mengandung keyword 2 suku kata pertama paketLengkap
        var keywords = paketLengkap
          ? paketLengkap.split(/\s+|[(),]/).map(function(s){return s.trim().toLowerCase();}).filter(Boolean).slice(0,4)
          : [];
        if (!keywords.length) {
          const shortNeedle = targetNameNorm.substring(0, 30);
          const partial = allProducts.find(p => normalizeText_(p && p.NamaProduk).includes(shortNeedle));
          if (partial && partial.NoStok) recommendedNoStok = String(partial.NoStok);
        } else {
          const partial = allProducts.find(p => {
            const nm = normalizeText_(p && p.NamaProduk);
            if (!nm) return false;
            return keywords.every(function(kw){ return nm.indexOf(kw) !== -1; });
          });
          if (partial && partial.NoStok) recommendedNoStok = String(partial.NoStok);
          if (!recommendedNoStok) {
            // fallback: match minimal 2 dari 4 keyword
            var partial2 = allProducts.find(p => {
              const nm = normalizeText_(p && p.NamaProduk);
              if (!nm) return false;
              var matchCount = 0;
              keywords.forEach(function(kw){ if (nm.indexOf(kw)!==-1) matchCount++; });
              return matchCount >= Math.max(2, Math.floor(keywords.length/2));
            });
            if (partial2 && partial2.NoStok) recommendedNoStok = String(partial2.NoStok);
          }
        }
      }
    }

    const finalList = recommendedNoStok
      ? [
          ...allProducts.filter(p => String(p && p.NoStok) === recommendedNoStok),
          ...allProducts.filter(p => String(p && p.NoStok) !== recommendedNoStok)
        ]
      : allProducts;

    productSelect.innerHTML = '<option value="">Pilih Nama Produk</option>';
    finalList.forEach(product => {
      const option = document.createElement('option');
      option.value = product.NoStok || '';
      option.textContent = product.NamaProduk || '';
      productSelect.appendChild(option);
    });

    if (recommendedNoStok) {
      productSelect.value = recommendedNoStok;
    }
  } catch (e) {
    console.error('autoFillProdukByKategori error:', e);
  }
}

// ============================================================
// Requirement 4: Atur field Voucher berdasarkan level user.
// - PESERTA: field TAMPIL + isi sesuai totalPoint dari TabelVoucer
//            via API getVoucherByPoint (fallback = 0)
// - MEMBER : field HIDDEN + voucherAmount=0
// ============================================================
function applyVoucherBasedOnLevel() {
  return new Promise((resolve) => {
    const level = (pesananState && pesananState.level) ? String(pesananState.level).toLowerCase() : 'peserta';
    const isPeserta = (level !== 'member');

    const voucherSection = document.getElementById('voucherSection');
    const voucherInfoEl  = document.getElementById('voucherInfo');
    const voucherAmountInput = document.getElementById('voucherAmount');

    if (voucherAmountInput) voucherAmountInput.value = '0';
    pesananState.voucherAmount = 0;

    if (!isPeserta) {
      // member: sembunyikan + voucher = 0
      if (voucherSection) voucherSection.style.display = 'none';
      if (voucherInfoEl) voucherInfoEl.value = formatCurrency(0);
      if (typeof updateTotals === 'function') updateTotals();
      resolve();
      return;
    }

    // peserta: tampilkan + cari berdasarkan totalPoint
    if (voucherSection) voucherSection.style.display = 'flex';
    const totalPoint = Number(pesananState.totalPoint || 0);

    if (!totalPoint || totalPoint <= 0) {
      if (voucherInfoEl) voucherInfoEl.value = formatCurrency(0);
      pesananState.voucherAmount = 0;
      if (typeof updateTotals === 'function') updateTotals();
      resolve();
      return;
    }

    if (voucherInfoEl) voucherInfoEl.value = 'memuat...';

    // Panggil backend URL_dbEstihtools action=getVoucherByPoint
    fetchJsonpEstihtools('getVoucherByPoint', { totalPoint: totalPoint })
      .then(resp => {
        let potongan = 0;
        let keterangan = '';
        if (resp && resp.status !== 'error') {
          potongan  = Number(resp.potongan || resp.voucher || resp.amount || 0) || 0;
          keterangan = String(resp.keterangan || resp.nama || resp.deskripsi || '').trim();
        }
        if (potongan < 0) potongan = 0;
        pesananState.voucherAmount = potongan;
        if (voucherAmountInput) voucherAmountInput.value = String(potongan);
        if (voucherInfoEl) {
          voucherInfoEl.value = formatCurrency(potongan);
        }
        if (typeof updateTotals === 'function') updateTotals();
      })
      .catch(err => {
        console.error('getVoucherByPoint error:', err);
        pesananState.voucherAmount = 0;
        if (voucherInfoEl) voucherInfoEl.value = formatCurrency(0);
        if (typeof updateTotals === 'function') updateTotals();
      })
      .finally(resolve);
  });
}

// ============================================================
// Init: Ambil userId dari localStorage, panggil
//       action=getPesananContextByUserId ke Code-dbProgram.gs
//       untuk mendapatkan: level, totalPoint, namaSponsor, hpSponsor
// ============================================================
function initPesananContext() {
  return new Promise((resolve) => {
    let userId = '';
    try { userId = String(localStorage.getItem('userId') || '').trim(); } catch (e) { userId = ''; }
    pesananState.userId = userId;

    if (!userId) {
      pesananState.level = 'peserta';
      pesananState.totalPoint = 0;
      pesananState.voucherAmount = 0;
      resolve();
      return;
    }

    fetchJsonpProgram('getPesananContextByUserId', { userId })
      .then(resp => {
        if (resp && resp.status === 'success') {
          const lv = String(resp.level || 'peserta').trim().toLowerCase();
          pesananState.level = (lv === 'member') ? 'member' : 'peserta';
          pesananState.totalPoint = Number(resp.totalPoint || 0) || 0;
        } else {
          pesananState.level = 'peserta';
          pesananState.totalPoint = 0;
        }
      })
      .catch(err => {
        console.error('getPesananContextByUserId error:', err);
        pesananState.level = 'peserta';
        pesananState.totalPoint = 0;
      })
      .finally(resolve);
  });
}

// *****************************************************
// Tambahkan event listener untuk perubahan input jumlah
// *****************************************************
document.querySelector('#orderTable tbody').addEventListener('input', function(e) {
  if (e.target.classList.contains('qty-input')) {
    const row   = e.target.closest('tr');
    const qty   = parseInt(e.target.value) || 0;
    const vpPerItem = parseFloat(row.getAttribute('data-vp-asli')) || 0;
    const priceAfterDiscount = parseFloat(row.getAttribute('data-harga-setelah-diskon')) || 0;
    
    // Update tampilan
    const rowTotalVP = vpPerItem * qty;
    const rowTotalHarga = priceAfterDiscount * qty;

    row.cells[6].textContent = formatCurrency(rowTotalVP);
    row.cells[6].setAttribute('data-vp-nilai', rowTotalVP);
    row.cells[7].textContent = formatCurrency(rowTotalHarga);
    row.cells[7].setAttribute('data-harga-nilai', rowTotalHarga);
    updateTotals();
    
    // Aktifkan mode edit
    if (!isEditMode) {
      isEditMode = true;
      currentEditRow = row;
    }
  }
});

// *******************************************************
// Fungsi untuk memperbarui nomor item setelah penghapusan
// *******************************************************
function updateItemNumbers() {
    const rows    = document.querySelectorAll('#orderTable tbody tr');
    const invoice = document.getElementById('invoice').value; // Ambil No Simulasi (Invoice) dari form

    let itemCounter = 1;
    rows.forEach((row) => {
        if (row.cells[1].textContent.trim() !== "") {        // Pastikan baris tidak kosong
            row.cells[0].textContent = itemCounter;          // Update nomor item di kolom pertama
            itemCounter++;
        }
    });
    console.log("Nomor item di tabel 'Form Pesanan' berhasil diperbarui untuk Simulasi No: " + invoice);
}

// ************************************
// Kumpulkan data tabel ke object order
// ************************************ 
function collectOrderData() {
  const mTableBody = document.querySelector("#orderTable tbody");
  const rows = mTableBody.querySelectorAll("tr");

  const items = [];
  rows.forEach((row, idx) => {
    const mNoItem = idx + 1;
    const mNoStok = row.cells[1].textContent.trim();
    const mNamaProduk = row.cells[2].textContent.trim();
    const mHargaEceran = parseFloat(row.cells[3].getAttribute('data-nilai-asli') || 
                                 row.cells[3].textContent.replace(/[^\d]/g, "")) || 0;
    const mSetelahDiskon = parseFloat(row.getAttribute('data-harga-setelah-diskon')) || 0;
    const mJumlah = parseInt(row.querySelector("input").value) || 0;
    
    // Gunakan nilai VP dari atribut data, bukan dari teks yang diformat
    const mTotVP = parseFloat(row.cells[6].getAttribute('data-vp-nilai')) || 0;
    
    // Gunakan nilai harga dari atribut data, bukan dari teks yang diformat
    const mHarga = parseFloat(row.cells[7].getAttribute('data-harga-nilai')) || 0;
    
    const mKategori = row.getAttribute("data-kategori") || "";
    const mVp = parseFloat(row.getAttribute("data-vp-asli")) || 0;

    items.push({
      mNoItem,
      mNoStok,
      mKategori,
      mNamaProduk,
      mVp,
      mHargaEceran,
      mSetelahDiskon,
      mJumlah,
      mTotVP,
      mHarga
    });
  });

  return {
    // info invoice
    mDate: document.getElementById("date").value,
    mInvoice: document.getElementById("invoice").value,

    // info distributor (member)
    mDistributorName: (document.getElementById("namaSponsor") && document.getElementById("namaSponsor").value) ? document.getElementById("namaSponsor").value : "",
    mDistributorPhone: (document.getElementById("hpSponsor") && document.getElementById("hpSponsor").value) ? document.getElementById("hpSponsor").value : "",

    // info konsumen (akan kosong saat SUBMIT, terisi saat KIRIM)
    mConsumerName: (document.getElementById("namaKonsumen") && document.getElementById("namaKonsumen").value) ? document.getElementById("namaKonsumen").value : "",
    mConsumerPhone: (document.getElementById("hpKonsumen") && document.getElementById("hpKonsumen").value) ? document.getElementById("hpKonsumen").value : "",
    mConsumerEmail: (document.getElementById("emailKonsumen") && document.getElementById("emailKonsumen").value) ? document.getElementById("emailKonsumen").value : "",

    // alamat pengiriman (prefill dari dbProgram, bisa diedit)
    mAlamat: (document.getElementById("alamat") && document.getElementById("alamat").value) ? document.getElementById("alamat").value : "",
    mKelurahan: (document.getElementById("kelurahan") && document.getElementById("kelurahan").value) ? document.getElementById("kelurahan").value : "",
    mKecamatan: (document.getElementById("kecamatan") && document.getElementById("kecamatan").value) ? document.getElementById("kecamatan").value : "",
    mKota: (document.getElementById("kota") && document.getElementById("kota").value) ? document.getElementById("kota").value : "",
    mPropensi: (document.getElementById("propensi") && document.getElementById("propensi").value) ? document.getElementById("propensi").value : "",

    // info order
    mDiskon: document.getElementById("discount").options[document.getElementById("discount").selectedIndex]
      ? document.getElementById("discount").options[document.getElementById("discount").selectedIndex].text
      : "",
    mDiskonValue: document.getElementById("discount").value || "",
    mVoucher: (function() {
      const el = document.getElementById('voucherAmount');
      if (!el) return (pesananState && pesananState.voucherAmount) ? Number(pesananState.voucherAmount) : 0;
      const digits = String(el.value || '').replace(/\D/g, '');
      return digits ? Number(digits) : 0;
    })(),
    mVoucherPoint: (pesananState && pesananState.totalPoint) ? Number(pesananState.totalPoint) : 0,
    mByKirim: parseFloat(document.getElementById("shipping").value) || 0,
    mPajak: parseFloat(document.getElementById("tax").textContent.replace(/[^\d]/g, "")) || 0,
    mTotalPrice: parseFloat(document.getElementById("totalPrice").textContent.replace(/[^\d]/g, "")) || 0,

    // user context (untuk tracking backend)
    mUserId: (pesananState && pesananState.userId) ? String(pesananState.userId) : "",
    mLevelUser: (pesananState && pesananState.level) ? String(pesananState.level) : "peserta",
    mKategoriPesanan: (function(){ try { return localStorage.getItem('pesananKategori') || ''; } catch(e){ return ''; } })(),

    // detail item produk
    items
  };
}

// Helper untuk parsing angka dari string "Rp. 1.500.000"
function parseCurrency(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9,-]/g, "").replace(",", "."));
}

// *****************************
// Untuk menyimpan data ke sheet
// *****************************
function saveOrderToSheet(orderData) {
  // Tampilkan loading indicator
  //document.getElementById('loadingSpinner').style.display = 'block';
  
  return callAPI("saveOrder", orderData, "POST")
    .then(res => {
      console.log("Data tersimpan:", res);
      return res;
    })
    .catch(err => {
      console.error("Gagal menyimpan:", err);
      showNotification('error', 'ERROR : Gagal menyimpan perubahan');
    })
    .finally(() => {
       showNotification('success', 'SUKSES : Data tersimpan'); 
      //document.getElementById('loadingSpinner').style.display = 'none';
    });
}

// *******************************************
// Fungsi untuk simpan data terakhir ke sheet 
// *******************************************
async function submitForm() {
  // Hanya mengubah tampilan, tidak menyimpan data
  console.log("Submit clicked - preparing for final submission");

  // Disable input produk
  document.getElementById("product").disabled  = true;
  document.getElementById("quantity").disabled = true;
  document.getElementById("discount").disabled = true;
  document.getElementById("shipping").disabled = true;
  document.getElementById("btnAdd").disabled   = true;
  document.getElementById("btnReset").disabled = true;
 
  // Toggle tombol
  document.getElementById("submitButton").style.display   = "none";
  document.getElementById("kirimButton").style.display    = "inline-block";
  // Tampilkan inputan konsumen
  document.getElementById("inputanSection").style.display = "block";
  const dataProdukSection = document.getElementById("dataProdukSection");
  if (dataProdukSection) dataProdukSection.style.display = "none";
  const invoiceSection = document.getElementById("invoiceSection");
  if (invoiceSection) invoiceSection.style.display = "none";
  const orderSummary = document.getElementById("orderSummary");
  if (orderSummary) orderSummary.style.display = "none";
  await prefillDataKonsumen({ force: false });
}

// **************************************************
// Mengirim data ke sheet DataPesanan/DataInput (backend dbEstihtools)
// Setelah sukses:
//   1. simpan lastOrderData di localStorage (backup untuk frmKonfirmasi.html)
//   2. redirect ke frmKonfirmasi.html?noPesanan=INVxxxx
// JANGAN pakai formKonfirmasiBayar.html (itu milik flow PENDAFTARAN)
// **************************************************
function simpanData() {
  // Validasi form sebelum mengirim
  if (!validateForm()) {
     return false;
  }
  
  const mOrderData = collectOrderData();
  const noPesanan  = mOrderData.mInvoice;
  document.getElementById("kirimButton").style.display  = "block";
  // Tampilkan loading spinner
  showSpinner("kirimButton");

  callAPI("kirimData", mOrderData, "POST")
  .then(response => {
      console.log("Kirim berhasil");
      // document.getElementById("submitButton").style.display   = "none";
      // document.getElementById("inputanSection").style.display = "none";
      hideSpinner("kirimButton");
      // showNotification('success', 'SUKSES: Data berhasil disimpan. Mengarahkan ke Form Konfirmasi Bayar Produk...');

      // Simpan backup data order ke localStorage (jalur utama untuk frmKonfirmasi)
      try {
        localStorage.setItem('lastOrderData', JSON.stringify({
          noPesanan: noPesanan,
          tanggal: mOrderData.mDate,
          namaSponsor: mOrderData.mDistributorName,
          hpSponsor: mOrderData.mDistributorPhone,
          namaKonsumen: mOrderData.mConsumerName,
          hpKonsumen: mOrderData.mConsumerPhone,
          emailKonsumen: mOrderData.mConsumerEmail,
          alamat: mOrderData.mAlamat,
          kelurahan: mOrderData.mKelurahan,
          kecamatan: mOrderData.mKecamatan,
          kota: mOrderData.mKota,
          propensi: mOrderData.mPropensi,
          byKirim: mOrderData.mByKirim,
          diskon: mOrderData.mDiskon,
          voucher: mOrderData.mVoucher,
          pajak: mOrderData.mPajak,
          grandTotal: mOrderData.mTotalPrice,
          items: (mOrderData.items || []).map(it => ({
            noStok: it.mNoStok || '',
            nama: it.mNamaProduk || '',
            qty: it.mJumlah || 0,
            vp: it.mVp || 0,
            hargaSatuan: it.mSetelahDiskon || 0,
            subtotal: it.mHarga || 0
          }))
        }));
      } catch (e) { console.error('simpan localStorage error', e); }

      // Redirect ke FORM KONFIRMASI PRODUK (file BARU, bukan formKonfirmasiBayar.html)
      setTimeout(function() {
        window.location.href = 'frmKonfirmasi.html?noPesanan=' + encodeURIComponent(noPesanan);
      }, 1200);
    })
    .catch(err => {
      console.error("Error kirim:", err);
      hideSpinner("kirimButton");
      showNotification('error', 'ERROR: Gagal menyimpan data');
    });   
}

// ************************************************************
// Fungsi untuk menampilkan/menyembunyikan icon "X" saat hover
// ************************************************************
document.querySelectorAll('#orderTable tbody tr').forEach(row => {
    row.addEventListener('mouseenter', () => {
        row.querySelector('.delete-icon').style.display = 'inline';
    });
    row.addEventListener('mouseleave', () => {
        row.querySelector('.delete-icon').style.display = 'none';
    });
});

// ********************************
// Fungsi untuk menformat currency
// ********************************
function formatCurrency(amount) {
  if (isNaN(amount)) return "0";
  
  // Konversi ke number jika input string
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[^\d]/g, ''));
  }
  
  // Format tanpa desimal jika angka bulat
  if (Number.isInteger(amount)) {
    return new Intl.NumberFormat('id-ID').format(amount);
  }
  
  // Format dengan 2 desimal jika perlu
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

// *****************************************************
// Fungsi untuk memformat tanggal Indonesia (DD/MM/YYYY)
// *****************************************************
function formatDate(dateString) {
    const mDate  = new Date(dateString);
    const mDay   = String(mDate.getDate()).padStart(2, '0');
    const mMonth = String(mDate.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
    const mYear  = mDate.getFullYear();
    return `${mDay}/${mMonth}/${mYear}`;
}

// ******************************
// Fungsi untuk Pesan Notifikasi 
// ******************************
function showNotification(type, message, duration = 3000) {
  const box  = document.getElementById('notificationBox');
  const icon = document.getElementById('pesanNotifIcon');
  const text = document.getElementById('pesanNotifText');

  // Reset class
  box.className  = 'notification-message w-100 mb-2';
  icon.className = 'pesan-notif-icon me-2';

  if (type === 'error') {
    box.classList.add('notification-error');
    icon.classList.add('fas', 'fa-times-circle');
  } else if (type === 'success') {
    box.classList.add('notification-success');
    icon.classList.add('fas', 'fa-check-circle');
  } else if (type === 'warning') {
    box.classList.add('notification-warning');
    icon.classList.add('fas', 'fa-exclamation-circle');
  }

  text.textContent  = message;
  box.style.display = 'flex';
  setTimeout(() => { box.style.display = 'none'; }, duration);
}

// ***********************************
// Fungsi untuk Pesan Validasi Inputan
// ***********************************
function showNotifValidasi(type, message, duration = 3000) {
  const boxValidasi  = document.getElementById('validasiBox');
  const iconValidasi = document.getElementById('pesanValidasiIcon');
  const textValidasi = document.getElementById('pesanValidasiText');

  // Reset class
  boxValidasi.className  = 'validasi-message w-100 mb-2';
  iconValidasi.className = 'pesan-validasi-icon me-2';

  if (type === 'error') {
    boxValidasi.classList.add('validasi-error');
    iconValidasi.classList.add('fas', 'fa-times-circle');
  } else if (type === 'success') {
    boxValidasi.classList.add('validasi-success');
    iconValidasi.classList.add('fas', 'fa-check-circle');
  } else if (type === 'warning') {
    boxValidasi.classList.add('validasi-warning');
    iconValidasi.classList.add('fas', 'fa-exclamation-circle');
  }

  textValidasi.textContent  = message;
  boxValidasi.style.display = 'flex';
  setTimeout(() => { boxValidasi.style.display = 'none'; }, duration);
}

// ************************************
// Fungsi untuk Ketentuan dan Kebijakan
// ************************************
function showKetentuanModal() {
    const modal = document.getElementById('ketentuanModal');
          modal.style.display = 'block';

    // Memuat isi ketentuan dan kebijakan
    const ketentuanContent = `
          <p><strong>Pengertian EstiHTools</strong></p>
          <ul>
              <li>Akronim dari EstiHTools, yaitu Esti = Estimasi dan H = Harga, jadi yang dimaksud dengan EstiHTools adalah suatu aplikasi yang berbasis web base yang berfungsi sebagai sarana untuk melakukan pesanan dan perhitungan harga suatu produk</li>
              <li>Jadi EstiHTools sifatnya memberikan simulasi pesanan, estimasi harga dari suatu produk</li>
          </ul>
          <p><strong>Ketentuan keamanan dan privasi</strong></p>
          <ul>
              <li>Menyatakan bahwa keamanan informasi pribadi, saat anda menggunakan EstiHTools tidak dapat kami jamin</li>
              <li>Menyatakan bahwa pihak ketiga dapat melihat atau merusak data yang dipertukarkan dengan cara menghack, diluar tanggung jawab kami</li>
          </ul>
          <p><strong>Ketentuan konten</strong></p>
          <ul>
              <li>Menyatakan bahwa tidak bertanggung jawab atas konten yang muncul di EstiHTools yang sifatnya iklan atau promosi lain</li>
              <li>Menyatakan bahwa tidak bertanggung jawab atas konten situs lain</li>
              <li>Menyatakan bahwa jika terjadi suatu hal atau problem atas EstiHTools, dan mengakibatkan kerugian dari pihak user atau lainnya, maka kami tidak dapat dimintakan pertanggung jawaban atas hal tersebut</li>
          </ul>
          <p><strong>Ketentuan lisensi</strong></p>
          <ul>
              <li>Memberikan izin untuk dapat menggunkan EstiHTools dengan penuh tanggung jawab dan tidak melanggar hukum yang berlaku</li>
              <li>Memberikan izin untuk mengunduh hasil dari proses EstiHTools</li>
              <li>Menyatakan bahwa hasil unduhan tidak boleh dimodifikasi untuk tujuan apapun</li>
          </ul>
          `;
          document.getElementById('ketentuanContent').innerHTML = ketentuanContent;
}

// *************************************************
// Fungsi untuk sembunyikan Ketentuan dan Kebijakan
// *************************************************
function hideKetentuanModal() {
    const modal = document.getElementById('ketentuanModal');
    modal.style.display = 'none';
}

// ***********************
// Fungsi Show About form
// ***********************
function showAbout() {
  document.getElementById('aboutOverlay').style.display = 'flex';
}

// ***********************
// Fungsi Hide About form
// ***********************
function hideAbout() {
  document.getElementById('aboutOverlay').style.display = 'none';
}

// *********************************
// Fungsi Event untuk tampilan About
// *********************************
document.addEventListener('DOMContentLoaded', function () {
  // Event listener untuk tombol About
  const aboutLinkEl = document.querySelector('a[href="#about"]');
  if (aboutLinkEl) {
    aboutLinkEl.addEventListener('click', function(e) {
      e.preventDefault();
      showAbout();
    });
  } 
  // Event listener untuk tombol Close About
  const btnCloseAboutEl = document.getElementById('btnCloseAbout');
  if (btnCloseAboutEl) btnCloseAboutEl.addEventListener('click', hideAbout);
});
