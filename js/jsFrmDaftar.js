/**
 * VARIABEL GLOBAL
 * Untuk menyimpan data sementara selama proses pendaftaran
 */
let formData = {
    tglDaftar: '',
    noPesanan: '',
    program: '',
    harga: 0,
    nama: '',
    alamat: '',
    telp: '',
    email: '',
    kelurahan: '',
    kecamatan: '',
    kota: '',
    propinsi: '',
    pembayaran: '',
    namaPenerima: '',
    acPenerima: '',
    nominal: 0
  };
  
  /**
   * FUNGSI UNTUK NAVIGASI FORM
   */
  function nextStep(currentStep) {
    // Validasi sebelum lanjut ke step berikutnya
    if (validateStep(currentStep)) {
      document.querySelector(`#step-${currentStep}`).classList.remove('active');
      document.querySelector(`#step-${currentStep + 1}`).classList.add('active');
      updateProgressBar(currentStep + 1);
      
      // Jika sampai ke step 3, update data pembayaran
      if (currentStep + 1 === 3) {
        updatePembayaran();
      }
    }
  }
  
  function prevStep() {
    const currentStep = parseInt(document.querySelector('.form-step.active').id.split('-')[1]);
    document.querySelector(`#step-${currentStep}`).classList.remove('active');
    document.querySelector(`#step-${currentStep - 1}`).classlist.add('active');
    updateProgressBar(currentStep - 1);
  }
  
  function updateProgressBar(step) {
    const percentage = (step / 3) * 100;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `Step ${step} dari 3`;
  }
  
  /**
   * VALIDASI SETIAP STEP
   */
  function validateStep(step) {
    let isValid = true;
    const msgBox = document.getElementById(`msgBox${step}`);
  
    // Reset pesan error
    msgBox.innerHTML = '';
  
    // Validasi Step 1: Program
    if (step === 1) {
      const program = document.getElementById('program').value;
      if (!program) {
        showError(msgBox, 'Silakan pilih program terlebih dahulu');
        isValid = false;
      } else {
        formData.program = program;
        formData.harga = getHargaProgram(program);
      }
    }
  
    // Validasi Step 2: Data Pribadi
    if (step === 2) {
      const requiredFields = ['nama', 'alamat', 'telp', 'email', 'kelurahan', 'kecamatan', 'kota', 'propinsi'];
      const errors = [];
  
      requiredFields.forEach(field => {
        const value = document.getElementById(field).value.trim();
        if (!value) {
          errors.push(`Field ${field.toUpperCase()} wajib diisi`);
        } else {
          formData[field] = value;
        }
      });
  
      // Validasi format email
      const email = document.getElementById('email').value;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Format email tidak valid');
      }
  
      if (errors.length > 0) {
        showError(msgBox, errors.join('<br>'));
        isValid = false;
      }
    }
  
    return isValid;
  }
  
  function showError(element, message) {
    element.innerHTML = `<div class="msg-error">${message}</div>`;
  }
  
  /**
   * FUNGSI PEMBAYARAN (STEP 3)
   */
  function updatePembayaran() {
    const method = document.getElementById('pembayaran').value;
    formData.pembayaran = method;
  
    // Update info penerima berdasarkan metode pembayaran
    if (method === 'QR') {
      formData.namaPenerima = 'CLUB KITA';
      formData.acPenerima = '1234567890';
      document.getElementById('qrisImage').innerHTML = '<img src="images/QRIS CLUB KITA.jpeg" alt="QR Code" style="max-width:200px;">';
      document.getElementById('btnDownloadQR').style.display = 'block';
    } else if (method === 'BCA') {
      formData.namaPenerima = 'HESTY HUSAIN';
      formData.acPenerima = '9876543210';
      document.getElementById('qrisImage').innerHTML = '';
      document.getElementById('btnDownloadQR').style.display = 'none';
    } else if (method === 'Mandiri') {
      formData.namaPenerima = 'HESTY HUSAIN';
      formData.acPenerima = '0123456789';
      document.getElementById('qrisImage').innerHTML = '';
      document.getElementById('btnDownloadQR').style.display = 'none';
    }
  
    // Update nominal transfer (harga program + 3 digit terakhir telp)
    const uniqueDigits = formData.telp ? parseInt(formData.telp.slice(-3)) || 0 : 0;
    formData.nominal = formData.harga + uniqueDigits;
  
    // Update tampilan
    document.getElementById('namaPenerima').value = formData.namaPenerima;
    document.getElementById('acPenerima').value = formData.acPenerima;
    document.getElementById('nominal').value = formData.nominal.toLocaleString('id-ID');
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
   * FUNGSI UNTUK KIRIM DATA KE GOOGLE SHEETS
   */
  async function submitForm() {
    // Update tanggal dan no pesanan
    formData.tglDaftar = new Date().toLocaleDateString('id-ID');
    formData.noPesanan = 'PS' + Date.now().toString().slice(-6);
  
    // Kirim data ke Google Sheets
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbxRBeQ_bL8G6YrHsx6ifcIjS773xmS6vh6aFUHOJ4JC43lWiL46hCz2Cx2_tKEdqU9P/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
  
      const result = await response.json();
      if (result.success) {
        showSuccess('Data berhasil disimpan!');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 3000);
      } else {
        showError(document.getElementById('msgBox3'), 'Gagal menyimpan data: ' + result.message);
      }
    } catch (error) {
      showError(document.getElementById('msgBox3'), 'Terjadi error: ' + error.message);
    }
  }
  
  function showSuccess(message) {
    const msgBox = document.getElementById('msgBox3');
    msgBox.innerHTML = `<div class="msg-success">${message}</div>`;
  }
  
  /**
   * INISIALISASI FORM SAAT HALAMAN DIMUAT
   */
  document.addEventListener('DOMContentLoaded', function() {
    // Set tanggal daftar otomatis
    document.getElementById('tanggal').value = new Date().toLocaleDateString('id-ID');
    
    // Event listener untuk perubahan program
    document.getElementById('program').addEventListener('change', function() {
      formData.program = this.value;
      formData.harga = getHargaProgram(this.value);
      document.getElementById('harga').value = formData.harga.toLocaleString('id-ID');
    });
  
    // Event listener untuk submit form
    document.getElementById('formDaftar').addEventListener('submit', function(e) {
      e.preventDefault();
      submitForm();
    });
  });