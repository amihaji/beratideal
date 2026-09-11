// *******************************
// URL Web App Google Apps Script 
// *******************************
let isEditMode     = false;  // Untuk mendefenisikan mode Edit
let currentEditRow = null;   // Untuk menyimpan referensi row yang sedang diedit
// Untuk memastikan tidak ada event listener ganda
document.querySelector('#orderTable tbody').replaceWith(document.querySelector('#orderTable tbody').cloneNode(true));

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

async function prefillDataKonsumen() {
  try {
    const userId = String(localStorage.getItem('userId') || '').trim();
    if (!userId || !URL_dbProgram) return;

    const response = await fetchJsonpProgram('getDataKonsumenByUserId', { userId });
    if (!response || response.status !== 'success' || !response.data) return;

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

    if (namaKonsumenEl && !namaKonsumenEl.value) namaKonsumenEl.value = String(data.nama || '').toUpperCase();
    if (alamatEl && !alamatEl.value) alamatEl.value = String(data.alamat || '').toUpperCase();
    if (hpKonsumenEl && !hpKonsumenEl.value) hpKonsumenEl.value = normalizePhoneForInput(data.telp);
    if (kelurahanEl && !kelurahanEl.value) kelurahanEl.value = String(data.kelurahan || '').toUpperCase();
    if (kecamatanEl && !kecamatanEl.value) kecamatanEl.value = String(data.kecamatan || '').toUpperCase();
    if (kotaEl && !kotaEl.value) kotaEl.value = String(data.kota || '').toUpperCase();
    if (propensiEl && !propensiEl.value) propensiEl.value = String(data.propensi || '').toUpperCase();

    if (namaSponsorEl && !namaSponsorEl.value) namaSponsorEl.value = String(data.namaSponsor || '').toUpperCase();
    if (hpSponsorEl && !hpSponsorEl.value) hpSponsorEl.value = normalizePhoneForInput(data.hpSponsor);
  } catch (error) {
    console.error(error);
  }
}

