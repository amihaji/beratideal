(function() {
    const EMOJI_GROUPS = [
        { title: 'Ekspresi', items: ['😊', '😁', '😂', '🤣', '🙂', '😉', '😇', '🤗'] },
        { title: 'Dukungan', items: ['🙏', '👏', '👍', '👌', '🤝', '🙌', '💪'] },
        { title: 'Apresiasi', items: ['🎉', '✨', '🔥', '🌟', '⭐'] },
        { title: 'Hati', items: ['❤️', '🧡', '💚', '💙', '💜'] },
        { title: 'Aktivitas', items: ['🥗', '🍎', '🥤', '💧', '🏃', '🚴', '🧘', '📲'] }
    ];

    // Buat picker element di body (bukan di dalam host)
    let pickerElement = document.getElementById('sharedEmojiPickerBody');
    if (!pickerElement) {
        pickerElement = document.createElement('div');
        pickerElement.id = 'sharedEmojiPickerBody';
        pickerElement.className = 'followupwe-emoji-picker';
        document.body.appendChild(pickerElement);
    }

    // Style dengan position fixed agar tidak terpengaruh overflow tabel
    pickerElement.style.cssText = `
        display: none;
        position: fixed;
        z-index: 999999;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        max-width: 300px;
        max-height: 300px;
        overflow-y: auto;
        min-width: 220px;
    `;

    let activeTextarea = null;
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
        activeTextarea = null;
        activeTrigger = null;
    }

    function getPickerPosition(trigger) {
        const rect = trigger.getBoundingClientRect();
        const pickerWidth = 280;
        const pickerHeight = 300;
        const margin = 10;

        let left = rect.left;
        let top = rect.bottom + margin;

        // Jika tidak cukup ruang di bawah, munculkan di atas
        if (top + pickerHeight > window.innerHeight - margin) {
            top = rect.top - pickerHeight - margin;
        }

        // Agar tidak keluar dari viewport kiri/kanan
        if (left + pickerWidth > window.innerWidth - margin) {
            left = window.innerWidth - pickerWidth - margin;
        }
        if (left < margin) {
            left = margin;
        }

        return { left, top };
    }

    function openEmojiPickerForTextarea(textarea, trigger) {
        if (!textarea || !trigger) return;

        const isSameOpen = activeTextarea === textarea && activeTrigger === trigger && pickerElement.style.display === 'block';
        if (isSameOpen) {
            closeEmojiPicker();
            return;
        }

        activeTextarea = textarea;
        activeTrigger = trigger;

        // Render ulang
        renderEmojiGroups();

        // Posisikan picker
        const pos = getPickerPosition(trigger);
        pickerElement.style.left = pos.left + 'px';
        pickerElement.style.top = pos.top + 'px';
        pickerElement.style.display = 'block';
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

    // Event listener untuk tombol emoji
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
        
        if (!textarea) return;

        openEmojiPickerForTextarea(textarea, trigger);
    }

    // Tutup picker jika klik di luar
    function handleOutsideClick(event) {
        if (pickerElement.style.display !== 'block') return;

        const clickedTrigger = event.target.closest('[data-emoji-target]');
        if (clickedTrigger && activeTrigger === clickedTrigger) {
            return;
        }

        if (pickerElement.contains(event.target)) {
            return;
        }

        closeEmojiPicker();
    }

    // Inisialisasi
    renderEmojiGroups();

    // Event listeners
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

    console.log('jsEmojiPicker.js initialized with FIXED positioning');
})();