// shared.js
export function getSettings() {
    return JSON.parse(localStorage.getItem('flagfrenzy_settings')) || { unOnly: true };
}
export function setSettings(settings) {
    localStorage.setItem('flagfrenzy_settings', JSON.stringify(settings));
}
export async function getCountries(unOnly) {
    const res = await fetch('/data/countries.json');
    const all = await res.json();
    return unOnly ? all.filter(c => c.unMember) : all;
}
export function getStats() {
    return JSON.parse(localStorage.getItem('flagfrenzy_stats')) || { un: {}, all: {} };
}
export function setStats(stats) {
    localStorage.setItem('flagfrenzy_stats', JSON.stringify(stats));
}
export function getContinents() {
    return JSON.parse(localStorage.getItem('flagfrenzy_continents')) || [
        'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'
    ];
}
export function setContinents(continents) {
    localStorage.setItem('flagfrenzy_continents', JSON.stringify(continents));
} 