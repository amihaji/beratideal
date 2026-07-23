(function() {
    const EMOJI_GROUPS = [
        { title: 'Ekspresi', items: ['😊', '😁', '😂', '🤣', '🙂', '😉', '😇', '🤗'] },
        { title: 'Dukungan', items: ['🙏', '👏', '👍', '👌', '🤝', '🙌', '💪'] },
        { title: 'Apresiasi', items: ['🎉', '✨', '🔥', '🌟', '⭐'] },
        { title: 'Hati', items: ['❤️', '🧡', '💚', '💙', '💜'] },
        { title: 'Aktivitas', items: ['🥗', '🍎', '🥤', '💧', '🏃', '🚴', '🧘', '📲'] }
    ];

    // Gunakan template yang sudah ada atau buat baru
    let pickerElement = document.getElementById('sharedEmojiPickerBody');
    if (!pickerElement) {
        const template = document.getElementById('sharedEmojiPickerTemplate');
        if (template && template.content) {
            pickerElement = template.content.firstElementChild?.cloneNode(true);
        }
        if (!pickerElement) {
            pickerElement = document.createElement('div');
            pickerElement.id = 'sharedEmojiPickerBody';
            pickerElement.className = 'followupwe-emoji-picker';
        }
        document.body.appendChild(pickerElement);
    }

    let activeTextarea = null;
    let activeHost = null;
    let activeTrigger = null;

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderEmojiGroups() {
        pickerElement.innerHTML = EMOJI_GROUPS.map((group) => `
            <div class="followupwe-emoji-group">
                <div class="followupwe-emoji-group-title">${escapeHtml(group.title)}</div>
                <div class="followupwe-emoji-grid">
                    ${group.items.map((emoji) => `
                        <button type="button" class="btn btn-light btn-sm emoji-item" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function insertEmojiAtCursor(textarea, emoji) {
        if (!textarea) return;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        textarea.value = textarea.value.substring(0, start) + emoji + textarea.value.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        // Trigger input event untuk update state jika ada
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function closeEmojiPicker() {
        pickerElement.style.display = 'none';
        if (activeHost && pickerElement.parentElement === activeHost) {
            activeHost.removeChild(pickerElement);
        }
        activeHost = null;
        activeTrigger = null;
        activeTextarea = null;
    }

    function openEmojiPickerForTextarea(textarea, trigger) {
        if (!textarea || !trigger) return;

        // Cari host terdekat dengan class .followupwe-message-input atau .followupcrm-message-input atau .pendaftaran-message-input
        let host = trigger.closest('.followupwe-message-input');
        if (!host) host = trigger.closest('.followupcrm-message-input');
        if (!host) host = trigger.closest('.pendaftaran-message-input');
        
        if (!host) {
            // Fallback: cari parent dengan class yang mengandung 'message-input'
            host = trigger.closest('[class*="message-input"]');
        }
        
        if (!host) return;

        const isSameOpen = activeTextarea === textarea && activeHost === host && pickerElement.style.display === 'block';
        if (isSameOpen) {
            closeEmojiPicker();
            return;
        }

        activeTextarea = textarea;
        activeHost = host;
        activeTrigger = trigger;

        // Pastikan picker ada di dalam host
        if (pickerElement.parentElement !== host) {
            host.appendChild(pickerElement);
        }
        pickerElement.style.display = 'block';
        // Posisikan picker di bawah tombol
        pickerElement.style.position = 'absolute';
        pickerElement.style.zIndex = '1050';
        pickerElement.style.top = '100%';
        pickerElement.style.left = '0';
        pickerElement.style.marginTop = '5px';
    }

    // Event listener untuk tombol emoji menggunakan event delegation
    function handleEmojiTriggerClick(event) {
        const trigger = event.target.closest('[data-emoji-target]');
        if (!trigger) return;

        // Cek apakah tombol ini ada di dalam halaman yang aktif (tidak tersembunyi)
        const page = trigger.closest('.page-content');
        if (page && page.style.display === 'none') return;

        event.preventDefault();
        event.stopPropagation();

        const targetId = trigger.getAttribute('data-emoji-target');
        const textarea = targetId ? document.getElementById(targetId) : null;
        
        if (!textarea) {
            console.warn('Textarea tidak ditemukan untuk target:', targetId);
            return;
        }

        openEmojiPickerForTextarea(textarea, trigger);
    }

    // Handler untuk memilih emoji
    function handleEmojiPick(event) {
        const emojiButton = event.target.closest('.emoji-item');
        if (!emojiButton || !activeTextarea) return;

        const emoji = emojiButton.getAttribute('data-emoji') || '';
        if (!emoji) return;

        insertEmojiAtCursor(activeTextarea, emoji);
        closeEmojiPicker();
    }

    // Tutup picker jika klik di luar
    function handleOutsideClick(event) {
        if (pickerElement.style.display !== 'block') return;

        // Jika klik pada tombol trigger yang sama, biarkan openEmojiPickerForTextarea yang menangani
        const clickedTrigger = event.target.closest('[data-emoji-target]');
        if (clickedTrigger && activeTrigger === clickedTrigger) {
            return;
        }

        // Jika klik di dalam host (termasuk picker itu sendiri), biarkan
        if (activeHost && activeHost.contains(event.target)) {
            return;
        }

        closeEmojiPicker();
    }

    // Inisialisasi
    renderEmojiGroups();

    // Gunakan event delegation pada document untuk menangkap klik tombol emoji
    // Ini akan menangani elemen yang dimuat secara dinamis
    document.addEventListener('click', handleEmojiTriggerClick);

    // Event untuk memilih emoji
    pickerElement.addEventListener('click', handleEmojiPick);

    // Event untuk menutup picker saat klik di luar
    document.addEventListener('click', handleOutsideClick);

    // Fungsi global untuk membuka picker (untuk kompatibilitas)
    window.openEmojiPickerForTextarea = function(textarea, title, trigger) {
        openEmojiPickerForTextarea(textarea, trigger);
    };

    // Fungsi untuk menutup picker secara global
    window.closeEmojiPicker = closeEmojiPicker;

    console.log('jsEmojiPicker.js initialized dengan event delegation');
})();