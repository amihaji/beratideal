(function() {
    const EMOJI_GROUPS = [
        { title: 'Ekspresi', items: ['😊', '😁', '😂', '🤣', '🙂', '😉', '😇', '🤗'] },
        { title: 'Dukungan', items: ['🙏', '👏', '👍', '👌', '🤝', '🙌', '💪'] },
        { title: 'Apresiasi', items: ['🎉', '✨', '🔥', '🌟', '⭐'] },
        { title: 'Hati', items: ['❤️', '🧡', '💚', '💙', '💜'] },
        { title: 'Aktivitas', items: ['🥗', '🍎', '🥤', '💧', '🏃', '🚴', '🧘', '📲'] }
    ];

    const modalElement = document.getElementById('emojiPickerModal');
    const modalTitle = document.getElementById('emojiPickerModalLabel');
    const modalBody = document.getElementById('sharedEmojiPickerBody');

    if (!modalElement || !modalBody || !modalTitle || typeof bootstrap === 'undefined') {
        return;
    }

    const emojiModal = new bootstrap.Modal(modalElement);
    let activeTextarea = null;

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderEmojiGroups() {
        modalBody.innerHTML = EMOJI_GROUPS.map((group) => `
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

    function openEmojiPickerForTextarea(textarea, title) {
        if (!textarea) return;
        activeTextarea = textarea;
        modalTitle.textContent = title || 'Pilih Emoji';
        emojiModal.show();
    }

    function handleTriggerClick(event) {
        const trigger = event.target.closest('[data-emoji-target]');
        if (!trigger) return;

        event.preventDefault();
        const targetId = trigger.getAttribute('data-emoji-target');
        const textarea = targetId ? document.getElementById(targetId) : null;
        const title = trigger.getAttribute('data-emoji-title') || 'Pilih Emoji';
        openEmojiPickerForTextarea(textarea, title);
    }

    renderEmojiGroups();

    document.addEventListener('click', handleTriggerClick);

    modalBody.addEventListener('click', (event) => {
        const emojiButton = event.target.closest('.emoji-item');
        if (!emojiButton || !activeTextarea) return;

        const emoji = emojiButton.getAttribute('data-emoji') || '';
        if (!emoji) return;

        insertEmojiAtCursor(activeTextarea, emoji);
        emojiModal.hide();
    });

    modalElement.addEventListener('hidden.bs.modal', () => {
        if (activeTextarea) {
            activeTextarea.focus();
        }
    });

    window.openEmojiPickerForTextarea = openEmojiPickerForTextarea;
})();
