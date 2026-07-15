/**************************************************************
APLIKASI BERATIDEAL
TAMPILAN DASHBOARD UNTUK :
FitTracker, Data Peserta, Program, Analytics, Setup ,Log Notif
***************************************************************/

// ********* Deklarasi Variabel Public **********
//const URL_dbUser = 'https://script.google.com/macros/s/AKfycbwYPMhKcrzjdFoBS8Qme47CmxOim_Lzo-dgJGFooqgfnHyWvP2-2ea1dqO9yapWoVyAWw/exec';
//const URL_dbWETools_Fallback = 'https://script.google.com/macros/s/AKfycbzF6Tcp32ER0GANh0igUw-iJbTM-OHUNCabkFTqgsZ1x48sWQra-x56hlWqojHpGQ6h/exec';
let followUpWEFallbackBound = false;
let currentPage = 'fittracker';
let pesertaData = [];
let programsData = [];
let analytics = {};
let charts = {};
let dashboardAdminPayload = null;
const DEFAULT_USER_ACCESS = {
    aksesLogin: 'N',
    aksesFitChallange: 'N',
    aksesFitTracker: 'N',
    aksesProgram: 'N',
    aksesAnalisa: 'N',
    aksesDataPeserta: 'N',
    aksesFollowWe: 'N',
    aksesFollowCrm: 'N',
    aksesReferall: 'N',
    aksesSetup: 'N',
    aksesLogNotif: 'N',
    aksesCoach: 'N'
};
const MENU_ACCESS_MAP = [
    { page: 'fittracker', navId: 'nav-fittracker', accessKey: 'aksesFitTracker' },
    { page: 'programs', navId: 'nav-programs', accessKey: 'aksesProgram' },
    { page: 'analytics', navId: 'nav-analytics', accessKey: 'aksesAnalisa' },
    { page: 'peserta', navId: 'nav-peserta', accessKey: 'aksesDataPeserta' },
    { page: 'followupwe', navId: 'nav-followupwe', accessKey: 'aksesFollowWe' },
    { page: 'followupcrm', navId: 'nav-followupcrm', accessKey: 'aksesFollowCrm' },
    { page: 'referall', navId: 'nav-referall', accessKey: 'aksesReferall' },
    { page: 'setupuser', navId: 'nav-setupuser', accessKey: 'aksesSetup' },
    { page: 'lognotif', navId: 'nav-lognotif', accessKey: 'aksesLogNotif' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
});

async function initializeApp() {
    const accessSynced = await syncUserAccessFromServer();
    if (!accessSynced) {
        return;
    }

    if (!enforceDashboardAccess()) {
        return;
    }

    updateActiveUserLabel();
    applyMenuAccessControl();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize charts
    initializeCharts();
    
    // Show default page
    showPage(getDefaultAccessiblePage());

    // Load initial data after UI is ready
    await loadAllData();
}

function normalizeAccessValue(value) {
    return String(value || 'N').trim().toUpperCase() === 'Y' ? 'Y' : 'N';
}

function buildNormalizedAccess(source = {}) {
    const fitTrackerValue = source.aksesFitTracker ?? source.aksesfittracker;

    return {
        aksesLogin: normalizeAccessValue(source.aksesLogin ?? source.akseslogin ?? source.login),
        aksesFitChallange: normalizeAccessValue(source.aksesFitChallange ?? source.aksesfitchallange ?? source.fitchallange),
        aksesFitTracker: normalizeAccessValue(fitTrackerValue),
        aksesProgram: normalizeAccessValue(source.aksesProgram ?? source.aksesprogram ?? fitTrackerValue),
        aksesAnalisa: normalizeAccessValue(source.aksesAnalisa ?? source.aksesanalisa ?? source.analisa),
        aksesDataPeserta: normalizeAccessValue(source.aksesDataPeserta ?? source.aksesdatapeserta ?? source.datapeserta),
        aksesFollowWe: normalizeAccessValue(source.aksesFollowWe ?? source.aksesfollowwe ?? source.followwe),
        aksesFollowCrm: normalizeAccessValue(source.aksesFollowCrm ?? source.aksesfollowcrm ?? source.followcrm),
        aksesReferall: normalizeAccessValue(source.aksesReferall ?? source.aksesreferall ?? source.referall),
        aksesSetup: normalizeAccessValue(source.aksesSetup ?? source.aksessetup ?? source.setup),
        aksesLogNotif: normalizeAccessValue(source.aksesLogNotif ?? source.akseslognotif ?? source.lognotif),
        aksesCoach: normalizeAccessValue(source.aksesCoach ?? source.aksescoach ?? source.coach)
    };
}

function persistUserAccess(access) {
    const normalizedAccess = buildNormalizedAccess(access);
    localStorage.setItem('rawUserAccess', JSON.stringify(access || {}));
    localStorage.setItem('userAccess', JSON.stringify(normalizedAccess));

    Object.entries(normalizedAccess).forEach(([key, value]) => {
        localStorage.setItem(key, value);
    });

    return normalizedAccess;
}

function clearUserSession() {
    clearStoredUserAccess();
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userHP');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userLevel');
    localStorage.removeItem('progressData');
}

function syncUserAccessFromServer() {
    const userId = String(localStorage.getItem('userId') || '').trim();
    const token = String(localStorage.getItem('userToken') || '').trim();

    if (!userId || !token) {
        clearUserSession();
        window.location.href = 'loginBeratideal.html';
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const callbackName = 'cb_access_' + Date.now();
        const script = document.createElement('script');
        let finished = false;

        const cleanup = () => {
            if (finished) return;
            finished = true;
            delete window[callbackName];
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };

        window[callbackName] = function(response) {
            if (!response || response.status !== 'success' || !response.access) {
                cleanup();
                clearUserSession();
                window.location.href = 'loginBeratideal.html';
                resolve(false);
                return;
            }

            persistUserAccess(response.access);
            cleanup();
            resolve(true);
        };

        script.onerror = function() {
            cleanup();
            clearUserSession();
            window.location.href = 'loginBeratideal.html';
            resolve(false);
        };

        script.src = `${URL_dbUser}?action=getUserAccess&userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}&callback=${callbackName}`;
        document.body.appendChild(script);
    });
}

