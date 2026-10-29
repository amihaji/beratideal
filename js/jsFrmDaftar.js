/****************************  
* Deklarasi variabel global *
*****************************/ 
let currentStep = 1;

function normalizeReferralSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 24);
}

// Nilai ?ref= bisa berupa slug ("klikdisini") atau URL lengkap
// ("https://beratidealku.com/?ref=klikdisini") -> ambil slug-nya.
function extractSlugFromReferralValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/[?&]ref=([^&#\s]+)/i);
  if (!match) return raw;
  try {
    return decodeURIComponent(match[1]);
  } catch (e) {
    return match[1];
  }
}

function getReferralSlugFromLocation() {
  if (!window || !window.location || !window.location.search) return '';
  const params = new URLSearchParams(window.location.search);
  return normalizeReferralSlug(extractSlugFromReferralValue(params.get('ref')));
}

// Sponsor default dipakai jika user masuk TANPA link referral (?ref=...)
const DEFAULT_SPONSOR_NAME = 'HESTY HUSAIN';
const DEFAULT_SPONSOR_PHONE = '81241318600';

function fetchReferralBySlug(slug) {
  return new Promise((resolve) => {
    const cleanSlug = normalizeReferralSlug(slug);
    if (!cleanSlug || !URL_dbReferral) {
      resolve({ status: 'error', message: 'Slug/URL referral tidak valid.' });
      return;
    }
    const callbackName = `cb_referral_slug_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
    window[callbackName] = function(response) {
      cleanup();
      resolve(response || { status: 'error', message: 'Respons server referral kosong.' });
    };
    script.onerror = function() {
      cleanup();
      resolve({ status: 'error', message: 'Gagal menghubungi server referral.' });
    };
    script.src = `${URL_dbReferral}?action=getReferralBySlug&slug=${encodeURIComponent(cleanSlug)}&callback=${encodeURIComponent(callbackName)}`;
    document.body.appendChild(script);
  });
}

function applySponsorToForm(name, phone, lockFields) {
  const sponsorEl = document.getElementById('mSponsor');
  const sponsorPhoneEl = document.getElementById('mHpSponsor');
  if (!sponsorEl || !sponsorPhoneEl) return;

  if (name) sponsorEl.value = String(name).toUpperCase().substring(0, 40);
  if (phone) sponsorPhoneEl.value = String(phone).replace(/\D/g, '').replace(/^0+/, '').substring(0, 14);

  if (lockFields) {
    sponsorEl.readOnly = true;
    sponsorPhoneEl.readOnly = true;
    sponsorEl.style.cursor = 'no-drop';
    sponsorPhoneEl.style.cursor = 'no-drop';
  }
}

// *********************************************
// Memanggail data inputan ke dalam form daftar
// *********************************************
document.addEventListener('DOMContentLoaded', function() {
  // Set tanggal dan nomor pesanan
  document.getElementById('tanggal').value      = new Date().toLocaleDateString('id-ID');
  document.getElementById('nomorPesanan').value = generateNoPesanan();

  // Event listener untuk program
  document.getElementById('program').addEventListener('change', function() {
  const harga = getHargaProgram(this.value);
  document.getElementById('harga').value = harga.toLocaleString('id-ID');
  });

  (async function() {
    const slug = getReferralSlugFromLocation();
    let sponsorName = DEFAULT_SPONSOR_NAME;
    let sponsorPhone = DEFAULT_SPONSOR_PHONE;

    if (slug) {
      try {
        const response = await fetchReferralBySlug(slug);
        const data = (response && response.status === 'success') ? response.data : null;
        if (data && (data.nama || data.telp)) {
          sponsorName = String(data.nama || '').trim();
          sponsorPhone = String(data.telp || '').trim();
        }
      } catch (err) {
        console.warn('Auto-fill sponsor referral dilewati:', err);
      }
    }

    applySponsorToForm(sponsorName, sponsorPhone, true);
  })();
});

/**********************************
* Event listener untuk submit form
***********************************/
const form = document.getElementById('formDaftar');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm();
  }, false); // Gunakan capture false
}

/************************************
* Event listener untuk download QRIS
*************************************/
const downloadBtn = document.getElementById('btnDownloadQR');
if (downloadBtn) {
  downloadBtn.addEventListener('click', function(e) {
    e.preventDefault();
    downloadQRIS(e);
  }, false); // Gunakan capture false
}

/*******************************************
* Fungsi untuk berpindah ke step berikutnya
*******************************************/
 function nextStep(step) {
  if (validateStep(step)) {
    document.querySelector(`#step-${step}`).classList.remove('active');
    document.querySelector(`#step-${step+1}`).classList.add('active');
    updateProgressBar(step+1);
    currentStep = step+1;
    
    if (currentStep === 3) {
      updatePembayaran();
    }
  }
}

/*****************************************
* Fungsi untuk kembali ke step sebelumnya
* ***************************************/
function prevStep() {
  document.querySelector(`#step-${currentStep}`).classList.remove('active');
  document.querySelector(`#step-${currentStep-1}`).classList.add('active');
  updateProgressBar(currentStep-1);
  currentStep = currentStep-1;
}

/**********************************
* Fungsi untuk update progress bar
**********************************/
function updateProgressBar(step) {
  const percentage  = (step/3)*100;
  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = `Step ${step} dari 3`;
}

/*****************************
* Fungsi untuk validasi form
*****************************/
function validateStep(step) {
  const msgBoxId = `msgBox${step}`;
  const msgBox   = document.getElementById(msgBoxId);
  
  // Jika msgBox tidak ditemukan, buat elemen baru
  if (!msgBox) {
    console.warn(`Element #${msgBoxId} not found, validation skipped`);
    return true;
  }

  msgBox.innerHTML = '';
  let isValid      = true;
  const errors     = [];

  // Validasi Step 1
  if (step === 1) {
    const program = document.getElementById('program').value;
    if (!program) {
      errors.push('Silakan pilih program');
      isValid = false;
    }
  }

  // Validasi Step 2
  if (step === 2) {
    const requiredFields = ['nama', 'alamat', 'telp', 'email', 'kelurahan', 'kecamatan', 'kota', 'propinsi'];
    requiredFields.forEach(field => {
      const value = document.getElementById(field).value.trim();
      if (!value) {
        errors.push(`Field ${field} wajib diisi`);
        isValid = false;
      }
  });

  // Validasi email
  const email = document.getElementById('email').value;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Format email tidak valid');
    isValid = false;
    }
  }

  if (errors.length > 0) {
    msgBox.innerHTML = `<div class="msg-error">${errors.join('<br>')}</div>`;
  }
  return isValid;
}

/*****************************************
* Fungsi untuk mengupdate data pembayaran
******************************************/
function updatePembayaran() {
  // Deklarasi data pembayaran
  const method        = document.getElementById('pembayaran').value;
  const qrisImage     = document.getElementById('qrisImage'); 
  const btnDownloadQR = document.getElementById('btnDownloadQR');
  const namaPenerima  = document.getElementById('namaPenerima');
  const acPenerima    = document.getElementById('acPenerima');
  const nominal       = document.getElementById('nominal');

  // Reset semua field
  btnDownloadQR.style.display = 'none';
  qrisImage.innerHTML = '';
  namaPenerima.value  = '';
  acPenerima.value    = '';
  nominal.value       = '';
  
  // Tampilkan data sesuai metode pembayaran 
  if (method === 'QR') {
    // Nonaktifkan tombol Sebelumnya setelah memilih pembayaran
    const prevBtn = document.querySelector('#step-3 .btn-secondary');
    if (prevBtn) {
      prevBtn.disabled = true;
      prevBtn.classList.add('disabled');
      prevBtn.style.opacity = '0.6';
      prevBtn.style.cursor = 'not-allowed';
    }
  
    // Untuk memanggil file image qris
    const img = document.createElement('img');
    img.src            = 'https://amihaji.github.io/beratideal/images/qris_club_kita.jpeg';
    img.alt            = 'QR Code Pembayaran';
    img.style.maxWidth = '200px';
    img.style.display  = 'block';
    img.style.margin   = '0 auto';
    img.style.border   = '1px solid #ddd';
    
    // Tampilkan data qris
    namaPenerima.value = 'QR Code Club Kita HESTY HUSAIN';
    acPenerima.value   = 'QR9876543210';
    qrisImage.appendChild(img);
    btnDownloadQR.style.display = 'flex'; // Ubah ke flex untuk centering icon
  
  } else if (method === 'BCA') {
    // Nonaktifkan tombol Sebelumnya, setelah memilih pembayaran
    const prevBtn = document.querySelector('#step-3 .btn-secondary');
    if (prevBtn) {
      prevBtn.disabled = true;
      prevBtn.classList.add('disabled');
      prevBtn.style.opacity = '0.6';
      prevBtn.style.cursor = 'not-allowed';
    }
  
    // Tampilkan data bca
    namaPenerima.value = 'HESTY HUSAIN';
    acPenerima.value   = '9876543210';
  
  } else if (method === 'Mandiri') {
    // Nonaktifkan tombol Sebelumnya, setelah memilih pembayaran
    const prevBtn = document.querySelector('#step-3 .btn-secondary');
    if (prevBtn) {
      prevBtn.disabled = true;
      prevBtn.classList.add('disabled');
      prevBtn.style.opacity = '0.6';
      prevBtn.style.cursor = 'not-allowed';
    }
  
    // Tampilkan data mandiri
    namaPenerima.value = 'HESTY HUSAIN';
    acPenerima.value   = '0123456789';
  }

  // Update nominal transfer
  if (method) {
    const harga        = parseInt(document.getElementById('harga').value.replace(/\D/g,'')) || 0;
    const telp         = document.getElementById('telp').value || '';
    const uniqueDigits = parseInt(telp.slice(-3)) || 0;
    const total        = harga + uniqueDigits;
    nominal.value      = total.toLocaleString('id-ID');
  }
}

/*******************************************************
* Fungsi tombol downloadQRIS untuk mendownload file qris
********************************************************/
function downloadQRIS(e) {
  e.preventDefault();  // Menghentikan event bubbling
  e.stopPropagation(); // Menghentikan propagasi event
  
  try {
    const qrImageUrl = 'https://amihaji.github.io/beratideal/images/qris_club_kita.jpeg';
    const link       = document.createElement('a');
    link.href        = qrImageUrl;
    link.download    = 'qris_pembayaran.jpg';
    link.target      = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Beri feedback visual
    const btn                 = document.getElementById('btnDownloadQR');
    btn.innerHTML             = '<i class="fas fa-check"></i> Terdownload';
    btn.style.backgroundColor = '#28a745';   // Tombol berubah Warna hijau
    btn.style.color           = '#fff';      // Warna teks putih
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-download"></i> Download QRIS';
      btn.style.backgroundColor = '';
    }, 2000);
    return false; // untuk memastikan tidak ada submit
 
  } catch (error) {
    console.error('Download error:', error);
    alert('Silakan buka gambar secara manual');
    return false;
  }
}

