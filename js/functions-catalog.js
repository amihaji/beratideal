// =============================================
// FUNCTIONS_CATALOG.JS - FIT CHALLENGE PROGRAM
// Katalog lengkap semua fungsi dalam aplikasi
// =============================================

'use strict';

/**
 * 📊 FUNCTIONS SUMMARY - Katalog semua fungsi
 * Digunakan untuk dokumentasi, maintenance, dan debugging
 */
const FUNCTIONS_SUMMARY = {
    // ==================== CORE & AUTH ====================
    core: [
        'showAbout', 'hideAbout', 'logout', 
        'checkPerkenalanStatus', 'unlockModul'
    ],
    
    // ==================== VIDEO PLAYER ====================
    videoPlayer: [
        'initializeAllVideoPlayers', 'loadVideo', 'playVideo', 
        'closeVideo', 'closeAllVideos', 'loadYouTubeVideo', 
        'loadLocalVideo', 'extractYouTubeId', 'validateYouTubeUrl'
    ],
    
    // ==================== PDF VIEWER ====================
    pdfViewer: [
        'loadPDF', 'displayPDF', 'closePDF', 'closeAllPDFs',
        'setupPDFLinks', 'setupPanduanPDFLinks', 'fallbackToIframe',
        'openPDFInNewTab'
    ],
    
    // ==================== PLAYLIST ====================
    playlist: [
        'loadPlaylistData', 'getProvenVideos', 'setupPlaylistTriggers',
        'showPlaylistInSection', 'renderPlaylist', 'hidePlaylist',
        'playVideoFromPlaylist'
    ],
    
    // ==================== UI & NAVIGATION ====================
    ui: [
        'showSubmenu', 'hideSubmenu', 'setupAllLinks', 
        'setupCekDisiniButtons', 'setupPerkenalanCompletion',
        'setupMateriCompletion'
    ],
    
    // ==================== NOTIFICATION SYSTEM ====================
    notification: [
        'showMessage'
    ],
    
    // ==================== MEAL PLAN ====================
    mealPlan: [
        'setupMealPlanUpload', 'uploadMealPhoto', 'uploadMealPlanWithFile',
        'selesaiMealPlan', 'updateMealPlanUI'
    ],
    
    // ==================== RESISTANCE WORKOUT ====================
    resistance: [
        'addResistanceExercise', 'removeResistanceExercise', 
        'simpanResistanceData', 'loadSavedResistanceData'
    ],
    
    // ==================== PROGRESS TRACKING ====================
    progress: [
        'simpanMateri', 'uploadMealPlan', 'selesaiWorkout',
        'waterReminder', 'istirahat', 'simpanDataTracking',
        'tanyaCoach', 'selesaiPerkenalan', 'selesaiMateri'
    ],
    
    // ==================== UTILITIES ====================
    utilities: [
        'getHariKeFromSection', 'capitalizeFirst', 
        'updateMateriStatusUI'
    ],
    
    // ==================== FORM BUILDERS ====================
    formBuilders: [
        // Functions that dynamically create form elements
        // These are executed immediately when script loads
    ]
};

/**
 * 🗑️ FUNGSI YANG TIDAK DIGUNAKAN
 * Marked for deletion - aman untuk dihapus
 */
const UNUSED_FUNCTIONS = {
    toBeDeleted: [
        'debugVideoLoadProcess',           // Debug only, not in production
        'showMessageAuto',                 // Never called
        'getActiveMenu',                   // Incomplete implementation  
        'findMenuContainer',               // Never called
        'displayPDFWithPDFJS',             // Complex duplicate
        'showMobilePDFOptions',            // Never called
        'simpanProgress',                  // Incomplete logic
        'isReadyForNextModule',            // Incomplete implementation
        'simpanMealItem',                  // JSONP pattern (outdated)
        'simpanMealPlan',                  // Duplicate functionality
        'updateLockIcon',                  // Duplicate of updateMateriStatusUI
        'fileToBase64',                    // Already implemented elsewhere
        'extractPlaylistId',               // Not needed with JSON approach
        'showPlaylist',                    // Compatibility function not needed
        'resetResistanceData',             // Never used in normal flow
        'simpanStatusMateri',              // Uses undefined URL_APPS_SCRIPT_PROGRAM
        'triggerMealPlanUpload',           // Never called
        'uploadMealPlanImage',             // Uses undefined URL_APPS_SCRIPT_PROGRAM
        'simpanStatusMealItem',            // Uses undefined URL_APPS_SCRIPT_PROGRAM
        'simpanStatusMealPlan'             // Uses undefined URL_APPS_SCRIPT_PROGRAM
    ],
    
    backupFunctions: [
        'BACKUP_extractPlaylistId',
        'BACKUP_getActiveMenu', 
        'BACKUP_findMenuContainer'
    ]
};

