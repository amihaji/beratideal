/**************************************************************
APLIKASI BERATIDEAL
TAMPILAN DASHBOARD UNTUK : Referral
Database :  dbReferral 
Data awal diambil dbDaftarBeratideal sheet "DAFTAR"
***************************************************************/

(function () {
    const REFERRAL_BASE_URL = 'https://beratidealku.com/?ref=';

    const state = {
        loaded: false,
        loading: false,
        mode: 'view',
        profileData: null,
        referralData: null,
        canManageReferral: false
    };

    const elements = {};

    function cacheElements() {
        elements.page = document.getElementById('referral-page');
        elements.form = document.getElementById('referralForm');
        elements.recordId = document.getElementById('referralRecordId');
        elements.mode = document.getElementById('referralMode');
        elements.statusBox = document.getElementById('referralStatusBox');
        elements.statusIcon = document.getElementById('referralStatusIcon');
        elements.statusText = document.getElementById('referralStatusText');
        elements.linkPreview = document.getElementById('referralLinkPreview');
        elements.inlineSlugStatus = document.getElementById('refLinkInlineStatus');

        elements.inputButton = document.getElementById('referralInputButton');
        elements.editButton = document.getElementById('referralEditButton');
        elements.createLinkButton = document.getElementById('referralCreateLinkButton');
        elements.saveButton = document.getElementById('referralSaveButton');

        elements.fields = {
            refId: document.getElementById('refId'),
            refName: document.getElementById('refName'),
            refJenkel: document.getElementById('refJenkel'),
            refTlahir: document.getElementById('refTlahir'),
            refHP: document.getElementById('refHP'),
            refEmail: document.getElementById('refEmail'),
            refAlamat: document.getElementById('refAlamat'),
            refKelurahan: document.getElementById('refKelurahan'),
            refKecamatan: document.getElementById('refKecamatan'),
            refKota: document.getElementById('refKota'),
            refPropensi: document.getElementById('refPropensi'),
            refACNama1: document.getElementById('refACNama1'),
            refNamabank1: document.getElementById('refNamabank1'),
            refACbank1: document.getElementById('refACbank1'),
            refACNama2: document.getElementById('refACNama2'),
            refNamabank2: document.getElementById('refNamabank2'),
            refACbank2: document.getElementById('refACbank2'),
            refLink: document.getElementById('refLink')
        };

        elements.editableFields = Array.from(document.querySelectorAll('[data-referral-editable="true"]'));
    }

    function init() {
        cacheElements();
        if (!elements.page || !elements.form) return;

        bindEvents();
        initReferralTooltips();
        setEditableState(false);
        updateLinkPreview('');
        updateButtonState();
    }

    function bindEvents() {
        elements.inputButton?.addEventListener('click', handleInputMode);
        elements.editButton?.addEventListener('click', handleEditMode);
        elements.createLinkButton?.addEventListener('click', handleCreateLink);
        elements.saveButton?.addEventListener('click', handleSave);
        elements.fields.refLink?.addEventListener('input', () => {
            updateLinkPreview(elements.fields.refLink.value);
            if (!elements.inlineSlugStatus) return;
            const raw = normalizeText(elements.fields.refLink.value);
            if (!raw) {
                clearInlineSlugStatus();
            }
        });

        // Event listener untuk tombol Lihat Panduan - BUKA MODAL
        const guideButton = document.getElementById('referralGuideButton');
        if (guideButton) {
            guideButton.addEventListener('click', function(e) {
                e.preventDefault();
                openReferralPdfModal();
            });
        }
    }

    function clearInlineSlugStatus() {
        if (!elements.inlineSlugStatus) return;
        elements.inlineSlugStatus.style.display = 'none';
        elements.inlineSlugStatus.classList.remove('rss-success', 'rss-warning', 'rss-error');
        elements.inlineSlugStatus.innerHTML = '';
    }

    function setInlineSlugStatus(type, message, suggestions, allowClick) {
        if (!elements.inlineSlugStatus) return;
        const t = type === 'success' || type === 'warning' || type === 'error' ? type : 'warning';
        const safeMessage = escapeHtmlForStatus(message || '');
        const box = elements.inlineSlugStatus;
        box.classList.remove('rss-success', 'rss-warning', 'rss-error');
        box.classList.add('rss-' + t);
        const labelMap = {
            success: 'Link Referral OK',
            warning: 'Perhatian',
            error: 'Gunakan nama link lain'
        };
        const icon = escapeHtmlForStatus(labelMap[t] || 'Informasi');
        const list = Array.isArray(suggestions) ? suggestions.filter(Boolean).slice(0, 6) : [];
        const labelHtml = `<div class="rss-label"><span class="rss-dot" aria-hidden="true"></span><span>${icon}</span></div>`;
        const messageHtml = `<div class="rss-message">${safeMessage}</div>`;
        let listHtml = '';
        if (list.length) {
            const items = list.map((s) => {
                const safe = escapeHtmlForStatus(s);
                const clickAttr = allowClick
                    ? ` data-referral-slug-inline-action="apply" data-referral-slug-inline-value="${safe}" style="cursor:pointer;"`
                    : '';
                return `<li${clickAttr}>${safe}</li>`;
            }).join('');
            listHtml = `<div class="rss-message" style="margin-top:0.25rem;">Saran alternatif:</div><ul class="rss-suggestions">${items}</ul>`;
        }
        box.innerHTML = labelHtml + messageHtml + listHtml;
        box.style.display = 'flex';
        if (allowClick && list.length) {
            bindInlineSlugSuggestionClicks_();
        }
    }

    function bindInlineSlugSuggestionClicks_() {
        if (!elements.inlineSlugStatus || !elements.fields || !elements.fields.refLink) return;
        try {
            const nodes = elements.inlineSlugStatus.querySelectorAll('[data-referral-slug-inline-action="apply"]');
            nodes.forEach((node) => {
                if (node.__referralBoundInlineSlug) return;
                node.__referralBoundInlineSlug = true;
                node.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const value = String(node.getAttribute('data-referral-slug-inline-value') || '').trim();
                    if (!value) return;
                    elements.fields.refLink.value = value;
                    updateLinkPreview(value);
                    setInlineSlugStatus(
                        'success',
                        `Nama link "${value}" siap dipakai. Silakan klik Simpan`,
                        [],
                        false
                    );
                    if (elements.fields.refLink && typeof elements.fields.refLink.scrollIntoView === 'function') {
                        try { elements.fields.refLink.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_err) {}
                    }
                });
            });
        } catch (_err) { }
    }

    function initReferralTooltips() {
        if (!elements.page || typeof bootstrap === 'undefined' || !bootstrap.Tooltip) return;

        elements.page.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
            const instance = bootstrap.Tooltip.getInstance(el);
            if (instance) instance.dispose();

            new bootstrap.Tooltip(el, {
                trigger: 'hover focus',
                container: 'body',
                placement: 'top'
            });
        });
    }

    function getUserContext() {
        return {
            userId: String(localStorage.getItem('userId') || '').trim(),
            userName: String(localStorage.getItem('userName') || '').trim(),
            userHP: String(localStorage.getItem('userHP') || '').trim()
        };
    }

    function referralFetchJsonp(url, params = {}) {
        return new Promise((resolve, reject) => {
            if (!url) {
                resolve(null);
                return;
            }

            const callbackName = 'cb_referral_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const script = document.createElement('script');
            const query = new URLSearchParams({ ...params, callback: callbackName });
            let finished = false;

            const cleanup = () => {
                if (finished) return;
                finished = true;
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            };

            window[callbackName] = (response) => {
                cleanup();
                resolve(response);
            };

            script.onerror = () => {
                cleanup();
                reject(new Error('Gagal memuat data JSONP.'));
            };

            script.src = `${url}?${query.toString()}`;
            document.body.appendChild(script);
        });
    }

    function referralSaveJsonp(url, payload) {
        return new Promise((resolve, reject) => {
            if (!url) {
                reject(new Error('URL dbReferral belum diatur.'));
                return;
            }

            const callbackName = 'cb_referral_save_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const script = document.createElement('script');
            const query = new URLSearchParams({ ...payload, callback: callbackName });
            let finished = false;
            const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error('Timeout saat menyimpan data Referral. Silakan coba lagi.'));
            }, 15000);

            const cleanup = () => {
                if (finished) return;
                finished = true;
                window.clearTimeout(timeoutId);
                delete window[callbackName];
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
            };

            window[callbackName] = (response) => {
                cleanup();
                resolve(response || { status: 'error', message: 'Respons simpan Referral kosong.' });
            };

            script.onerror = () => {
                cleanup();
                reject(new Error('Gagal menghubungi server simpan Referral.'));
            };

            script.src = `${url}?${query.toString()}`;
            document.body.appendChild(script);
        });
    }

    function normalizeText(value) {
        return String(value || '').trim();
    }

    function normalizeDateValue(value) {
        const rawValue = normalizeText(value);
        if (!rawValue) return '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
            return rawValue;
        }

        const parsedDate = new Date(rawValue);
        if (Number.isNaN(parsedDate.getTime())) {
            return rawValue;
        }

        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatReferralDateTime(value) {
        const rawValue = normalizeText(value);
        if (!rawValue) return '';

        const parsedDate = new Date(rawValue);
        if (Number.isNaN(parsedDate.getTime())) {
            return rawValue;
        }

        return parsedDate.toLocaleString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function slugifyReferral(value) {
        const slug = String(value || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 24);

        return slug;
    }

    function isValidReferralSlug(value) {
        return /^[a-z0-9-]{3,10}$/.test(String(value || '').trim());
    }

    function buildReferralUrl(slug) {
        if (!slug) return '';
        return `${REFERRAL_BASE_URL}${encodeURIComponent(slug)}`;
    }

    function updateLinkPreview(slug) {
        if (!elements.linkPreview) return;

        const cleanSlug = slugifyReferral(slug);
        elements.linkPreview.textContent = cleanSlug
            ? buildReferralUrl(cleanSlug)
            : 'Belum ada link referral.';
    }

    function setEditableState(isEditable) {
        elements.editableFields.forEach((field) => {
            const tagName = String(field.tagName || '').toUpperCase();

            if (tagName === 'SELECT') {
                field.disabled = !isEditable;
                return;
            }

            field.disabled = !isEditable;
            if ('readOnly' in field) {
                field.readOnly = !isEditable;
            }
        });
    }

    function resolveReferralOwnerId() {
        const formUserId = normalizeText(elements.fields && elements.fields.refId ? elements.fields.refId.value : '');
        if (formUserId) return formUserId.toLowerCase();

        const profileUserId = normalizeText(state.profileData && state.profileData.userId);
        if (profileUserId) return profileUserId.toLowerCase();

        const savedUserId = normalizeText(state.referralData && state.referralData.userId);
        return savedUserId ? savedUserId.toLowerCase() : '';
    }

    function evaluateReferralPermission() {
        const context = getUserContext();
        const activeUserId = normalizeText(context.userId).toLowerCase();
        const ownerUserId = resolveReferralOwnerId();

        state.canManageReferral = Boolean(activeUserId && ownerUserId && activeUserId === ownerUserId);
        return state.canManageReferral;
    }

    function ensureReferralPermission() {
        if (evaluateReferralPermission()) {
            return true;
        }

        setMode('view');
        setStatus('error', 'Aksi Referral hanya bisa dilakukan oleh user pemilik data yang sedang login.');
        return false;
    }

    function updateButtonState() {
        const hasSavedData = Boolean(state.referralData && state.referralData.userId);
        const isEditableMode = state.mode === 'input' || state.mode === 'edit';
        const hasReferralUrl = Boolean(URL_dbReferral);
        const canManageReferral = evaluateReferralPermission();

        if (elements.inputButton) {
            elements.inputButton.disabled = !canManageReferral;
        }

        if (elements.editButton) {
            elements.editButton.disabled = !hasSavedData || !canManageReferral;
        }
        if (elements.saveButton) {
            elements.saveButton.disabled = !isEditableMode || !hasReferralUrl || !canManageReferral;
        }
        if (elements.createLinkButton) {
            elements.createLinkButton.disabled = !isEditableMode || !canManageReferral;
        }
    }

    function setMode(modeName) {
        state.mode = modeName;
        if (elements.mode) {
            elements.mode.value = modeName;
        }

        setEditableState(modeName === 'input' || modeName === 'edit');
        updateButtonState();
    }

    function setStatus(type, message, allowHtml) {
        if (!elements.statusBox || !elements.statusIcon || !elements.statusText) return;

        elements.statusBox.style.display = message ? 'flex' : 'none';
        elements.statusBox.classList.remove('notification-success', 'notification-error', 'notification-warning');
        elements.statusIcon.className = 'pesan-notif-icon';
        if (allowHtml) {
            elements.statusText.innerHTML = message || '';
        } else {
            elements.statusText.textContent = message || '';
        }

        if (!message) return;

        if (type === 'success') {
            elements.statusBox.classList.add('notification-success');
            elements.statusIcon.classList.add('fas', 'fa-check-circle');
        } else if (type === 'error') {
            elements.statusBox.classList.add('notification-error');
            elements.statusIcon.classList.add('fas', 'fa-times-circle');
        } else {
            elements.statusBox.classList.add('notification-warning');
            elements.statusIcon.classList.add('fas', 'fa-exclamation-triangle');
        }
    }

    function fillProfileFields(profileData, referralData) {
        const profile = profileData || {};
        const referral = referralData || {};
        const resolvedJenkel = normalizeText(referral.jenkel) || normalizeText(profile.jenkel);
        const resolvedTglLahir = normalizeDateValue(referral.tglLahir || profile.tglLahir);

        elements.fields.refId.value = normalizeText(profile.userId);
        elements.fields.refName.value = normalizeText(profile.nama);
        elements.fields.refJenkel.value = resolvedJenkel;
        elements.fields.refTlahir.value = resolvedTglLahir;
        elements.fields.refHP.value = normalizeText(profile.telp);
        elements.fields.refEmail.value = normalizeText(profile.email);
    }

    function fillEditableFields(data) {
        const record = data || {};

        elements.fields.refAlamat.value = normalizeText(record.alamat);
        elements.fields.refKelurahan.value = normalizeText(record.kelurahan);
        elements.fields.refKecamatan.value = normalizeText(record.kecamatan);
        elements.fields.refKota.value = normalizeText(record.kota);
        elements.fields.refPropensi.value = normalizeText(record.propinsi);
        elements.fields.refACNama1.value = normalizeText(record.acNama1);
        elements.fields.refNamabank1.value = normalizeText(record.namaBank1);
        elements.fields.refACbank1.value = normalizeText(record.acBank1);
        elements.fields.refACNama2.value = normalizeText(record.acNama2);
        elements.fields.refNamabank2.value = normalizeText(record.namaBank2);
        elements.fields.refACbank2.value = normalizeText(record.acBank2);
        elements.fields.refLink.value = normalizeText(record.refLink);

        updateLinkPreview(record.refLink);
    }

    function buildEditableDefaults(profileData) {
        const profile = profileData || {};

        return {
            alamat: profile.alamat || '',
            kelurahan: profile.kelurahan || '',
            kecamatan: profile.kecamatan || '',
            kota: profile.kota || '',
            propinsi: profile.propinsi || '',
            acNama1: '',
            namaBank1: '',
            acBank1: '',
            acNama2: '',
            namaBank2: '',
            acBank2: '',
            refLink: ''
        };
    }

    async function loadProfileData(context) {
        const response = await referralFetchJsonp(URL_dbDaftarBeratideal, {
            action: 'getReferralReadonlyProfile',
            userId: context.userId,
            userName: context.userName,
            userHP: context.userHP
        });

        if (!response || response.status !== 'success') {
            return {
                userId: context.userId,
                nama: context.userName,
                jenkel: '',
                tglLahir: '',
                telp: context.userHP,
                email: '',
                alamat: '',
                kelurahan: '',
                kecamatan: '',
                kota: '',
                propinsi: ''
            };
        }

        return response.data || {};
    }

    function normalizeMetaSpreadsheetUrl_(meta) {
        if (!meta) return meta;
        if (meta.spreadsheetUrl) return meta;
        const id = normalizeText(meta.spreadsheetId);
        const gid = meta.sheetId != null ? String(meta.sheetId) : '0';
        if (!id) return meta;
        return Object.assign({}, meta, {
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit#gid=${encodeURIComponent(gid)}`
        });
    }

    async function loadSavedReferral(userId) {
        if (!URL_dbReferral || !userId) return null;

        const response = await referralFetchJsonp(URL_dbReferral, {
            action: 'getReferralData',
            userId
        });

        if (!response || response.status !== 'success') {
            return null;
        }

        state.lastMeta = normalizeMetaSpreadsheetUrl_(response.meta || state.lastMeta || null);
        return response.data || null;
    }

    async function loadPage(forceReload = false) {
        if (!elements.form) {
            cacheElements();
        }
        if (!elements.form) return;
        if (state.loading) return;
        if (state.loaded && !forceReload) {
            initReferralTooltips();
            return;
        }

        const context = getUserContext();
        if (!context.userId) {
            setStatus('error', 'User ID tidak ditemukan. Silakan login ulang.');
            return;
        }

        state.loading = true;
        initReferralTooltips();
        setStatus('warning', 'Memuat data Referral...');

        try {
            const [profileData, referralData] = await Promise.all([
                loadProfileData(context),
                loadSavedReferral(context.userId)
            ]);

            state.profileData = profileData;
            state.referralData = referralData;

            fillProfileFields(profileData, referralData);
            fillEditableFields(referralData || buildEditableDefaults(profileData));
            evaluateReferralPermission();

            if (elements.recordId) {
                elements.recordId.value = referralData && referralData.recordId ? referralData.recordId : '';
            }

            if (referralData) {
                setMode('view');
                setStatus('success', 'Data Referral berhasil dimuat.');
            } else {
                setMode('input');
                setStatus(
                    URL_dbReferral ? 'warning' : 'warning',
                    URL_dbReferral
                        ? 'Data Referral belum ada. Silakan lengkapi form lalu simpan.'
                        : 'Profil berhasil dimuat. Lengkapi form lalu simpan.'
                );
            }

            state.loaded = true;
        } catch (error) {
            setMode('input');
            setStatus('error', `Gagal memuat data Referral: ${error.message}`);
        } finally {
            state.loading = false;
        }
    }

    /*************************************
    * PDF VIEWER MODAL - Untuk Referral *
    *************************************/
    // Variabel global untuk PDF
    let referralPdfDoc = null;
    let referralPdfCurrentPage = 1;
    let referralPdfTotalPages = 0;
    let referralPdfScale = 1.5;

    /************************
    * Buka modal PDF viewer * 
    *************************/
    function openReferralPdfModal() {
        const modalElement = document.getElementById('referralPdfModal');
        if (!modalElement) {
            console.error('Modal PDF tidak ditemukan. Pastikan elemen dengan id "referralPdfModal" ada di HTML.');
            setStatus('error', 'Modal PDF tidak ditemukan. Silakan refresh halaman.', false);
            return;
        }
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Reset state
        referralPdfCurrentPage = 1;
        referralPdfScale = 1.5;
        
        // Load PDF
        const container = document.getElementById('referralPdfContainer');
        if (!container) {
            console.error('Container PDF tidak ditemukan');
            return;
        }
        container.innerHTML = `
            <div class="pdf-loading">
                <div class="spinner-border text-primary me-3" role="status">
                    <span class="visually-hidden">Memuat...</span>
                </div>
                <span>Memuat file panduan...</span>
            </div>
        `;
        
        // Update info
        const pageInfo = document.getElementById('referralPdfPageInfo');
        const totalPages = document.getElementById('referralPdfTotalPages');
        const prevBtn = document.getElementById('referralPdfPrevBtn');
        const nextBtn = document.getElementById('referralPdfNextBtn');
        
        if (pageInfo) pageInfo.textContent = 'Memuat...';
        if (totalPages) totalPages.textContent = '';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        
        const pdfUrl = 'pdf/Panduan_Referral.pdf';
        
        // Gunakan pdf.js
        if (typeof pdfjsLib === 'undefined') {
            container.innerHTML = `
                <div class="pdf-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Library PDF tidak tersedia. Silakan refresh halaman.</span>
                </div>
            `;
            return;
        }
        
        // Set worker
        if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }
        
        pdfjsLib.getDocument(pdfUrl).promise
            .then(function(pdf) {
                referralPdfDoc = pdf;
                referralPdfTotalPages = pdf.numPages;
                
                if (totalPages) totalPages.textContent = `${referralPdfTotalPages} halaman`;
                
                // Render halaman pertama
                referralPdfRenderPage(referralPdfCurrentPage);
            })
            .catch(function(error) {
                console.error('Error loading PDF:', error);
                container.innerHTML = `
                    <div class="pdf-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Gagal memuat file PDF: ${error.message || 'File tidak ditemukan'}</span>
                    </div>
                `;
                if (pageInfo) pageInfo.textContent = 'Error';
            });
    }
    
    /*********************
    * Render halaman PDF *
    **********************/
    function referralPdfRenderPage(pageNumber) {
        const container = document.getElementById('referralPdfContainer');
        
        if (!referralPdfDoc) {
            container.innerHTML = `
                <div class="pdf-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>PDF belum dimuat. Silakan tutup dan buka kembali.</span>
                </div>
            `;
            return;
        }
        
        if (pageNumber < 1 || pageNumber > referralPdfTotalPages) return;
        
        referralPdfCurrentPage = pageNumber;
        
        // Update info
        const pageInfo = document.getElementById('referralPdfPageInfo');
        const prevBtn = document.getElementById('referralPdfPrevBtn');
        const nextBtn = document.getElementById('referralPdfNextBtn');
        
        if (pageInfo) pageInfo.textContent = `Hal: ${pageNumber} dari ${referralPdfTotalPages}`;
        if (prevBtn) prevBtn.disabled = (pageNumber <= 1);
        if (nextBtn) nextBtn.disabled = (pageNumber >= referralPdfTotalPages);
        
        // Tampilkan loading
        container.innerHTML = `
            <div class="pdf-loading">
                <div class="spinner-border text-primary me-3" role="status">
                    <span class="visually-hidden">Memuat halaman...</span>
                </div>
                <span>Memuat halaman ${pageNumber}...</span>
            </div>
        `;
        
        referralPdfDoc.getPage(pageNumber).then(function(page) {
            const viewport = page.getViewport({ scale: referralPdfScale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Sesuaikan lebar canvas dengan container
            const containerWidth = container.clientWidth - 20;
            let scale = referralPdfScale;
            if (viewport.width > containerWidth) {
                scale = scale * (containerWidth / viewport.width);
            }
            
            const adjustedViewport = page.getViewport({ scale: scale });
            canvas.width = adjustedViewport.width;
            canvas.height = adjustedViewport.height;
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
            
            container.innerHTML = '';
            container.appendChild(canvas);
            
            const renderContext = {
                canvasContext: context,
                viewport: adjustedViewport
            };
            
            page.render(renderContext).promise
                .then(function() {
                    // Selesai render
                })
                .catch(function(error) {
                    console.error('Error rendering PDF page:', error);
                    container.innerHTML = `
                        <div class="pdf-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Gagal merender halaman ${pageNumber}</span>
                        </div>
                    `;
                });
        }).catch(function(error) {
            console.error('Error getting PDF page:', error);
            container.innerHTML = `
                <div class="pdf-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Gagal memuat halaman ${pageNumber}</span>
                </div>
            `;
        });
    }

    /*******************************
     * Pindah ke halaman sebelumnya
     ******************************/
    function referralPdfPrevPage() {
        if (referralPdfCurrentPage > 1) {
            referralPdfRenderPage(referralPdfCurrentPage - 1);
        }
    }

    /*******************************
     * Pindah ke halaman berikutnya
     *******************************/
    function referralPdfNextPage() {
        if (referralPdfCurrentPage < referralPdfTotalPages) {
            referralPdfRenderPage(referralPdfCurrentPage + 1);
        }
    }

    /**************************************************
     * Event listener untuk resize window - update PDF
     *************************************************/
    let referralPdfResizeTimeout = null;
    window.addEventListener('resize', function() {
        const modalElement = document.getElementById('referralPdfModal');
        if (referralPdfDoc && modalElement && modalElement.classList.contains('show')) {
            clearTimeout(referralPdfResizeTimeout);
            referralPdfResizeTimeout = setTimeout(function() {
                referralPdfRenderPage(referralPdfCurrentPage);
            }, 300);
        }
    });

    // Ekspos fungsi ke global untuk tombol HTML
    window.openReferralPdfModal = openReferralPdfModal;
    window.referralPdfPrevPage = referralPdfPrevPage;
    window.referralPdfNextPage = referralPdfNextPage;
    
    function handleInputMode() {
        if (!ensureReferralPermission()) return;
        fillEditableFields(state.referralData || buildEditableDefaults(state.profileData));
        setMode('input');
        setStatus('warning', 'Mode input aktif. Lengkapi data lalu klik Simpan.');
    }

    /*****************
    * Mode Edit Data *
    ******************/
    function handleEditMode() {
        if (!ensureReferralPermission()) return;
       if (!state.referralData) {
            setStatus('warning', 'Data Referral belum ada. Input data baru.');
            return;
        }

        fillEditableFields(state.referralData);
        setMode('edit');
        setStatus('warning', 'Mode edit aktif. Ubah data yang diperlukan lalu Simpan.');
    }

    /*****************
     * Escape status
     *****************/
    function escapeHtmlForStatus(value) {
        const s = String(value == null ? '' : value);
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /***************************
     * Fungsi untuk pesan slug *
     ***************************/
    function buildSlugSuggestionMessage(message, suggestions, allowUseAction) {
        const base = escapeHtmlForStatus(message || '');
        const list = Array.isArray(suggestions) ? suggestions.filter(Boolean).slice(0, 8) : [];
        if (!list.length) return base;
        const header = '<br><strong>Saran nama link yang bisa dipakai:</strong>';
        const items = list.map((s) => {
            const safe = escapeHtmlForStatus(s);
            if (allowUseAction) {
                return `<li style="cursor:pointer;color:#0d6efd;text-decoration:underline;" data-referral-slug-action="apply" data-referral-slug-value="${safe}">${safe}</li>`;
            }
            return `<li>${safe}</li>`;
        });
        return `${base}${header}<ul style="margin-top:6px;margin-bottom:0;padding-left:20px;">${items.join('')}</ul>`;
    }

    /**************************
     * Fungsi slug saat  klik *
     **************************/
    function bindSlugSuggestionClickHandlers_() {
        if (!elements || !elements.statusBox || !elements.fields || !elements.fields.refLink) return;
        try {
            const nodes = elements.statusBox.querySelectorAll('[data-referral-slug-action="apply"]');
            nodes.forEach((node) => {
                if (node.__referralBoundSlug) return;
                node.__referralBoundSlug = true;
                node.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const value = String(node.getAttribute('data-referral-slug-value') || '').trim();
                    if (!value) return;
                    elements.fields.refLink.value = value;
                    updateLinkPreview(value);
                    setStatus('success', `Nama link "${value}" siap dipakai. Silakan klik Simpan untuk menyimpan.`);
                    if (window.scrollTo && typeof window.scrollTo === 'function') {
                        try {
                            elements.fields.refLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } catch (_err) { }
                    }
                });
            });
        } catch (_err) { }
    }

    /***********************
    * Check slug referral
    ************************/
    async function checkReferralSlugAvailability(slug, opts) {
        const safeSlug = slugifyReferral(slug);
        if (!safeSlug) {
            return {
                ok: false,
                available: false,
                valid: false,
                message: 'Nama link Referral belum bisa dibuat. Pastikan nama atau User ID tersedia.',
                suggestions: []
            };
        }
        if (!isValidReferralSlug(safeSlug)) {
            return {
                ok: false,
                available: false,
                valid: false,
                message: 'Nama link Referral harus 3-10 karakter dan hanya boleh huruf kecil, angka, atau tanda minus (-).',
                suggestions: []
            };
        }
        if (!URL_dbReferral) {
            return {
                ok: false,
                available: true,
                valid: true,
                message: 'Nama link "' + safeSlug + '" siap dipakai. (URL dbReferral belum diatur, jadi tidak bisa cek ke server.)',
                suggestions: []
            };
        }
        const context = getUserContext();
        const params = {
            action: 'checkReferralSlugAvailable',
            slug: safeSlug,
            userId: context.userId || ''
        };
        try {
            const response = await referralFetchJsonp(URL_dbReferral, params);
            const ok = !!(response && response.status === 'success');
            const available = ok && response.available === true;
            const suggestions = Array.isArray(response && response.suggestions)
                ? response.suggestions.slice()
                : [];
            return {
                ok: ok,
                available: !!available,
                valid: true,
                slug: safeSlug,
                message: (response && response.message) || (available ? 'Nama link tersedia.' : 'Nama link sudah dipakai.'),
                suggestions: suggestions,
                usedBy: (response && response.usedBy) || ''
            };
        } catch (err) {
            return {
                ok: false,
                available: false,
                valid: true,
                slug: safeSlug,
                message: 'Gagal memeriksa nama link ke server: ' + (err && err.message ? err.message : String(err)),
                suggestions: []
            };
        }
    }

    /******************************
     * Fungsi create link referral
     ******************************/
    async function handleCreateLink() {
        if (!ensureReferralPermission()) return;
        const sourceValue =
            elements.fields.refLink.value ||
            elements.fields.refName.value ||
            elements.fields.refId.value;

        const slug = slugifyReferral(sourceValue);
        if (!slug) {
            setInlineSlugStatus('warning', 'Slug Referral belum bisa dibuat. Pastikan nama atau User ID tersedia.', [], false);
            return;
        }

        if (!isValidReferralSlug(slug)) {
            setInlineSlugStatus(
                'warning',
                'Nama link Referral harus 3-10 karakter dan hanya boleh berisi huruf kecil, angka, atau tanda minus.',
                [],
                false
            );
            return;
        }

        setInlineSlugStatus('warning', `Memeriksa ketersediaan nama link "${slug}"...`, [], false);
        if (elements.createLinkButton) {
            elements.createLinkButton.disabled = true;
        }

        try {
            const check = await checkReferralSlugAvailability(slug, {});
            if (check && check.ok && check.available === false) {
                const userMsg = 'Nama link sudah ada, coba yang lain.';
                setInlineSlugStatus('error', userMsg, check.suggestions || [], true);
                return;
            }

            elements.fields.refLink.value = slug;
            updateLinkPreview(slug);
            const baseMsg = 'Link Referral berhasil dibuat. Silakan simpan';
            if (check && Array.isArray(check.suggestions) && check.suggestions.length) {
                setInlineSlugStatus('success', baseMsg, check.suggestions, false);
            } else {
                setInlineSlugStatus('success', baseMsg, [], false);
            }
        } catch (err) {
            const failMsg = 'Gagal memeriksa ketersediaan nama link. ' + (err && err.message ? err.message : 'Silakan coba lagi.');
            setInlineSlugStatus('error', failMsg, [], false);
        } finally {
            if (elements.createLinkButton) {
                elements.createLinkButton.disabled = false;
            }
        }
    }

    /*********************
    * Fungsi kolek data  *
    **********************/
    function collectFormData() {
        const cleanRefLink = slugifyReferral(elements.fields.refLink.value);
        const payload = {
            userId: normalizeText(elements.fields.refId.value),
            nama: normalizeText(elements.fields.refName.value),
            jenkel: normalizeText(elements.fields.refJenkel.value),
            tglLahir: normalizeDateValue(elements.fields.refTlahir.value),
            telp: normalizeText(elements.fields.refHP.value),
            email: normalizeText(elements.fields.refEmail.value),
            alamat: normalizeText(elements.fields.refAlamat.value),
            kelurahan: normalizeText(elements.fields.refKelurahan.value),
            kecamatan: normalizeText(elements.fields.refKecamatan.value),
            kota: normalizeText(elements.fields.refKota.value),
            propinsi: normalizeText(elements.fields.refPropensi.value),
            acNama1: normalizeText(elements.fields.refACNama1.value),
            namaBank1: normalizeText(elements.fields.refNamabank1.value),
            acBank1: normalizeText(elements.fields.refACbank1.value),
            acNama2: normalizeText(elements.fields.refACNama2.value),
            namaBank2: normalizeText(elements.fields.refNamabank2.value),
            acBank2: normalizeText(elements.fields.refACbank2.value),
            refLink: cleanRefLink,
            referralUrl: buildReferralUrl(cleanRefLink),
            mode: state.mode,
            sourceSheet: 'DAFTAR'
        };
        return payload;
    }

    /************************
     * Verify Data Referral
     ************************/
    async function verifySavedReferral(payload) {
        const refreshedData = await loadSavedReferral(payload.userId);
        if (!refreshedData) {
            throw new Error('Server merespons sukses, tetapi data Referral belum ditemukan saat verifikasi baca ulang.');
        }

        const savedUserId = normalizeText(refreshedData.userId).toLowerCase();
        const expectedUserId = normalizeText(payload.userId).toLowerCase();
        if (!savedUserId || savedUserId !== expectedUserId) {
            throw new Error('Verifikasi baca ulang gagal: User ID data Referral tidak cocok.');
        }

        const savedSlug = normalizeText(refreshedData.refLink);
        const expectedSlug = normalizeText(payload.refLink);
        if (!savedSlug || savedSlug !== expectedSlug) {
            throw new Error('Verifikasi baca ulang gagal: slug Referral yang tersimpan tidak sesuai.');
        }

        const savedBirthDate = normalizeDateValue(refreshedData.tglLahir);
        const expectedBirthDate = normalizeDateValue(payload.tglLahir);
        if (expectedBirthDate && savedBirthDate !== expectedBirthDate) {
            throw new Error('Verifikasi baca ulang gagal: tanggal lahir yang tersimpan tidak sesuai.');
        }

        return refreshedData;
    }

    /******************************
     * Fungsi Simpan Data Referral
     ******************************/
    async function handleSave() {
        if (!elements.form) return;
        if (!ensureReferralPermission()) return;
        if (!URL_dbReferral) {
            setStatus('warning', 'URL dbReferral belum diatur');
            return;
        }
        if (!elements.form.reportValidity()) {
            setStatus('warning', 'Mohon lengkapi semua field yang wajib diisi.');
            return;
        }

        const payload = collectFormData();
        payload.action = 'saveReferralData';
        payload.recordId = normalizeText(elements.recordId?.value);
        payload.requesterUserId = normalizeText(getUserContext().userId);
        if (!payload.refLink) {
            setStatus('warning', 'Slug Referral wajib dibuat sebelum disimpan.');
            return;
        }
        if (!isValidReferralSlug(payload.refLink)) {
            setStatus('warning', 'Slug Referral harus 3-10 karakter dan hanya boleh berisi huruf kecil, angka, atau tanda minus.');
            return;
        }
        try {
            elements.saveButton.disabled = true;
            setStatus('warning', 'Menyimpan data Referral...');

            const response = await referralSaveJsonp(URL_dbReferral, payload);

            if (!response || response.status !== 'success') {
                const rawMsg = (response && response.message) || 'Gagal menyimpan data Referral.';
                const isDuplicateSlug = /sudah dipakai|nama link sudah|duplikat|tersedia.*sudah|referral.*sudah/i.test(rawMsg);
                if (isDuplicateSlug && Array.isArray(response && response.suggestions) && response.suggestions.length) {
                    setInlineSlugStatus('error', rawMsg, response.suggestions, true);
                    throw new Error('__duplicate_slug_handled__');
                }
                throw new Error(rawMsg);
            }

            state.referralData = await verifySavedReferral(payload);
            if (elements.recordId) {
                elements.recordId.value = normalizeText(state.referralData.recordId);
            }

            fillProfileFields(state.profileData, state.referralData);
            fillEditableFields(state.referralData);
            setMode('view');
            const enrichedMeta = normalizeMetaSpreadsheetUrl_(response.meta || state.lastMeta || null);
            state.lastMeta = enrichedMeta;
            const spreadsheetLink = enrichedMeta && enrichedMeta.spreadsheetUrl
                ? `<a href="${enrichedMeta.spreadsheetUrl}" target="_blank" rel="noopener noreferrer">Buka Sheet Referral →</a>`
                : '';
            const targetSheetLabel = enrichedMeta && enrichedMeta.sheetName
                ? ` Sheet tujuan: ${enrichedMeta.spreadsheetName || 'dbReferral'} / ${enrichedMeta.sheetName}.${spreadsheetLink ? ` ${spreadsheetLink}` : ''}`
                : '';
            const rowLabel = state.referralData && state.referralData.recordId
                ? ` Baris: #${state.referralData.recordId}.`
                : '';
            const updatedAtLabel = state.referralData && state.referralData.updatedAt
                ? ` Update terakhir: ${formatReferralDateTime(state.referralData.updatedAt)}.`
                : '';
            const finalMessage = `${response.message || 'Data Referral berhasil disimpan.'}`;
            setStatus('success', finalMessage, true);

            if (typeof showToast === 'function') {
                showToast(`Data Referral berhasil diperbarui${rowLabel ? ` (baris #${state.referralData.recordId})` : ''}.`, 'success');
            }
        } catch (error) {
            setStatus('error', error.message);
        } finally {
            updateButtonState();
        }
    }

    window.ReferralModule = {
        loadPage,
        reload: function () {
            state.loaded = false;
            return loadPage(true);
        }
    };

    document.addEventListener('DOMContentLoaded', init);
})();


