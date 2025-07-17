// Continent settings modal logic
import { getContinents, setContinents } from './shared.js';

document.addEventListener('DOMContentLoaded', function() {
    const openSettings = document.getElementById('openSettings');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const continentForm = document.getElementById('continentForm');
    if (openSettings && settingsModal && closeSettings && continentForm) {
        openSettings.onclick = () => { settingsModal.style.display = 'flex'; };
        closeSettings.onclick = () => { settingsModal.style.display = 'none'; };
        // Overlay click to close
        settingsModal.addEventListener('mousedown', function(e) {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        // Escape key to close
        document.addEventListener('keydown', function(e) {
            if (settingsModal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
                settingsModal.style.display = 'none';
            }
        });
        // Load saved continents
        const enabled = getContinents();
        Array.from(continentForm.elements['continent']).forEach(cb => {
            cb.checked = enabled.includes(cb.value);
        });
        continentForm.onchange = (e) => {
            const checkboxes = Array.from(continentForm.elements['continent']);
            const checked = checkboxes.filter(cb => cb.checked);
            // Prevent unchecking the last checked continent
            if (checked.length === 0) {
                // Re-check the one that was just unchecked
                e.target.checked = true;
                // Optional: quick red border visual cue
                e.target.parentElement.style.boxShadow = '0 0 0 2px #ef4444';
                setTimeout(() => {
                    e.target.parentElement.style.boxShadow = '';
                }, 400);
                return;
            }
            const selected = checked.map(cb => cb.value);
            setContinents(selected);
        };
    }
}); 