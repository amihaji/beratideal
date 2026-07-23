(function() {
    const EMOJI_GROUPS = [
        { title: 'Ekspresi', items: ['😊', '😁', '😂', '🤣', '🙂', '😉', '😇', '🤗'] },
        { title: 'Dukungan', items: ['🙏', '👏', '👍', '👌', '🤝', '🙌', '💪'] },
        { title: 'Apresiasi', items: ['🎉', '✨', '🔥', '🌟', '⭐'] },
        { title: 'Hati', items: ['❤️', '🧡', '💚', '💙', '💜'] },
        { title: 'Aktivitas', items: ['🥗', '🍎', '🥤', '💧', '🏃', '🚴', '🧘', '📲'] }
    ];

    // Ambil template yang sudah ada di HTML
    const template = document.getElementById('sharedEmojiPickerTemplate');
    let pickerElement = document.getElementById('sharedEmojiPickerBody');

    if (!pickerElement && template) {
        pickerElement = template.content.firstElementChild?.cloneNode(true);
        if (pickerElement) {
            document.body.appendChild(pickerElement);
        }
    }

    if (!pickerElement) {
        pickerElement = document.createElement('div');
        pickerElement.id = 'sharedEmojiPickerBody';
        pickerElement.className = 'followupwe-emoji-picker';
        pickerElement.style.display = 'none';
        document.body.appendChild(pickerElement);
    }

    // Pastikan class yang benar
    pickerElement.className = 'followupwe-emoji-picker';

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
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        textarea.value = textarea.value.substring(0, start) + emoji + textarea.value.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
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

        // Cari host - support berbagai class
        let host = trigger.closest('.followupwe-message-input');
        if (!host) host = trigger.closest('.followupcrm-message-input');
        if (!host) host = trigger.closest('.pendaftaran-message-input');

        if (!host) return;

        const isSameOpen = activeTextarea === textarea && activeHost === host && pickerElement.style.display === 'block';
        if (isSameOpen) {
            closeEmojiPicker();
            return;
        }

        activeTextarea = textarea;
        activeHost = host;
        activeTrigger = trigger;

        // Pindahkan picker ke dalam host
        if (pickerElement.parentElement !== host) {
            if (pickerElement.parentElement) {
                pickerElement.remove();
            }
            host.appendChild(pickerElement);
        }

        // Tampilkan picker - SAMA PERSIS dengan Follow WE
        pickerElement.style.display = 'block';
        pickerElement.style.position = 'static';
        pickerElement.style.width = '100%';
        pickerElement.style.marginTop = '0.5rem';
        pickerElement.style.zIndex = 'auto';
    }

    function handleTriggerClick(event) {
        const trigger = event.target.closest('[data-emoji-target]');
        if (!trigger) return;

        // Cek apakah tombol ini ada di dalam halaman yang aktif
        const page = trigger.closest('.page-content');
        if (page && page.style.display === 'none') return;

        event.preventDefault();
        const targetId = trigger.getAttribute('data-emoji-target');
        const textarea = targetId ? document.getElementById(targetId) : null;
        openEmojiPickerForTextarea(textarea, trigger);
    }

    renderEmojiGroups();

    // Event delegation untuk tombol emoji
    document.removeEventListener('click', handleTriggerClick);
    document.addEventListener('click', handleTriggerClick);

    // Event untuk memilih emoji
    pickerElement.addEventListener('click', (event) => {
        const emojiButton = event.target.closest('.emoji-item');
        if (!emojiButton || !activeTextarea) return;

        const emoji = emojiButton.getAttribute('data-emoji') || '';
        if (!emoji) return;

        insertEmojiAtCursor(activeTextarea, emoji);
        closeEmojiPicker();
    });

    // Tutup picker jika klik di luar
    document.addEventListener('click', (event) => {
        if (pickerElement.style.display !== 'block') return;

        const clickedTrigger = event.target.closest('[data-emoji-target]');
        if (clickedTrigger && activeTrigger === clickedTrigger) {
            return;
        }

        if (activeHost && activeHost.contains(event.target)) {
            return;
        }

        closeEmojiPicker();
    });

    window.openEmojiPickerForTextarea = function(textarea, title, trigger) {
        void title;
        openEmojiPickerForTextarea(textarea, trigger);
    };

    window.closeEmojiPicker = closeEmojiPicker;

    console.log('jsEmojiPicker.js initialized - SAMA PERSIS dengan Follow WE');
})();