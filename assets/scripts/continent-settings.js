// Continent settings modal logic
import { getContinents, setContinents, getSettings, setSettings } from './shared.js';

document.addEventListener('DOMContentLoaded', function() {
    const openSettings = document.getElementById('openSettings');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const continentForm = document.getElementById('continentForm');
    const unOnlyToggle = document.getElementById('unOnlyToggleModal');
    const labelLeft = document.getElementById('labelLeftModal');
    const labelRight = document.getElementById('labelRightModal');
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
            // Re-initialize the game if function exists
            if (typeof window.initGame === 'function') {
                window.initGame();
            }
        };
        // Load and apply saved setting
        let settings = getSettings() || { unOnly: true };
        if (unOnlyToggle) {
            const switchEl = unOnlyToggle.closest('.switch');
            // Invert logic: checked = All Countries, unchecked = UN Only
            unOnlyToggle.checked = !settings.unOnly;
            updateLabels();
            // Always keep switch yellow
            function updateSwitchBg() {
                if (switchEl) switchEl.style.background = '#FFB703';
            }
            updateSwitchBg();
            unOnlyToggle.addEventListener('change', function() {
                settings.unOnly = !unOnlyToggle.checked;
                setSettings(settings);
                updateLabels();
                updateSwitchBg();
                if (typeof window.initGame === 'function') window.initGame();
            });
        }
        function updateLabels() {
            if (!labelLeft || !labelRight || !unOnlyToggle) return;
            if (!unOnlyToggle.checked) {
                labelLeft.style.fontWeight = '700';
                labelLeft.style.color = '#10b981';
                labelRight.style.fontWeight = '400';
                labelRight.style.color = '#1f2937';
            } else {
                labelLeft.style.fontWeight = '400';
                labelLeft.style.color = '#1f2937';
                labelRight.style.fontWeight = '700';
                labelRight.style.color = '#10b981';
            }
        }
    }
});

// Randomize SVG overlay background
const backgrounds = [
  'background1.svg',
  'background2.svg',
  'background3.svg',
  'background4.svg',
  'background5.svg',
  'background6.svg',
  'background7.svg',
  'background8.svg'
];
const chosen = backgrounds[Math.floor(Math.random() * backgrounds.length)];
document.body.style.setProperty('--overlay-bg-url', `url('../images/${chosen}')`); 