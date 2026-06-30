// FitTracker Main Application JavaScript

// Global Variables
let currentPage = 'dashboard';
let studentsData = [];
let programsData = [];
let analytics = {};
let charts = {};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load initial data
    loadAllData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize charts
    initializeCharts();
    
    // Show default page
    showPage('dashboard');
}

function setupEventListeners() {
    // Search functionality
    document.getElementById('searchStudent').addEventListener('input', filterStudents);
    document.getElementById('filterProgram').addEventListener('change', filterStudents);
    
    // Add student form
    document.getElementById('addStudentForm').addEventListener('submit', handleAddStudent);
    
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
        case 'dashboard':
            renderDashboard();
            break;
        case 'students':
            renderStudents();
            break;
        case 'programs':
            renderPrograms();
            break;
        case 'analytics':
            renderAnalytics();
            break;
    }
}

// Load All Data
async function loadAllData() {
    showLoading(true);
    try {
        // Load from Google Sheets
        studentsData = await loadStudentsFromSheets();
        programsData = await loadProgramsFromSheets();
        analytics = await loadAnalyticsFromSheets();
        
        // If no data from sheets, use mock data
        if (studentsData.length === 0) {
            studentsData = getMockStudentsData();
        }
        if (programsData.length === 0) {
            programsData = getMockProgramsData();
        }
        
        renderCurrentPage();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data: ' + error.message, 'error');
        // Fallback to mock data
        studentsData = getMockStudentsData();
        programsData = getMockProgramsData();
        renderCurrentPage();
    } finally {
        showLoading(false);
    }
}

function renderCurrentPage() {
    switch(currentPage) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'students':
            renderStudents();
            break;
        case 'programs':
            renderPrograms();
            break;
        case 'analytics':
            renderAnalytics();
            break;
    }
}

// Dashboard Rendering
function renderDashboard() {
    // Update stats
    const totalStudents = studentsData.length;
    const activeStudents = studentsData.filter(s => isActive(s)).length;
    const avgProgress = Math.round(studentsData.reduce((sum, s) => sum + s.progress, 0) / totalStudents) || 0;
    const completedPrograms = studentsData.filter(s => s.progress >= 100).length;
    
    document.getElementById('total-students').textContent = totalStudents;
    document.getElementById('active-students').textContent = activeStudents;
    document.getElementById('active-percentage').textContent = `${Math.round((activeStudents/totalStudents)*100)}% dari total`;
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

// Students Rendering
function renderStudents() {
    filterStudents();
}

function filterStudents() {
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    const programFilter = document.getElementById('filterProgram').value;
    
    let filtered = studentsData.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm) || 
                             student.email.toLowerCase().includes(searchTerm);
        const matchesProgram = !programFilter || student.program === programFilter;
        return matchesSearch && matchesProgram;
    });
    
    renderStudentCards(filtered);
}

