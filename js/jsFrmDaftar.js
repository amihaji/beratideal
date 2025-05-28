/**
 * VARIABEL GLOBAL
 */
let currentStep = 1;

/**
 * INISIALISASI FORM
 */
document.addEventListener('DOMContentLoaded', function() {
  // Set tanggal dan nomor pesanan
  document.getElementById('tanggal').value = new Date().toLocaleDateString('id-ID');
  document.getElementById('nomorPesanan').value = generateNoPesanan();

  // Event listener untuk download QRIS (diperbarui)
  const downloadBtn = document.getElementById('btnDownloadQR');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function(e) {
      e.preventDefault();
      downloadQRIS(e);
    }, false); // Gunakan capture false
  }

  // Event listener untuk program
  document.getElementById('program').addEventListener('change', function() {
    const harga = getHargaProgram(this.value);
    document.getElementById('harga').value = harga.toLocaleString('id-ID');
  });
  
  // Event listener untuk submit form (diperbarui)
  const form = document.getElementById('formDaftar');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      submitForm();
    }, false); // Gunakan capture false
  }

});

/**
 * FUNGSI NAVIGASI FORM
 */
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

function prevStep() {
  document.querySelector(`#step-${currentStep}`).classList.remove('active');
  document.querySelector(`#step-${currentStep-1}`).classList.add('active');
  updateProgressBar(currentStep-1);
  currentStep = currentStep-1;
}

function updateProgressBar(step) {
  const percentage = (step/3)*100;
  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = `Step ${step} dari 3`;
}

/**
 * VALIDASI FORM
 */
function validateStep(step) {
  const msgBoxId = `msgBox${step}`;
  const msgBox = document.getElementById(msgBoxId);
  
  // Jika msgBox tidak ditemukan, buat elemen baru
  if (!msgBox) {
    console.warn(`Element #${msgBoxId} not found, validation skipped`);
    return true;
  }

  msgBox.innerHTML = '';
  let isValid = true;
  const errors = [];



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

/**
 * FUNGSI PEMBAYARAN
 */
function updatePembayaran() {
  const method = document.getElementById('pembayaran').value;
  const qrisImage = document.getElementById('qrisImage'); // Perbaikan: Gunakan qrisImage bukan qrisContainer
  const btnDownloadQR = document.getElementById('btnDownloadQR');
  const namaPenerima = document.getElementById('namaPenerima');
  const acPenerima = document.getElementById('acPenerima');
  const nominal = document.getElementById('nominal');

  // Reset semua field
   btnDownloadQR.style.display = 'none';
   qrisImage.innerHTML = '';
   namaPenerima.value = '';
   acPenerima.value = '';
   nominal.value = '';

  if (method === 'QR') {
    // Buat elemen img baru dengan cara yang lebih reliable
    const img = document.createElement('img');
    img.src            = 'https://amihaji.github.io/beratideal/images/qris_club_kita.jpeg';
    img.alt            = 'QR Code Pembayaran';
    img.style.maxWidth = '200px';
    img.style.display  = 'block';
    img.style.margin   = '0 auto';
    img.style.border   = '1px solid #ddd';
    
    namaPenerima.value = 'QR Code Club Kita HESTY HUSAIN';
    acPenerima.value   = 'QR9876543210';
    qrisImage.appendChild(img);
    btnDownloadQR.style.display = 'flex'; // Ubah ke flex untuk centering icon
  
  } else if (method === 'BCA') {
    namaPenerima.value = 'HESTY HUSAIN';
    acPenerima.value   = '9876543210';
  } else if (method === 'Mandiri') {
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

function downloadQRIS(e) {
  e.preventDefault();  // Menghentikan event bubbling
  e.stopPropagation(); // Menghentikan propagasi event
  
  try {
    const qrImageUrl = 'https://amihaji.github.io/beratideal/images/qris_club_kita.jpeg';
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = 'qris_pembayaran.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Beri feedback visual
    const btn = document.getElementById('btnDownloadQR');
    btn.innerHTML = '<i class="fas fa-check"></i> Terdownload';
    btn.style.backgroundColor = '#28a745';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-download"></i> Download QRIS';
      btn.style.backgroundColor = '';
    }, 2000);
    
    return false; // Tambahan untuk memastikan tidak ada submit
  } catch (error) {
    console.error('Download error:', error);
    alert('Silakan buka gambar secara manual');
    return false;
  }
}

function getHargaProgram(program) {
  const prices = {
    '10 Hari': 700000,
    '21 Hari': 2100000,
    '3 Bulan': 7000000
  };
  return prices[program] || 0;
}

/**
 * FUNGSI SUBMIT FORM
 */
async function submitForm() {
  const submitBtn = document.getElementById('btnSubmit');
  const msgBox3 = document.getElementById('msgBox3') || document.createElement('div');
  
  // Validasi akhir
  if (!validateStep(3)) return false;

  // Kumpulkan data
  const formData = {
    tglDaftar: document.getElementById('tanggal').value,
    noPesanan: document.getElementById('nomorPesanan').value,
    program: document.getElementById('program').value,
    harga: document.getElementById('harga').value.replace(/\D/g,''),
    nama: document.getElementById('nama').value,
    alamat: document.getElementById('alamat').value,
    telp: document.getElementById('telp').value,
    email: document.getElementById('email').value,
    kelurahan: document.getElementById('kelurahan').value,
    kecamatan: document.getElementById('kecamatan').value,
    kota: document.getElementById('kota').value,
    propinsi: document.getElementById('propinsi').value,
    pembayaran: document.getElementById('pembayaran').value,
    namaPenerima: document.getElementById('namaPenerima').value,
    acPenerima: document.getElementById('acPenerima').value,
    nominal: document.getElementById('nominal').value.replace(/\D/g,'')
  };

  // Tampilkan loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

  try {
    // Kirim data ke Google Sheets
    const response = await fetch('https://script.google.com/macros/s/AKfycbzjL6T4pLCCV_cc8QxnyikE8yFfiLwGaXFL6ZvgQI8_1_N95NaXH-bSbfY1fSSORvBD/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(formData)
    });

    if (!response.ok) throw new Error('Network response was not ok');
    
    // Tampilkan pesan sukses
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
    msgBox3.innerHTML = '<div class="msg-success">Data berhasil dikirim!</div>';

    // Redirect setelah 3 detik
    setTimeout(() => {
      window.location.replace('index.html'); // Gunakan replace bukan href
    }, 3000);

  } catch (error) {
    console.error('Error:', error);
    msgBox3.innerHTML = `<div class="msg-error">Gagal mengirim: ${error.message}</div>`;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
    submitBtn.disabled = false;
  }
  
  return false; // Mencegah form submit default
}

/**
 * FUNGSI UTILITAS
 */
function generateNoPesanan() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const random = Math.floor(Math.random() * 900) + 100;
  return `PS${dd}${mm}${yy}-${random}`;
}