function getStoredAccess() {
    const storedAccess = { ...DEFAULT_USER_ACCESS };
    let parsedAccess = {};
    let rawAccess = {};

    try {
        parsedAccess = JSON.parse(localStorage.getItem('userAccess') || '{}');
    } catch (error) {
        parsedAccess = {};
    }

    try {
        rawAccess = JSON.parse(localStorage.getItem('rawUserAccess') || '{}');
    } catch (error) {
        rawAccess = {};
    }

    const hasExplicitLoginFlag =
        Object.prototype.hasOwnProperty.call(parsedAccess, 'aksesLogin') ||
        Object.prototype.hasOwnProperty.call(rawAccess, 'aksesLogin') ||
        Object.prototype.hasOwnProperty.call(rawAccess, 'akseslogindash');
    /**
    storedAccess.aksesLogin = hasExplicitLoginFlag
        ? normalizeAccessValue(parsedAccess.aksesLogin || rawAccess.aksesLogin || rawAccess.akseslogindash || localStorage.getItem('aksesLogin'))
        : 'Y';
    storedAccess.aksesFitChallange = normalizeAccessValue(parsedAccess.aksesFitChallange || rawAccess.aksesFitChallange || rawAccess.aksesFC || rawAccess.aksesfitchallange || rawAccess.aksesfc || localStorage.getItem('aksesFitChallange'));
    storedAccess.aksesFitTracker = normalizeAccessValue(parsedAccess.aksesFitTracker || rawAccess.aksesFitTracker || rawAccess.aksesDashAdmin || rawAccess.aksesDashMember || rawAccess.aksesfittracker || rawAccess.aksesdashadmin || rawAccess.aksesdashmember || localStorage.getItem('aksesFitTracker'));
    storedAccess.aksesProgram = normalizeAccessValue(parsedAccess.aksesProgram || rawAccess.aksesProgram || rawAccess.aksesprogram || localStorage.getItem('aksesProgram') || storedAccess.aksesFitTracker);
    storedAccess.aksesAnalisa = normalizeAccessValue(parsedAccess.aksesAnalisa || rawAccess.aksesAnalisa || rawAccess.aksesanalisa || localStorage.getItem('aksesAnalisa'));
    storedAccess.aksesDataPeserta = normalizeAccessValue(parsedAccess.aksesDataPeserta || rawAccess.aksesDataPeserta || rawAccess.aksesdatapeserta || localStorage.getItem('aksesDataPeserta'));
    storedAccess.aksesFollowWe = normalizeAccessValue(parsedAccess.aksesFollowWe || rawAccess.aksesFollowWe || rawAccess.aksesDashWE || rawAccess.aksesfollowwe || rawAccess.aksesdashwe || localStorage.getItem('aksesFollowWe'));
    storedAccess.aksesFollowCrm = normalizeAccessValue(parsedAccess.aksesFollowCrm || rawAccess.aksesFollowCrm || rawAccess.aksesCRM || rawAccess.aksesfollowcrm || rawAccess.aksescrm || localStorage.getItem('aksesFollowCrm'));
    storedAccess.aksesReferall = normalizeAccessValue(parsedAccess.aksesReferall || rawAccess.aksesReferall || rawAccess.aksesreferall || localStorage.getItem('aksesReferall'));
    storedAccess.aksesSetup = normalizeAccessValue(parsedAccess.aksesSetup || rawAccess.aksesSetup || rawAccess.aksesSetting || rawAccess.aksessetup || rawAccess.aksessetting || localStorage.getItem('aksesSetup'));
    storedAccess.aksesLogNotif = normalizeAccessValue(parsedAccess.aksesLogNotif || rawAccess.aksesLogNotif || rawAccess.akseslognotif || localStorage.getItem('aksesLogNotif'));
    storedAccess.aksesCoach = normalizeAccessValue(parsedAccess.aksesCoach || rawAccess.aksesCoach || rawAccess.aksesCOACH || rawAccess.aksescoach || localStorage.getItem('aksesCoach'));
    **/


    if (!hasExplicitLoginFlag) {
        return storedAccess;
    }

    return buildNormalizedAccess({
        ...rawAccess,
        ...parsedAccess,
        aksesLogin: parsedAccess.aksesLogin || rawAccess.aksesLogin || localStorage.getItem('aksesLogin'),
        aksesFitChallange: parsedAccess.aksesFitChallange || rawAccess.aksesFitChallange || localStorage.getItem('aksesFitChallange'),
        aksesFitTracker: parsedAccess.aksesFitTracker || rawAccess.aksesFitTracker || localStorage.getItem('aksesFitTracker'),
        aksesProgram: parsedAccess.aksesProgram || rawAccess.aksesProgram || localStorage.getItem('aksesProgram'),
        aksesAnalisa: parsedAccess.aksesAnalisa || rawAccess.aksesAnalisa || localStorage.getItem('aksesAnalisa'),
        aksesDataPeserta: parsedAccess.aksesDataPeserta || rawAccess.aksesDataPeserta || localStorage.getItem('aksesDataPeserta'),
        aksesFollowWe: parsedAccess.aksesFollowWe || rawAccess.aksesFollowWe || localStorage.getItem('aksesFollowWe'),
        aksesFollowCrm: parsedAccess.aksesFollowCrm || rawAccess.aksesFollowCrm || localStorage.getItem('aksesFollowCrm'),
        aksesReferall: parsedAccess.aksesReferall || rawAccess.aksesReferall || localStorage.getItem('aksesReferall'),
        aksesSetup: parsedAccess.aksesSetup || rawAccess.aksesSetup || localStorage.getItem('aksesSetup'),
        aksesLogNotif: parsedAccess.aksesLogNotif || rawAccess.aksesLogNotif || localStorage.getItem('aksesLogNotif'),
        aksesCoach: parsedAccess.aksesCoach || rawAccess.aksesCoach || localStorage.getItem('aksesCoach')
    });
}

