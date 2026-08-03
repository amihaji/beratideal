// ********** Deklarasi Variabel URL Public ***********
// UNTUK APLIKASI BERATIDEAL DAN FILE-FILE PENDUKUNGNYA
// **************************************************** 

// URl dbUSER (TabelUser, LogNotif) :
// jsDashboard.js, jsSetupUser.js untuk :
// - loginBeratideal.html
// - formDashboard.html
const URL_dbUser ='https://script.google.com/macros/s/AKfycbygI_rcLyGrGNTH_uOOrj-pKZ1_2_B9F8pm-3dmXeujP0A_secxuZhnzCGky1b9_RMUWQ/exec';

// url dbProgram (PROGRAM , DATAKONSUMEN): 
// jsFitTracker.js, jsFollowCrm.js, jsProg10hari untuk :
// - formDashboard.html
// - prog10hari.html
const URL_dbProgram ='https://script.google.com/macros/s/AKfycbwV2mZySfzMevxDroycyx3Nadwu6SR-Fn9MEJLZaV8AONHVO8YW9AhevaQ7p_Bwm_b1DQ/exec';

// URl dbWETools (SurveyData, DataWE) : 
// jsDashboard.js, jsFollowWe.js 
// untuk formDashboard.html
const URL_dbWETools ='https://script.google.com/macros/s/AKfycbyscUEUpSOywPEs2-V6_6MwkbpdiLcmraIAIgdP_oNbALIROB4l4NAeO_QT7aTymfvX/exec';

// url dbDaftarBeratideal (DAFTAR) :
// jsFrmDaftar.js, jsFrmBayar.js, jsFrmTandaTerima.js
// untuk formDaftar.html
const URL_dbDaftarBeratideal ='https://script.google.com/macros/s/AKfycbxDBhOy78Z2GhPGc2BGyFrB81hnWvI4CwQCPokuGfyX37TfJpBReMG02-Omzni8T_rD/exec'

// ============================================================
// FUNGSI GLOBAL UNTUK TOOLTIP - VERSI SEDERHANA
// ============================================================
function initModalTooltips(modalElement) {
    if (!modalElement) return;
    console.log('initModalTooltips dipanggil untuk:', modalElement.id || 'modal');
    
    // Tunggu sebentar agar DOM siap
    setTimeout(function() {
        // Cari semua elemen dengan data-bs-toggle="tooltip" di dalam modal
        var tooltipTriggers = modalElement.querySelectorAll('[data-bs-toggle="tooltip"]');
        console.log('Tooltip triggers ditemukan:', tooltipTriggers.length);
        
        tooltipTriggers.forEach(function(el) {
            // Hapus tooltip lama jika ada
            var oldTooltip = bootstrap.Tooltip.getInstance(el);
            if (oldTooltip) {
                oldTooltip.dispose();
            }
            // Buat tooltip baru
            new bootstrap.Tooltip(el, {
                trigger: 'hover focus',
                container: 'body',
                placement: 'top'
            });
        });
    }, 500);
}

function destroyModalTooltips(modalElement) {
    if (!modalElement) return;
    
    var tooltipTriggers = modalElement.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggers.forEach(function(el) {
        var tooltip = bootstrap.Tooltip.getInstance(el);
        if (tooltip) {
            tooltip.dispose();
        }
    });
}

// ============================================================
// INISIALISASI OTOMATIS UNTUK SEMUA MODAL
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - Inisialisasi tooltip otomatis');
    
    // Cari semua modal yang memiliki elemen dengan data-bs-toggle="tooltip"
    var allModals = document.querySelectorAll('.modal');
    allModals.forEach(function(modal) {
        var hasTooltip = modal.querySelector('[data-bs-toggle="tooltip"]');
        if (hasTooltip) {
            console.log('Modal dengan tooltip ditemukan:', modal.id);
            
            // Hapus event listener lama untuk menghindari duplikasi
            modal.removeEventListener('shown.bs.modal', function() {});
            modal.removeEventListener('hidden.bs.modal', function() {});
            
            modal.addEventListener('shown.bs.modal', function() {
                console.log('Modal shown:', this.id);
                initModalTooltips(this);
            });
            
            modal.addEventListener('hidden.bs.modal', function() {
                destroyModalTooltips(this);
            });
        }
    });
});