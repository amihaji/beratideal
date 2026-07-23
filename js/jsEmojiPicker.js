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

    // Atur style dasar picker agar selalu di atas
    pickerElement.style.cssText = `
        display: none;
        position: fixed;
        z-index: 999999;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        max-width: 320px;
        max-height: 350px;
        overflow-y: auto;
        min-width: 250px;
        left: auto;
        right: auto;
        top: auto;
        bottom: auto;
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
        pickerElement.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:5px;">
                <span style="font-weight:600;font-size:14px;">😊 Pilih Emoji</span>
                <button type="button" class="btn-close btn-sm" id="emojiPickerCloseBtn" style="font-size:12px;"></button>
            </div>
            ${EMOJI_GROUPS.map((group) => `
                <div class="followupwe-emoji-group" style="margin-bottom:8px;">
                    <div class="followupwe-emoji-group-title" style="font-size:11px;color:#888;margin-bottom:4px;">${escapeHtml(group.title)}</div>
                    <div class="followupwe-emoji-grid" style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${group.items.map((emoji) => `
                            <button type="button" class="btn btn-light btn-sm emoji-item" data-emoji="${escapeHtml(emoji)}" style="font-size:22px;padding:4px 8px;border-radius:6px;border:1px solid #eee;background:#f8f9fa;cursor:pointer;transition:all 0.2s;min-width:40px;text-align:center;">
                                ${escapeHtml(emoji)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;

        // Event close button
        const closeBtn = document.getElementById('emojiPickerCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeEmojiPicker();
            });
        }

        // Hover effect untuk emoji
        pickerElement.querySelectorAll('.emoji-item').forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.background = '#e9ecef';
                this.style.transform = 'scale(1.1)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.background = '#f8f9fa';
                this.style.transform = 'scale(1)';
            });
        });
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

    function getPosition(trigger) {
        const rect = trigger.getBoundingClientRect();
        const pickerWidth = 300;
        const pickerHeight = 350;
        const margin = 10;
        
        let left = rect.left + (rect.width / 2) - (pickerWidth / 2);
        let top = rect.bottom + margin;
        
        // Cek agar tidak keluar dari viewport kanan
        if (left + pickerWidth > window.innerWidth - margin) {
            left = window.innerWidth - pickerWidth - margin;
        }
        if (left < margin) {
            left = margin;
        }
        
        // Cek agar tidak keluar dari viewport bawah
        if (top + pickerHeight > window.innerHeight - margin) {
            top = rect.top - pickerHeight - margin;
        }
        if (top < margin) {
            top = margin;
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

        // Render ulang agar fresh
        renderEmojiGroups();

        // Posisikan picker
        const pos = getPosition(trigger);
        pickerElement.style.left = pos.left + 'px';
        pickerElement.style.top = pos.top + 'px';
        pickerElement.style.display = 'block';

        // Re-attach event untuk emoji items setelah render ulang
        pickerElement.querySelectorAll('.emoji-item').forEach(btn => {
            btn.removeEventListener('click', handleEmojiPick);
            btn.addEventListener('click', handleEmojiPick);
        });
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

    // Tutup picker jika klik di luar
    function handleOutsideClick(event) {
        if (pickerElement.style.display !== 'block') return;

        // Jika klik pada tombol trigger yang sama, biarkan openEmojiPickerForTextarea yang menangani
        const clickedTrigger = event.target.closest('[data-emoji-target]');
        if (clickedTrigger && activeTrigger === clickedTrigger) {
            return;
        }

        // Jika klik di dalam picker, biarkan
        if (pickerElement.contains(event.target)) {
            return;
        }

        closeEmojiPicker();
    }

    // Inisialisasi
    renderEmojiGroups();

    // Gunakan event delegation pada document
    document.removeEventListener('click', handleEmojiTriggerClick);
    document.addEventListener('click', handleEmojiTriggerClick);

    // Event untuk menutup picker saat klik di luar
    document.removeEventListener('click', handleOutsideClick);
    document.addEventListener('click', handleOutsideClick);

    // Fungsi global untuk membuka picker
    window.openEmojiPickerForTextarea = function(textarea, title, trigger) {
        openEmojiPickerForTextarea(textarea, trigger);
    };

    // Fungsi untuk menutup picker secara global
    window.closeEmojiPicker = closeEmojiPicker;

    console.log('jsEmojiPicker.js initialized with fixed positioning');
})();