function clearStoredUserAccess() {
    Object.keys(DEFAULT_USER_ACCESS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('userAccess');
    localStorage.removeItem('rawUserAccess');
}

function hasPageAccess(pageName) {
    const menu = MENU_ACCESS_MAP.find((item) => item.page === pageName);
    if (!menu) return false;

    const access = getStoredAccess();
    return access[menu.accessKey] === 'Y';
}

function getDefaultAccessiblePage() {
    const firstAccessibleMenu = MENU_ACCESS_MAP.find((item) => hasPageAccess(item.page));
    return firstAccessibleMenu ? firstAccessibleMenu.page : 'fittracker';
}

function applyMenuAccessControl() {
    MENU_ACCESS_MAP.forEach(({ navId, page, accessKey }) => {
        const navLink = document.getElementById(navId);
        const pageElement = document.getElementById(page + '-page');
        const isAllowed = getStoredAccess()[accessKey] === 'Y';

        if (navLink && navLink.parentElement) {
            navLink.parentElement.style.display = isAllowed ? '' : 'none';
        }

        if (!isAllowed && pageElement) {
            pageElement.style.display = 'none';
        }
    });
}

function enforceDashboardAccess() {
    const access = getStoredAccess();
    const hasDashboardAccess = MENU_ACCESS_MAP.some(({ accessKey }) => access[accessKey] === 'Y');

    if (hasDashboardAccess) {
        return true;
    }

    if (access.aksesFitChallange === 'Y') {
        window.location.href = 'prog10hari.html';
        return false;
    }

    clearUserSession();
    window.location.href = 'loginBeratideal.html';
    return false;
}

function updateActiveUserLabel() {
    const el = document.getElementById('activeUserId');
    if (!el) return;

    const userId = localStorage.getItem('userId');
    el.textContent = userId ? userId : '-';
}

function setupEventListeners() {
    // Search functionality
    const searchPeserta = document.getElementById('searchPeserta');
    const filterProgram = document.getElementById('filterProgram');
    if (searchPeserta) searchPeserta.addEventListener('input', filterPeserta);
    if (filterProgram) filterProgram.addEventListener('change', filterPeserta);
    
    // Add peserta form (only if exists)
    const addPesertaForm = document.getElementById('addPesertaForm');
    if (addPesertaForm) addPesertaForm.addEventListener('submit', handleAddPeserta);
    
    // Navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Page Navigation
function showPage(pageName) {
    if (!hasPageAccess(pageName)) {
        showToast('Anda tidak memiliki hak akses ke menu ini.', 'warning');
        const fallbackPage = getDefaultAccessiblePage();
        if (fallbackPage !== pageName) {
            pageName = fallbackPage;
        } else {
            return;
        }
    }

    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    document.getElementById(pageName + '-page').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById('nav-' + pageName).classList.add('active');
    
    currentPage = pageName;
    
    // Load page-specific data
    switch(pageName) {
        case 'fittracker':
            renderFittracker();
            break;
        case 'peserta':
            renderPeserta();
            break;
        case 'programs':
            renderPrograms();
            break;
        case 'analytics':
            renderAnalytics();
            break;
        case 'followupwe':
            if (typeof loadTableData === 'function') {
                loadTableData();
            } else {
                ensureFollowUpWEFallback();
                loadFollowUpWETableFallback();
            }
            break;
        case 'followupcrm':
            if (typeof loadCrmTableData === 'function') {
                loadCrmTableData();
            }
            break;     
        case 'setupuser':
            // Setup user page will load user table automatically
            loadUserTable(); // Make sure this function exists in jsSetupUser.js
            break;
        case 'lognotif':
            // Log notif page will load log table automatically
            loadLogNotifTable(); // Make sure this function exists in jsSetupUser.js
            break;        
      
    }
}

function ensureFollowUpWEFallback() {
    if (followUpWEFallbackBound) return;

    const filterButton = document.getElementById('filterButton');
    const filterInput = document.getElementById('filterNama') || document.getElementById('filterSponsor');
    const startButton = document.getElementById('startFollowUpButton');
    const cancelButton = document.getElementById('cancelFollowUpButton');
    const checkAll = document.getElementById('checkAll');

    if (filterButton) {
        filterButton.addEventListener('click', loadFollowUpWETableFallback);
    }

    if (filterInput) {
        filterInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                loadFollowUpWETableFallback();
            }
        });
    }

    if (startButton) {
        startButton.addEventListener('click', function() {
            const normalToolbar = document.getElementById('normalToolbar');
            const followUpToolbar = document.getElementById('followUpToolbar');
            const followUpMessageBox = document.getElementById('followUpMessageBox');

            if (filterInput) filterInput.disabled = true;
            if (filterButton) filterButton.disabled = true;
            if (normalToolbar) normalToolbar.classList.add('sembunyikan');
            if (followUpToolbar) followUpToolbar.classList.remove('sembunyikan');
            if (followUpMessageBox) followUpMessageBox.style.display = 'block';

            document.querySelectorAll('#weTableBody .rowCheckbox, #dataTableBody .rowCheckbox').forEach(cb => cb.classList.remove('d-none'));
            document.querySelectorAll('#weTableBody .action-icon, #dataTableBody .action-icon').forEach(icon => icon.classList.add('disabled-action'));
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            const normalToolbar = document.getElementById('normalToolbar');
            const followUpToolbar = document.getElementById('followUpToolbar');
            const followUpMessageBox = document.getElementById('followUpMessageBox');
            const waMessage = document.getElementById('waMessage');

            if (filterInput) filterInput.disabled = false;
            if (filterButton) filterButton.disabled = false;
            if (normalToolbar) normalToolbar.classList.remove('sembunyikan');
            if (followUpToolbar) followUpToolbar.classList.add('sembunyikan');
            if (followUpMessageBox) followUpMessageBox.style.display = 'none';
            if (waMessage) waMessage.value = '';
            if (checkAll) checkAll.checked = false;

            document.querySelectorAll('#weTableBody .rowCheckbox, #dataTableBody .rowCheckbox').forEach(cb => {
                cb.classList.add('d-none');
                cb.checked = false;
            });
            document.querySelectorAll('#weTableBody .action-icon, #dataTableBody .action-icon').forEach(icon => icon.classList.remove('disabled-action'));
        });
    }

    if (checkAll) {
        checkAll.addEventListener('change', function() {
            document.querySelectorAll('#weTableBody .rowCheckbox, #dataTableBody .rowCheckbox').forEach(cb => cb.checked = this.checked);
        });
    }

    window.loadTableData = loadFollowUpWETableFallback;
    followUpWEFallbackBound = true;

    if (typeof showPesan === 'function') {
        showPesan('warning', 'PERHATIAN : FollowUp WE memakai fallback dari jsDashboard karena jsFollowWe.js belum termuat di hosting.', 5000);
    }
}

function setFollowUpWELoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
}