function renderStudentCards(students) {
    const container = document.getElementById('students-container');
    
    if (students.length === 0) {
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
    
    students.forEach(student => {
        const programClass = getProgramClass(student.program);
        const avatarBg = getAvatarColor(student.name);
        
        const studentHtml = `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card student-card h-100" onclick="showStudentDetail(${student.id})">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="student-avatar me-3" style="background-color: ${avatarBg}">
                                ${student.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-1">${student.name}</h6>
                                <small class="text-muted">${student.email}</small>
                            </div>
                            <span class="program-badge ${programClass}">
                                ${getProgramIcon(student.program)}
                            </span>
                        </div>
                        
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small class="text-muted">Progress</small>
                                <small class="fw-bold">${student.progress}%</small>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-primary" role="progressbar" 
                                     style="width: ${student.progress}%"></div>
                            </div>
                        </div>
                        
                        <div class="row text-center small">
                            <div class="col-4">
                                <div class="text-muted">Awal</div>
                                <div class="fw-bold">${student.initialWeight}kg</div>
                            </div>
                            <div class="col-4">
                                <div class="text-muted">Saat Ini</div>
                                <div class="fw-bold">${student.currentWeight}kg</div>
                            </div>
                            <div class="col-4">
                                <div class="text-muted">Target</div>
                                <div class="fw-bold">${student.targetWeight}kg</div>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <div class="d-flex justify-content-between align-items-center small text-muted">
                            <span>Bergabung: ${formatDate(student.joinDate)}</span>
                            <span class="${isActive(student) ? 'text-success' : 'text-warning'}">
                                <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i>
                                ${isActive(student) ? 'Aktif' : 'Tidak Aktif'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += studentHtml;
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
                            <h6>Module Completion Rates</h6>
                            <div id="modules-${program.id}" class="mb-3">
                                <!-- Modules will be loaded here -->
                            </div>
                        </div>
                        <div class="col-md-4">
                            <h6>Program Stats</h6>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Completion Rate:</span>
                                <strong>${program.completionRate}%</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Avg Progress:</span>
                                <strong>${program.avgProgress}%</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Active Students:</span>
                                <strong>${program.activeStudents}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += programHtml;
    });
}

// Analytics Rendering
function renderAnalytics() {
    // Render top performers
    const topPerformers = studentsData
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 5);
    
    const topPerformersContainer = document.getElementById('top-performers');
    topPerformersContainer.innerHTML = '';
    
    topPerformers.forEach((student, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        const performerHtml = `
            <div class="d-flex align-items-center mb-3">
                <div class="me-3">
                    <span class="fs-5">${medal}</span>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${student.name}</h6>
                    <small class="text-muted">${student.program}</small>
                </div>
                <div class="text-end">
                    <strong>${student.progress}%</strong>
                </div>
            </div>
        `;
        topPerformersContainer.innerHTML += performerHtml;
    });
    
    // Update monthly trend chart
    updateMonthlyTrendChart();
}

// Chart Functions
function initializeCharts() {
    // Weekly Activity Chart
    const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
    charts.weekly = new Chart(weeklyCtx, {
        type: 'bar',
        data: {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            datasets: [{
                label: 'Peserta Aktif',
                data: [85, 92, 78, 88, 95, 72, 68],
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
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Program Distribution Chart
    const programCtx = document.getElementById('programChart').getContext('2d');
    charts.program = new Chart(programCtx, {
        type: 'doughnut',
        data: {
            labels: ['Turun BB', 'Naik BB', 'Jaga Stamina'],
            datasets: [{
                data: [45, 32, 58],
                backgroundColor: [
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(25, 135, 84, 0.8)',
                    'rgba(13, 110, 253, 0.8)'
                ],
                borderColor: [
                    'rgba(220, 53, 69, 1)',
                    'rgba(25, 135, 84, 1)',
                    'rgba(13, 110, 253, 1)'
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

function updateCharts() {
    // Update weekly chart with real data
    if (charts.weekly) {
        // Calculate weekly activity from students data
        const weeklyData = calculateWeeklyActivity();
        charts.weekly.data.datasets[0].data = weeklyData;
        charts.weekly.update();
    }
    
    // Update program chart with real data
    if (charts.program) {
        const programStats = getProgramStats();
        charts.program.data.datasets[0].data = programStats.map(p => p.participants);
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
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'],
            datasets: [{
                label: 'Rata-rata Progress',
                data: [65, 68, 70, 72, 74, 75, 76],
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

// Form Handlers
async function handleAddStudent(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        program: document.getElementById('studentProgram').value,
        initialWeight: parseFloat(document.getElementById('initialWeight').value),
        targetWeight: parseFloat(document.getElementById('targetWeight').value),
        currentWeight: parseFloat(document.getElementById('initialWeight').value),
        progress: 0,
        joinDate: new Date().toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0]
    };
    
    try {
        // Add to Google Sheets
        await addStudentToSheets(formData);
        
        // Add to local data
        formData.id = Date.now();
        studentsData.push(formData);
        
        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
        modal.hide();
        
        // Reset form
        document.getElementById('addStudentForm').reset();
        
        // Refresh current page
        renderCurrentPage();
        
        showToast('Peserta berhasil ditambahkan!', 'success');
    } catch (error) {
        console.error('Error adding student:', error);
        showToast('Error menambahkan peserta: ' + error.message, 'error');
    }
}

// Student Detail Modal
function showStudentDetail(studentId) {
    const student = studentsData.find(s => s.id == studentId);
    if (!student) return;
    
    const modal = new bootstrap.Modal(document.getElementById('studentDetailModal'));
    document.getElementById('studentDetailTitle').textContent = student.name;
    
    const detailHtml = `
        <div class="row">
            <div class="col-md-8">
                <h6>Progress Overview</h6>
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-2">
                        <span>Progress Keseluruhan</span>
                        <strong>${student.progress}%</strong>
                    </div>
                    <div class="progress mb-3" style="height: 10px;">
                        <div class="progress-bar" style="width: ${student.progress}%"></div>
                    </div>
                </div>
                
                <h6>Weight Progress</h6>
                <canvas id="studentWeightChart" height="200"></canvas>
            </div>
            
            <div class="col-md-4">
                <h6>Informasi Peserta</h6>
                <table class="table table-sm">
                    <tr>
                        <td>Email:</td>
                        <td>${student.email}</td>
                    </tr>
                    <tr>
                        <td>Program:</td>
                        <td><span class="program-badge ${getProgramClass(student.program)}">${student.program}</span></td>
                    </tr>
                    <tr>
                        <td>Berat Awal:</td>
                        <td>${student.initialWeight} kg</td>
                    </tr>
                    <tr>
                        <td>Berat Saat Ini:</td>
                        <td>${student.currentWeight} kg</td>
                    </tr>
                    <tr>
                        <td>Target Berat:</td>
                        <td>${student.targetWeight} kg</td>
                    </tr>
                    <tr>
                        <td>Bergabung:</td>
                        <td>${formatDate(student.joinDate)}</td>
                    </tr>
                    <tr>
                        <td>Aktivitas Terakhir:</td>
                        <td>${formatDate(student.lastActivity)}</td>
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
    
    document.getElementById('studentDetailBody').innerHTML = detailHtml;
    modal.show();
    
    // Create weight progress chart after modal is shown
    setTimeout(() => {
        createStudentWeightChart(student);
    }, 300);
}

function createStudentWeightChart(student) {
    const ctx = document.getElementById('studentWeightChart');
    if (!ctx) return;
    
    // Generate mock weekly progress data
    const weeklyProgress = generateWeeklyProgress(student);
    
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
    const programs = ['Turun Berat Badan', 'Naik Berat Badan', 'Jaga Stamina'];
    
    return programs.map((programName, index) => {
        const programStudents = studentsData.filter(s => s.program === programName);
        const completionRate = programStudents.length > 0 
            ? Math.round(programStudents.reduce((sum, s) => sum + s.progress, 0) / programStudents.length)
            : 0;
        const activeStudents = programStudents.filter(s => isActive(s)).length;
        
        return {
            id: index + 1,
            name: programName,
            description: getProgramDescription(programName),
            participants: programStudents.length,
            completionRate,
            avgProgress: completionRate,
            activeStudents,
            class: getProgramClass(programName),
            badgeClass: getProgramBadgeClass(programName),
            icon: getProgramIconClass(programName)
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

function isActive(student) {
    const lastActivity = new Date(student.lastActivity);
    const now = new Date();
    const diffDays = Math.ceil((now - lastActivity) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID');
}

function calculateWeeklyActivity() {
    // Mock calculation for weekly activity
    return [85, 92, 78, 88, 95, 72, 68];
}

function generateWeeklyProgress(student) {
    const labels = [];
    const data = [];
    const startWeight = student.initialWeight;
    const currentWeight = student.currentWeight;
    const weeks = 8;
    
    for (let i = 0; i < weeks; i++) {
        labels.push(`W${i + 1}`);
        const progress = i / (weeks - 1);
        const weight = startWeight + (currentWeight - startWeight) * progress;
        data.push(Math.round(weight * 10) / 10);
    }
    
    return { labels, data };
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

function syncData() {
    loadAllData();
    showToast('Data berhasil disinkronisasi!', 'success');
}

// Mock Data Functions
function getMockStudentsData() {
    return [
        {
            id: 1,
            name: "Andi Pratama",
            email: "andi@email.com",
            program: "Turun Berat Badan",
            progress: 85,
            joinDate: "2024-01-15",
            currentWeight: 72,
            targetWeight: 65,
            initialWeight: 85,
            lastActivity: "2024-07-20"
        },
        {
            id: 2,
            name: "Sari Wulandari",
            email: "sari@email.com",
            program: "Naik Berat Badan",
            progress: 60,
            joinDate: "2024-02-10",
            currentWeight: 52,
            targetWeight: 60,
            initialWeight: 48,
            lastActivity: "2024-07-19"
        },
        {
            id: 3,
            name: "Budi Santoso",
            email: "budi@email.com",
            program: "Jaga Stamina",
            progress: 92,
            joinDate: "2024-01-20",
            currentWeight: 70,
            targetWeight: 70,
            initialWeight: 68,
            lastActivity: "2024-07-21"
        },
        {
            id: 4,
            name: "Maya Lestari",
            email: "maya@email.com",
            program: "Turun Berat Badan",
            progress: 45,
            joinDate: "2024-03-05",
            currentWeight: 78,
            targetWeight: 65,
            initialWeight: 88,
            lastActivity: "2024-07-18"
        },
        {
            id: 5,
            name: "Deni Kurniawan",
            email: "deni@email.com",
            program: "Naik Berat Badan",
            progress: 75,
            joinDate: "2024-02-20",
            currentWeight: 58,
            targetWeight: 65,
            initialWeight: 52,
            lastActivity: "2024-07-21"
        }
    ];
}

function getMockProgramsData() {
    return [
        {
            id: 1,
            name: "Turun Berat Badan",
            description: "Program penurunan berat badan yang sehat dan berkelanjutan"
        },
        {
            id: 2,
            name: "Naik Berat Badan", 
            description: "Program peningkatan massa tubuh yang sehat"
        },
        {
            id: 3,
            name: "Jaga Stamina",
            description: "Program peningkatan dan pemeliharaan stamina tubuh"
        }
    ];
}