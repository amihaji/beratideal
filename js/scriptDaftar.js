// scriptDaftar.js - FINAL

// ============================== //
// Inisialisasi dan Setup Awal
// ============================== //

let currentStep = 0;
const steps = document.querySelectorAll('.form-step');
const progress = document.getElementById('progressBar');
const formatter = new Intl.NumberFormat('id-ID');

// Saat halaman selesai dimuat:
document.addEventListener('DOMContentLoaded', () => {
  // Isi tanggal dan nomor pesanan otomatis
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const tanggal = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
  document.getElementById('tanggal').value = tanggal;

  const noPesanan = `PS-${pad(now.getDate())}${pad(now.getMonth()+1)}${now.getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random()*9000)}`;
  document.getElementById('nomorPesanan').value = noPesanan;

  // Auto uppercase/lowercase
  document.querySelectorAll('input.uppercase').forEach(el => {
    el.addEventListener('input', () => {
      el.value = el.value.toUpperCase();
    });
  });
  document.querySelectorAll('input.lowercase').forEach(el => {
    el.addEventListener('input', () => {
      el.value = el.value.toLowerCase();
    });
  });
});

// Saat dropdown program berubah, atur harga otomatis

document.getElementById('program').addEventListener('change', e => {
  const hargaMap = { "10 Hari": 600000, "21 Hari": 1200000, "3 Bulan": 3200000 };
  const harga = hargaMap[e.target.value] || '';
  document.getElementById('harga').value = harga ? formatter.format(harga) : '';
  generateNominal();
});

// ========================= //
// Fungsi Hitung Nominal Akhir
// ========================= //
function generateNominal() {
  const rawHarga = document.getElementById('harga').value.replace(/\D/g, '');
  const harga = parseInt(rawHarga);
  if (!isNaN(harga)) {
    const random = Math.floor(Math.random()*900)+100; // Tambah 3 digit acak
    const nominal = harga + random;
    document.getElementById('nominal').value = formatter.format(nominal);
  }
}

// ============================= //
// Fungsi Update Rekening + QR Code
// ============================= //
function updatePembayaran() {
  const value = document.getElementById('pembayaran').value;
  let nama = "Hesty Husain";
  let ac = "";
  const qrisImage = document.getElementById('qrisImage');

  if (value === 'BCA') ac = "bca123456789";
  else if (value === 'Mandiri') ac = "mandiri123456789";
  else if (value === 'QR') ac = "QR123456789";

  document.getElementById('namaPenerima').value = nama;
  document.getElementById('acPenerima').value = ac;

  if (value === 'QR') {
    qrisImage.innerHTML = '<img src="images/QRIS CLUB KITA.jpeg" alt="QR Code" class="img-fluid" style="max-width:200px">';
  } else {
    qrisImage.innerHTML = '';
  }
}

// ====================== //
// Fungsi Tampilkan Pesan
// ====================== //
function showMessage(step, type, message) {
  const msgBox = document.getElementById(`msgBox${step}`);
  msgBox.innerHTML = `<div class="msg-${type}">${message}</div>`;
}

// ============================= //
// Validasi Input per Halaman
// ============================= //
function validateStep(step) {
  if (step === 1) {
    const program = document.getElementById('program').value;
    if (!program) {
      showMessage(1, 'error', 'Silakan pilih program terlebih dahulu.');
      return false;
    }
  } else if (step === 2) {
    const fields = ['nama','alamat','kelurahan','kecamatan','kota','propinsi'];
    for (const id of fields) {
      const value = document.getElementById(id).value.trim();
      if (value.length < 3 || value.length > 40) {
        showMessage(2, 'error', `Field ${id.toUpperCase()} harus 3–40 karakter.`);
        return false;
      }
    }
    // Validasi telp (hanya angka, panjang 10–14, tanpa 0 depan)
    let telp = document.getElementById('telp').value.replace(/\D/g, '').replace(/^0/, '');
    if (telp.length < 10 || telp.length > 14) {
      showMessage(2, 'error', 'Nomor telepon harus 10–14 digit angka dan tanpa awalan 0.');
      return false;
    }
    // Validasi email format
    const email = document.getElementById('email').value.toLowerCase();
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (email && !emailPattern.test(email)) {
      showMessage(2, 'error', 'Format email tidak valid.');
      return false;
    }
  }
  return true;
}

// ==================== //
// Navigasi antar halaman
// ==================== //
function nextStep(step) {
  if (!validateStep(step)) return;
  steps[currentStep].classList.remove('active');
  currentStep++;
  steps[currentStep].classList.add('active');
  updateProgress();
}

function prevStep() {
  steps[currentStep].classList.remove('active');
  currentStep--;
  steps[currentStep].classList.add('active');
  updateProgress();
}

function updateProgress() {
  progress.style.width = `${(currentStep+1)/steps.length*100}%`;
  progress.textContent = `Step ${currentStep+1} dari 3`;
}

// ================================= //
// Kirim Data ke Google Sheet Web App
// ================================= //
document.getElementById('formDaftar').addEventListener('submit', async function(e) {
  e.preventDefault();

  const rawHarga = document.getElementById('harga').value.replace(/\D/g, '');
  const rawNominal = document.getElementById('nominal').value.replace(/\D/g, '');
  const telpClean = document.getElementById('telp').value.replace(/\D/g, '').replace(/^0/, '');

  const data = {
    tanggal: document.getElementById('tanggal').value,
    nomorPesanan: document.getElementById('nomorPesanan').value,
    program: document.getElementById('program').value,
    harga: rawHarga,
    nama: document.getElementById('nama').value,
    alamat: document.getElementById('alamat').value,
    telp: telpClean,
    email: document.getElementById('email').value.toLowerCase(),
    kelurahan: document.getElementById('kelurahan').value,
    kecamatan: document.getElementById('kecamatan').value,
    kota: document.getElementById('kota').value,
    propinsi: document.getElementById('propinsi').value,
    pembayaran: document.getElementById('pembayaran').value,
    namaPenerima: document.getElementById('namaPenerima').value,
    acPenerima: document.getElementById('acPenerima').value,
    nominal: rawNominal
  };

  const msgBox = document.getElementById('msgBox3');
  msgBox.innerHTML = '';
  const btnSubmit = document.getElementById('btnSubmit');

  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbzhWSDlJHD2b8nyZf8pp0y_MR50JgPQpy_b2wYBVcNxTpIJ1wnJvvQKE3CY4Q7jXCur/exec', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.status === 'success') {
      msgBox.innerHTML = '<div class="msg-success">Pendaftaran berhasil, lihat konfirmasinya di WA dan Email anda!</div>';
      btnSubmit.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
      btnSubmit.disabled = true;
      document.getElementById('btnPrev').disabled = true;
      document.getElementById('formDaftar').reset();
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 4000);
    } else {
      msgBox.innerHTML = '<div class="msg-error">Terjadi kesalahan: ' + result.message + '</div>';
    }
  } catch (err) {
    msgBox.innerHTML = '<div class="msg-error">Gagal mengirim data.</div>';
  }
});