// =============================================
// FUNCTIONS_SUMMARY - FIT CHALLENGE PROGRAM
// =============================================

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

// =============================================
// FUNGSI YANG TIDAK DIGUNAKAN (MARKED FOR DELETION)
// =============================================

const UNUSED_FUNCTIONS = {
    // 🗑️ FUNGSI YANG PERLU DIHAPUS
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
    
    // ⚠️ FUNGSI YANG DI-BACKUP (SUDAH DI-RENAME)
    backupFunctions: [
        'BACKUP_extractPlaylistId',
        'BACKUP_getActiveMenu', 
        'BACKUP_findMenuContainer'
    ]
};

// =============================================
// HELPER FUNCTIONS UNTUK FUNCTIONS_SUMMARY
// =============================================

/**
 * Get all function names from FUNCTIONS_SUMMARY
 */
function getAllFunctionNames() {
    return Object.values(FUNCTIONS_SUMMARY).flat();
}

/**
 * Find which module a function belongs to
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
 * Generate function usage report
 */
function generateFunctionReport() {
    const report = {
        totalFunctions: getAllFunctionNames().length,
        modules: {},
        unusedCount: UNUSED_FUNCTIONS.toBeDeleted.length
    };
    
    Object.entries(FUNCTIONS_SUMMARY).forEach(([module, functions]) => {
        report.modules[module] = {
            count: functions.length,
            functions: functions
        };
    });
    
    return report;
}

/**
 * Check for function name conflicts
 */
function checkFunctionConflicts() {
    const allFunctions = getAllFunctionNames();
    const duplicates = allFunctions.filter((func, index) => 
        allFunctions.indexOf(func) !== index
    );
    
    return {
        hasConflicts: duplicates.length > 0,
        duplicates: [...new Set(duplicates)]
    };
}