function formatFollowUpWETanggal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function normalizeFollowUpWEKeyword(value) {
    return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function filterFollowUpWERecordsByName(rows, keyword) {
    const normalizedKeyword = normalizeFollowUpWEKeyword(keyword);
    if (!Array.isArray(rows)) return [];
    if (!normalizedKeyword) return rows;

    return rows.filter((row) => {
        const nama = normalizeFollowUpWEKeyword(row[2]);
        return nama.includes(normalizedKeyword);
    });
}

function loadFollowUpWETableFallback() {
    const tableBody = document.getElementById('weTableBody') || document.getElementById('dataTableBody');
    const filterInput = document.getElementById('filterNama') || document.getElementById('filterSponsor');

    if (!tableBody) return;

    setFollowUpWELoading(true);

    const filterValue = filterInput ? filterInput.value.trim() : '';
    const callbackName = 'we_cb_' + Date.now();
    const script = document.createElement('script');
    // script.src = `${URL_dbWETools_Fallback}?action=getDataWE&filter=${encodeURIComponent(filterValue)}&callback=${callbackName}`;
    script.src = `${URL_dbWETools}?action=getDataWE&filter=${encodeURIComponent(filterValue)}&callback=${callbackName}`;

    window[callbackName] = function(response) {
        tableBody.innerHTML = '';

        if (!response || response.status !== 'success' || !Array.isArray(response.data)) {
            tableBody.innerHTML = '<tr><td colspan="8">Gagal memuat data prospek WE.</td></tr>';
            if (typeof showPesan === 'function') {
                showPesan('error', `ERROR : ${(response && response.message) ? response.message : 'Data tidak valid dari server.'}`, 5000);
            }
            cleanupFollowUpWEJsonp(script, callbackName);
            setFollowUpWELoading(false);
            return;
        }

        const filteredRows = filterFollowUpWERecordsByName(response.data, filterValue);

        if (response.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8">Tidak ada data prospek WE.</td></tr>';
            cleanupFollowUpWEJsonp(script, callbackName);
            setFollowUpWELoading(false);
            return;
        }

        if (filteredRows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8">Data dengan nama tersebut tidak ditemukan.</td></tr>';
            if (typeof showPesan === 'function') {
                showPesan('warning', 'PERHATIAN : Data dengan nama tersebut tidak ditemukan.', 4000);
            }
            cleanupFollowUpWEJsonp(script, callbackName);
            setFollowUpWELoading(false);
            return;
        }

        filteredRows.forEach(row => {
            const tr = document.createElement('tr');
            const rowIndex = row[0];
            const tanggal = formatFollowUpWETanggal(row[1]);
            const nama = row[2] || '';
            const hp = row[3] || '';
            const email = row[4] || '';
            const sponsor = row[29] || '';
            const hpSponsor = row[30] || '';
            const actionsHtml = typeof viewRecord === 'function'
                ? `
                    <a href="#" class="action-icon ${userLevel === 'User' ? 'disabled-action' : ''}" onclick="${userLevel !== 'User' ? `viewRecord(${rowIndex})` : 'return false;'}" title="Lihat"><i class="fas fa-eye"></i></a>
                    <a href="#" class="action-icon ${userLevel === 'User' ? 'disabled-action' : ''}" onclick="${userLevel !== 'User' ? `openEditModal(${rowIndex}, '${String(nama).replace(/'/g, "\\'")}', '${String(hp).replace(/'/g, "\\'")}', '${String(email).replace(/'/g, "\\'")}', '${String(sponsor).replace(/'/g, "\\'")}', '${String(hpSponsor).replace(/'/g, "\\'")}')` : 'return false;'}" title="Edit"><i class="fas fa-edit"></i></a>
                    <a href="#" class="action-icon ${userLevel === 'User' ? 'disabled-action' : ''}" onclick="${userLevel !== 'User' ? `deleteRow(${rowIndex})` : 'return false;'}" title="Hapus"><i class="fas fa-trash"></i></a>
                `
                : '<span class="text-muted small">Aksi belum aktif</span>';

            tr.innerHTML = `
                <td><input type="checkbox" class="rowCheckbox d-none"></td>
                <td>${tanggal}</td>
                <td>${nama}</td>
                <td>${hp}</td>
                <td>${email}</td>
                <td>${sponsor}</td>
                <td>${hpSponsor}</td>
                <td class="actions-col">${actionsHtml}</td>
            `;
            tableBody.appendChild(tr);
        });

        cleanupFollowUpWEJsonp(script, callbackName);
        setFollowUpWELoading(false);
    };

    script.onerror = function() {
        tableBody.innerHTML = '<tr><td colspan="8">Gagal menghubungi server data prospek WE.</td></tr>';
        if (typeof showPesan === 'function') {
            showPesan('error', 'ERROR : Tidak dapat mengambil data prospek WE.', 5000);
        }
        cleanupFollowUpWEJsonp(script, callbackName);
        setFollowUpWELoading(false);
    };

    document.body.appendChild(script);
}

function cleanupFollowUpWEJsonp(script, callbackName) {
    delete window[callbackName];
    if (script && document.body.contains(script)) {
        document.body.removeChild(script);
    }
}

// Load All Data
async function loadAllData() {
    showLoading(true);
    try {
        dashboardAdminPayload = await fetchAdminDashboardData();
        pesertaData = Array.isArray(dashboardAdminPayload.participants) ? dashboardAdminPayload.participants : [];
        programsData = Array.isArray(dashboardAdminPayload.programs) ? dashboardAdminPayload.programs : [];
        analytics = dashboardAdminPayload.analytics || getEmptyAnalyticsData();

        populateProgramFilterOptions();
        
        renderCurrentPage();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Gagal memuat data dashboard dari dbProgram: ' + error.message, 'error');
        dashboardAdminPayload = null;
        pesertaData = [];
        programsData = [];
        analytics = getEmptyAnalyticsData();
        populateProgramFilterOptions();
        renderCurrentPage();
    } finally {
        showLoading(false);
    }
}

async function fetchAdminDashboardData() {
    const response = await fetch(`${URL_dbProgram}?action=getAdminDashboardData`);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success && data.status !== 'success') {
        throw new Error(data.message || 'Respons dashboard admin tidak valid.');
    }

    return data;
}

function renderCurrentPage() {
    switch(currentPage) {
        case 'fittracker':
            renderFittracker();
            break;
        case 'peserta':
            renderPeserta();
            break;
        case 'programs':
            renderPrograms();
            break;
        case 'analytics':
            renderAnalytics();
            break;
    }
}

// Fittracker Rendering
function renderFittracker() {
    // Update stats
    const totalPeserta = pesertaData.length;
    const activePeserta = pesertaData.filter(s => isActive(s)).length;
    const avgProgress = Math.round(pesertaData.reduce((sum, s) => sum + s.progress, 0) / totalPeserta) || 0;
    const completedPrograms = pesertaData.filter(s => s.progress >= 100).length;
    
    document.getElementById('total-peserta').textContent = totalPeserta;
    document.getElementById('active-peserta').textContent = activePeserta;
    document.getElementById('active-percentage').textContent = totalPeserta
        ? `${Math.round((activePeserta / totalPeserta) * 100)}% dari total`
        : '0% dari total';
    document.getElementById('avg-progress').textContent = avgProgress + '%';
    document.getElementById('completed-programs').textContent = completedPrograms;
    
    // Render programs
    renderProgramsOverview();
    
    // Update charts
    updateCharts();
}

function renderProgramsOverview() {
    const container = document.getElementById('programs-container');
    const programStats = getProgramStats();
    
    container.innerHTML = '';
    
    programStats.forEach(program => {
        const programHtml = `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card program-card ${program.class} h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h5 class="card-title">${program.name}</h5>
                            <span class="badge ${program.badgeClass}">
                                <i class="${program.icon}"></i>
                            </span>
                        </div>
                        <p class="card-text text-muted small">${program.description}</p>
                        
                        <div class="row text-center mb-3">
                            <div class="col-6">
                                <h6 class="mb-1">${program.participants}</h6>
                                <small class="text-muted">Peserta</small>
                            </div>
                            <div class="col-6">
                                <h6 class="mb-1">${program.completionRate}%</h6>
                                <small class="text-muted">Completion</small>
                            </div>
                        </div>
                        
                        <div class="progress mb-2" style="height: 8px;">
                            <div class="progress-bar" role="progressbar" 
                                 style="width: ${program.completionRate}%"></div>
                        </div>
                        
                        <button class="btn btn-outline-primary btn-sm w-100" 
                                onclick="showProgramDetail('${program.name}')">
                            <i class="bi bi-eye me-1"></i>Lihat Detail
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += programHtml;
    });
}

// Peserta Rendering
function renderPeserta() {
    renderPesertaTopPerformers();
    filterPeserta();
}

function filterPeserta() {
    const searchElement = document.getElementById('searchPeserta');
    const filterElement = document.getElementById('filterProgram');
    const searchTerm = String(searchElement ? searchElement.value : '').toLowerCase();
    const programFilter = filterElement ? filterElement.value : '';
    
    let filtered = pesertaData.filter(peserta => {
        const matchesSearch = String(peserta.name || '').toLowerCase().includes(searchTerm) || 
                             String(peserta.email || '').toLowerCase().includes(searchTerm) ||
                             String(peserta.userId || '').toLowerCase().includes(searchTerm);
        const matchesProgram = !programFilter || peserta.program === programFilter;
        return matchesSearch && matchesProgram;
    });
    
    renderPesertaCards(filtered);
}

function renderPesertaCards(peserta) {
    const container = document.getElementById('peserta-container');
    
    if (peserta.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center py-5">
                        <i class="bi bi-search fs-1 text-muted mb-3"></i>
                        <h5>Tidak ada peserta ditemukan</h5>
                        <p class="text-muted">Coba ubah kriteria pencarian Anda</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    peserta.forEach(peserta => {
        const programClass = getProgramClass(peserta.program);
        const avatarBg = getAvatarColor(peserta.name);
        const pesertaId = String(peserta.id || '').replace(/'/g, "\\'");
        
        const pesertaHtml = `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card peserta-card h-100" onclick="showPesertaDetail('${pesertaId}')">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="peserta-avatar me-3" style="background-color: ${avatarBg}">
                                ${peserta.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-1">${peserta.name}</h6>
                                <small class="text-muted">${peserta.email}</small>
                            </div>
                            <span class="program-badge ${programClass}">
                                ${getProgramIcon(peserta.program)}
                            </span>
                        </div>
                        
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small class="text-muted">Progress</small>
                                <small class="fw-bold">${peserta.progress}%</small>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-primary" role="progressbar" 
                                     style="width: ${peserta.progress}%"></div>
                            </div>
                        </div>
                        
                        <div class="row text-center small">
                            <div class="col-4">
                                <div class="text-muted">Awal</div>
                                <div class="fw-bold">${peserta.initialWeight ?? '-'}kg</div>
                            </div>
                            <div class="col-4">
                                <div class="text-muted">Saat Ini</div>
                                <div class="fw-bold">${peserta.currentWeight ?? '-'}kg</div>
                            </div>
                            <div class="col-4">
                                <div class="text-muted">Target</div>
                                <div class="fw-bold">${peserta.targetWeight ?? '-'}kg</div>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <div class="d-flex justify-content-between align-items-center small text-muted">
                            <span>Bergabung: ${formatDate(peserta.joinDate)}</span>
                            <span class="${isActive(peserta) ? 'text-success' : 'text-warning'}">
                                <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i>
                                ${isActive(peserta) ? 'Aktif' : 'Tidak Aktif'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += pesertaHtml;
    });
}

// Programs Rendering
function renderPrograms() {
    const container = document.getElementById('program-details-container');
    const programStats = getProgramStats();
    
    container.innerHTML = '';
    
    programStats.forEach(program => {
        const programHtml = `
            <div class="card mb-4">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <span class="badge ${program.badgeClass} me-3">
                                <i class="${program.icon}"></i>
                            </span>
                            <div>
                                <h5 class="mb-1">${program.name}</h5>
                                <p class="text-muted mb-0">${program.description}</p>
                            </div>
                        </div>
                        <div class="text-end">
                            <h4 class="mb-0">${program.participants}</h4>
                            <small class="text-muted">Peserta</small>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6>Tingkat Penyelesaian Modul</h6>
                            <div id="modules-${program.id}" class="mb-3">
                                <!-- Modules will be loaded here -->
                            </div>
                        </div>
                        <div class="col-md-4">
                            <h6>Status Program</h6>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Tingkat Penyelesaian:</span>
                                <strong>${program.completionRate}%</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Rata-rata Progres:</span>
                                <strong>${program.avgProgress}%</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Peserta Aktif:</span>
                                <strong>${program.activePeserta}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += programHtml;
    });

    programStats.forEach(program => {
        renderProgramModules(program);
    });
}

// Analytics Rendering
function renderAnalytics() {
    renderAnalyticsSummaryCards();
    renderAnalyticsInsights();
    renderModuleSpotlight();
    const topPerformers = getTopPerformersData();
    
    const topPerformersContainer = document.getElementById('top-performers');
    topPerformersContainer.innerHTML = '';

    if (topPerformers.length === 0) {
        topPerformersContainer.innerHTML = '<p class="text-muted mb-0">Belum ada data peserta.</p>';
        updateMonthlyTrendChart();
        updateCompletionFunnelChart();
        updateActivityStatusChart();
        return;
    }
    
    topPerformers.forEach((peserta, index) => {
        const medalClass = index === 0 ? 'bg-warning text-dark' : index === 1 ? 'bg-secondary' : index === 2 ? 'bg-danger' : 'bg-primary';
        const performerHtml = `
            <div class="d-flex align-items-center mb-3">
                <div class="me-3">
                    <span class="badge ${medalClass}">#${index + 1}</span>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${peserta.name}</h6>
                    <small class="text-muted">${peserta.program} | ${buildTopPerformerMetricText(peserta)}</small>
                </div>
                <div class="text-end">
                    <strong>${peserta.performanceScore ?? peserta.progress}%</strong>
                </div>
            </div>
        `;
        topPerformersContainer.innerHTML += performerHtml;
    });
    
    // Update monthly trend chart
    updateMonthlyTrendChart();
    updateCompletionFunnelChart();
    updateActivityStatusChart();
}

// Chart Functions
function initializeCharts() {
    // Weekly Activity Chart
    const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
    charts.weekly = new Chart(weeklyCtx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 10 }, (_, index) => `Modul ${index + 1}`),
            datasets: [{
                label: 'Peserta Menyelesaikan Modul',
                data: Array(10).fill(0),
                backgroundColor: 'rgba(13, 110, 253, 0.8)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Program Distribution Chart
    const programCtx = document.getElementById('programChart').getContext('2d');
    charts.program = new Chart(programCtx, {
        type: 'doughnut',
        data: {
            labels: ['Belum ada data'],
            datasets: [{
                data: [1],
                backgroundColor: [
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(25, 135, 84, 0.8)',
                    'rgba(13, 110, 253, 0.8)',
                    'rgba(255, 193, 7, 0.8)'
                ],
                borderColor: [
                    'rgba(220, 53, 69, 1)',
                    'rgba(25, 135, 84, 1)',
                    'rgba(13, 110, 253, 1)',
                    'rgba(255, 193, 7, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    const completionFunnelCtx = document.getElementById('completionFunnelChart');
    if (completionFunnelCtx) {
        charts.completionFunnel = new Chart(completionFunnelCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Mulai Modul 1', 'Capai Modul 5', 'Selesai Modul 10'],
                datasets: [{
                    label: 'Jumlah Peserta',
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(13, 110, 253, 0.85)',
                        'rgba(25, 135, 84, 0.85)',
                        'rgba(255, 193, 7, 0.85)'
                    ],
                    borderRadius: 10,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    const activityStatusCtx = document.getElementById('activityStatusChart');
    if (activityStatusCtx) {
        charts.activityStatus = new Chart(activityStatusCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Aktif 7 Hari', 'Perlu Follow Up'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(25, 135, 84, 0.85)',
                        'rgba(220, 53, 69, 0.85)'
                    ],
                    borderColor: [
                        'rgba(25, 135, 84, 1)',
                        'rgba(220, 53, 69, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function updateCharts() {
    // Update weekly chart with real data
    if (charts.weekly) {
        const moduleStats = Array.isArray(analytics.moduleCompletions) ? analytics.moduleCompletions : [];
        charts.weekly.data.labels = moduleStats.length
            ? moduleStats.map(item => item.label)
            : Array.from({ length: 10 }, (_, index) => `Modul ${index + 1}`);
        charts.weekly.data.datasets[0].data = calculateWeeklyActivity();
        charts.weekly.update();
    }
    
    // Update program chart with real data
    if (charts.program) {
        const programStats = getProgramStats();
        charts.program.data.labels = programStats.length
            ? programStats.map(p => p.name)
            : ['Belum ada data'];
        charts.program.data.datasets[0].data = programStats.length
            ? programStats.map(p => p.participants)
            : [1];
        charts.program.update();
    }
}

function updateMonthlyTrendChart() {
    const monthlyCtx = document.getElementById('monthlyTrendChart');
    if (!monthlyCtx) return;
    
    if (charts.monthly) {
        charts.monthly.destroy();
    }
    
    charts.monthly = new Chart(monthlyCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: (analytics.monthlyTrend || []).map(item => item.label),
            datasets: [{
                label: 'Rata-rata Progress',
                data: (analytics.monthlyTrend || []).map(item => item.avgProgress),
                borderColor: 'rgba(13, 110, 253, 1)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function updateCompletionFunnelChart() {
    if (!charts.completionFunnel) return;

    const overview = analytics.completionOverview || {};
    charts.completionFunnel.data.datasets[0].data = [
        overview.started || 0,
        overview.reachedHalfway || 0,
        overview.finished || 0
    ];
    charts.completionFunnel.update();
}

function updateActivityStatusChart() {
    if (!charts.activityStatus) return;

    const activeCount = pesertaData.filter(item => item.isActive).length;
    const inactiveCount = Math.max(pesertaData.length - activeCount, 0);

    charts.activityStatus.data.datasets[0].data = [activeCount, inactiveCount];
    charts.activityStatus.update();
}

// Form Handlers
async function handleAddPeserta(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('pesertaName').value,
        email: document.getElementById('pesertaEmail').value,
        program: document.getElementById('pesertaProgram').value,
        initialWeight: parseFloat(document.getElementById('initialWeight').value),
        targetWeight: parseFloat(document.getElementById('targetWeight').value),
        currentWeight: parseFloat(document.getElementById('initialWeight').value),
        progress: 0,
        joinDate: new Date().toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0]
    };
    
    try {
        // Add to Google Sheets
        await addPesertaToSheets(formData);
        
        // Add to local data
        formData.id = Date.now();
        pesertaData.push(formData);
        
        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('addPesertaModal'));
        modal.hide();
        
        // Reset form
        document.getElementById('addPesertaForm').reset();
        
        // Refresh current page
        renderCurrentPage();
        
        showToast('Peserta berhasil ditambahkan!', 'success');
    } catch (error) {
        console.error('Error adding peserta:', error);
        showToast('Error menambahkan peserta: ' + error.message, 'error');
    }
}

// Peserta Detail Modal
function showPesertaDetail(pesertaId) {
    const peserta = pesertaData.find(s => s.id == pesertaId);
    if (!peserta) return;
    
    const modal = new bootstrap.Modal(document.getElementById('pesertaDetailModal'));
    document.getElementById('pesertaDetailTitle').textContent = peserta.name;
    
    const detailHtml = `
        <div class="row">
            <div class="col-md-8">
                <h6>Progress Overview</h6>
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-2">
                        <span>Progress Keseluruhan</span>
                        <strong>${peserta.progress}%</strong>
                    </div>
                    <div class="progress mb-3" style="height: 10px;">
                        <div class="progress-bar" style="width: ${peserta.progress}%"></div>
                    </div>
                </div>
                
                <h6>Weight Progress</h6>
                <canvas id="pesertaWeightChart" height="200"></canvas>
            </div>
            
            <div class="col-md-4">
                <h6>Informasi Peserta</h6>
                <table class="table table-sm">
                    <tr>
                        <td>Email:</td>
                        <td>${peserta.email}</td>
                    </tr>
                    <tr>
                        <td>Program:</td>
                        <td><span class="program-badge ${getProgramClass(peserta.program)}">${peserta.program}</span></td>
                    </tr>
                    <tr>
                        <td>Berat Awal:</td>
                        <td>${peserta.initialWeight ?? '-'} kg</td>
                    </tr>
                    <tr>
                        <td>Berat Saat Ini:</td>
                        <td>${peserta.currentWeight ?? '-'} kg</td>
                    </tr>
                    <tr>
                        <td>Target Berat:</td>
                        <td>${peserta.targetWeight ?? '-'} kg</td>
                    </tr>
                    <tr>
                        <td>Bergabung:</td>
                        <td>${formatDate(peserta.joinDate)}</td>
                    </tr>
                    <tr>
                        <td>Aktivitas Terakhir:</td>
                        <td>${formatDate(peserta.lastActivity)}</td>
                    </tr>
                    <tr>
                        <td>Skor Performa:</td>
                        <td>${peserta.performanceScore ?? '-'} / 100</td>
                    </tr>
                </table>
                
                <div class="d-grid gap-2 mt-3">
                    <button class="btn btn-primary btn-sm">
                        <i class="bi bi-envelope me-1"></i>Kirim Pesan
                    </button>
                    <button class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-calendar me-1"></i>Jadwalkan Konsultasi
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('pesertaDetailBody').innerHTML = detailHtml;
    modal.show();
    
    // Create weight progress chart after modal is shown
    setTimeout(() => {
        createPesertaWeightChart(peserta);
    }, 300);
}

function createPesertaWeightChart(peserta) {
    const ctx = document.getElementById('pesertaWeightChart');
    if (!ctx) return;
    
    // Build grafik progres berat dari histori peserta yang tersedia
    const weeklyProgress = generateWeeklyProgress(peserta);
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: weeklyProgress.labels,
            datasets: [{
                label: 'Berat Badan (kg)',
                data: weeklyProgress.data,
                borderColor: 'rgba(13, 110, 253, 1)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Utility Functions
function getProgramStats() {
    if (Array.isArray(programsData) && programsData.length > 0) {
        return programsData.map((program, index) => ({
            ...program,
            id: program.id || index + 1,
            description: program.description || getProgramDescription(program.name),
            class: getProgramClass(program.name),
            badgeClass: getProgramBadgeClass(program.name),
            icon: getProgramIconClass(program.name)
        }));
    }

    const programs = [...new Set(
        pesertaData
            .map((peserta) => String(peserta.program || '').trim())
            .filter(Boolean)
    )];
    
    return programs.map((programName, index) => {
        const programPeserta = pesertaData.filter(s => s.program === programName);
        const avgProgress = programPeserta.length > 0 
            ? Math.round(programPeserta.reduce((sum, s) => sum + s.progress, 0) / programPeserta.length)
            : 0;
        const activePeserta = programPeserta.filter(s => isActive(s)).length;
        
        return {
            id: index + 1,
            name: programName,
            description: getProgramDescription(programName),
            participants: programPeserta.length,
            completionRate: avgProgress,
            avgProgress: avgProgress,
            activePeserta,
            class: getProgramClass(programName),
            badgeClass: getProgramBadgeClass(programName),
            icon: getProgramIconClass(programName),
            modules: Array.from({ length: 10 }, (_, moduleIndex) => ({
                module: moduleIndex + 1,
                label: `Modul ${moduleIndex + 1}`,
                completedCount: 0,
                completionRate: 0
            }))
        };
    });
}

function getProgramDescription(program) {
    const descriptions = {
        'Turun Berat Badan': 'Program penurunan berat badan yang sehat dan berkelanjutan',
        'Naik Berat Badan': 'Program peningkatan massa tubuh yang sehat',
        'Jaga Stamina': 'Program peningkatan dan pemeliharaan stamina tubuh'
    };
    return descriptions[program] || '';
}

function getProgramClass(program) {
    const classes = {
        'Turun Berat Badan': 'turun-bb',
        'Naik Berat Badan': 'naik-bb',
        'Jaga Stamina': 'stamina'
    };
    return classes[program] || '';
}

function getProgramBadgeClass(program) {
    const classes = {
        'Turun Berat Badan': 'bg-danger',
        'Naik Berat Badan': 'bg-success',
        'Jaga Stamina': 'bg-primary'
    };
    return classes[program] || 'bg-secondary';
}

function getProgramIconClass(program) {
    const icons = {
        'Turun Berat Badan': 'bi bi-arrow-down',
        'Naik Berat Badan': 'bi bi-arrow-up',
        'Jaga Stamina': 'bi bi-activity'
    };
    return icons[program] || 'bi bi-target';
}

function getProgramIcon(program) {
    const icons = {
        'Turun Berat Badan': '⬇️',
        'Naik Berat Badan': '⬆️',
        'Jaga Stamina': '💪'
    };
    return icons[program] || '🎯';
}

function getAvatarColor(name) {
    const colors = [
        '#007bff', '#28a745', '#dc3545', '#ffc107', 
        '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function isActive(peserta) {
    const lastActivity = new Date(peserta.lastActivity);
    if (Number.isNaN(lastActivity.getTime())) {
        return false;
    }
    const now = new Date();
    const diffDays = Math.ceil((now - lastActivity) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleDateString('id-ID');
}

function calculateWeeklyActivity() {
    if (!Array.isArray(analytics.moduleCompletions) || analytics.moduleCompletions.length === 0) {
        return Array(10).fill(0);
    }

    return analytics.moduleCompletions.map(item => item.completedCount || 0);
}

function generateWeeklyProgress(peserta) {
    if (Array.isArray(peserta.weightHistory) && peserta.weightHistory.length > 0) {
        return {
            labels: peserta.weightHistory.map(item => item.label),
            data: peserta.weightHistory.map(item => item.weight)
        };
    }

    const labels = [];
    const data = [];
    const startWeight = peserta.initialWeight;
    const currentWeight = peserta.currentWeight;
    const weeks = 8;
    
    for (let i = 0; i < weeks; i++) {
        labels.push(`W${i + 1}`);
        const progress = i / (weeks - 1);
        const weight = startWeight + (currentWeight - startWeight) * progress;
        data.push(Math.round(weight * 10) / 10);
    }
    
    return { labels, data };
}

function renderProgramModules(program) {
    const container = document.getElementById(`modules-${program.id}`);
    if (!container) return;

    const modules = Array.isArray(program.modules) ? program.modules : [];
    if (modules.length === 0) {
        container.innerHTML = '<p class="text-muted mb-0">Belum ada data penyelesaian modul.</p>';
        return;
    }

    container.innerHTML = modules.map(module => `
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <small class="text-muted">${module.label}</small>
                <small class="fw-bold">${module.completedCount} peserta (${module.completionRate}%)</small>
            </div>
            <div class="progress" style="height: 8px;">
                <div class="progress-bar bg-primary" role="progressbar" style="width: ${module.completionRate}%"></div>
            </div>
        </div>
    `).join('');
}

function getTopPerformersData() {
    if (Array.isArray(analytics.topPerformers) && analytics.topPerformers.length > 0) {
        return analytics.topPerformers;
    }

    return [...pesertaData]
        .sort((a, b) => (b.performanceScore || b.progress || 0) - (a.performanceScore || a.progress || 0))
        .slice(0, 5);
}

function renderPesertaTopPerformers() {
    const container = document.getElementById('peserta-top-performers');
    if (!container) return;

    const topPerformers = getTopPerformersData();

    if (topPerformers.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-muted mb-0">Belum ada data peserta untuk dinilai.</p></div>';
        return;
    }

    container.innerHTML = topPerformers.map((peserta, index) => `
        <div class="col-lg-4 col-md-6">
            <div class="border rounded p-3 h-100">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="mb-1">${peserta.name}</h6>
                        <small class="text-muted">${peserta.program}</small>
                    </div>
                    <span class="badge ${getPerformanceBadgeClass(index)}">#${index + 1}</span>
                </div>
                <div class="mb-2">
                    <div class="small text-muted">Skor Top Performer</div>
                    <div class="fw-bold">${peserta.performanceScore ?? peserta.progress} / 100</div>
                </div>
                <div class="small text-muted">${buildTopPerformerMetricText(peserta)}</div>
            </div>
        </div>
    `).join('');
}

function renderAnalyticsSummaryCards() {
    const container = document.getElementById('analytics-summary-cards');
    if (!container) return;

    const overview = analytics.completionOverview || {};
    const cards = [
        { title: 'Mulai Modul', value: overview.started || 0, subtitle: 'Peserta yang sudah menyelesaikan minimal Modul 1', color: 'primary' },
        { title: 'Tembus Modul 5', value: overview.reachedHalfway || 0, subtitle: 'Peserta yang sudah melewati fase tengah challenge', color: 'success' },
        { title: 'Lulus Modul 10', value: overview.finished || 0, subtitle: 'Peserta yang sudah menyelesaikan seluruh eCourse', color: 'warning' },
        { title: 'Rata-rata Poin', value: analytics.avgPoints || 0, subtitle: 'Rata-rata akumulasi poin peserta selama challenge', color: 'info' }
    ];

    container.innerHTML = cards.map(card => `
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card border-${card.color} h-100">
                <div class="card-body">
                    <div class="small text-muted mb-1">${card.title}</div>
                    <h3 class="mb-2">${card.value}</h3>
                    <small class="text-muted">${card.subtitle}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAnalyticsInsights() {
    const container = document.getElementById('analytics-insights');
    if (!container) return;

    const insights = buildAnalyticsInsights();

    if (insights.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-muted mb-0">Belum ada insight karena data peserta masih kosong.</p></div>';
        return;
    }

    container.innerHTML = insights.map(insight => `
        <div class="col-md-6">
            <div class="border rounded p-3 h-100">
                <div class="small text-muted mb-1">${insight.label}</div>
                <div class="fw-bold mb-2">${insight.value}</div>
                <div class="small text-muted">${insight.description}</div>
            </div>
        </div>
    `).join('');
}

function renderModuleSpotlight() {
    const container = document.getElementById('analytics-module-spotlight');
    if (!container) return;

    const moduleStats = Array.isArray(analytics.moduleCompletions) ? analytics.moduleCompletions : [];
    if (moduleStats.length === 0) {
        container.innerHTML = '<p class="text-muted mb-0">Belum ada data modul untuk dianalisis.</p>';
        return;
    }

    const totalParticipants = Math.max(pesertaData.length, 1);
    const richestModule = [...moduleStats].sort((a, b) => (b.completedCount || 0) - (a.completedCount || 0))[0];
    const hardestModule = [...moduleStats].sort((a, b) => (a.completedCount || 0) - (b.completedCount || 0))[0];
    const cards = [
        {
            title: 'Modul Paling Banyak Diselesaikan',
            label: richestModule.label,
            description: `${richestModule.completedCount} peserta atau ${Math.round((richestModule.completedCount / totalParticipants) * 100)}% dari total peserta.`
        },
        {
            title: 'Modul Paling Berat',
            label: hardestModule.label,
            description: `${hardestModule.completedCount} peserta yang sudah sampai modul ini. Modul ini layak dipantau untuk follow up tambahan.`
        }
    ];

    container.innerHTML = cards.map(card => `
        <div class="border rounded p-3 mb-3">
            <div class="small text-muted mb-1">${card.title}</div>
            <div class="fw-bold mb-2">${card.label}</div>
            <div class="small text-muted">${card.description}</div>
        </div>
    `).join('');
}

function buildAnalyticsInsights() {
    if (!pesertaData.length) {
        return [];
    }

    const overview = analytics.completionOverview || {};
    const activeCount = overview.active || pesertaData.filter(item => item.isActive).length;
    const inactiveCount = Math.max(pesertaData.length - activeCount, 0);
    const bestProgram = getBestPerformingProgram();
    const moduleStats = Array.isArray(analytics.moduleCompletions) ? analytics.moduleCompletions : [];
    const weakestModule = moduleStats.length
        ? [...moduleStats].sort((a, b) => (a.completedCount || 0) - (b.completedCount || 0))[0]
        : null;

    return [
        {
            label: 'Retensi Tengah Program',
            value: `${overview.reachedHalfway || 0} peserta`,
            description: 'Peserta yang sudah menembus Modul 5. Ini penting untuk melihat apakah challenge tetap menarik setelah fase awal.'
        },
        {
            label: 'Peserta Perlu Follow Up',
            value: `${inactiveCount} peserta`,
            description: 'Peserta yang belum aktif dalam 7 hari terakhir. Daftar ini paling cocok jadi prioritas follow up WA atau CRM.'
        },
        {
            label: 'Program Dengan Performa Terbaik',
            value: bestProgram ? bestProgram.name : '-',
            description: bestProgram
                ? `Rata-rata progres ${bestProgram.avgProgress}% dengan ${bestProgram.activePeserta} peserta aktif.`
                : 'Belum ada program yang bisa dibandingkan.'
        },
        {
            label: 'Titik Drop-Off Terbesar',
            value: weakestModule ? weakestModule.label : '-',
            description: weakestModule
                ? `Baru ${weakestModule.completedCount} peserta yang menyelesaikannya, jadi bagian ini layak ditinjau dari sisi materi, reminder, atau coaching.`
                : 'Belum ada cukup data modul.'
        }
    ];
}

function getBestPerformingProgram() {
    const programStats = getProgramStats().filter(program => program.participants > 0);
    if (!programStats.length) {
        return null;
    }

    return [...programStats].sort((a, b) => {
        const scoreA = (a.avgProgress || 0) + ((a.activePeserta || 0) * 2);
        const scoreB = (b.avgProgress || 0) + ((b.activePeserta || 0) * 2);
        return scoreB - scoreA;
    })[0];
}

function getPerformanceBadgeClass(index) {
    if (index === 0) return 'bg-warning text-dark';
    if (index === 1) return 'bg-secondary';
    if (index === 2) return 'bg-danger';
    return 'bg-primary';
}

function buildTopPerformerMetricText(peserta) {
    const modules = `${peserta.completedModules || 0}/10 modul`;
    const points = `${peserta.pointsTotal || 0} poin`;
    const activity = peserta.isActive ? 'aktivitas terbaru aktif' : 'perlu follow up aktivitas';
    return `${modules} | ${points} | ${activity}`;
}

function populateProgramFilterOptions() {
    const filterProgram = document.getElementById('filterProgram');
    if (!filterProgram) return;

    const selectedValue = filterProgram.value;
    const programNames = getProgramStats().map(program => program.name);
    const uniqueProgramNames = [...new Set(programNames)].filter(Boolean);

    filterProgram.innerHTML = '<option value="">Semua Program</option>' +
        uniqueProgramNames.map(programName => `<option value="${programName}">${programName}</option>`).join('');

    filterProgram.value = uniqueProgramNames.includes(selectedValue) ? selectedValue : '';
}

function getEmptyAnalyticsData() {
    return {
        moduleCompletions: [],
        monthlyTrend: [],
        completionOverview: {
            started: 0,
            reachedHalfway: 0,
            finished: 0,
            active: 0
        },
        avgPoints: 0,
        topPerformers: []
    };
}

function showProgramDetail(programName) {
    showPage('programs');
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.style.display = 'block';
    } else {
        loading.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    // Change toast color based on type
    toast.className = 'toast';
    if (type === 'success') {
        toast.classList.add('text-bg-success');
    } else if (type === 'error') {
        toast.classList.add('text-bg-danger');
    } else {
        toast.classList.add('text-bg-info');
    }
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

function logoutUser() {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userHP');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userLevel');
    localStorage.removeItem('progressData');
    clearStoredUserAccess();
    window.location.href = 'loginBeratideal.html';
}

async function syncData() {
    const startedAt = Date.now();
    const syncBtn = document.getElementById('syncButton') || document.querySelector('button[onclick="syncData()"]');
    const syncBtnText = document.getElementById('syncButtonText');
    const syncBtnSpinner = document.getElementById('syncButtonSpinner');

    if (syncBtn) syncBtn.disabled = true;
    if (syncBtnText) syncBtnText.classList.add('d-none');
    if (syncBtnSpinner) syncBtnSpinner.classList.remove('d-none');

    await new Promise((resolve) => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
        } else {
            setTimeout(resolve, 0);
        }
    });

    try {
        showToast('Sinkronisasi data...', 'info');

        await loadAllData();

        if (typeof loadUserTable === 'function') loadUserTable();
        if (typeof loadLogNotifTable === 'function') loadLogNotifTable();

        if (typeof loadTableData === 'function') {
            const result = loadTableData();
            if (result && typeof result.then === 'function') await result;
        }

        if (typeof loadCrmTableData === 'function') {
            const result = loadCrmTableData();
            if (result && typeof result.then === 'function') await result;
        }

        showToast('Data berhasil disinkronisasi!', 'success');
    } catch (error) {
        console.error('Error syncData:', error);
        showToast('Gagal sinkronisasi: ' + (error?.message || error), 'error');
    } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 400) {
            await new Promise((resolve) => setTimeout(resolve, 400 - elapsed));
        }
        if (syncBtn) syncBtn.disabled = false;
        if (syncBtnText) syncBtnText.classList.remove('d-none');
        if (syncBtnSpinner) syncBtnSpinner.classList.add('d-none');
    }
}

