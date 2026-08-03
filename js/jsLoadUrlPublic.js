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
// FUNGSI GLOBAL UNTUK TOOLTIP - VERSI FINAL
// ============================================================
function initModalTooltips(modalElement) {
    if (!modalElement) return;
    console.log('initModalTooltips dipanggil untuk:', modalElement.id || 'modal tanpa id');
    
    setTimeout(function() {
        const tooltipTriggers = modalElement.querySelectorAll('[data-bs-toggle="tooltip"]');
        console.log('Tooltip triggers ditemukan:', tooltipTriggers.length);
        
        tooltipTriggers.forEach(function(el) {
            const oldTooltip = bootstrap.Tooltip.getInstance(el);
            if (oldTooltip) {
                oldTooltip.dispose();
            }
            new bootstrap.Tooltip(el, {
                trigger: 'hover focus',
                container: 'body',
                placement: 'top'
            });
        });
    }, 300);
}

function destroyModalTooltips(modalElement) {
    if (!modalElement) return;
    
    const tooltipTriggers = modalElement.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggers.forEach(function(el) {
        const tooltip = bootstrap.Tooltip.getInstance(el);
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
    
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(function(modal) {
        const hasTooltip = modal.querySelector('[data-bs-toggle="tooltip"]');
        if (hasTooltip) {
            console.log('Modal dengan tooltip ditemukan:', modal.id);
            
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