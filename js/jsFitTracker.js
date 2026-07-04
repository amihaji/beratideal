/****************************************************************************
APLIKASI BERATIDEAL
- DATABASE : dbProgram (program, datakonsumen dan tabelwetools)
DASHBOARD UNTUK :
PROGRAM 
- Mendata seluruh aktifitas peserta program mulai dari modul1 hingga modul10
- Resept Healthy snaking
- Dashboard peserta program
DATAKONSUMEN : 
- Mendata tgl daftar peserta program
- mendata data pribadi peserta program
TABELWETOOLS : 
- Mendata hasil dari WETOOLS
*****************************************************************************/

// ********* Deklarasi Variabel Public **********
// url dbProgram untuk aplikasi : prog10hari
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZORzfs6Egbx8-dB1zfM2Wh1v-iX4G0y21F6-JMG40ntUkZhNE3HfJPXlw0yrMjsU0pA/exec';

/*****************************************
 * Load students data from Google Sheets
 *****************************************/
async function loadStudentsFromSheets() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStudents`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.students || [];
        } else {
            throw new Error(data.error || 'Failed to load students data');
        }
    } catch (error) {
        console.error('Error loading students from Google Sheets:', error);
        // Return empty array to fallback to mock data
        return [];
    }
}

/**
 * Load programs data from Google Sheets
 */
async function loadProgramsFromSheets() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPrograms`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.programs || [];
        } else {
            throw new Error(data.error || 'Failed to load programs data');
        }
    } catch (error) {
        console.error('Error loading programs from Google Sheets:', error);
        return [];
    }
}

/**
 * Load analytics data from Google Sheets
 */
async function loadAnalyticsFromSheets() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAnalytics`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.analytics || {};
        } else {
            throw new Error(data.error || 'Failed to load analytics data');
        }
    } catch (error) {
        console.error('Error loading analytics from Google Sheets:', error);
        return {};
    }
}

/**
 * Add new student to Google Sheets
 */
async function addStudentToSheets(studentData) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addStudent',
                student: studentData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to add student');
        }
        
        return data;
    } catch (error) {
        console.error('Error adding student to Google Sheets:', error);
        throw error;
    }
}

/**
 * Update student data in Google Sheets
 */
async function updateStudentInSheets(studentId, updateData) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'updateStudent',
                studentId: studentId,
                updates: updateData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to update student');
        }
        
        return data;
    } catch (error) {
        console.error('Error updating student in Google Sheets:', error);
        throw error;
    }
}

/**
 * Add progress entry for a student
 */
async function addProgressEntry(studentId, progressData) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addProgress',
                studentId: studentId,
                progress: progressData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to add progress entry');
        }
        
        return data;
    } catch (error) {
        console.error('Error adding progress entry to Google Sheets:', error);
        throw error;
    }
}

/**
 * Get student progress history from Google Sheets
 */
async function getStudentProgress(studentId) {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStudentProgress&studentId=${studentId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.progress || [];
        } else {
            throw new Error(data.error || 'Failed to load student progress');
        }
    } catch (error) {
        console.error('Error loading student progress from Google Sheets:', error);
        return [];
    }
}

/**
 * Delete student from Google Sheets
 */
async function deleteStudentFromSheets(studentId) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'deleteStudent',
                studentId: studentId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to delete student');
        }
        
        return data;
    } catch (error) {
        console.error('Error deleting student from Google Sheets:', error);
        throw error;
    }
}

/**
 * Batch update multiple students
 */
async function batchUpdateStudents(updates) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'batchUpdateStudents',
                updates: updates
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to batch update students');
        }
        
        return data;
    } catch (error) {
        console.error('Error batch updating students in Google Sheets:', error);
        throw error;
    }
}

/**
 * Export data from Google Sheets (for backup/reporting)
 */
async function exportDataFromSheets(dataType = 'all') {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=exportData&type=${dataType}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.exportData || {};
        } else {
            throw new Error(data.error || 'Failed to export data');
        }
    } catch (error) {
        console.error('Error exporting data from Google Sheets:', error);
        throw error;
    }
}

/**
 * Test connection to Google Sheets
 */
async function testGoogleSheetsConnection() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=test`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            success: data.success || false,
            message: data.message || 'Connection test completed',
            timestamp: data.timestamp || new Date().toISOString()
        };
    } catch (error) {
        console.error('Error testing Google Sheets connection:', error);
        return {
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Helper function to validate Google Sheets URL
function validateGoogleSheetsUrl(url) {
    if (!url || url === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        console.warn('Google Sheets URL not configured. Using mock data.');
        return false;
    }
    
    // Basic URL validation
    try {
        new URL(url);
        return url.includes('script.google.com');
    } catch (error) {
        console.error('Invalid Google Sheets URL:', error);
        return false;
    }
}

// Initialize Google Sheets connection on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!validateGoogleSheetsUrl(GOOGLE_SCRIPT_URL)) {
        console.info('Google Sheets integration not configured. Application will use mock data.');
        showToast('Menggunakan data mock. Konfigurasikan Google Sheets untuk data real-time.', 'info');
    } else {
        console.info('Google Sheets integration configured. Testing connection...');
        testGoogleSheetsConnection().then(result => {
            if (result.success) {
                console.info('Google Sheets connection successful!');
                showToast('Koneksi Google Sheets berhasil!', 'success');
            } else {
                console.error('Google Sheets connection failed:', result.message);
                showToast('Koneksi Google Sheets gagal. Menggunakan data mock.', 'warning');
            }
        });
    }
});