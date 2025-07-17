// settings.js
import { getSettings, setSettings } from './shared.js';

document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('unOnlyToggle');
    const switchEl = toggle.closest('.switch');
    const labelLeft = document.getElementById('labelLeft');
    const labelRight = document.getElementById('labelRight');
    let settings = getSettings();
    toggle.checked = settings.unOnly;
    updateLabels();
    // Always keep switch green
    switchEl.style.background = '#10b981';
    toggle.addEventListener('change', function() {
        settings.unOnly = toggle.checked;
        setSettings(settings);
        updateLabels();
    });
    function updateLabels() {
        // Always keep switch green
        switchEl.style.background = '#10b981';
        if (toggle.checked) {
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
}); 