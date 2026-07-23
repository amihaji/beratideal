(function() {
    const EMOJI_GROUPS = [
        { title: 'Ekspresi', items: ['😊', '😁', '😂', '🤣', '🙂', '😉', '😇', '🤗'] },
        { title: 'Dukungan', items: ['🙏', '👏', '👍', '👌', '🤝', '🙌', '💪'] },
        { title: 'Apresiasi', items: ['🎉', '✨', '🔥', '🌟', '⭐'] },
        { title: 'Hati', items: ['❤️', '🧡', '💚', '💙', '💜'] },
        { title: 'Aktivitas', items: ['🥗', '🍎', '🥤', '💧', '🏃', '🚴', '🧘', '📲'] }
    ];

    const pickerTemplate = document.getElementById('sharedEmojiPickerTemplate');
    const pickerElement = pickerTemplate?.content?.firstElementChild?.cloneNode(true) || document.createElement('div');

    if (!pickerTemplate) {
        return;
    }

    if (!pickerElement.id) {
        pickerElement.id = 'sharedEmojiPickerBody';
        pickerElement.className = 'followupwe-emoji-picker';
        pickerElement.style.display = 'none';
    }

    document.body.appendChild(pickerElement);

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
    }

    function openEmojiPickerForTextarea(textarea, trigger) {
        if (!textarea || !trigger) return;

        const hostWe = trigger.closest('.followupwe-message-input');
        if (!hostWe) return;
       
        const isSameOpen = activeTextarea === textarea && activeHost === host && pickerElement.style.display === 'block';
        if (isSameOpen) {
            closeEmojiPicker();
            return;
        }

        activeTextarea = textarea;
        activeHost = host;
        activeTrigger = trigger;

        host.appendChild(pickerElement);
        pickerElement.style.display = 'block';
    }

    function handleTriggerClick(event) {
        const trigger = event.target.closest('[data-emoji-target]');
        if (!trigger) return;

        event.preventDefault();
        const targetId = trigger.getAttribute('data-emoji-target');
        const textarea = targetId ? document.getElementById(targetId) : null;
        openEmojiPickerForTextarea(textarea, trigger);
    }

    renderEmojiGroups();

    document.addEventListener('click', handleTriggerClick);

    pickerElement.addEventListener('click', (event) => {
        const emojiButton = event.target.closest('.emoji-item');
        if (!emojiButton || !activeTextarea) return;

        const emoji = emojiButton.getAttribute('data-emoji') || '';
        if (!emoji) return;

        insertEmojiAtCursor(activeTextarea, emoji);
        closeEmojiPicker();
    });

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
})();
