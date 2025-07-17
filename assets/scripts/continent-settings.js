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
        // Load saved continents
        const enabled = getContinents();
        Array.from(continentForm.elements['continent']).forEach(cb => {
            cb.checked = enabled.includes(cb.value);
        });
        continentForm.onchange = () => {
            const selected = Array.from(continentForm.elements['continent']).filter(cb => cb.checked).map(cb => cb.value);
            setContinents(selected);
        };
    }
}); 