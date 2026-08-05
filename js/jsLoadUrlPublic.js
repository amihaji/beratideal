// ********** Deklarasi Variabel URL Public ***********
// UNTUK APLIKASI BERATIDEAL DAN FILE-FILE PENDUKUNGNYA
// **************************************************** 

// URl dbUSER (TabelUser, LogNotif) :
// jsDashboard.js, jsSetupUser.js untuk :
// - loginBeratideal.html
// - formDashboard.html
const URL_dbUser ='https://script.google.com/macros/s/AKfycbxXxje8Jxg-ZmTFMt21UdKGheJ1TFRdHSQLpffP2aZ53B63SklPVEvuGYcdK1q81ufRdg/exec';

// url dbProgram (PROGRAM , DATAKONSUMEN): 
// jsFitTracker.js, jsFollowCrm.js, jsProg10hari untuk :
// - formDashboard.html
// - prog10hari.html
const URL_dbProgram ='https://script.google.com/macros/s/AKfycbzPhBLMFqleNuNmzWOCpUeGyAbMpdzw0SsIFsunyy1mm_tFCnTXrIhuwxJ_b4mLgJY1DA/exec';

// URl dbWETools (SurveyData, DataWE) : 
// jsDashboard.js, jsFollowWe.js 
// untuk formDashboard.html
const URL_dbWETools ='https://script.google.com/macros/s/AKfycbyscUEUpSOywPEs2-V6_6MwkbpdiLcmraIAIgdP_oNbALIROB4l4NAeO_QT7aTymfvX/exec';

// url dbDaftarBeratideal (DAFTAR) :
// jsFrmDaftar.js, jsFrmBayar.js, jsFrmTandaTerima.js
// untuk formDaftar.html
const URL_dbDaftarBeratideal ='https://script.google.com/macros/s/AKfycby3soomCa5lK79mEt468TlbqgA0dIghdl1O9wky9NeTM91TQPGcLPlpdV58adgo52J-/exec'

// url dbReferral (REFERRAL) :
// jsReferral.js untuk formDashboard.html
// Isi URL deploy Apps Script dbReferral setelah file backend dipublikasikan
const URL_dbReferral = 'https://script.google.com/macros/s/AKfycbzGxgfzacEdz_GS00gSIP7OdQNG2kOZldkfB2ILtEXAwxGb4DvDK_IDzlRuuzHB96Gh6A/exec';

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

function applyManagedModalFieldTooltips(modalElement, fieldTooltips) {
    if (!modalElement || !fieldTooltips) return;

    Object.entries(fieldTooltips).forEach(function(entry) {
        var inputId = entry[0];
        var tooltipText = entry[1];
        var input = modalElement.querySelector('#' + inputId);
        if (!input) return;

        var inputGroup = input.closest('.input-group');
        var prefix = inputGroup ? inputGroup.querySelector('.input-group-text') : null;

        [input, inputGroup, prefix].forEach(function(node) {
            if (!node) return;
            node.removeAttribute('title');
            node.removeAttribute('data-bs-toggle');
            node.removeAttribute('data-bs-placement');
            node.removeAttribute('tabindex');
        });

        if (input.disabled && inputGroup) {
            inputGroup.setAttribute('title', tooltipText);
            inputGroup.setAttribute('data-bs-toggle', 'tooltip');
            inputGroup.setAttribute('data-bs-placement', 'top');
            inputGroup.setAttribute('tabindex', '0');
        } else {
            input.setAttribute('title', tooltipText);
            input.setAttribute('data-bs-toggle', 'tooltip');
            input.setAttribute('data-bs-placement', 'top');
        }
    });
}

function prepareManagedModalFieldTooltips(modalElement, fieldTooltips) {
    applyManagedModalFieldTooltips(modalElement, fieldTooltips);
    initModalTooltips(modalElement);
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
