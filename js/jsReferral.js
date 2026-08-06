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
        });
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

    async function referralSaveJsonp(url, payload) {
        if (!url) {
            throw new Error('URL dbReferral belum diatur.');
        }
        const response = await referralFetchJsonp(url, payload);

        return response;
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

    function setStatus(type, message) {
        if (!elements.statusBox || !elements.statusIcon || !elements.statusText) return;

        elements.statusBox.style.display = message ? 'flex' : 'none';
        elements.statusBox.classList.remove('notification-success', 'notification-error', 'notification-warning');
        elements.statusIcon.className = 'pesan-notif-icon';
        elements.statusText.textContent = message || '';

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

    async function loadSavedReferral(userId) {
        if (!URL_dbReferral || !userId) return null;

        const response = await referralFetchJsonp(URL_dbReferral, {
            action: 'getReferralData',
            userId
        });

        if (!response || response.status !== 'success') {
            return null;
        }

        return response.data || null;
    }

    function buildComparableReferralData(source) {
        const data = source || {};
        const refLink = slugifyReferral(data.refLink);

        return {
            userId: normalizeText(data.userId).toLowerCase(),
            nama: normalizeText(data.nama),
            jenkel: normalizeText(data.jenkel),
            tglLahir: normalizeDateValue(data.tglLahir),
            telp: normalizeText(data.telp),
            email: normalizeText(data.email),
            alamat: normalizeText(data.alamat),
            kelurahan: normalizeText(data.kelurahan),
            kecamatan: normalizeText(data.kecamatan),
            kota: normalizeText(data.kota),
            propinsi: normalizeText(data.propinsi),
            acNama1: normalizeText(data.acNama1),
            namaBank1: normalizeText(data.namaBank1),
            acBank1: normalizeText(data.acBank1),
            acNama2: normalizeText(data.acNama2),
            namaBank2: normalizeText(data.namaBank2),
            acBank2: normalizeText(data.acBank2),
            refLink,
            referralUrl: buildReferralUrl(refLink)
        };
    }

    function isSavedReferralMatch(savedData, payload) {
        if (!savedData || !payload) return false;

        const savedComparable = buildComparableReferralData(savedData);
        const payloadComparable = buildComparableReferralData(payload);

        return Object.keys(payloadComparable).every((key) => savedComparable[key] === payloadComparable[key]);
    }

    function getReferralMismatchFields(savedData, payload) {
        const savedComparable = buildComparableReferralData(savedData);
        const payloadComparable = buildComparableReferralData(payload);

        return Object.keys(payloadComparable).filter((key) => savedComparable[key] !== payloadComparable[key]);
    }

    async function verifySavedReferral(payload, responseData) {
        if (responseData && !isSavedReferralMatch(responseData, payload)) {
            const responseMismatchFields = getReferralMismatchFields(responseData, payload);
            throw new Error(`Server merespons sukses, tetapi data balikan POST tidak cocok pada field: ${responseMismatchFields.join(', ')}.`);
        }

        const verifiedData = await loadSavedReferral(payload.userId);

        if (!verifiedData) {
            throw new Error('Server merespons sukses, tetapi data Referral belum terbaca ulang dari sheet REFERRAL.');
        }

        if (!isSavedReferralMatch(verifiedData, payload)) {
            const mismatchFields = getReferralMismatchFields(verifiedData, payload);
            throw new Error(`Server merespons sukses, tetapi hasil verifikasi sheet tidak cocok pada field: ${mismatchFields.join(', ')}.`);
        }

        return verifiedData;
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
                        : 'Profil berhasil dimuat. Isi URL dbReferral di jsLoadUrlPublic.js agar fitur simpan aktif.'
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

    function handleInputMode() {
        if (!ensureReferralPermission()) return;
        fillEditableFields(state.referralData || buildEditableDefaults(state.profileData));
        setMode('input');
        setStatus('warning', 'Mode input aktif. Lengkapi data lalu klik Simpan.');
    }

    function handleEditMode() {
        if (!ensureReferralPermission()) return;
        if (!state.referralData) {
            setStatus('warning', 'Data Referral belum ada. Gunakan tombol Input untuk membuat data baru.');
            return;
        }

        fillEditableFields(state.referralData);
        setMode('edit');
        setStatus('warning', 'Mode edit aktif. Ubah data yang diperlukan lalu klik Simpan.');
    }

    function handleCreateLink() {
        if (!ensureReferralPermission()) return;
        const sourceValue =
            elements.fields.refLink.value ||
            elements.fields.refName.value ||
            elements.fields.refId.value;

        const slug = slugifyReferral(sourceValue);
        if (!slug) {
            setStatus('warning', 'Slug Referral belum bisa dibuat. Pastikan nama atau User ID tersedia.');
            return;
        }

        elements.fields.refLink.value = slug;
        updateLinkPreview(slug);
        setStatus('success', 'Link Referral berhasil dibuat. Silakan simpan untuk menyimpan ke database.');
    }

    function collectFormData() {
        const cleanRefLink = slugifyReferral(elements.fields.refLink.value);

        return {
            userId: normalizeText(elements.fields.refId.value),
            nama: normalizeText(elements.fields.refName.value),
            jenkel: normalizeText(elements.fields.refJenkel.value),
            tglLahir: normalizeText(elements.fields.refTlahir.value),
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
    }

    async function handleSave() {
        if (!elements.form) return;
        if (!ensureReferralPermission()) return;

        if (!URL_dbReferral) {
            setStatus('warning', 'URL dbReferral belum diatur di jsLoadUrlPublic.js.');
            return;
        }

        if (!elements.form.reportValidity()) {
            setStatus('warning', 'Mohon lengkapi semua field yang wajib diisi.');
            return;
        }

        const payload = collectFormData();
        payload.action = 'saveReferralData';
        payload.recordId = normalizeText(elements.recordId?.value);

        if (!payload.refLink) {
            setStatus('warning', 'Slug Referral wajib dibuat sebelum disimpan.');
            return;
        }

        try {
            elements.saveButton.disabled = true;
            setStatus('warning', 'Menyimpan data Referral...');

            const response = await referralSaveJsonp(URL_dbReferral, payload);
            if (!response || response.status !== 'success') {
                throw new Error((response && response.message) || 'Gagal menyimpan data Referral.');
            }

            const verifiedData = await verifySavedReferral(payload, response.data);
            state.referralData = verifiedData;
            if (elements.recordId) {
                elements.recordId.value = normalizeText(state.referralData.recordId);
            }

            fillEditableFields(state.referralData);
            setMode('view');
            const targetSheetLabel = response.meta && response.meta.sheetName
                ? ` Sheet tujuan: ${response.meta.spreadsheetName || 'dbReferral'} / ${response.meta.sheetName}.`
                : '';
            const rowLabel = state.referralData && state.referralData.recordId
                ? ` Baris: #${state.referralData.recordId}.`
                : '';
            const updatedAtLabel = state.referralData && state.referralData.updatedAt
                ? ` Update terakhir: ${formatReferralDateTime(state.referralData.updatedAt)}.`
                : '';
            setStatus('success', `${response.message || 'Data Referral berhasil disimpan.'} Verifikasi baca ulang berhasil.${targetSheetLabel}${rowLabel}${updatedAtLabel}`);

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
