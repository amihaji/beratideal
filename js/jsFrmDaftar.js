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
  
  // Event listener untuk program
  document.getElementById('program').addEventListener('change', function() {
    const harga = getHargaProgram(this.value);
    document.getElementById('harga').value = harga.toLocaleString('id-ID');
  });
  
  // Event listener untuk submit form
  document.getElementById('formDaftar').addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm();
  });
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
  const msgBox = document.getElementById(`msgBox${step}`);
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
  const qrisImage = document.getElementById('qrisImage');
  const btnDownloadQR = document.getElementById('btnDownloadQR');
  const namaPenerima = document.getElementById('namaPenerima');
  const acPenerima = document.getElementById('acPenerima');
  const nominal = document.getElementById('nominal');

  // Reset semua field
  qrisImage.innerHTML = '';
  btnDownloadQR.style.display = 'none';
  namaPenerima.value = '';
  acPenerima.value = '';
  nominal.value = '';

  if (method === 'QR') {
    namaPenerima.value = 'CLUB KITA';
    acPenerima.value = '1234567890';
    
    // Tampilkan gambar QR Code
    qrisImage.innerHTML = `
      <img src="https://amihaji.github.io/beratideal/images/QRIS_CLUB_KITA.jpeg" 
           alt="QRIS CLUB KITA" 
           style="max-width: 200px; margin: 10px auto; display: block;">
    `;
    btnDownloadQR.style.display = 'block';
    
  } else if (method === 'BCA') {
    namaPenerima.value = 'HESTY HUSAIN';
    acPenerima.value = '9876543210';
  } else if (method === 'Mandiri') {
    namaPenerima.value = 'HESTY HUSAIN';
    acPenerima.value = '0123456789';
  }

  // Update nominal transfer
  if (method) {
    const harga = parseInt(document.getElementById('harga').value.replace(/\D/g,'')) || 0;
    const telp = document.getElementById('telp').value || '';
    const uniqueDigits = parseInt(telp.slice(-3)) || 0;
    const total = harga + uniqueDigits;
    nominal.value = total.toLocaleString('id-ID');
  }
}

function downloadQRIS() {
  const link = document.createElement('a');
  link.href = 'https://amihaji.github.io/beratideal/images/QRIS_CLUB_KITA.jpeg';
  link.download = 'QRIS_CLUB_KITA.jpeg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Beri feedback
  const msgBox = document.getElementById('msgBox3');
  msgBox.innerHTML = '<div class="alert alert-info">Download QRIS telah dimulai</div>';
  setTimeout(() => msgBox.innerHTML = '', 3000);
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
  const msgBox = document.getElementById('msgBox3');
  
  // Validasi akhir
  if (!validateStep(3)) return;

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
    const response = await fetch('https://script.google.com/macros/s/AKfycbz7s5RKRsYeU7V2EcQWeIN_7AhWb2FNfpSw1t2-c5tv5TvHhNJeekMe6igKtB_Me7Ll/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(formData)
    });

    // Tampilkan pesan sukses
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
    msgBox.innerHTML = '<div class="alert alert-success">Data berhasil dikirim! Redirect dalam 3 detik...</div>';
    
    // Reset form dan redirect
    setTimeout(() => {
      document.getElementById('formDaftar').reset();
      document.getElementById('nomorPesanan').value = generateNoPesanan();
      window.location.href = 'index.html';
    }, 3000);

  } catch (error) {
    // Tampilkan pesan error
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
    msgBox.innerHTML = `<div class="alert alert-danger">Gagal mengirim data: ${error.message}</div>`;
    console.error('Error:', error);
  }
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