(function() {
    const EMOJI_GROUPS = [
        { title: 'Ekspresi', items: ['😊', '😁', '😂', '🤣', '🙂', '😉', '😇', '🤗'] },
        { title: 'Dukungan', items: ['🙏', '👏', '👍', '👌', '🤝', '🙌', '💪'] },
        { title: 'Apresiasi', items: ['🎉', '✨', '🔥', '🌟', '⭐'] },
        { title: 'Hati', items: ['❤️', '🧡', '💚', '💙', '💜'] },
        { title: 'Aktivitas', items: ['🥗', '🍎', '🥤', '💧', '🏃', '🚴', '🧘', '📲'] }
    ];

    // Gunakan template yang sudah ada
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

    // Style SAMA PERSIS seperti yang berhasil di Follow WE
    pickerElement.style.cssText = `
        display: none;
        position: absolute;
        z-index: 9999;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        max-width: 300px;
        max-height: 300px;
        overflow-y: auto;
        min-width: 220px;
    `;

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

        // Cari host - SAMA seperti di Follow WE
        let host = trigger.closest('.followupwe-message-input');
        if (!host) host = trigger.closest('.followupcrm-message-input');
        if (!host) host = trigger.closest('.pendaftaran-message-input');
        
        // Fallback: cari parent dengan class yang mengandung 'message-input'
        if (!host) {
            let parent = trigger.parentElement;
            while (parent) {
                if (parent.className && parent.className.includes('message-input')) {
                    host = parent;
                    break;
                }
                parent = parent.parentElement;
            }
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

        // Pastikan host punya position relative
        if (getComputedStyle(host).position === 'static') {
            host.style.position = 'relative';
        }

        // Pindahkan picker ke dalam host
        if (pickerElement.parentElement !== host) {
            if (pickerElement.parentElement) {
                pickerElement.remove();
            }
            host.appendChild(pickerElement);
        }

        // Tampilkan picker di bawah tombol
        pickerElement.style.display = 'block';
        pickerElement.style.top = '100%';
        pickerElement.style.left = '0';
        pickerElement.style.marginTop = '5px';
        pickerElement.style.zIndex = '9999';
        
        // Pastikan picker tidak keluar dari viewport
        const rect = pickerElement.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            pickerElement.style.left = 'auto';
            pickerElement.style.right = '0';
        }
        if (rect.bottom > window.innerHeight) {
            pickerElement.style.top = 'auto';
            pickerElement.style.bottom = '100%';
            pickerElement.style.marginTop = '0';
            pickerElement.style.marginBottom = '5px';
        }
    }

    // Event listener untuk tombol emoji - SAMA seperti di Follow WE
    function handleEmojiTriggerClick(event) {
        const trigger = event.target.closest('[data-emoji-target]');
        if (!trigger) return;

        // Cek apakah tombol ini ada di dalam halaman yang aktif
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

        // Jika klik di dalam host atau picker, biarkan
        if (activeHost && activeHost.contains(event.target)) {
            return;
        }

        closeEmojiPicker();
    }

    // Inisialisasi
    renderEmojiGroups();

    // Gunakan event delegation (SAMA seperti di Follow WE)
    document.removeEventListener('click', handleEmojiTriggerClick);
    document.addEventListener('click', handleEmojiTriggerClick);

    pickerElement.removeEventListener('click', handleEmojiPick);
    pickerElement.addEventListener('click', handleEmojiPick);

    document.removeEventListener('click', handleOutsideClick);
    document.addEventListener('click', handleOutsideClick);

    // Fungsi global
    window.openEmojiPickerForTextarea = function(textarea, title, trigger) {
        openEmojiPickerForTextarea(textarea, trigger);
    };

    window.closeEmojiPicker = closeEmojiPicker;

    console.log('jsEmojiPicker.js initialized (SAMA PERSIS dengan logika Follow WE)');
})();