/************************************
* Fungsi untuk mengambil nilai harga
************************************/
function getHargaProgram(program) {
  const prices = {
    'Turun Berat Badan': 600001,
    'Naik Berat Badan': 600002,
    'Jaga Stamina': 600003 
  };
  return prices[program] || 0;
}
 
/***********************************************
* Fungsi Untuk mengsubmit data dari form inputan
************************************************/
async function submitForm() {
  const submitBtn = document.getElementById('btnSubmit');
  const msgBox3   = document.getElementById('msgBox3') || document.createElement('div');

  if (!validateStep(3)) return false;

  const sponsorInputValue = document.getElementById("mSponsor").value;
  const sponsorPhoneInputValue = document.getElementById("mHpSponsor").value;

  const formData = {
    tglDaftar:    document.getElementById('tanggal').value,
    noPesanan:    document.getElementById('nomorPesanan').value,
    program:      document.getElementById('program').value,
    harga:        document.getElementById('harga').value.replace(/\D/g,''),
    nama:         document.getElementById('nama').value,
    alamat:       document.getElementById('alamat').value,
    telp:         document.getElementById('telp').value,
    email:        document.getElementById('email').value,
    kelurahan:    document.getElementById('kelurahan').value,
    kecamatan:    document.getElementById('kecamatan').value,
    kota:         document.getElementById('kota').value,
    propinsi:     document.getElementById('propinsi').value,
    pembayaran:   document.getElementById('pembayaran').value,
    namaPenerima: document.getElementById('namaPenerima').value,
    acPenerima:   document.getElementById('acPenerima').value,
    nominal:      document.getElementById('nominal').value.replace(/\D/g,''),
    mSponsor:     sponsorInputValue,
    mHpSponsor:   sponsorPhoneInputValue
  };

  try {
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
   
    const response = await fetch(URL_dbDaftarBeratideal, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData)
    });

    if (!response.ok) throw new Error('Jaringan sedang gangguan');

    submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
    msgBox3.innerHTML   = '<div class="msg-success">Data berhasil dikirim!</div>';

    // formKonfirmasiBayar membaca noPesanan dari query string.
    localStorage.setItem('noPesanan', formData.noPesanan);

    setTimeout(function() {
      // kembali ke landingpage
      window.location.href = 'index.html';
    }, 3000); // delay 3 detik (3000 milidetik)

  } catch (error) {
    console.error('Error:', error);
    msgBox3.innerHTML   = `<div class="msg-error">Gagal mengirim: ${error.message}</div>`;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
    submitBtn.disabled  = false;
  }
 
}

/**********************************
* Fungsi untuk generate No Pesanan
**********************************/
function generateNoPesanan() {
  const now    = new Date();
  const dd     = String(now.getDate()).padStart(2, '0');
  const mm     = String(now.getMonth() + 1).padStart(2, '0');
  const yy     = String(now.getFullYear()).slice(-2);
  const random = Math.floor(Math.random() * 900) + 100;
  return `PS${dd}${mm}${yy}-${random}`;
}
