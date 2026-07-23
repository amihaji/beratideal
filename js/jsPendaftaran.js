(function() {
    const userLevel = localStorage.getItem('userLevel') || 'User';

    const fieldMap = [
        ['tanggal', 'pendaftaranEditTanggal'],
        ['noPesanan', 'pendaftaranEditNoPesanan'],
        ['program', 'pendaftaranEditProgram'],
        ['harga', 'pendaftaranEditHarga'],
        ['nama', 'pendaftaranEditNama'],
        ['alamat', 'pendaftaranEditAlamat'],
        ['telp', 'pendaftaranEditTelp'],
        ['email', 'pendaftaranEditEmail'],
        ['kelurahan', 'pendaftaranEditKelurahan'],
        ['kecamatan', 'pendaftaranEditKecamatan'],
        ['kota', 'pendaftaranEditKota'],
        ['propinsi', 'pendaftaranEditPropinsi'],
        ['pembayaran', 'pendaftaranEditPembayaran'],
        ['namaPenerima', 'pendaftaranEditNamaPenerima'],
        ['acPenerima', 'pendaftaranEditAcPenerima'],
        ['nominal', 'pendaftaranEditNominal'],
        ['statusWa', 'pendaftaranEditStatusWa'],
        ['statusEmail', 'pendaftaranEditStatusEmail'],
        ['tglBayar', 'pendaftaranEditTglBayar'],
        ['linkBuktiTransfer', 'pendaftaranEditLinkBuktiTransfer'],
        ['statusBayar', 'pendaftaranEditStatusBayar'],
        ['tglTerima', 'pendaftaranEditTglTerima'],
        ['linkBuktiProduk', 'pendaftaranEditLinkBuktiProduk'],
        ['statusTerima', 'pendaftaranEditStatusTerima'],
        ['namaSponsor', 'pendaftaranEditNamaSponsor'],
        ['hpSponsor', 'pendaftaranEditHpSponsor']
    ];

    const editFieldTooltips = {
        pendaftaranEditTanggal: 'Tanggal daftar.',
        pendaftaranEditNoPesanan: 'Nomor pesanan.',
        pendaftaranEditProgram: 'Nama program.',
        pendaftaranEditHarga: 'Harga program.',
        pendaftaranEditNama: 'Nama pendaftar.',
        pendaftaranEditAlamat: 'Alamat pendaftar.',
        pendaftaranEditTelp: 'Nomor telepon pendaftar.',
        pendaftaranEditEmail: 'Email pendaftar.',
        pendaftaranEditKelurahan: 'Kelurahan.',
        pendaftaranEditKecamatan: 'Kecamatan.',
        pendaftaranEditKota: 'Kota atau kabupaten.',
        pendaftaranEditPropinsi: 'Propinsi.',
        pendaftaranEditPembayaran: 'Metode pembayaran.',
        pendaftaranEditNamaPenerima: 'Nama penerima rekening.',
        pendaftaranEditAcPenerima: 'Nomor rekening penerima.',
        pendaftaranEditNominal: 'Nominal transfer.',
        pendaftaranEditStatusWa: 'Status pesan WA.',
        pendaftaranEditStatusEmail: 'Status pesan email.',
        pendaftaranEditTglBayar: 'Tanggal bayar.',
        pendaftaranEditLinkBuktiTransfer: 'Link bukti transfer.',
        pendaftaranEditStatusBayar: 'Status pembayaran.',
        pendaftaranEditTglTerima: 'Tanggal terima produk.',
        pendaftaranEditLinkBuktiProduk: 'Link bukti produk.',
        pendaftaranEditStatusTerima: 'Status terima produk.',
        pendaftaranEditNamaSponsor: 'Nama sponsor.',
        pendaftaranEditHpSponsor: 'HP sponsor.'
    };

    const lockedEditFieldIds = [
        'pendaftaranEditTanggal',
        'pendaftaranEditNoPesanan',
        'pendaftaranEditProgram',
        'pendaftaranEditHarga',
        'pendaftaranEditNamaPenerima',
        'pendaftaranEditAcPenerima',
        'pendaftaranEditNominal'
    ];

    const elements = {
        page: document.getElementById('pendaftaran-page'),
        filterNama: document.getElementById('pendaftaranFilterNama'),
        filterButton: document.getElementById('pendaftaranFilterButton'),
        normalToolbar: document.getElementById('pendaftaranNormalToolbar'),
        followUpToolbar: document.getElementById('pendaftaranFollowUpToolbar'),
        startButton: document.getElementById('pendaftaranStartFollowUpButton'),
        cancelButton: document.getElementById('pendaftaranCancelFollowUpButton'),
        exportButton: document.getElementById('pendaftaranExportButton'),
        sendWaButton: document.getElementById('pendaftaranSendWaButton'),
        messageBox: document.getElementById('pendaftaranFollowUpMessageBox'),
        waMessage: document.getElementById('pendaftaranWaMessage'),
        progressContainer: document.getElementById('pendaftaranWaProgressContainer'),
        progressBar: document.getElementById('pendaftaranWaProgressBar'),
        checkAll: document.getElementById('pendaftaranCheckAll'),
        table: document.getElementById('pendaftaranTable'),
        tableBody: document.getElementById('pendaftaranTableBody'),
        loadingOverlay: document.getElementById('pendaftaranLoadingOverlay'),
        pesanBox: document.getElementById('pendaftaranPesanNotification'),
        pesanIcon: document.getElementById('pendaftaranPesanNotifIcon'),
        pesanText: document.getElementById('pendaftaranPesanNotifText'),
        editModalEl: document.getElementById('pendaftaranEditModal'),
        viewModalEl: document.getElementById('pendaftaranViewModal'),
        viewModalBody: document.getElementById('pendaftaranViewModalBody'),
        imageZoomModalEl: document.getElementById('pendaftaranImageZoomModal'),
        imageZoomTitle: document.getElementById('pendaftaranImageZoomModalLabel'),
        imageZoomTarget: document.getElementById('pendaftaranImageZoomTarget'),
        saveButton: document.getElementById('pendaftaranSaveChangesButton'),
        editNotifBox: document.getElementById('pendaftaranPesanNotifEditBox'),
        editNotifIcon: document.getElementById('pendaftaranPesanNotifEditIcon'),
        editNotifText: document.getElementById('pendaftaranPesanNotifEditText')
    };

    if (!elements.page) {
        return;
    }

    const pendaftaranEditModal = elements.editModalEl ? new bootstrap.Modal(elements.editModalEl) : null;
    const pendaftaranViewModal = elements.viewModalEl ? new bootstrap.Modal(elements.viewModalEl) : null;
    const pendaftaranImageZoomModal = elements.imageZoomModalEl ? new bootstrap.Modal(elements.imageZoomModalEl) : null;

    let pendaftaranUiInitialized = false;
    let pendaftaranRecords = new Map();
    let editModalTooltipInstances = [];

    function normalizeKeyword(value) {
        return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function formatTanggal(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function cleanupJsonp(script, callbackName) {
        delete window[callbackName];
        if (script && document.body.contains(script)) {
            document.body.removeChild(script);
        }
    }

    function fetchJsonp(action, params = {}) {
        return new Promise((resolve) => {
            const callbackName = `pendaftaran_cb_${action}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            const script = document.createElement('script');
            const query = new URLSearchParams({ action, callback: callbackName, ...params });

            script.onerror = () => {
                cleanupJsonp(script, callbackName);
                resolve({ status: 'error', message: 'Gagal menghubungi server pendaftaran.' });
            };

            window[callbackName] = (response) => {
                cleanupJsonp(script, callbackName);
                resolve(response || { status: 'error', message: 'Respons server pendaftaran kosong.' });
            };

            script.src = `${URL_dbDaftarBeratideal}?${query.toString()}`;
            document.body.appendChild(script);
        });
    }

    function showLoading(show) {
        if (!elements.loadingOverlay) return;
        elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    function showPesan(type, message, duration = 3000) {
        if (!elements.pesanBox || !elements.pesanIcon || !elements.pesanText) return;

        elements.pesanBox.className = 'notification-message';
        elements.pesanIcon.className = 'pesan-notif-icon';

        if (type === 'error') {
            elements.pesanBox.classList.add('notification-error');
            elements.pesanIcon.classList.add('fas', 'fa-times-circle');
        } else if (type === 'success') {
            elements.pesanBox.classList.add('notification-success');
            elements.pesanIcon.classList.add('fas', 'fa-check-circle');
        } else {
            elements.pesanBox.classList.add('notification-warning');
            elements.pesanIcon.classList.add('fas', 'fa-exclamation-circle');
        }

        elements.pesanText.textContent = message;
        elements.pesanBox.style.display = 'flex';
        setTimeout(() => {
            elements.pesanBox.style.display = 'none';
        }, duration);
    }

    function showPesanEdit(type, message, duration = 2500) {
        if (!elements.editNotifBox || !elements.editNotifIcon || !elements.editNotifText) return;

        elements.editNotifBox.className = 'notification-message modal-user-message';
        elements.editNotifIcon.className = 'pesan-notif-icon me-2';

        if (type === 'error') {
            elements.editNotifBox.classList.add('notification-error');
            elements.editNotifIcon.classList.add('fas', 'fa-times-circle');
        } else if (type === 'success') {
            elements.editNotifBox.classList.add('notification-success');
            elements.editNotifIcon.classList.add('fas', 'fa-check-circle');
        } else {
            elements.editNotifBox.classList.add('notification-warning');
            elements.editNotifIcon.classList.add('fas', 'fa-exclamation-circle');
        }

        elements.editNotifText.textContent = message;
        elements.editNotifBox.style.display = 'flex';
        setTimeout(() => {
            elements.editNotifBox.style.display = 'none';
        }, duration);
    }

    function resetWaProgress() {
        if (!elements.progressContainer || !elements.progressBar) return;
        elements.progressContainer.style.display = 'none';
        elements.progressBar.style.width = '0%';
        elements.progressBar.textContent = '0%';
        elements.progressBar.setAttribute('aria-valuenow', '0');
    }

    function disposeEditTooltips() {
        editModalTooltipInstances.forEach((tooltip) => tooltip.dispose());
        editModalTooltipInstances = [];
    }

    function applyEditFieldTooltips() {
        Object.entries(editFieldTooltips).forEach(([inputId, tooltipText]) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            const inputGroup = input.closest('.input-group');
            const prefix = inputGroup ? inputGroup.querySelector('.input-group-text') : null;

            input.removeAttribute('title');
            input.removeAttribute('data-bs-toggle');
            input.removeAttribute('data-bs-placement');

            if (inputGroup) {
                inputGroup.removeAttribute('title');
                inputGroup.removeAttribute('data-bs-toggle');
                inputGroup.removeAttribute('data-bs-placement');
                inputGroup.removeAttribute('tabindex');
            }

            if (prefix) {
                prefix.removeAttribute('title');
                prefix.removeAttribute('data-bs-toggle');
                prefix.removeAttribute('data-bs-placement');
            }

            if (input.disabled) {
                if (inputGroup) {
                    inputGroup.setAttribute('title', tooltipText);
                    inputGroup.setAttribute('data-bs-toggle', 'tooltip');
                    inputGroup.setAttribute('data-bs-placement', 'top');
                    inputGroup.setAttribute('tabindex', '0');
                }
            } else {
                input.setAttribute('title', tooltipText);
                input.setAttribute('data-bs-toggle', 'tooltip');
                input.setAttribute('data-bs-placement', 'top');
            }
        });
    }

    function applyLockedEditFields() {
        fieldMap.forEach(([, inputId]) => {
            const input = document.getElementById(inputId);
            if (!input) return;

            const isLocked = lockedEditFieldIds.includes(inputId);
            const inputGroup = input.closest('.input-group');
            input.disabled = isLocked;
            if (inputGroup) {
                inputGroup.classList.toggle('is-locked-group', isLocked);
            }
        });
    }

    function initEditTooltips() {
        if (!elements.editModalEl || typeof bootstrap?.Tooltip !== 'function') return;

        disposeEditTooltips();
        applyEditFieldTooltips();

        elements.editModalEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((node) => {
            editModalTooltipInstances.push(new bootstrap.Tooltip(node, {
                trigger: 'hover focus',
                container: 'body'
            }));
        });
    }

    function setFollowUpMode(isActive, options = {}) {
        const { clearMessage = false, clearSelection = false, keepProgress = false } = options;

        if (elements.filterNama) elements.filterNama.disabled = isActive;
        if (elements.filterButton) elements.filterButton.disabled = isActive;

        if (elements.normalToolbar) elements.normalToolbar.classList.toggle('sembunyikan', isActive);
        if (elements.followUpToolbar) elements.followUpToolbar.classList.toggle('sembunyikan', !isActive);
        if (elements.messageBox) elements.messageBox.style.display = isActive ? 'block' : 'none';

        elements.tableBody?.querySelectorAll('.pendaftaranRowCheckbox').forEach((checkbox) => {
            checkbox.classList.toggle('d-none', !isActive);
            if (!isActive && clearSelection) checkbox.checked = false;
        });

        elements.tableBody?.querySelectorAll('.pendaftaranActionIcon').forEach((icon) => {
            icon.classList.toggle('disabled-action', isActive || userLevel === 'User');
        });

        if (!isActive) {
            if (clearMessage && elements.waMessage) elements.waMessage.value = '';
            if (clearSelection && elements.checkAll) elements.checkAll.checked = false;
            if (!keepProgress) resetWaProgress();
        }
    }

    function renderTableRows(rows, emptyMessage) {
        if (!elements.tableBody) return;

        elements.tableBody.innerHTML = '';
        pendaftaranRecords = new Map();

        if (!rows.length) {
            elements.tableBody.innerHTML = `<tr><td colspan="26">${escapeHtml(emptyMessage)}</td></tr>`;
            return;
        }

        rows.forEach((record) => {
            pendaftaranRecords.set(String(record.rowIndex), record);

            const disabledClass = userLevel === 'User' ? 'disabled-action' : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input
                        type="checkbox"
                        class="pendaftaranRowCheckbox d-none"
                        data-row-index="${escapeAttr(record.rowIndex)}"
                        data-nama="${escapeAttr(record.nama)}"
                        data-nomor="${escapeAttr(record.telp)}"
                        data-sponsor="${escapeAttr(record.namaSponsor)}">
                </td>
                <td>${escapeHtml(formatTanggal(record.tanggal))}</td>
                <td>${escapeHtml(record.noPesanan)}</td>
                <td>${escapeHtml(record.program)}</td>
                <td>${escapeHtml(record.harga)}</td>
                <td>${escapeHtml(record.nama)}</td>
                <td>${escapeHtml(record.alamat)}</td>
                <td>${escapeHtml(record.telp)}</td>
                <td>${escapeHtml(record.email)}</td>
                <td>${escapeHtml(record.kelurahan)}</td>
                <td>${escapeHtml(record.kecamatan)}</td>
                <td>${escapeHtml(record.kota)}</td>
                <td>${escapeHtml(record.propinsi)}</td>
                <td>${escapeHtml(record.pembayaran)}</td>
                <td>${escapeHtml(record.namaPenerima)}</td>
                <td>${escapeHtml(record.acPenerima)}</td>
                <td>${escapeHtml(record.nominal)}</td>
                <td>${escapeHtml(record.statusWa)}</td>
                <td>${escapeHtml(record.statusEmail)}</td>
                <td>${escapeHtml(record.tglBayar)}</td>
                <td>${escapeHtml(record.statusBayar)}</td>
                <td>${escapeHtml(record.tglTerima)}</td>
                <td>${escapeHtml(record.statusTerima)}</td>
                <td>${escapeHtml(record.namaSponsor)}</td>
                <td>${escapeHtml(record.hpSponsor)}</td>
                <td class="actions-col">
                    <a href="#" class="action-icon pendaftaranActionIcon ${disabledClass}" data-action="view" data-row-index="${escapeAttr(record.rowIndex)}" title="Lihat"><i class="fas fa-eye"></i></a>
                    <a href="#" class="action-icon pendaftaranActionIcon ${disabledClass}" data-action="edit" data-row-index="${escapeAttr(record.rowIndex)}" title="Edit"><i class="fas fa-edit"></i></a>
                    <a href="#" class="action-icon pendaftaranActionIcon ${disabledClass}" data-action="delete" data-row-index="${escapeAttr(record.rowIndex)}" title="Hapus"><i class="fas fa-trash"></i></a>
                </td>
            `;

            elements.tableBody.appendChild(tr);
        });
    }

    async function loadPendaftaranTableData() {
        showLoading(true);
        const filterValue = elements.filterNama ? elements.filterNama.value.trim() : '';
        const response = await fetchJsonp('getDataPendaftaran', { filter: filterValue });

        if (!response || response.status !== 'success' || !Array.isArray(response.data)) {
            renderTableRows([], 'Gagal memuat data pendaftaran.');
            showPesan('error', `ERROR : ${(response && response.message) ? response.message : 'Data tidak valid dari server.'}`, 5000);
            showLoading(false);
            return;
        }

        if (response.data.length === 0) {
            renderTableRows([], 'Tidak ada data pendaftaran.');
        } else {
            const normalizedFilter = normalizeKeyword(filterValue);
            const filteredRows = !normalizedFilter
                ? response.data
                : response.data.filter((row) => normalizeKeyword(row.nama).includes(normalizedFilter));

            if (!filteredRows.length) {
                renderTableRows([], 'Data dengan nama tersebut tidak ditemukan.');
                showPesan('warning', 'PERHATIAN : Data dengan nama tersebut tidak ditemukan.', 4000);
            } else {
                renderTableRows(filteredRows, 'Tidak ada data pendaftaran.');
            }
        }

        showLoading(false);
    }

    function buildViewTableRow(label, value) {
        return `<tr><th>${escapeHtml(label)}</th><td>${value || '-'}</td></tr>`;
    }

    function buildViewDetailItem(label, value) {
        return `
            <div class="pendaftaran-view-item">
                <div class="pendaftaran-view-label">${escapeHtml(label)}</div>
                <div class="pendaftaran-view-value">${value || '-'}</div>
            </div>
        `;
    }

    function renderLinkIfUrl(value) {
        const safeValue = escapeHtml(value);
        if (!value || String(value).trim() === 'PENDING') return escapeHtml(value || '-');
        if (/^https?:\/\//i.test(String(value).trim())) {
            return `<a href="${escapeAttr(value)}" target="_blank" rel="noopener noreferrer">${safeValue}</a>`;
        }
        return safeValue;
    }

    function normalizeImageUrl(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue || rawValue === 'PENDING') return '';

        const driveFileMatch = rawValue.match(/\/file\/d\/([^/]+)/i);
        if (driveFileMatch && driveFileMatch[1]) {
            return driveFileMatch[1];
        }

        const driveIdMatch = rawValue.match(/[?&]id=([^&]+)/i);
        if (driveIdMatch && driveIdMatch[1]) {
            return driveIdMatch[1];
        }

        return /^https?:\/\//i.test(rawValue) ? rawValue : rawValue;
    }

    function getImagePreviewSources(value) {
        const normalizedValue = normalizeImageUrl(value);
        if (!normalizedValue) return [];

        if (/^https?:\/\//i.test(normalizedValue)) {
            return [normalizedValue];
        }

        return [
            `https://drive.google.com/thumbnail?id=${normalizedValue}&sz=w1600`,
            `https://drive.google.com/uc?export=view&id=${normalizedValue}`,
            `https://lh3.googleusercontent.com/d/${normalizedValue}=w1600`
        ];
    }

    function openImageZoomModal(src, title) {
        if (!elements.imageZoomTarget || !pendaftaranImageZoomModal) return;
        elements.imageZoomTarget.src = src || '';
        elements.imageZoomTarget.alt = title || 'Preview Bukti';
        if (elements.imageZoomTitle && title) {
            elements.imageZoomTitle.textContent = title;
        }
        pendaftaranImageZoomModal.show();
    }

    function bindProofPreviewInteractions() {
        elements.viewModalBody?.querySelectorAll('.pendaftaran-proof-image').forEach((img) => {
            img.addEventListener('error', function handleImageError() {
                const sources = String(this.dataset.fallbackSources || '')
                    .split('||')
                    .map((item) => item.trim())
                    .filter(Boolean);
                const nextIndex = Number(this.dataset.fallbackIndex || '0') + 1;

                if (nextIndex < sources.length) {
                    this.dataset.fallbackIndex = String(nextIndex);
                    this.src = sources[nextIndex];
                    return;
                }

                const wrapper = this.closest('.pendaftaran-proof-preview');
                if (wrapper) {
                    wrapper.innerHTML = `
                        <div class="pendaftaran-proof-header">${escapeHtml(this.dataset.previewTitle || 'Preview Bukti')}</div>
                        <div class="pendaftaran-proof-empty">Gambar tidak bisa ditampilkan</div>
                    `;
                }
            });
        });

        elements.viewModalBody?.querySelectorAll('[data-preview-src]').forEach((trigger) => {
            trigger.addEventListener('click', () => {
                const previewSrc = trigger.getAttribute('data-preview-src') || '';
                const previewTitle = trigger.getAttribute('data-preview-title') || 'Preview Gambar';
                if (previewSrc) {
                    openImageZoomModal(previewSrc, previewTitle);
                }
            });
        });
    }

    function renderImagePreview(value, label) {
        const previewSources = getImagePreviewSources(value);
        const previewUrl = previewSources[0] || '';
        if (!previewUrl) {
            return `
                <div class="pendaftaran-proof-preview is-empty">
                    <div class="pendaftaran-proof-header">${escapeHtml(label)}</div>
                    <div class="pendaftaran-proof-empty">${escapeHtml(value || 'Belum ada gambar')}</div>
                </div>
            `;
        }

        return `
            <div class="pendaftaran-proof-preview">
                <div class="pendaftaran-proof-header">${escapeHtml(label)}</div>
                <button type="button" class="pendaftaran-proof-button" data-preview-src="${escapeAttr(previewUrl)}" data-preview-title="${escapeAttr(label)}">
                    <img
                        src="${escapeAttr(previewUrl)}"
                        alt="${escapeAttr(label)}"
                        class="pendaftaran-proof-image img-fluid rounded border"
                        data-preview-title="${escapeAttr(label)}"
                        data-fallback-index="0"
                        data-fallback-sources="${escapeAttr(previewSources.join('||'))}">
                    <span class="pendaftaran-proof-zoom-badge"><i class="fas fa-search-plus me-1"></i>Zoom</span>
                </button>
            </div>
        `;
    }

    async function openViewModal(rowIndex) {
        showLoading(true);
        const response = await fetchJsonp('getSingleDataPendaftaran', { rowIndex });

        if (!response || response.status !== 'success' || !response.data) {
            showPesan('warning', `PERHATIAN : ${(response && response.message) ? response.message : 'Detail data tidak ditemukan.'}`);
            showLoading(false);
            return;
        }

        const data = response.data;
        if (elements.viewModalBody) {
            elements.viewModalBody.innerHTML = `
                <div class="pendaftaran-view-layout">
                    <section class="pendaftaran-view-section">
                        <h6 class="pendaftaran-view-title"><i class="fas fa-receipt me-2"></i>Data Pesanan</h6>
                        <div class="pendaftaran-view-grid">
                            ${buildViewDetailItem('Tanggal Daftar', escapeHtml(formatTanggal(data.tanggal)))}
                            ${buildViewDetailItem('No Pesanan', escapeHtml(data.noPesanan))}
                            ${buildViewDetailItem('Program', escapeHtml(data.program))}
                            ${buildViewDetailItem('Harga', escapeHtml(data.harga))}
                            ${buildViewDetailItem('Pembayaran', escapeHtml(data.pembayaran))}
                            ${buildViewDetailItem('Nominal Transfer', escapeHtml(data.nominal))}
                        </div>
                    </section>

                    <section class="pendaftaran-view-section">
                        <h6 class="pendaftaran-view-title"><i class="fas fa-user me-2"></i>Data Pendaftar</h6>
                        <div class="pendaftaran-view-grid">
                            ${buildViewDetailItem('Nama', escapeHtml(data.nama))}
                            ${buildViewDetailItem('Telp', escapeHtml(data.telp))}
                            ${buildViewDetailItem('Email', escapeHtml(data.email))}
                            ${buildViewDetailItem('Alamat', escapeHtml(data.alamat))}
                            ${buildViewDetailItem('Kelurahan', escapeHtml(data.kelurahan))}
                            ${buildViewDetailItem('Kecamatan', escapeHtml(data.kecamatan))}
                            ${buildViewDetailItem('Kota', escapeHtml(data.kota))}
                            ${buildViewDetailItem('Propinsi', escapeHtml(data.propinsi))}
                            ${buildViewDetailItem('Nama Sponsor', escapeHtml(data.namaSponsor))}
                            ${buildViewDetailItem('HP Sponsor', escapeHtml(data.hpSponsor))}
                        </div>
                    </section>

                    <section class="pendaftaran-view-section">
                        <h6 class="pendaftaran-view-title"><i class="fas fa-info-circle me-2"></i>Status Proses</h6>
                        <div class="pendaftaran-view-grid">
                            ${buildViewDetailItem('Status WA', escapeHtml(data.statusWa))}
                            ${buildViewDetailItem('Status Email', escapeHtml(data.statusEmail))}
                            ${buildViewDetailItem('Tanggal Bayar', escapeHtml(data.tglBayar))}
                            ${buildViewDetailItem('Status Bayar', escapeHtml(data.statusBayar))}
                            ${buildViewDetailItem('Tanggal Terima', escapeHtml(data.tglTerima))}
                            ${buildViewDetailItem('Status Terima', escapeHtml(data.statusTerima))}
                            ${buildViewDetailItem('Nama Penerima', escapeHtml(data.namaPenerima))}
                            ${buildViewDetailItem('AC Penerima', escapeHtml(data.acPenerima))}
                        </div>
                    </section>

                    <section class="pendaftaran-view-section">
                        <h6 class="pendaftaran-view-title"><i class="fas fa-images me-2"></i>Galeri Bukti</h6>
                        <div class="pendaftaran-proof-gallery">
                            ${renderImagePreview(data.linkBuktiTransfer, 'Bukti Transfer')}
                            ${renderImagePreview(data.linkBuktiProduk, 'Bukti Produk')}
                        </div>
                    </section>
                </div>
            `;
            bindProofPreviewInteractions();
        }

        pendaftaranViewModal?.show();
        showLoading(false);
    }

    function openEditModal(rowIndex) {
        const record = pendaftaranRecords.get(String(rowIndex));
        if (!record) {
            showPesan('warning', 'PERHATIAN : Data pendaftaran tidak ditemukan.');
            return;
        }

        const rowInput = document.getElementById('pendaftaranEditRowIndex');
        if (rowInput) rowInput.value = record.rowIndex;

        fieldMap.forEach(([field, inputId]) => {
            const input = document.getElementById(inputId);
            if (input) input.value = record[field] || '';
        });

        applyLockedEditFields();
        pendaftaranEditModal?.show();
    }

    function saveChanges() {
        const rowInput = document.getElementById('pendaftaranEditRowIndex');
        if (!rowInput || !rowInput.value) {
            showPesanEdit('error', 'ERROR : Baris data pendaftaran tidak valid.');
            return;
        }

        const payload = {
            action: 'editDataPendaftaran',
            rowIndex: rowInput.value
        };

        fieldMap.forEach(([field, inputId]) => {
            const input = document.getElementById(inputId);
            payload[field] = input ? input.value : '';
        });

        showLoading(true);
        fetch(URL_dbDaftarBeratideal, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        }).finally(() => {
            showPesanEdit('success', 'BERHASIL : menyimpan data pendaftaran');
            setTimeout(() => {
                pendaftaranEditModal?.hide();
                showLoading(false);
                setTimeout(loadPendaftaranTableData, 500);
            }, 700);
        });
    }

    async function deleteRow(rowIndex) {
        const confirmed = typeof showConfirm === 'function'
            ? await showConfirm('Anda yakin ingin menghapus data pendaftaran ini?', 'Konfirmasi Hapus')
            : window.confirm('Anda yakin ingin menghapus data pendaftaran ini?');

        if (!confirmed) return;

        showLoading(true);
        fetch(URL_dbDaftarBeratideal, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'deleteDataPendaftaran',
                rowIndex: rowIndex
            })
        }).finally(() => {
            showPesan('warning', 'PERHATIAN : data pendaftaran berhasil dihapus');
            setTimeout(() => {
                showLoading(false);
                loadPendaftaranTableData();
            }, 500);
        });
    }

    function sendWaMassal() {
        const messageTemplate = elements.waMessage ? elements.waMessage.value.trim() : '';
        if (!messageTemplate) {
            showPesan('warning', 'PERHATIAN : Silahkan isi pesan FollowUp');
            return;
        }

        const selectedRows = Array.from(elements.tableBody?.querySelectorAll('.pendaftaranRowCheckbox:checked') || []).map((checkbox) => ({
            nama: checkbox.dataset.nama || '',
            nomor: checkbox.dataset.nomor || '',
            sponsor: checkbox.dataset.sponsor || ''
        }));

        if (!selectedRows.length) {
            showPesan('warning', 'PERHATIAN : Pilih minimal satu record untuk mengirim pesan follow up');
            return;
        }

        if (!elements.progressContainer || !elements.progressBar) return;

        elements.progressBar.style.width = '0%';
        elements.progressBar.textContent = `0 dari ${selectedRows.length}`;
        elements.progressBar.setAttribute('aria-valuenow', '0');
        elements.progressContainer.style.display = 'block';

        if (elements.filterNama) elements.filterNama.disabled = true;
        if (elements.filterButton) elements.filterButton.disabled = true;
        if (elements.sendWaButton) elements.sendWaButton.disabled = true;
        if (elements.cancelButton) elements.cancelButton.disabled = true;

        let completedCount = 0;
        let failedCount = 0;
        const failedRecipients = [];

        selectedRows.forEach((row, index) => {
            setTimeout(() => {
                const message = messageTemplate
                    .replace(/\{nama\}/g, row.nama)
                    .replace(/\{sponsor\}/g, row.sponsor);

                fetchJsonp('sendFollowUpWAPendaftaran', {
                    target: row.nomor,
                    message: message
                }).then((response) => {
                    if (!response || response.status !== 'success') {
                        failedCount++;
                        failedRecipients.push(`${row.nama} (${row.nomor})`);
                    }
                }).finally(() => {
                    completedCount++;
                    const progress = Math.round((completedCount / selectedRows.length) * 100);
                    elements.progressBar.style.width = `${progress}%`;
                    elements.progressBar.textContent = `${completedCount} dari ${selectedRows.length}`;
                    elements.progressBar.setAttribute('aria-valuenow', String(progress));

                    if (completedCount === selectedRows.length) {
                        elements.progressBar.style.width = '100%';
                        elements.progressBar.textContent = failedCount === 0
                            ? '100%'
                            : `Sukses ${selectedRows.length - failedCount}, Gagal ${failedCount}`;
                        elements.progressBar.setAttribute('aria-valuenow', '100');

                        setTimeout(() => {
                            if (elements.sendWaButton) elements.sendWaButton.disabled = false;
                            if (elements.cancelButton) elements.cancelButton.disabled = false;

                            if (failedCount === 0) {
                                showPesan('success', 'BERHASIL : mengirim seluruh pesan WA pendaftaran');
                                setFollowUpMode(false, { clearMessage: true, clearSelection: true });
                                if (elements.filterNama) elements.filterNama.value = '';
                            } else {
                                showPesan('warning', `PERHATIAN : ${failedCount} pesan WA gagal dikirim. Silahkan cek console browser.`, 5000);
                                console.warn('Daftar FollowUp pendaftaran gagal:', failedRecipients);
                            }
                        }, 3000);
                    }
                });
            }, index * 2500);
        });
    }

    function exportToCsv() {
        if (!elements.table) return;

        const rows = [];
        const headerCells = Array.from(elements.table.tHead.rows[0].cells).slice(1, -1);
        rows.push(headerCells.map((cell) => `"${String(cell.innerText).replace(/"/g, '""')}"`).join(','));

        Array.from(elements.table.tBodies[0].rows).forEach((row) => {
            if (row.cells.length <= 2) return;
            const rowData = Array.from(row.cells).slice(1, -1).map((cell) => `"${String(cell.innerText).replace(/"/g, '""')}"`);
            rows.push(rowData.join(','));
        });

        const csvContent = `data:text/csv;charset=utf-8,${rows.join('\n')}`;
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', 'DataPendaftaran.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showPesan('success', 'BERHASIL : mengekspor data pendaftaran');
    }

    function handleTableAction(event) {
        const actionLink = event.target.closest('[data-action]');
        if (!actionLink || !elements.tableBody?.contains(actionLink)) return;

        event.preventDefault();
        if (actionLink.classList.contains('disabled-action')) return;

        const rowIndex = actionLink.dataset.rowIndex;
        const action = actionLink.dataset.action;

        if (action === 'view') {
            openViewModal(rowIndex);
        } else if (action === 'edit') {
            openEditModal(rowIndex);
        } else if (action === 'delete') {
            deleteRow(rowIndex);
        }
    }

    function initPendaftaranUI() {
        if (pendaftaranUiInitialized) return;
        pendaftaranUiInitialized = true;

        if (elements.filterButton) {
            elements.filterButton.addEventListener('click', loadPendaftaranTableData);
        }

        if (elements.filterNama) {
            elements.filterNama.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    loadPendaftaranTableData();
                }
            });
        }

        if (elements.startButton) {
            elements.startButton.addEventListener('click', () => setFollowUpMode(true));
        }

        if (elements.cancelButton) {
            elements.cancelButton.addEventListener('click', () => setFollowUpMode(false, { clearMessage: true, clearSelection: true }));
        }

        if (elements.checkAll) {
            elements.checkAll.addEventListener('change', function() {
                elements.tableBody?.querySelectorAll('.pendaftaranRowCheckbox').forEach((checkbox) => {
                    checkbox.checked = this.checked;
                });
            });
        }

        if (elements.sendWaButton) {
            elements.sendWaButton.addEventListener('click', sendWaMassal);
        }

        if (elements.exportButton) {
            elements.exportButton.addEventListener('click', exportToCsv);
        }

        if (elements.saveButton) {
            elements.saveButton.addEventListener('click', saveChanges);
        }

        if (elements.tableBody) {
            elements.tableBody.addEventListener('click', handleTableAction);
        }

        if (elements.editModalEl) {
            elements.editModalEl.addEventListener('shown.bs.modal', () => {
                initEditTooltips();
            });
            elements.editModalEl.addEventListener('hidden.bs.modal', () => {
                if (elements.editNotifBox) elements.editNotifBox.style.display = 'none';
                disposeEditTooltips();
            });
        }

        // ===== PERBAIKAN: Inisialisasi Emoji Picker untuk Pendaftaran =====
        const pendaftaranEmojiButton = document.getElementById('pendaftaranEmojiPickerButton');
        if (pendaftaranEmojiButton) {
            if (!pendaftaranEmojiButton.hasAttribute('data-emoji-target')) {
                pendaftaranEmojiButton.setAttribute('data-emoji-target', 'pendaftaranWaMessage');
            }
            console.log('Pendaftaran Emoji button ready (menggunakan event delegation)');
        }
    }

    window.loadPendaftaranTableData = loadPendaftaranTableData;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPendaftaranUI, { once: true });
    } else {
        initPendaftaranUI();
    }
})();
