// scriptDaftar.js
let currentStep = 0;
const steps = document.querySelectorAll('.form-step');
const progress = document.getElementById('progressBar');
const formatter = new Intl.NumberFormat('id-ID');

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const tanggal = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
  document.getElementById('tanggal').value = tanggal;

  const noPesanan = `PS-${pad(now.getDate())}${pad(now.getMonth()+1)}${now.getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random()*9000)}`;
  document.getElementById('nomorPesanan').value = noPesanan;
});

document.getElementById('program').addEventListener('change', e => {
  const hargaMap = {"10 Hari": 600000, "21 Hari": 1200000, "3 Bulan": 3200000};
  const harga = hargaMap[e.target.value] || '';
  document.getElementById('harga').value = harga ? formatter.format(harga) : '';
  generateNominal();
});

function generateNominal() {
  const rawHarga = document.getElementById('harga').value.replace(/\D/g, '');
  const harga = parseInt(rawHarga);
  if (!isNaN(harga)) {
    const random = Math.floor(Math.random()*900)+100;
    const nominal = harga + random;
    document.getElementById('nominal').value = formatter.format(nominal);
  }
}

function updatePembayaran() {
  const value = document.getElementById('pembayaran').value;
  let nama = "";
  let ac = "";
  if (value === 'BCA') {
    nama = "Hesty Husain";
    ac = "bca123456789";
  } else if (value === 'Mandiri') {
    nama = "Hesty Husain";
    ac = "mandiri123456789";
  } else if (value === 'QR') {
    nama = "CLUB KITA Hesty Husain";
    ac = "ID1023260668521";
  }
  document.getElementById('namaPenerima').value = nama;
  document.getElementById('acPenerima').value = ac;
}

function showMessage(step, type, message) {
  const msgBox = document.getElementById(`msgBox${step}`);
  msgBox.innerHTML = `<div class="msg-${type}">${message}</div>`;
}

function validateStep(step) {
  if (step === 1) {
    const program = document.getElementById('program').value;
    if (!program) {
      showMessage(1, 'error', 'Silakan pilih program terlebih dahulu.');
      return false;
    }
  } else if (step === 2) {
    const fields = ['nama','alamat','telp','kelurahan','kecamatan','kota','propinsi'];
    for (const id of fields) {
      const value = document.getElementById(id).value.trim();
      if (value.length < 3) {
        showMessage(2, 'error', `Field ${id.toUpperCase()} minimal 3 karakter.`);
        return false;
      }
    }
  }
  return true;
}

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

document.getElementById('formDaftar').addEventListener('submit', async function(e) {
  e.preventDefault();

  const rawHarga = document.getElementById('harga').value.replace(/\D/g, '');
  const rawNominal = document.getElementById('nominal').value.replace(/\D/g, '');

  const data = {
    tanggal: document.getElementById('tanggal').value,
    nomorPesanan: document.getElementById('nomorPesanan').value,
    program: document.getElementById('program').value,
    harga: rawHarga,
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