// =============================================
// 🔧 HELPER FUNCTIONS
// =============================================

/**
 * Get all function names from FUNCTIONS_SUMMARY
 * @returns {string[]} Array of all function names
 */
function getAllFunctionNames() {
    return Object.values(FUNCTIONS_SUMMARY).flat();
}

/**
 * Find which module a function belongs to
 * @param {string} functionName - Name of the function to find
 * @returns {string} Module name or 'unknown'
 */
function findFunctionModule(functionName) {
    for (const [module, functions] of Object.entries(FUNCTIONS_SUMMARY)) {
        if (functions.includes(functionName)) {
            return module;
        }
    }
    return 'unknown';
}

/**
 * Generate comprehensive function usage report
 * @returns {Object} Report object with statistics
 */
function generateFunctionReport() {
    const allFunctions = getAllFunctionNames();
    
    const report = {
        totalFunctions: allFunctions.length,
        unusedCount: UNUSED_FUNCTIONS.toBeDeleted.length,
        backupCount: UNUSED_FUNCTIONS.backupFunctions.length,
        modules: {},
        summary: `FIT Challenge memiliki ${allFunctions.length} fungsi aktif dan ${UNUSED_FUNCTIONS.toBeDeleted.length} fungsi tidak terpakai`
    };
    
    // Module statistics
    Object.entries(FUNCTIONS_SUMMARY).forEach(([module, functions]) => {
        report.modules[module] = {
            count: functions.length,
            functions: functions,
            percentage: ((functions.length / allFunctions.length) * 100).toFixed(1) + '%'
        };
    });
    
    return report;
}

/**
 * Check for function name conflicts/duplicates
 * @returns {Object} Conflict report
 */
function checkFunctionConflicts() {
    const allFunctions = getAllFunctionNames();
    const duplicates = allFunctions.filter((func, index) => 
        allFunctions.indexOf(func) !== index
    );
    
    return {
        hasConflicts: duplicates.length > 0,
        duplicates: [...new Set(duplicates)],
        message: duplicates.length > 0 ? 
            `⚠️ Ditemukan ${duplicates.length} konflik nama function` : 
            '✅ Tidak ada konflik nama function'
    };
}

/**
 * Display formatted report in console
 */
function displayConsoleReport() {
    console.log('🎯 ==========================================');
    console.log('🎯 FIT CHALLENGE - FUNCTION CATALOG REPORT');
    console.log('🎯 ==========================================');
    
    const report = generateFunctionReport();
    const conflicts = checkFunctionConflicts();
    
    console.log('📊 ' + report.summary);
    console.log('🗑️  Fungsi tidak terpakai:', report.unusedCount);
    console.log('📁 Backup functions:', report.backupCount);
    
    console.log('\n📂 MODULE BREAKDOWN:');
    Object.entries(report.modules).forEach(([module, data]) => {
        console.log(`   ${module}: ${data.count} functions (${data.percentage})`);
    });
    
    console.log('\n⚠️  ' + conflicts.message);
    if (conflicts.hasConflicts) {
        console.log('   Konflik:', conflicts.duplicates);
    }
    
    console.log('\n🔍 FUNCTION SEARCH EXAMPLES:');
    console.log('   findFunctionModule("loadVideo") →', findFunctionModule('loadVideo'));
    console.log('   findFunctionModule("simpanMateri") →', findFunctionModule('simpanMateri'));
    console.log('   findFunctionModule("showMessage") →', findFunctionModule('showMessage'));
    
    console.log('\n💡 Tips: Gunakan fungsi di atas untuk maintenance dan debugging');
    console.log('==========================================\n');
}

// =============================================
// 🚀 INITIALIZATION & EXPORTS
// =============================================

// Auto-display report when loaded in console environment
if (typeof window !== 'undefined' && window.console) {
    // Tunggu sampai DOM siap sebelum menampilkan report
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', displayConsoleReport);
    } else {
        setTimeout(displayConsoleReport, 1000);
    }
}

// Export for modular use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FUNCTIONS_SUMMARY,
        UNUSED_FUNCTIONS,
        getAllFunctionNames,
        findFunctionModule,
        generateFunctionReport,
        checkFunctionConflicts,
        displayConsoleReport
    };
}