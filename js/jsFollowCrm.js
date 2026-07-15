(function() {
    // const URL_dbProgram = 'https://script.google.com/macros/s/AKfycby_MUSEc0sc8JEdgHigGYxBnoPrcKek8xkSDlTs6_XKZM1NXUeaqQrBUATYthgWouG_4g/exec';
    const userLevel = localStorage.getItem('userLevel') || 'User';

    const fieldMap = [
        ['tanggal', 'crmEditTanggal'],
        ['noPesanan', 'crmEditNoPesanan'],
        ['program', 'crmEditProgram'],
        ['harga', 'crmEditHarga'],
        ['nama', 'crmEditNama'],
        ['alamat', 'crmEditAlamat'],
        ['telp', 'crmEditTelp'],
        ['email', 'crmEditEmail'],
        ['kelurahan', 'crmEditKelurahan'],
        ['kecamatan', 'crmEditKecamatan'],
        ['kota', 'crmEditKota'],
        ['propensi', 'crmEditPropensi'],
        ['userId', 'crmEditUserId'],
        ['jenisKelamin', 'crmEditJenisKelamin'],
        ['tglLahir', 'crmEditTglLahir'],
        ['testimoni', 'crmEditTestimoni'],
        ['feedback', 'crmEditFeedback'],
        ['downloadSertifikat', 'crmEditDownloadSertifikat'],
        ['produk', 'crmEditProduk'],
        ['namaSponsor', 'crmEditNamaSponsor'],
        ['hpSponsor', 'crmEditHpSponsor'],
        ['levelSponsor', 'crmEditLevelSponsor'],
        ['emailSponsor', 'crmEditEmailSponsor'],
        ['namaCoach', 'crmEditNamaCoach'],
        ['waCoach', 'crmEditWaCoach']
    ];

    const elements = {
        page: document.getElementById('followupcrm-page'),
        filterNama: document.getElementById('crmFilterNama'),
        filterButton: document.getElementById('crmFilterButton'),
        normalToolbar: document.getElementById('crmNormalToolbar'),
        followUpToolbar: document.getElementById('crmFollowUpToolbar'),
        startButton: document.getElementById('crmStartFollowUpButton'),
        cancelButton: document.getElementById('crmCancelFollowUpButton'),
        exportButton: document.getElementById('crmExportButton'),
        sendWaButton: document.getElementById('crmSendWaButton'),
        messageBox: document.getElementById('crmFollowUpMessageBox'),
        waMessage: document.getElementById('crmWaMessage'),
        progressContainer: document.getElementById('crmWaProgressContainer'),
        progressBar: document.getElementById('crmWaProgressBar'),
        checkAll: document.getElementById('crmCheckAll'),
        table: document.getElementById('crmTable'),
        tableBody: document.getElementById('crmTableBody') || document.getElementById('crmDataTableBody'),
        loadingOverlay: document.getElementById('crmLoadingOverlay'),
        pesanBox: document.getElementById('crmPesanNotification'),
        pesanIcon: document.getElementById('crmPesanNotifIcon'),
        pesanText: document.getElementById('crmPesanNotifText'),
        emojiButton: document.getElementById('crmEmojiPickerButton'),
        editModalEl: document.getElementById('crmEditModal'),
        viewModalEl: document.getElementById('crmViewModal'),
        editModalBody: document.getElementById('crmEditForm'),
        viewModalBody: document.getElementById('crmViewModalBody'),
        saveButton: document.getElementById('crmSaveChangesButton'),
        editNotifBox: document.getElementById('crmPesanNotifEditBox'),
        editNotifIcon: document.getElementById('crmPesanNotifEditIcon'),
        editNotifText: document.getElementById('crmPesanNotifEditText')
    };

    if (!elements.page) {
        return;
    }

    const crmEditModal = elements.editModalEl ? new bootstrap.Modal(elements.editModalEl) : null;
    const crmViewModal = elements.viewModalEl ? new bootstrap.Modal(elements.viewModalEl) : null;

    let crmUiInitialized = false;
    let crmRecords = new Map();

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
            const callbackName = `crm_cb_${action}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            const script = document.createElement('script');
            const query = new URLSearchParams({ action, callback: callbackName, ...params });

            script.onerror = () => {
                cleanupJsonp(script, callbackName);
                resolve({ status: 'error', message: 'Gagal menghubungi server CRM.' });
            };

            window[callbackName] = (response) => {
                cleanupJsonp(script, callbackName);
                resolve(response || { status: 'error', message: 'Respons server CRM kosong.' });
            };

            script.src = `${URL_dbProgram}?${query.toString()}`;
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

    function setFollowUpMode(isActive, options = {}) {
        const { clearMessage = false, clearSelection = false, keepProgress = false } = options;

        if (elements.filterNama) elements.filterNama.disabled = isActive;
        if (elements.filterButton) elements.filterButton.disabled = isActive;

        if (elements.normalToolbar) elements.normalToolbar.classList.toggle('sembunyikan', isActive);
        if (elements.followUpToolbar) elements.followUpToolbar.classList.toggle('sembunyikan', !isActive);
        if (elements.messageBox) elements.messageBox.style.display = isActive ? 'block' : 'none';

        elements.tableBody?.querySelectorAll('.crmRowCheckbox').forEach((checkbox) => {
            checkbox.classList.toggle('d-none', !isActive);
            if (!isActive && clearSelection) checkbox.checked = false;
        });

        elements.tableBody?.querySelectorAll('.crmActionIcon').forEach((icon) => {
            icon.classList.toggle('disabled-action', isActive || userLevel === 'User');
        });

        if (!isActive) {
            if (clearMessage && elements.waMessage) elements.waMessage.value = '';
            if (clearSelection && elements.checkAll) elements.checkAll.checked = false;
            if (!keepProgress) resetWaProgress();
        }
    }

    function renderCrmTableRows(rows, emptyMessage) {
        if (!elements.tableBody) return;

        elements.tableBody.innerHTML = '';
        crmRecords = new Map();

        if (!rows.length) {
            elements.tableBody.innerHTML = `<tr><td colspan="27">${escapeHtml(emptyMessage)}</td></tr>`;
            return;
        }

        rows.forEach((record) => {
            crmRecords.set(String(record.rowIndex), record);

            const disabledClass = userLevel === 'User' ? 'disabled-action' : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input
                        type="checkbox"
                        class="crmRowCheckbox d-none"
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
                <td>${escapeHtml(record.propensi)}</td>
                <td>${escapeHtml(record.userId)}</td>
                <td>${escapeHtml(record.jenisKelamin)}</td>
                <td>${escapeHtml(record.tglLahir)}</td>
                <td>${escapeHtml(record.testimoni)}</td>
                <td>${escapeHtml(record.feedback)}</td>
                <td>${escapeHtml(record.downloadSertifikat)}</td>
                <td>${escapeHtml(record.produk)}</td>
                <td>${escapeHtml(record.namaSponsor)}</td>
                <td>${escapeHtml(record.hpSponsor)}</td>
                <td>${escapeHtml(record.levelSponsor)}</td>
                <td>${escapeHtml(record.emailSponsor)}</td>
                <td>${escapeHtml(record.namaCoach)}</td>
                <td>${escapeHtml(record.waCoach)}</td>
                <td class="actions-col">
                    <a href="#" class="action-icon crmActionIcon ${disabledClass}" data-action="view" data-row-index="${escapeAttr(record.rowIndex)}" title="Lihat"><i class="fas fa-eye"></i></a>
                    <a href="#" class="action-icon crmActionIcon ${disabledClass}" data-action="edit" data-row-index="${escapeAttr(record.rowIndex)}" title="Edit"><i class="fas fa-edit"></i></a>
                    <a href="#" class="action-icon crmActionIcon ${disabledClass}" data-action="delete" data-row-index="${escapeAttr(record.rowIndex)}" title="Hapus"><i class="fas fa-trash"></i></a>
                </td>
            `;

            elements.tableBody.appendChild(tr);
        });
    }

    async function loadCrmTableData() {
        showLoading(true);
        const filterValue = elements.filterNama ? elements.filterNama.value.trim() : '';
        const response = await fetchJsonp('getDataKonsumen', { filter: filterValue });

        if (!response || response.status !== 'success' || !Array.isArray(response.data)) {
            renderCrmTableRows([], 'Gagal memuat data konsumen.');
            showPesan('error', `ERROR : ${(response && response.message) ? response.message : 'Data tidak valid dari server.'}`, 5000);
            showLoading(false);
            return;
        }

        if (response.data.length === 0) {
            renderCrmTableRows([], 'Tidak ada data konsumen.');
        } else {
            const normalizedFilter = normalizeKeyword(filterValue);
            const filteredRows = !normalizedFilter
                ? response.data
                : response.data.filter((row) => normalizeKeyword(row.nama).includes(normalizedFilter));

            if (!filteredRows.length) {
                renderCrmTableRows([], 'Data dengan nama tersebut tidak ditemukan.');
                showPesan('warning', 'PERHATIAN : Data dengan nama tersebut tidak ditemukan.', 4000);
            } else {
                renderCrmTableRows(filteredRows, 'Tidak ada data konsumen.');
            }
        }

        showLoading(false);
    }

    function buildViewTableRow(label, value) {
        return `<tr><th>${escapeHtml(label)}</th><td>${value || '-'}</td></tr>`;
    }

    function renderLinkIfUrl(value) {
        const safeValue = escapeHtml(value);
        if (!value) return '-';
        if (/^https?:\/\//i.test(String(value).trim())) {
            return `<a href="${escapeAttr(value)}" target="_blank" rel="noopener noreferrer">${safeValue}</a>`;
        }
        return safeValue;
    }

    async function openViewModal(rowIndex) {
        showLoading(true);
        const response = await fetchJsonp('getSingleDataKonsumen', { rowIndex });

        if (!response || response.status !== 'success' || !response.data) {
            showPesan('warning', `PERHATIAN : ${(response && response.message) ? response.message : 'Detail data tidak ditemukan.'}`);
            showLoading(false);
            return;
        }

        const data = response.data;
        if (elements.viewModalBody) {
            elements.viewModalBody.innerHTML = `
                <h6 class="mt-1"><i class="fas fa-receipt me-2"></i>Data Pesanan</h6>
                <table class="table table-bordered">
                    <tbody>
                        ${buildViewTableRow('Tanggal', escapeHtml(formatTanggal(data.tanggal)))}
                        ${buildViewTableRow('No Pesanan', escapeHtml(data.noPesanan))}
                        ${buildViewTableRow('Program', escapeHtml(data.program))}
                        ${buildViewTableRow('Harga', escapeHtml(data.harga))}
                        ${buildViewTableRow('Produk', escapeHtml(data.produk))}
                    </tbody>
                </table>

                <h6 class="mt-4"><i class="fas fa-user me-2"></i>Data Konsumen</h6>
                <table class="table table-bordered">
                    <tbody>
                        ${buildViewTableRow('Nama', escapeHtml(data.nama))}
                        ${buildViewTableRow('Telp', escapeHtml(data.telp))}
                        ${buildViewTableRow('Email', escapeHtml(data.email))}
                        ${buildViewTableRow('Alamat', escapeHtml(data.alamat))}
                        ${buildViewTableRow('Kelurahan', escapeHtml(data.kelurahan))}
                        ${buildViewTableRow('Kecamatan', escapeHtml(data.kecamatan))}
                        ${buildViewTableRow('Kota', escapeHtml(data.kota))}
                        ${buildViewTableRow('Propensi', escapeHtml(data.propensi))}
                        ${buildViewTableRow('User ID', escapeHtml(data.userId))}
                        ${buildViewTableRow('Jenis Kelamin', escapeHtml(data.jenisKelamin))}
                        ${buildViewTableRow('Tgl Lahir', escapeHtml(data.tglLahir))}
                        ${buildViewTableRow('Testimoni', escapeHtml(data.testimoni))}
                        ${buildViewTableRow('Feedback', escapeHtml(data.feedback))}
                        ${buildViewTableRow('Download Sertifikat', renderLinkIfUrl(data.downloadSertifikat))}
                    </tbody>
                </table>

                <h6 class="mt-4"><i class="fas fa-users me-2"></i>Data Pendamping</h6>
                <table class="table table-bordered">
                    <tbody>
                        ${buildViewTableRow('Nama Sponsor', escapeHtml(data.namaSponsor))}
                        ${buildViewTableRow('HP Sponsor', escapeHtml(data.hpSponsor))}
                        ${buildViewTableRow('Level Sponsor', escapeHtml(data.levelSponsor))}
                        ${buildViewTableRow('Email Sponsor', escapeHtml(data.emailSponsor))}
                        ${buildViewTableRow('Nama Coach', escapeHtml(data.namaCoach))}
                        ${buildViewTableRow('WA Coach', escapeHtml(data.waCoach))}
                    </tbody>
                </table>
            `;
        }

        crmViewModal?.show();
        showLoading(false);
    }

    function openEditModal(rowIndex) {
        const record = crmRecords.get(String(rowIndex));
        if (!record) {
            showPesan('warning', 'PERHATIAN : Data konsumen tidak ditemukan.');
            return;
        }

        const rowInput = document.getElementById('crmEditRowIndex');
        if (rowInput) rowInput.value = record.rowIndex;

        fieldMap.forEach(([field, inputId]) => {
            const input = document.getElementById(inputId);
            if (input) input.value = record[field] || '';
        });

        crmEditModal?.show();
    }

    async function saveChanges() {
        const rowInput = document.getElementById('crmEditRowIndex');
        if (!rowInput || !rowInput.value) {
            showPesanEdit('error', 'ERROR : Baris data CRM tidak valid.');
            return;
        }

        const payload = {
            action: 'editDataKonsumen',
            rowIndex: rowInput.value
        };

        fieldMap.forEach(([field, inputId]) => {
            const input = document.getElementById(inputId);
            payload[field] = input ? input.value : '';
        });

        showLoading(true);
        fetch(URL_dbProgram, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        }).finally(() => {
            showPesanEdit('success', 'BERHASIL : menyimpan data CRM');
            setTimeout(() => {
                crmEditModal?.hide();
                showLoading(false);
                setTimeout(loadCrmTableData, 500);
            }, 700);
        });
    }

    async function deleteRow(rowIndex) {
        const confirmed = typeof showConfirm === 'function'
            ? await showConfirm('Anda yakin ingin menghapus data konsumen ini?', 'Konfirmasi Hapus')
            : window.confirm('Anda yakin ingin menghapus data konsumen ini?');

        if (!confirmed) return;

        showLoading(true);
        fetch(URL_dbProgram, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'deleteDataKonsumen',
                rowIndex: rowIndex
            })
        }).finally(() => {
            showPesan('warning', 'PERHATIAN : data konsumen berhasil dihapus');
            setTimeout(() => {
                showLoading(false);
                loadCrmTableData();
            }, 500);
        });
    }

    async function sendWaMassal() {
        const messageTemplate = elements.waMessage ? elements.waMessage.value.trim() : '';
        if (!messageTemplate) {
            showPesan('warning', 'PERHATIAN : Silahkan isi pesan FollowUp');
            return;
        }

        const selectedRows = Array.from(elements.tableBody?.querySelectorAll('.crmRowCheckbox:checked') || []).map((checkbox) => ({
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

                fetchJsonp('sendFollowUpWACRM', {
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
                                showPesan('success', 'BERHASIL : mengirim seluruh pesan WA CRM');
                                setFollowUpMode(false, { clearMessage: true, clearSelection: true });
                                if (elements.filterNama) elements.filterNama.value = '';
                            } else {
                                showPesan('warning', `PERHATIAN : ${failedCount} pesan WA gagal dikirim. Silahkan cek console browser.`, 5000);
                                console.warn('Daftar FollowUp CRM gagal:', failedRecipients);
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
        link.setAttribute('download', 'DataKonsumenCRM.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showPesan('success', 'BERHASIL : mengekspor data CRM');
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

    function initFollowCrmUI() {
        if (crmUiInitialized) return;
        crmUiInitialized = true;

        if (elements.filterButton) {
            elements.filterButton.addEventListener('click', loadCrmTableData);
        }

        if (elements.filterNama) {
            elements.filterNama.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    loadCrmTableData();
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
                elements.tableBody?.querySelectorAll('.crmRowCheckbox').forEach((checkbox) => {
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
            elements.editModalEl.addEventListener('hidden.bs.modal', () => {
                if (elements.editNotifBox) elements.editNotifBox.style.display = 'none';
            });
        }

    }

    window.loadCrmTableData = loadCrmTableData;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFollowCrmUI, { once: true });
    } else {
        initFollowCrmUI();
    }
})();
