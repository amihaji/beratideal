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
    document.querySelector(`#step-${currentStep - 1}`).classList.add('active');
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
  

  function showSuccess(message) {
    const msgBox = document.getElementById('msgBox3');
    msgBox.innerHTML = `<div class="msg-success">${message}</div>`;
  }
    
  async function submitForm() {
    const submitBtn = document.getElementById('btnSubmit');
    const msgBox = document.getElementById('msgBox3');
    
    // 1. Kumpulkan semua data form
    const formData = {
      tglDaftar: new Date().toLocaleDateString('id-ID'),
      noPesanan: document.getElementById('nomorPesanan').value,
      program: document.getElementById('program').value,
      harga: document.getElementById('harga').value.replace(/\D/g,'') || 0,
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
      nominal: document.getElementById('nominal').value.replace(/\D/g,'') || 0
    };
  
    // 2. Tampilkan loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    msgBox.innerHTML = '<div class="alert alert-info">Mengirim data...</div>';
  
    try {
      // 3. Kirim data sebagai form-urlencoded
      const formBody = Object.keys(formData)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(formData[key]))
        .join('&');
  
      const response = await fetch('https://script.google.com/macros/s/AKfycbwsoTh3ecdIakFIDSJqpP_c0SqPjZ3SCcBm_PQ11y_G-mxgqFaRbLtP4_I95NvAFEJ8/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody
      });
  
      // 4. Handle response
      submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil Terkirim';
      submitBtn.classList.remove('btn-primary');
      submitBtn.classList.add('btn-success');
      
      msgBox.innerHTML = '<div class="alert alert-success">Data berhasil dikirim! Redirect dalam 3 detik...</div>';
      
      // 5. Reset form dan redirect
      setTimeout(() => {
        document.getElementById('formDaftar').reset();
        // Generate nomor pesanan baru
        document.getElementById('nomorPesanan').value = generateNoPesanan();
        window.location.href = 'index.html';
      }, 3000);
  
    } catch (error) {
      // 6. Handle error
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
      msgBox.innerHTML = `<div class="alert alert-danger">Gagal mengirim data: ${error.message}</div>`;
      console.error('Error:', error);
    }
  }
  
  // Fungsi generate nomor pesanan
  function generateNoPesanan() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const random = Math.floor(Math.random() * 900) + 100; // 100-999
    return `PS${dd}${mm}${yy}-${random}`;
  }
 
  /**
  * INISIALISASI FORM SAAT HALAMAN DIMUAT
  */
    document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('tanggal').value = new Date().toLocaleDateString('id-ID');
    document.getElementById('nomorPesanan').value = generateNoPesanan();

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

  // Reset Form dengan mengosongkan field
  function resetForm() {
    // Reset semua input
    document.getElementById('formDaftar').reset();
    
    // Reset variabel formData
    formData = {
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
      // ... semua field lainnya
    };
    
    // Generate nomor pesanan baru
    document.getElementById('nomorPesanan').value = generateNoPesanan();
    
    // Reset tampilan ke step 1
    document.querySelectorAll('.form-step').forEach(step => {
      step.classList.remove('active');
    });
    document.getElementById('step-1').classList.add('active');
    updateProgressBar(1);
  }