// **********************************************
// Inisialisasi saat halaman sudah load sempurna
// **********************************************
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed");
    
    // Generate Tanggal dan Invoice
    const mDateField    = document.getElementById('date'); 
    const mInvoiceField = document.getElementById('invoice');
    const mToday        = new Date();
    
    mDateField.value       = mToday.toISOString().split('T')[0];
    mInvoiceField.value    = `SIM-${mToday.getFullYear()}${(mToday.getMonth()+1).toString().padStart(2,'0')}${mToday.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
    mDateField.disabled    = true;
    mInvoiceField.disabled = true;

    loadOptions();       // Load Dropdown Options
    prefillDataKonsumen();

    // Event listener untuk edit jumlah item
    const tableBody = document.querySelector('#orderTable tbody');
    if (tableBody) {
        tableBody.addEventListener('input', function(e) {
            if (e.target.classList.contains('qty-input')) {
                console.log("Jumlah item diubah, aktifkan mode edit");
                
                // Update tampilan langsung
                const row = e.target.closest('tr');
                const qty = parseInt(e.target.value) || 0;
                const price = parseFloat(row.cells[4].textContent.replace(/[^\d]/g, '')) || 0;
                
                row.cells[7].textContent = formatCurrency(price * qty);
                updateTotals();
              
            }
        });
    } else {
        console.error("Tabel body tidak ditemukan!");
    }

    // Event listener untuk tombol close Ketentuan dan Kebijakan
        document.querySelector('.close').addEventListener('click', hideKetentuanModal);
        // Event listener untuk tombol SETUJU Ketentuan dan Kebijakan
        document.getElementById('setujuButton').addEventListener('click', function() {
        hideKetentuanModal();
        showNotification('success', 'SUKSES : Anda telah menyetujui ketentuan dan kebijakan');
    });

    // Event listener untuk checkbox Ketentuan dan Kebijakan
        document.getElementById('agreeCheckbox').addEventListener('change', function() {
        const setujuButton = document.getElementById('setujuButton');
        setujuButton.disabled = !this.checked;
    });

    // Event listener untuk link Ketentuan dan Kebijakan
        document.querySelector('a[href="ketentuan.html"]').addEventListener('click', function(event) {
        event.preventDefault(); // Mencegah navigasi ke halaman lain
        showKetentuanModal();
    });      
    
    // Intial Aplikasi Siap Digunakam
    console.log("Aplikasi siap digunakan");
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
  const selectedDiscountLabel = mDiscountSelect.options[mDiscountSelect.selectedIndex].text;

  if (!mProductSelect.value || mQuantity <= 0 || !mDiscountSelect.value || !mShippingSelect.value) {
    showNotification('warning', 'PERHATIAN : Lengkapi pilihan Produk, Jumlah, Diskon dan Pengiriman');
    return;
  }

  callAPI("getProductDetails", { noStok: mProductSelect.value }).then(mProductData => {
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
        <td>${formatCurrency(mPriceAfterDiscount)}</td>
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
 
    // kirim per item ke sheet
    const mOrderData = {
      mDate: document.getElementById("date").value,
      mInvoice: document.getElementById("invoice").value,
      mDistributorName: (document.getElementById("namaSponsor") && document.getElementById("namaSponsor").value) ? document.getElementById("namaSponsor").value : "",
      mDistributorPhone: (document.getElementById("hpSponsor") && document.getElementById("hpSponsor").value) ? document.getElementById("hpSponsor").value : "",
      mConsumerName: (document.getElementById("namaKonsumen") && document.getElementById("namaKonsumen").value) ? document.getElementById("namaKonsumen").value : "",
      mConsumerPhone: (document.getElementById("hpKonsumen") && document.getElementById("hpKonsumen").value) ? document.getElementById("hpKonsumen").value : "",
      mConsumerEmail: (document.getElementById("emailKonsumen") && document.getElementById("emailKonsumen").value) ? document.getElementById("emailKonsumen").value : "",
      mDiskon: selectedDiscountLabel,
      mByKirim: parseFloat(mShippingSelect.value),
      mPajak: parseFloat(document.getElementById("tax").textContent.replace(/\./g, "").replace(",", ".")),
      mItem: {
        mNoStok: mProductSelect.value,
        mKategori: mProductData.Kategori,
        mNamaProduk: mProductSelect.options[mProductSelect.selectedIndex].text,
        mVp: mProductData.VP,
        mHargaEceran: mProductData.HargaEceran,
        mSetelahDiskon: mPriceAfterDiscount,
        mJumlah: mQuantity,
        mTotVP: mTotVP,
        mHarga: mHarga
      }
    };

    callAPI("saveItem", mOrderData, "POST");
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
// *********************
function updateTotals() {
  const rows = document.querySelectorAll('#orderTable tbody tr');
  let totalJumlah = 0;
  let totalVP = 0;
  let totalHarga = 0;

    rows.forEach(row => {
    // Ambil nilai jumlah dari input
    const qtyInput = row.querySelector('.qty-input');
    const qty = qtyInput ? parseInt(qtyInput.value) || 0 : 0;

    // Ambil VP per item dari atribut data (nilai asli dengan desimal)
    const vpPerItem = parseFloat(row.getAttribute('data-vp-asli')) || 0;

    // Ambil harga setelah diskon dari atribut data (nilai asli dengan desimal)
    const priceAfterDiscount = parseFloat(row.getAttribute('data-harga-setelah-diskon')) || 0;

    // HITUNG TOTAL VP UNTUK BARIS INI
    const rowTotalVP = vpPerItem * qty;

    // HITUNG TOTAL HARGA UNTUK BARIS INI
    const rowTotalHarga = priceAfterDiscount * qty;

    // UPDATE TAMPILAN KOLOM "Tot VP" (kolom ke-7)
    row.cells[6].textContent = formatCurrency(rowTotalVP);
    row.cells[6].setAttribute('data-vp-nilai', rowTotalVP);
    
    // UPDATE TAMPILAN KOLOM "Harga" (kolom ke-8)
    row.cells[7].textContent = formatCurrency(rowTotalHarga);
    row.cells[7].setAttribute('data-harga-nilai', rowTotalHarga);

    totalJumlah += qty;
    totalVP += rowTotalVP;
    totalHarga += rowTotalHarga;
  });

  // Update footer tabel
  document.getElementById('totalJumlah').textContent = totalJumlah;
  document.getElementById('totalVP').textContent = formatCurrency(totalVP);
  document.getElementById('totalHarga').textContent = formatCurrency(totalHarga);

  // Update summary
  const shippingCost = parseFloat(document.getElementById('shipping').value) || 0;
  const tax = 0;
  const grandTotal = totalHarga + shippingCost + tax;
  document.getElementById('shippingCost').textContent = formatCurrency(shippingCost);
  document.getElementById('tax').textContent = formatCurrency(tax);
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
    const mInvoiceNumber = `SIM-${mToday.getFullYear()}${(mToday.getMonth()+1).toString().padStart(2,'0')}${mToday.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
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

// *********************************************
// Fungsi untuk Pengaturan awal, saat form aktif
// *********************************************
document.addEventListener('DOMContentLoaded', function() {
    // Generate No. Simulasi (invoice)
    const mDateField    = document.getElementById('date'); 
    const mInvoiceField = document.getElementById('invoice');
    const mToday        = new Date();
    
    // Format: INV-YYYYMMDD-XXX
    mDateField.value    = mToday.toISOString().split('T')[0];
    mInvoiceField.value = `SIM-${mToday.getFullYear()}${(mToday.getMonth()+1).toString().padStart(2,'0')}${mToday.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;

    // Disable fields
    mDateField.disabled = true;
    mInvoiceField.disabled = true;

    // Memanggil isi pilihan field dropdown
    loadOptions();
});

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
// **********************************************
function loadOptions() {
    // Load Pilihan Diskon
    callAPI("getDiscounts").then(mDiscounts => {
        const discountSelect     = document.getElementById('discount');
        discountSelect.innerHTML = '<option value="">Pilih Level Diskon</option>';
        mDiscounts.forEach(discount => {
            const option       = document.createElement('option');
            option.value       = discount.Diskon;
            option.textContent = discount.Level;
            discountSelect.appendChild(option);
        });
    }).catch(err => {
        console.error("Gagal memuat diskon:", err);
        showNotification('error', 'ERROR : memuat data diskon');
    });

    // Load Pilihan Produk
    callAPI("getProducts").then(mProducts => {
        const productSelect     = document.getElementById('product');
        productSelect.innerHTML = '<option value="">Pilih Nama Produk</option>';
        mProducts.forEach(product => {
            const option       = document.createElement('option');
            option.value       = product.NoStok;
            option.textContent = product.NamaProduk;
            productSelect.appendChild(option);
        });
    }).catch(err => {
        console.error("Gagal memuat produk:", err);
        showNotification('error', 'ERROR : memuat data produk');
    });

    // Load Jenis Pengiriman
    callAPI("getShippingOptions").then(mShippingOptions => {
        const shippingSelect     = document.getElementById('shipping');
        shippingSelect.innerHTML = '<option value="">Pilih Jenis Pengiriman</option>';
        mShippingOptions.forEach(shipping => {
            const option       = document.createElement('option');
            option.value       = shipping.Biaya;
            // option.textContent = shipping.JenisPengiriman;
            option.textContent = `${shipping.JenisPengiriman} By =  ${shipping.Biaya}`;
            shippingSelect.appendChild(option);
        });
    }).catch(err => {
        console.error("Gagal memuat pengiriman:", err);
        showNotification('error', 'ERROR : Memuat data pengiriman');
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
    mDiskon: document.getElementById("discount").options[document.getElementById("discount").selectedIndex].text,
    mByKirim: parseFloat(document.getElementById("shipping").value) || 0,
    mPajak: parseFloat(document.getElementById("tax").textContent.replace(/[^\d]/g, "")) || 0,
    mTotalPrice: parseFloat(document.getElementById("totalPrice").textContent.replace(/[^\d]/g, "")) || 0,

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
  const orderSummary = document.getElementById("orderSummary");
  if (orderSummary) orderSummary.style.display = "none";
  await prefillDataKonsumen();
}

// **************************************************
// Mengirim data ke sheet DataInput dan DataKonsumen
// **************************************************
function simpanData() {
  // Validasi form sebelum mengirim
  if (!validateForm()) {
     return false;
  }
  
  const mOrderData = collectOrderData();
  document.getElementById("kirimButton").style.display  = "block";
  // Tampilkan loading spinner
  showSpinner("kirimButton");

  callAPI("kirimData", mOrderData, "POST")
  .then(response => {
      console.log("Kirim berhasil");
      document.getElementById("submitButton").style.display   = "none";
      document.getElementById("inputanSection").style.display = "none";
      hideSpinner("kirimButton");
      showNotification('success', 'SUKSES: Data berhasil disimpan');
      resetForm();
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
  document.querySelector('a[href="#about"]').addEventListener('click', function(e) {
    e.preventDefault();
    showAbout();
  }); 
  // Event listener untuk tombol Close About
  document.getElementById('btnCloseAbout').addEventListener('click', hideAbout);
});
