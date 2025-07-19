// game.js
import { getCountries, getSettings, setStats, getStats, getContinents } from './shared.js';

  // Ensure FontAwesome is loaded on the game page
  (function() {
    if (!document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"], link[href*="cdnjs.cloudflare.com/ajax/libs/font-awesome"]')) {
      var fa = document.createElement('link');
      fa.rel = 'stylesheet';
      fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
      fa.crossOrigin = 'anonymous';
      fa.referrerPolicy = 'no-referrer';
      document.head.appendChild(fa);
    }
  })();
// Parse mode from URL
function getMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || 'multiple-choice';
}

// Game state
let state = {
    mode: getMode(),
    difficulty: 'easy',
    score: 0,
    streak: 0,
    bestStreak: 0,
    questionNumber: 0,
    totalQuestions: 10,
    timeLeft: 60,
    livesLeft: 1,
    timer: null,
    currentQuestion: null,
    correctAnswers: 0,
    usedQuestions: [],
    startTime: null,
    higherCountries: null, // New state for population higher modes
    highest3Countries: null // New state for population highest 3
};

const gameContainer = document.getElementById('gameContainer');
let countries = [];
let settings = getSettings();
let stats = getStats();

// Similar flag groups for challenging options
const flagGroups = {
    african_looking: [
        'bf','bj','bo','cm','et','gd','gf','gh','gn','gq','gw','gy','lt','mg','ml','mm','mz','sn','st','td','tg','zm','zw'
    ],
    bands: [
        'ar','bb','be','bg','bw','ci','de','ee','ga','gm','gt','hu','ie','in','it','lb','ls','lv','mn','ne','ng','ni','pf','sl','sv','uy'
    ],
    cross: [
        'ax','bi','ch','dk','dm','do','fi','fo','gb','gb-eng','gb-nir','gb-sct','ge','gg','gr','is','je','jm','no','se','to'
    ],
    diagonal: [
        'bn','cd','cg','kn','na','sb','sc','tt','tz'
    ],
    easy: [
        'br','ca','es','fr','jp','mx','pt','us'
    ],
    green_red_black: [
        'af','az','bh','eg','iq','ir','ke','ly','mq','mw','qa','sa','sy','ye'
    ],
    middle_east: [
        'ae','eh','jo','kw','om','ps','sd','ss'
    ],
    islands: [
        'ai','au','bm','ck','fj','fk','gs','io','ki','ky','lc','ms','nu','nz','pn','sh','tc','tv','vc','vg'
    ],
    moon: [
        'cc','dz','km','mr','mv','pk','tm','tn','tr','uz'
    ],
    others: [
        'ag','al','ao','aq','bd','bl','bs','bt','by','cy','er','gb-wls','gi','gl','gp','hk','im','kg','kz','lk','me','mk','mp','nc','nf','pg','pm','pw','re','sm','sz','tj','ug','va','vi','vu','yt','za'
    ],
    red_blue_yellow: [
        'ad','am','bq','co','ec','md','mu','ro','ua','ve'
    ],
    red_white: [
        'at','id','mc','mt','pe','pl','sg'
    ],
    red_white_blue: [
        'as','bz','cl','cr','cu','cz','gu','hr','ht','kh','kp','kr','la','li','lr','lu','my','nl','pa','ph','pr','py','rs','ru','si','sk','sx','tf','th','tw','wf'
    ],
    stars: [
        'aw','ba','cf','cn','cv','cw','cx','dj','fm','hn','il','ma','mh','mo','np','nr','rw','so','sr','tk','tl','vn','ws','xk'
    ]
};

function getSimilarFlags(target, all) {
    let similarFlags = [];
    for (const group of Object.values(flagGroups)) {
        if (group.includes(target.code)) {
            group.forEach(flagCode => {
                if (flagCode !== target.code) {
                    const flag = all.find(f => f.code === flagCode);
                    if (flag && !similarFlags.some(f => f.code === flag.code)) similarFlags.push(flag);
                }
            });
        }
    }
    // Fallback: same continent
    if (similarFlags.length < 5) {
        const continentFlags = all.filter(f => f.continent === target.continent && f.code !== target.code && !similarFlags.some(sf => sf.code === f.code));
        for (const flag of shuffle(continentFlags)) {
            if (similarFlags.length >= 5) break;
            similarFlags.push(flag);
        }
    }
    // Final fallback: random
    if (similarFlags.length < 5) {
        const randomFlags = all.filter(f => f.code !== target.code && !similarFlags.some(sf => sf.code === f.code));
        for (const flag of shuffle(randomFlags)) {
            if (similarFlags.length >= 5) break;
            similarFlags.push(flag);
        }
    }
    return similarFlags.slice(0, 5);
}

function shuffle(arr) {
    return arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
}

function pickRandom(arr, n) {
    return shuffle(arr).slice(0, n);
}

function getFilteredFlags() {
    const enabledContinents = getContinents();
    return countries.filter(c => enabledContinents.includes(c.continent));
}

function generateQuestion() {
    // Use state.availableCountries if present (hard/extreme), else getFilteredFlags()
    const pool = state.availableCountries || getFilteredFlags();
    const available = pool.filter(f => !state.usedQuestions.includes(f.name));
    if (available.length === 0) {
        state.usedQuestions = [];
        return generateQuestion();
    }
    const correct = pickRandom(available, 1)[0];
    state.usedQuestions.push(correct.name);
    let wrongAnswers = [];
    if (["multiple-choice", "time-attack", "survival"].includes(state.mode)) {
        wrongAnswers = getSimilarFlags(correct, pool).map(f => f.name);
        const usedNames = new Set([correct.name, ...wrongAnswers]);
        if (wrongAnswers.length < 5) {
            const fill = pool.filter(f => !usedNames.has(f.name));
            for (const flag of shuffle(fill)) {
                if (wrongAnswers.length >= 5) break;
                wrongAnswers.push(flag.name);
                usedNames.add(flag.name);
            }
        }
        wrongAnswers = wrongAnswers.slice(0, 5);
    }
    return { correct, wrongAnswers };
}

function renderQuestion() {
    state.questionNumber++;
    state.currentQuestion = generateQuestion();
    let html = '';
    html += `<div class="card text-center">`;
    html += `<div class="mb-6"><div class="text-gray mb-2" style="font-size: 0.875rem;">Question ${state.questionNumber} of ${state.totalQuestions}</div>`;
    html += `<h3 class="text-2xl font-bold mb-4">Which country does this flag belong to?</h3>`;
    html += `<div class="mb-6" style="display: flex; justify-content: center;"><img src="${state.currentQuestion.correct.flag}" alt="Flag" class="flag-img" /></div>`;
    html += `<div id="answerContainer">`;
    if (['multiple-choice', 'time-attack', 'survival'].includes(state.mode)) {
        let options = [...state.currentQuestion.wrongAnswers, state.currentQuestion.correct.name];
        options = shuffle(options);
        html += `<div class="grid md:grid-cols-2 lg:grid-cols-3">`;
        for (const opt of options) {
            html += `<button class="answer-option" data-answer="${opt}">${opt}</button>`;
        }
        html += `</div>`;
    } else if (state.mode === 'type-country') {
        html += `<input type="text" id="countryInput" placeholder="Type the country name..." class="input">`;
        html += `<button id="submitAnswer" class="btn btn-primary mt-2" style="padding: 0.75rem 2rem;">Submit Answer</button>`;
    }
    html += `</div>`;
    html += `<div id="feedbackContainer" class="hidden mt-6"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    attachQuestionHandlers();
    patchQuitButton();
}

function renderPopulationMCQuestion() {
    state.questionNumber++;
    // Pick a random country
    const available = getFilteredFlags().filter(f => !state.usedQuestions.includes(f.name));
    if (available.length === 0) {
        state.usedQuestions = [];
        return renderPopulationMCQuestion();
    }
    const correct = pickRandom(available, 1)[0];
    state.usedQuestions.push(correct.name);
    // Generate 5 wrong population options
    let populations = [correct.population];
    let used = new Set([correct.population]);
    let pool = countries.filter(f => f.name !== correct.name);
    pool = shuffle(pool);
    for (const c of pool) {
        if (populations.length >= 6) break;
        if (!used.has(c.population)) {
            populations.push(c.population);
            used.add(c.population);
        }
    }
    populations = shuffle(populations);
    let html = `<div class="card text-center">`;
    html += `<div class="mb-6"><div class="text-gray mb-2" style="font-size: 0.875rem;">Question ${state.questionNumber} of ${state.totalQuestions}</div>`;
    html += `<h3 class="text-2xl font-bold mb-4">What is the population of <span class='text-primary'>${correct.name}</span>?</h3>`;
    html += `<div class="mb-6" style="display: flex; justify-content: center;"><img src="${correct.flag}" alt="Flag" class="flag-img" /></div>`;
    html += `<div id="answerContainer"><div class="grid md:grid-cols-2 lg:grid-cols-3">`;
    for (const pop of populations) {
        html += `<button class="answer-option" data-answer="${pop}">${pop.toLocaleString()}</button>`;
    }
    html += `</div></div>`;
    html += `<div id="feedbackContainer" class="hidden mt-6"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    document.querySelectorAll('.answer-option').forEach(btn => {
        btn.onclick = () => {
            const isCorrect = Number(btn.dataset.answer) === correct.population;
            if (isCorrect) {
                state.score += 10 + (state.streak * 2);
                state.streak++;
                state.correctAnswers++;
                state.bestStreak = Math.max(state.bestStreak, state.streak);
            } else {
                state.streak = 0;
            }
            updateGameUI();
            showPopulationMCFeedback(isCorrect, correct);
        };
    });
    patchQuitButton();
}

function showPopulationMCFeedback(isCorrect, correct) {
    const feedback = document.getElementById('feedbackContainer');
    let html = '';
    if (isCorrect) {
        html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
    } else {
        html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
    }
    html += `<div class="text-gray mb-4">Population of ${correct.name}: <b>${correct.population.toLocaleString()}</b></div>`;
    html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next Question</button>`;
    feedback.innerHTML = html;
    feedback.classList.remove('hidden');
    document.getElementById('answerContainer').innerHTML = '';
    document.getElementById('nextQuestion').onclick = () => {
        if (state.questionNumber < state.totalQuestions) {
            renderPopulationMCQuestion();
        } else {
            endGame();
        }
    };
}

function renderPopulationHigherQuestion(flagsOnly = false) {
    if (!state.higherCountries) {
        state.higherCountries = pickRandom(countries, 2);
        state.streak = 0;
        state.score = 0;
        state.bestStreak = 0;
        state.questionNumber = 0;
    }
    state.questionNumber++;
    let [left, right] = state.higherCountries;
    let html = `<div class="card text-center">`;
    html += `<div class="mb-6"><div class="text-gray mb-2" style="font-size: 0.875rem;">Streak: <span id='currentStreak'>${state.streak}</span></div>`;
    html += `<h3 class="text-2xl font-bold mb-4">Which has a higher population?</h3>`;
    html += `<div class="flex justify-center items-center" style="gap:2rem;">`;
    html += `<button class="higher-choice" data-side="left" style="border:none;background:none;cursor:pointer;">`;
    html += `<img src="${left.flag}" alt="Flag" class="flag-img" /><br/>`;
    if (!flagsOnly) html += `<span class="text-xl font-bold">${left.name}</span>`;
    html += `</button>`;
    html += `<span style="font-size:2rem;">vs</span>`;
    html += `<button class="higher-choice" data-side="right" style="border:none;background:none;cursor:pointer;">`;
    html += `<img src="${right.flag}" alt="Flag" class="flag-img" /><br/>`;
    if (!flagsOnly) html += `<span class="text-xl font-bold">${right.name}</span>`;
    html += `</button>`;
    html += `</div></div>`;
    html += `<div id="feedbackContainer" class="hidden mt-6"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    document.querySelectorAll('.higher-choice').forEach(btn => {
        btn.onclick = () => {
            // Capture left/right before updating state
            const prevLeft = left;
            const prevRight = right;
            const chosen = btn.dataset.side === 'left' ? left : right;
            const other = btn.dataset.side === 'left' ? right : left;
            const isCorrect = chosen.population >= other.population;
            if (isCorrect) {
                state.streak++;
                state.score += 10;
                state.bestStreak = Math.max(state.bestStreak, state.streak);
                // Randomly choose which country to replace
                let replaceLeft = Math.random() < 0.5;
                let pool = countries.filter(c => c.name !== left.name && c.name !== right.name);
                if (pool.length === 0) pool = countries.filter(c => c.name !== (replaceLeft ? right.name : left.name));
                const newCountry = pickRandom(pool, 1)[0];
                if (replaceLeft) {
                    state.higherCountries = [newCountry, right];
                } else {
                    state.higherCountries = [left, newCountry];
                }
            } else {
                state.streak = 0;
                state.higherCountries = null;
            }
            showPopulationHigherFeedback(isCorrect, chosen, other, flagsOnly, prevLeft, prevRight);
        };
    });
    patchQuitButton();
}

function showPopulationHigherFeedback(isCorrect, chosen, other, flagsOnly, leftOverride, rightOverride) {
    const feedback = document.getElementById('feedbackContainer');
    let html = '';
    // Use leftOverride/rightOverride if provided, else fall back to state
    const left = leftOverride || state.higherCountries[0];
    const right = rightOverride || state.higherCountries[1];
    if (isCorrect) {
        html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
        html += `<div class="text-gray mb-4">${left.name} (${left.population.toLocaleString()}) vs ${right.name} (${right.population.toLocaleString()})</div>`;
        html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next</button>`;
    } else {
        html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
        html += `<div class="text-gray mb-4">${left.name} (${left.population.toLocaleString()}) vs ${right.name} (${right.population.toLocaleString()})</div>`;
        html += `<button id="endGameBtn" class="btn btn-primary mt-2">View Results</button>`;
    }
    feedback.innerHTML = html;
    feedback.classList.remove('hidden');
    document.querySelectorAll('.higher-choice').forEach(btn => btn.disabled = true);
    if (isCorrect) {
        document.getElementById('nextQuestion').onclick = () => renderPopulationHigherQuestion(flagsOnly);
    } else {
        document.getElementById('endGameBtn').onclick = () => endGame();
    }
}

function renderPopulationHighest3Question() {
    // Defensive: ensure always 3 unique valid objects before rendering
    let tries = 0;
    while (
        !state.highest3Countries ||
        state.highest3Countries.length !== 3 ||
        state.highest3Countries.some(c => !c) ||
        new Set(state.highest3Countries.map(c => c?.name)).size !== 3
    ) {
        state.highest3Countries = pickRandom(countries, 3);
        tries++;
        if (tries > 5) break;
    }
    // If still invalid, show error and return
    if (
        !state.highest3Countries ||
        state.highest3Countries.length !== 3 ||
        state.highest3Countries.some(c => !c) ||
        new Set(state.highest3Countries.map(c => c?.name)).size !== 3
    ) {
        gameContainer.innerHTML = '<div class="card text-center"><div class="text-danger">Error: Could not load 3 unique countries. Please refresh the page.</div></div>';
        return;
    }
    state.questionNumber++;
    let [a, b, c] = state.highest3Countries;
    let html = `<div class="card text-center">`;
    html += `<div class="mb-6"><div class="text-gray mb-2" style="font-size: 0.875rem;">Streak: <span id='currentStreak'>${state.streak}</span></div>`;
    html += `<h3 class="text-2xl font-bold mb-4">Which has the highest population?</h3>`;
    html += `<div class="flex justify-center items-center" style="gap:2rem;">`;
    [a, b, c].forEach((country, idx) => {
        if (!country) return; // Defensive: skip if undefined
        html += `<button class="highest3-choice" data-idx="${idx}" style="border:none;background:none;cursor:pointer;">`;
        html += `<img src="${country.flag}" alt="Flag" class="flag-img" /><br/>`;
        html += `<span class="text-xl font-bold">${country.name}</span>`;
        html += `</button>`;
        if (idx < 2) html += `<span style="font-size:2rem;">vs</span>`;
    });
    html += `</div></div>`;
    html += `<div id="feedbackContainer" class="hidden mt-6"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    document.querySelectorAll('.highest3-choice').forEach(btn => {
        btn.onclick = () => {
            const idx = Number(btn.dataset.idx);
            const chosen = [a, b, c][idx];
            // Keep the display order for feedback
            const others = [a, b, c].filter((_, i) => i !== idx);
            const isCorrect = chosen && others[0] && others[1] && chosen.population >= others[0].population && chosen.population >= others[1].population;
            if (isCorrect) {
                state.streak++;
                state.score += 10;
                state.bestStreak = Math.max(state.bestStreak, state.streak);
                // Randomly keep 1 of the previous 3, replace the other 2 with new unique countries
                const keepIdx = Math.floor(Math.random() * 3);
                const keepCountry = [a, b, c][keepIdx];
                let pool = countries.filter(c => c.name !== keepCountry.name);
                let newCountries = [null, null, null];
                newCountries[keepIdx] = keepCountry;
                // Pick 2 new unique countries
                const [new1, new2] = pickRandom(pool, 2);
                let fillIdxs = [0, 1, 2].filter(i => i !== keepIdx);
                newCountries[fillIdxs[0]] = new1;
                newCountries[fillIdxs[1]] = new2;
                // Defensive: ensure all unique
                if (new Set(newCountries.map(c => c?.name)).size === 3) {
                    state.highest3Countries = newCountries;
                } else {
                    // fallback: re-pick all 3
                    state.highest3Countries = pickRandom(countries, 3);
                }
            } else {
                state.streak = 0;
                state.highest3Countries = null;
            }
            showPopulationHighest3Feedback(isCorrect, [a, b, c], idx);
        };
    });
    patchQuitButton();
}

function showPopulationHighest3Feedback(isCorrect, displayOrder, chosenIdx) {
    const feedback = document.getElementById('feedbackContainer');
    let html = '';
    const chosen = displayOrder[chosenIdx];
    // Others in display order, not including chosen
    const others = displayOrder.filter((_, i) => i !== chosenIdx);
    if (isCorrect) {
        html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
        html += `<div class="text-gray mb-4">`;
        html += `${displayOrder[0].name} (${displayOrder[0].population.toLocaleString()}) vs ${displayOrder[1].name} (${displayOrder[1].population.toLocaleString()}) vs ${displayOrder[2].name} (${displayOrder[2].population.toLocaleString()})`;
        html += `</div>`;
        html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next</button>`;
    } else {
        html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
        html += `<div class="text-gray mb-4">`;
        html += `${displayOrder[0].name} (${displayOrder[0].population.toLocaleString()}) vs ${displayOrder[1].name} (${displayOrder[1].population.toLocaleString()}) vs ${displayOrder[2].name} (${displayOrder[2].population.toLocaleString()})`;
        html += `</div>`;
        html += `<button id="endGameBtn" class="btn btn-primary mt-2">View Results</button>`;
    }
    feedback.innerHTML = html;
    feedback.classList.remove('hidden');
    document.querySelectorAll('.highest3-choice').forEach(btn => btn.disabled = true);
    if (isCorrect) {
        document.getElementById('nextQuestion').onclick = () => renderPopulationHighest3Question();
    } else {
        document.getElementById('endGameBtn').onclick = () => endGame();
    }
}

function renderGameHeader() {
    let html = `<div class="card game-main-card mt-game-card"><div class="flex justify-between items-center">`;
    html += `<div class="flex items-center space-x-4">`;
    html += `<div class="score-box"><span style="font-size: 0.875rem; font-weight: 600;">Score: <span id="currentScore">${state.score}</span></span></div>`;
    html += `<div class="score-box"><span style="font-size: 0.875rem; font-weight: 600;">Streak: <span id="currentStreak">${state.streak}</span></span></div>`;
    html += `</div><div class="flex items-center space-x-4">`;
    if (state.mode === 'time-attack') {
        html += `<div id="timerDisplay" style="background: rgba(239, 68, 68, 0.1); padding: 0.5rem 1rem; border-radius: 0.5rem;">
            <span style="font-size: 0.875rem; font-weight: 600; color: #ef4444;"><i class="fa-solid fa-stopwatch fa-shake" style="animation-delay: 50s;"></i> <span id="timeLeft">${state.timeLeft}</span>s</span></div>`;
    }
    if (state.mode === 'survival') {
        html += `<div id="livesDisplay" style="background: rgba(245, 158, 11, 0.1); padding: 0.5rem 1rem; border-radius: 0.5rem;">`;
        html += `<span style="font-size: 1.25rem; font-weight: 600; color: #ef4444;">`;
        for (let i = 1; i <= 3; i++) {
            if (state.livesLeft >= i + 1) {
                html += `<i class="fa-solid fa-heart"></i>`;
            } else {
                html += `<i class="fa-solid fa-heart-crack"></i>`;
            }
            html += ' ';
        }
        html += `</span></div>`;
    }
    html += `<button id="quitGame" class="icon-btn" style="font-size:2rem; background:none; border:none;"><i class="fa-solid fa-xmark"></i></button>`;
    html += `</div></div></div>`;
    return html;
}

function attachQuestionHandlers() {
    if (["multiple-choice", "time-attack", "survival"].includes(state.mode)) {
        document.querySelectorAll(".answer-option").forEach((btn) => {
            btn.onclick = () => {
                checkAnswer(btn.dataset.answer);
            };
        });
    } else if (state.mode === "type-country" || state.mode === "hard" || state.mode === "extreme") {
        const input = document.getElementById("countryInput");
        const submitBtn = document.getElementById("submitAnswer");
        // Wrap input in a relative div for dropdown positioning
        const wrapper = document.createElement("div");
        wrapper.className = "autocomplete-wrapper";
        wrapper.style.position = "relative";
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        wrapper.appendChild(submitBtn);
        // Create autocomplete dropdown
        let dropdown = document.createElement("div");
        dropdown.className = "autocomplete-dropdown";
        dropdown.style.position = "absolute";
        dropdown.style.left = 0;
        dropdown.style.top = input.offsetHeight + 2 + "px";
        dropdown.style.zIndex = 10;
        dropdown.style.background = "#fff";
        dropdown.style.border = "1px solid #eee";
        dropdown.style.maxHeight = "180px";
        dropdown.style.overflowY = "auto";
        dropdown.style.display = "none";
        dropdown.style.width = input.offsetWidth + "px";
        wrapper.appendChild(dropdown);
        input.addEventListener("input", function () {
            const val = input.value.trim().toLowerCase();
            if (!val) {
                dropdown.style.display = "none";
                return;
            }
            // Filter and sort countries: startsWith first, then includes
            let filtered = getFilteredFlags().filter((c) => {
                if (c.name.toLowerCase().includes(val)) return true;
                if (c.code && c.code.toLowerCase().includes(val)) return true;
                if (c.altNames && c.altNames.some((alt) => alt.toLowerCase().includes(val))) return true;
                return false;
            });
            filtered = filtered.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aCode = (a.code || '').toLowerCase();
                const bCode = (b.code || '').toLowerCase();
                const aAlt = (a.altNames || []).map(x => x.toLowerCase());
                const bAlt = (b.altNames || []).map(x => x.toLowerCase());
                // Helper: does it start with val?
                function startsWithAny(strs) {
                  return strs.some(s => s.startsWith(val));
                }
                const aStarts = aName.startsWith(val) || aCode.startsWith(val) || startsWithAny(aAlt);
                const bStarts = bName.startsWith(val) || bCode.startsWith(val) || startsWithAny(bAlt);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return aName.localeCompare(bName);
            });
            if (filtered.length === 0) {
                dropdown.style.display = "none";
                return;
            }
            dropdown.innerHTML = filtered
                .map(
                    (c) =>
                        `<div class="autocomplete-item" style="padding: 0.4rem 0.8rem; cursor: pointer; border-bottom: 1px solid #f3f3f3; text-align: left;">${c.name}</div>`
                )
                .join("");
            dropdown.style.display = "block";
            dropdown.style.width = input.offsetWidth + "px";
            // Click handler for suggestions
            dropdown.querySelectorAll('.autocomplete-item').forEach((item, idx) => {
                item.onclick = () => {
                    input.value = filtered[idx].name;
                    dropdown.style.display = "none";
                    input.focus();
                };
            });
        });
        input.addEventListener("blur", () => setTimeout(() => (dropdown.style.display = "none"), 150));
        // Keyboard navigation
        let selectedIdx = -1;
        input.addEventListener("keydown", function (e) {
            const items = dropdown.querySelectorAll(".autocomplete-item");
            if (!items.length || dropdown.style.display === "none") return;
            if (e.key === "ArrowDown") {
                selectedIdx = (selectedIdx + 1) % items.length;
                items.forEach((it, i) => (it.style.background = i === selectedIdx ? "#f3f4f6" : "#fff"));
                e.preventDefault();
            } else if (e.key === "ArrowUp") {
                selectedIdx = (selectedIdx - 1 + items.length) % items.length;
                items.forEach((it, i) => (it.style.background = i === selectedIdx ? "#f3f4f6" : "#fff"));
                e.preventDefault();
            } else if (e.key === "Enter" && selectedIdx >= 0) {
                items[selectedIdx].click();
                selectedIdx = -1;
                e.preventDefault();
            }
        });
        submitBtn.className = "btn btn-primary mt-2";
        submitBtn.style.background = "#FFB703";
        submitBtn.style.color = "#fff";
        submitBtn.style.border = "none";
        submitBtn.style.padding = "";
        submitBtn.style.marginTop = "1rem";
        submitBtn.onclick = () => {
            const val = input.value.trim();
            if (val) checkAnswer(val);
        };
        input.onkeypress = (e) => {
            if (e.key === "Enter") {
                const val = input.value.trim();
                if (val) checkAnswer(val);
            }
        };
        // Always focus the input field
        setTimeout(() => { input.focus(); }, 0);
    }
}

function normalizeAnswer(str) {
    return str
        .toLowerCase()
        .replace(/\./g, '') // remove periods
        .replace(/&/g, 'and') // treat & as 'and'
        .replace(/saint/g, 'st') // treat 'saint' as 'st'
        .replace(/\s+/g, '') // remove all spaces
        .replace(/[^a-z0-9]/g, ''); // remove all non-alphanumeric
}

function checkAnswer(userAnswer) {
    const correct = state.currentQuestion.correct;
    const accepted = [correct.name, ...(correct.altNames || [])];
    const normalizedUser = normalizeAnswer(userAnswer);
    const isCorrect = accepted.some(ans => normalizeAnswer(ans) === normalizedUser);
    if (isCorrect) {
        if (state.mode === 'multiple-choice') {
            state.score += 10 + (state.streak * 2);
        } else {
            state.score += 10 + (state.streak * 2);
        }
        state.streak++;
        state.correctAnswers++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
    } else {
        state.streak = 0;
        if (state.mode === 'survival') {
            state.livesLeft--;
            // Immediately update hearts display after incorrect answer
            const livesDisplay = document.getElementById('livesDisplay');
            if (livesDisplay) {
                let hearts = '';
                for (let i = 1; i <= 3; i++) {
                    if (state.livesLeft >= i + 1) {
                        hearts += '<i class="fa-solid fa-heart fa-beat"></i> ';
                    } else {
                        hearts += '<i class="fa-solid fa-heart-crack"></i> ';
                    }
                }
                livesDisplay.innerHTML = `<span style=\"font-size: 1.25rem; font-weight: 600; color: #ef4444;\">${hearts}</span>`;
            }
        }
    }
    updateGameUI();
    showFeedback(isCorrect);
    // End conditions
    if (state.mode === 'survival' && state.livesLeft <= 0) {
        setTimeout(() => endGame(), 1200);
    } else if (state.mode === 'time-attack' && state.timeLeft <= 0) {
        setTimeout(() => endGame(), 1200);
    } else if (state.questionNumber >= state.totalQuestions && !['time-attack', 'survival'].includes(state.mode)) {
        setTimeout(() => endGame(), 1200);
    }
}

function showFeedback(correct) {
    const feedback = document.getElementById('feedbackContainer');
    let html = '';
    if (correct) {
        html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
        html += `<div class="text-gray mb-4">Well done! That's ${state.currentQuestion.correct.name}</div>`;
    } else {
        html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
        html += `<div class="text-gray mb-4">The correct answer is ${state.currentQuestion.correct.name}</div>`;
    }
    html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next Question</button>`;
    feedback.innerHTML = html;
    feedback.classList.remove('hidden');
    // Hide answer options
    const ac = document.getElementById('answerContainer');
    if (ac) ac.innerHTML = '';
    document.getElementById('nextQuestion').onclick = () => {
        if ((state.mode === 'time-attack' && state.timeLeft > 0) ||
            (state.mode === 'survival' && state.livesLeft > 0) ||
            (!['time-attack', 'survival'].includes(state.mode) && state.questionNumber < state.totalQuestions)) {
            renderQuestion();
        } else {
            endGame();
        }
    };
    // Focus the Next Question button for Enter key
    setTimeout(() => { document.getElementById('nextQuestion').focus(); }, 0);
}

function updateGameUI() {
    const score = document.getElementById('currentScore');
    const streak = document.getElementById('currentStreak');
    const time = document.getElementById('timeLeft');
    const lives = document.getElementById('livesLeft');
    if (score) score.textContent = state.score;
    if (streak) streak.textContent = state.streak;
    if (time) time.textContent = state.timeLeft;
    if (lives) lives.textContent = state.livesLeft;
}

function startGame() {
    // Reset state
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.questionNumber = 0;
    state.correctAnswers = 0;
    state.usedQuestions = [];
    state.startTime = Date.now();
    if (state.mode === 'time-attack') {
        state.timeLeft = 60;
        state.totalQuestions = 999;
        startTimer();
    } else if (state.mode === 'survival') {
        state.livesLeft = 4;
        state.totalQuestions = 999;
    } else {
        state.totalQuestions = 10;
    }
    renderQuestion();
}

function startTimer() {
    state.timer = setInterval(() => {
        state.timeLeft--;
        updateGameUI();
        if (state.timeLeft <= 0) {
            clearInterval(state.timer);
            endGame();
        }
    }, 1000);
}

function endGame() {
    if (state.timer) clearInterval(state.timer);
    let timeElapsed = 0;
    if (state.startTime && (state.mode === 'time-attack' || state.mode === 'survival')) {
        timeElapsed = Math.round((Date.now() - state.startTime) / 1000);
    }
    const accuracy = state.questionNumber > 0 ? Math.round((state.correctAnswers / state.questionNumber) * 100) : 0;
    // Update stats
    const statsKey = settings.unOnly ? 'un' : 'all';
    if (!stats[statsKey]) stats[statsKey] = {};
    stats[statsKey].totalGames = (stats[statsKey].totalGames || 0) + 1;
    stats[statsKey].bestScore = Math.max((stats[statsKey].bestScore || 0), state.score);
    stats[statsKey].totalCorrect = (stats[statsKey].totalCorrect || 0) + state.correctAnswers;
    stats[statsKey].totalQuestions = (stats[statsKey].totalQuestions || 0) + state.questionNumber;
    stats[statsKey].longestStreak = Math.max((stats[statsKey].longestStreak || 0), state.bestStreak);
    // Separate best streaks for comparison modes
    if (state.mode === 'population-higher') {
        stats[statsKey].longestStreakHigher = Math.max((stats[statsKey].longestStreakHigher || 0), state.bestStreak);
    } else if (state.mode === 'population-higher-flags') {
        stats[statsKey].longestStreakHigherFlags = Math.max((stats[statsKey].longestStreakHigherFlags || 0), state.bestStreak);
    }
    if (state.mode === 'population-highest-3') {
        stats[statsKey].longestStreakHighest3 = Math.max((stats[statsKey].longestStreakHighest3 || 0), state.bestStreak);
    }
    if (state.mode === 'multiple-choice') {
        stats[statsKey].longestStreakMC = Math.max((stats[statsKey].longestStreakMC || 0), state.bestStreak);
    }
    setStats(stats);
    // Show results
    let iconHtml = '';
    let title = '';
    let subtitle = '';
    if (state.mode === 'time-attack') {
        iconHtml = `<span class='fa-fallback' style='font-size:3rem;vertical-align:middle;'>⏳</span>`;
        title = 'Time is up!';
        subtitle = "You've completed the quiz!";
    } else if (state.mode === 'survival') {
        iconHtml = `<span class='fa-fallback' style='font-size:3rem;vertical-align:middle;'>😵</span>`;
        title = 'Game over!';
        subtitle = "You've ran out of lives.";
    } else if (state.mode === 'population-higher' || state.mode === 'population-higher-flags' || state.mode === 'population-highest-3') {
        iconHtml = `<span class='fa-fallback' style='font-size:3rem;vertical-align:middle;'>☠️</span>`;
        title = 'Game over!';
        subtitle = "You've ran out of lives.";
    } else if (state.mode === 'multiple-choice' || state.mode === 'type-country') {
        iconHtml = `<span class='fa-fallback' style='font-size:3rem;vertical-align:middle;'>🏆</span>`;
        title = 'Great Job!';
        subtitle = "You've completed the quiz!";
    } else {
        iconHtml = `<span class='fa-fallback' style='font-size:3rem;vertical-align:middle;'>🏆</span>`;
        title = 'Great Job!';
        subtitle = "You've completed the quiz!";
    }
    let html = `<div class="card game-results-card mt-game-results">`;
    html += `<div class="mb-6"><div class="text-8xl mb-4">${iconHtml}</div>`;
    html += `<h2 class="text-3xl font-bold mb-2">${title}</h2>`;
    html += `<p class="text-xl text-gray">${subtitle}</p></div>`;
    if (state.mode === 'population-higher') {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 mb-8">`;
        html += `<div style="background: rgba(93, 92, 222, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold text-primary">${state.score}</div><div class="text-gray" style="font-size: 0.875rem;">Final Score</div></div>`;
        html += `<div style="background: rgba(245, 158, 11, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold" style="color: #f59e0b;">${stats[statsKey].longestStreakHigher || 0}</div><div class="text-gray" style="font-size: 0.875rem;">Best Streak (All Time)</div></div>`;
        html += `</div>`;
    } else if (state.mode === 'population-higher-flags') {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 mb-8">`;
        html += `<div style="background: rgba(93, 92, 222, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold text-primary">${state.score}</div><div class="text-gray" style="font-size: 0.875rem;">Final Score</div></div>`;
        html += `<div style="background: rgba(245, 158, 11, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold" style="color: #f59e0b;">${stats[statsKey].longestStreakHigherFlags || 0}</div><div class="text-gray" style="font-size: 0.875rem;">Best Streak (All Time)</div></div>`;
        html += `</div>`;
    } else if (state.mode === 'multiple-choice') {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 mb-8">`;
        html += `<div style="background: #f3f4fd; border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold text-primary">${state.correctAnswers}</div><div class="text-gray" style="font-size: 0.875rem;">Final Score</div></div>`;
        html += `<div style="background: #fff8ed; border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold" style="color: #fb8500;">${stats[statsKey].longestStreakMC || 0}</div><div class="text-gray" style="font-size: 0.875rem;">Best Streak (All Time)</div></div>`;
        html += `</div>`;
    } else if (state.mode === 'population-highest-3') {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 mb-8">`;
        html += `<div style="background: rgba(93, 92, 222, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold text-primary">${state.score}</div><div class="text-gray" style="font-size: 0.875rem;">Final Score</div></div>`;
        html += `<div style="background: rgba(245, 158, 11, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold" style="color: #f59e0b;">${stats[statsKey].longestStreakHighest3 || 0}</div><div class="text-gray" style="font-size: 0.875rem;">Best Streak (All Time)</div></div>`;
        html += `</div>`;
    } else if (state.mode === 'survival') {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 mb-8">`;
        html += `<div style="background: rgba(93, 92, 222, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold text-primary">${state.score}</div><div class="text-gray" style="font-size: 0.875rem;">Final Score</div></div>`;
        html += `<div style="background: rgba(245, 158, 11, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold" style="color: #f59e0b;">${stats[statsKey].longestStreak || 0}</div><div class="text-gray" style="font-size: 0.875rem;">Best Streak (All Time)</div></div>`;
        html += `</div>`;
    } else {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 mb-8">`;
        html += `<div style="background: rgba(93, 92, 222, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold text-primary">${state.score}</div><div class="text-gray" style="font-size: 0.875rem;">Final Score</div></div>`;
        html += `<div style="background: rgba(245, 158, 11, 0.1); border-radius: 0.75rem; padding: 1rem;"><div class="text-2xl font-bold" style="color: #f59e0b;">${state.bestStreak}</div><div class="text-gray" style="font-size: 0.875rem;">Best Streak (All Time)</div></div>`;
        html += `</div>`;
    }
    html += `<div class="flex flex-col space-y-3" style="gap: 0.75rem;">`;
    html += `<div style="display: flex; gap: 0.75rem; justify-content: center;"><button id="playAgain" class="btn btn-primary" style="flex: 1;">Play Again</button><button id="backToMenu" class="btn btn-success" style="flex: 1;">Main Menu</button></div>`;
    html += `</div></div>`;
    gameContainer.innerHTML = html;
    document.getElementById('playAgain').onclick = () => initGame();
    document.getElementById('backToMenu').onclick = () => window.location.href = 'index.html';
}

async function initGame() {
    countries = await getCountries(settings.unOnly);
    // Define availableCountries before using it
    const availableCountries = getFilteredFlags();
    // Reset common state properties
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.questionNumber = 0;
    state.correctAnswers = 0;
    state.usedQuestions = [];

    if (state.mode === 'extreme') {
        state.totalQuestions = availableCountries.length;
        renderExtremeQuestion();
    } else if (state.mode === 'population-mc') {
        state.totalQuestions = 10;
        renderPopulationMCQuestion();
    } else if (state.mode === 'population-higher') {
        state.higherCountries = null;
        renderPopulationHigherQuestion(false);
    } else if (state.mode === 'population-higher-flags') {
        state.higherCountries = null;
        renderPopulationHigherQuestion(true);
    } else if (state.mode === 'population-highest-3') {
        state.highest3Countries = null;
        renderPopulationHighest3Question();
    } else if (state.mode === 'survival') {
        state.livesLeft = 4;
        startGame();
    } else if (state.mode === 'size-mc') {
        state.totalQuestions = 10;
        renderSizeMCQuestion();
    } else if (state.mode === 'size-higher') {
        state.higherCountries = null;
        renderSizeHigherQuestion(false);
    } else if (state.mode === 'size-higher-flags') {
        state.higherCountries = null;
        renderSizeHigherQuestion(true);
    } else if (state.mode === 'size-highest-3') {
        state.highest3Countries = null;
        renderSizeHighest3Question();
    } else if (state.mode === 'hard') {
        state.totalQuestions = Math.min(50, availableCountries.length);
        renderHardQuestion();
    } else {
        startGame();
    }
}


document.addEventListener('DOMContentLoaded', initGame);

// Patch quit button for all modes
function patchQuitButton() {
    const quitBtn = document.getElementById('quitGame');
    if (quitBtn) {
        quitBtn.onclick = () => {
            if (confirm('Are you sure you want to quit the current game?')) {
                if (state.timer) clearInterval(state.timer);
                window.location.href = 'index.html';
            }
        };
    }
}

// Utility: preserve scroll position during DOM updates
function preserveScroll(fn) {
  const y = window.scrollY;
  fn();
  window.scrollTo({ top: y, behavior: 'auto' });
}

// Patch render and feedback functions to preserve scroll position
const _renderQuestion = renderQuestion;
renderQuestion = function() { preserveScroll(() => _renderQuestion.apply(this, arguments)); patchQuitButton(); };
const _renderPopulationMCQuestion = renderPopulationMCQuestion;
renderPopulationMCQuestion = function() { preserveScroll(() => _renderPopulationMCQuestion.apply(this, arguments)); patchQuitButton(); };
const _renderPopulationHigherQuestion = renderPopulationHigherQuestion;
renderPopulationHigherQuestion = function(flagsOnly) { preserveScroll(() => _renderPopulationHigherQuestion.apply(this, arguments)); patchQuitButton(); };
const _renderPopulationHighest3Question = renderPopulationHighest3Question;
renderPopulationHighest3Question = function() { preserveScroll(() => _renderPopulationHighest3Question.apply(this, arguments)); patchQuitButton(); };

// Patch feedback functions as well
const _showFeedback = showFeedback;
showFeedback = function(correct) {
    if (state.mode === 'hard') {
        const feedback = document.getElementById('feedbackContainer');
        let html = '';
        if (correct) {
            html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
            html += `<div class="text-gray mb-4">Well done! That's ${state.currentQuestion.correct.name}</div>`;
        } else {
            html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
            html += `<div class="text-gray mb-4">The correct answer is ${state.currentQuestion.correct.name}</div>`;
        }
        html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next Question</button>`;
        feedback.innerHTML = html;
        feedback.classList.remove('hidden');
        // Hide answer options
        const ac = document.getElementById('answerContainer');
        if (ac) ac.innerHTML = '';
        document.getElementById('nextQuestion').onclick = () => {
            if (state.questionNumber < state.totalQuestions) {
                renderHardQuestion();
            } else {
                endGame();
            }
        };
        // Focus the Next Question button for Enter key
        setTimeout(() => { document.getElementById('nextQuestion').focus(); }, 0);
        return;
    }
    return _showFeedback.apply(this, arguments);
}
const _showPopulationMCFeedback = showPopulationMCFeedback;
showPopulationMCFeedback = function() { preserveScroll(() => _showPopulationMCFeedback.apply(this, arguments)); };
const _showPopulationHigherFeedback = showPopulationHigherFeedback;
showPopulationHigherFeedback = function() { preserveScroll(() => _showPopulationHigherFeedback.apply(this, arguments)); };
const _showPopulationHighest3Feedback = showPopulationHighest3Feedback;
showPopulationHighest3Feedback = function() { preserveScroll(() => _showPopulationHighest3Feedback.apply(this, arguments)); };

// --- SIZE MODES ---
function renderSizeMCQuestion() {
    state.questionNumber++;
    // Pick a random country
    const available = getFilteredFlags().filter(f => !state.usedQuestions.includes(f.name));
    if (available.length === 0) {
        state.usedQuestions = [];
        return renderSizeMCQuestion();
    }
    const correct = pickRandom(available, 1)[0];
    state.usedQuestions.push(correct.name);
    // Generate 5 wrong area options
    let areas = [correct.area];
    let used = new Set([correct.area]);
    let pool = countries.filter(f => f.name !== correct.name);
    pool = shuffle(pool);
    for (const c of pool) {
        if (areas.length >= 6) break;
        if (!used.has(c.area)) {
            areas.push(c.area);
            used.add(c.area);
        }
    }
    areas = shuffle(areas);
    let html = `<div class="card text-center">`;
    html += `<div class="mb-6"><div class="text-gray mb-2" style="font-size: 0.875rem;">Question ${state.questionNumber} of ${state.totalQuestions}</div>`;
    html += `<h3 class="text-2xl font-bold mb-4">What is the land area of <span class='text-primary'>${correct.name}</span>?</h3>`;
    html += `<div class="mb-6" style="display: flex; justify-content: center;"><img src="${correct.flag}" alt="Flag" class="flag-img" /></div>`;
    html += `<div id="answerContainer"><div class="grid md:grid-cols-2 lg:grid-cols-3">`;
    for (const area of areas) {
        html += `<button class="answer-option" data-answer="${area}">${area.toLocaleString()} km²</button>`;
    }
    html += `</div></div>`;
    html += `<div id="feedbackContainer" class="hidden mt-6"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    document.querySelectorAll('.answer-option').forEach(btn => {
        btn.onclick = () => {
            const isCorrect = Number(btn.dataset.answer) === correct.area;
            if (isCorrect) {
                state.score += 10 + (state.streak * 2);
                state.streak++;
                state.correctAnswers++;
                state.bestStreak = Math.max(state.bestStreak, state.streak);
            } else {
                state.streak = 0;
            }
            updateGameUI();
            showSizeMCFeedback(isCorrect, correct);
        };
    });
    patchQuitButton();
}

function showSizeMCFeedback(isCorrect, correct) {
    const feedback = document.getElementById('feedbackContainer');
    let html = '';
    if (isCorrect) {
        html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
        html += `<div class="text-gray mb-4">Well done! That's ${correct.name} (${correct.area.toLocaleString()} km²)</div>`;
    } else {
        html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
        html += `<div class="text-gray mb-4">The correct answer is ${correct.name} (${correct.area.toLocaleString()} km²)</div>`;
    }
    html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next Question</button>`;
    feedback.innerHTML = html;
    feedback.classList.remove('hidden');
    // Hide answer options
    const ac = document.getElementById('answerContainer');
    if (ac) ac.innerHTML = '';
    document.getElementById('nextQuestion').onclick = () => {
        if (state.questionNumber < state.totalQuestions) {
            renderSizeMCQuestion();
        } else {
            endGame();
        }
    };
}

function renderSizeHigherQuestion(flagsOnly = false) {
    if (!state.higherCountries) {
        state.higherCountries = pickRandom(countries, 2);
        state.streak = 0;
        state.score = 0;
        state.bestStreak = 0;
        state.questionNumber = 0;
    }
    state.questionNumber++;
    let [left, right] = state.higherCountries;
    let html = `<div class="card text-center">`;
    html += `<div class="mb-6"><div class="text-gray mb-2" style="font-size: 0.875rem;">Streak: <span id='currentStreak'>${state.streak}</span></div>`;
    html += `<h3 class="text-2xl font-bold mb-4">Which has a larger area?</h3>`;
    html += `<div class="flex justify-center items-center" style="gap:2rem;">`;
    html += `<button class="higher-choice" data-side="left" style="border:none;background:none;cursor:pointer;">`;
    html += `<img src="${left.flag}" alt="Flag" class="flag-img" /><br/>`;
    if (!flagsOnly) html += `<span class="text-xl font-bold">${left.name}</span>`;
    html += `</button>`;
    html += `<span style="font-size:2rem;">vs</span>`;
    html += `<button class="higher-choice" data-side="right" style="border:none;background:none;cursor:pointer;">`;
    html += `<img src="${right.flag}" alt="Flag" class="flag-img" /><br/>`;
    if (!flagsOnly) html += `<span class="text-xl font-bold">${right.name}</span>`;
    html += `</button>`;
    html += `</div></div>`;
    html += `<div id="feedbackContainer" class="hidden mt-6"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    document.querySelectorAll('.higher-choice').forEach(btn => {
        btn.onclick = () => {
            const chosen = btn.dataset.side === 'left' ? left : right;
            const other = btn.dataset.side === 'left' ? right : left;
            const isCorrect = chosen.area >= other.area;
            if (isCorrect) {
                state.streak++;
                state.score += 10;
                state.bestStreak = Math.max(state.bestStreak, state.streak);
                // Replace one country
                const keep = chosen;
                let pool = countries.filter(c => c.name !== keep.name);
                const newCountry = pickRandom(pool, 1)[0];
                state.higherCountries = btn.dataset.side === 'left' ? [keep, newCountry] : [newCountry, keep];
                showSizeHigherFeedback(isCorrect, chosen, other, flagsOnly);
            } else {
                state.streak = 0;
                state.higherCountries = null;
                showSizeHigherFeedback(isCorrect, chosen, other, flagsOnly, true);
            }
        };
    });
    patchQuitButton();
}

function showSizeHigherFeedback(isCorrect, chosen, other, flagsOnly, end = false) {
    const feedback = document.getElementById('feedbackContainer');
    let html = '';
    if (isCorrect) {
        html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
        html += `<div class="text-gray mb-4">${chosen.name} is larger (${chosen.area.toLocaleString()} km² vs ${other.area.toLocaleString()} km²)</div>`;
    } else {
        html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
        html += `<div class="text-gray mb-4">${other.name} is larger (${other.area.toLocaleString()} km² vs ${chosen.area.toLocaleString()} km²)</div>`;
    }
    if (isCorrect) {
        html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next Question</button>`;
    } else {
        html += `<button id="endGameBtn" class="btn btn-primary mt-2">View Results</button>`;
    }
    feedback.innerHTML = html;
    feedback.classList.remove('hidden');
    if (isCorrect) {
        document.getElementById('nextQuestion').onclick = () => {
            renderSizeHigherQuestion(flagsOnly);
        };
    } else {
        document.getElementById('endGameBtn').onclick = () => {
            endGame();
        };
    }
}

function renderSizeHighest3Question() {
    let tries = 0;
    while (
        !state.highest3Countries ||
        state.highest3Countries.length !== 3 ||
        state.highest3Countries.some(c => !c) ||
        new Set(state.highest3Countries.map(c => c?.name)).size !== 3
    ) {
        state.highest3Countries = pickRandom(countries, 3);
        tries++;
        if (tries > 5) break;
    }
    if (
        !state.highest3Countries ||
        state.highest3Countries.length !== 3 ||
        state.highest3Countries.some(c => !c) ||
        new Set(state.highest3Countries.map(c => c?.name)).size !== 3
    ) {
        gameContainer.innerHTML = '<div class="card text-center"><div class="text-danger">Error: Could not load 3 unique countries. Please refresh the page.</div></div>';
        return;
    }
    state.questionNumber++;
    let [a, b, c] = state.highest3Countries;
    let html = `<div class="card text-center">`;
    html += `<div class="mb-6"><div class="text-gray mb-2" style="font-size: 0.875rem;">Streak: <span id='currentStreak'>${state.streak}</span></div>`;
    html += `<h3 class="text-2xl font-bold mb-4">Which has the largest area?</h3>`;
    html += `<div class="flex justify-center items-center" style="gap:2rem;">`;
    [a, b, c].forEach((country, idx) => {
        if (!country) return;
        html += `<button class="highest3-choice" data-idx="${idx}" style="border:none;background:none;cursor:pointer;">`;
        html += `<img src="${country.flag}" alt="Flag" class="flag-img" /><br/>`;
        html += `<span class="text-xl font-bold">${country.name}</span>`;
        html += `</button>`;
        if (idx < 2) html += `<span style="font-size:2rem;">vs</span>`;
    });
    html += `</div></div>`;
    html += `<div id="feedbackContainer" class="hidden mt-6"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    document.querySelectorAll('.highest3-choice').forEach(btn => {
        btn.onclick = () => {
            const idx = Number(btn.dataset.idx);
            const chosen = [a, b, c][idx];
            const others = [a, b, c].filter((_, i) => i !== idx);
            const isCorrect = chosen && others[0] && others[1] && chosen.area >= others[0].area && chosen.area >= others[1].area;
            if (isCorrect) {
                state.streak++;
                state.score += 10;
                state.bestStreak = Math.max(state.bestStreak, state.streak);
                const keepIdx = Math.floor(Math.random() * 3);
                const keepCountry = [a, b, c][keepIdx];
                let pool = countries.filter(c => c.name !== keepCountry.name);
                let newCountries = [null, null, null];
                newCountries[keepIdx] = keepCountry;
                const [new1, new2] = pickRandom(pool, 2);
                let fillIdxs = [0, 1, 2].filter(i => i !== keepIdx);
                newCountries[fillIdxs[0]] = new1;
                newCountries[fillIdxs[1]] = new2;
                if (new Set(newCountries.map(c => c?.name)).size === 3) {
                    state.highest3Countries = newCountries;
                } else {
                    state.highest3Countries = pickRandom(countries, 3);
                }
                showSizeHighest3Feedback(isCorrect, [a, b, c], idx);
            } else {
                state.streak = 0;
                state.highest3Countries = null;
                showSizeHighest3Feedback(isCorrect, [a, b, c], idx, true);
            }
        };
    });
    patchQuitButton();
}

function showSizeHighest3Feedback(isCorrect, displayOrder, chosenIdx, end = false) {
    const feedback = document.getElementById('feedbackContainer');
    let html = '';
    const chosen = displayOrder[chosenIdx];
    const others = displayOrder.filter((_, i) => i !== chosenIdx);
    // Find the country with the largest area
    const largest = displayOrder.reduce((max, c) => c.area > max.area ? c : max, displayOrder[0]);
    if (isCorrect) {
        html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
        html += `<div class="text-gray mb-4">${chosen.name} has the largest area (${chosen.area.toLocaleString()} km²)</div>`;
    } else {
        html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
        html += `<div class="text-gray mb-4">The correct answer is ${largest.name} (${largest.area.toLocaleString()} km²)</div>`;
    }
    if (isCorrect) {
        html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next Question</button>`;
    } else {
        html += `<button id="endGameBtn" class="btn btn-primary mt-2">View Results</button>`;
    }
    feedback.innerHTML = html;
    feedback.classList.remove('hidden');
    if (isCorrect) {
        document.getElementById('nextQuestion').onclick = () => {
            renderSizeHighest3Question();
        };
    } else {
        document.getElementById('endGameBtn').onclick = () => {
            endGame();
        };
    }
}

function renderHardQuestion() {
    state.questionNumber++;
    state.currentQuestion = generateQuestion();
    let html = '';
    html += `<div class="card text-center">`;
    html += `<div class="mb-6"><div class="text-gray mb-2" style="font-size: 0.875rem;">Question ${state.questionNumber} of ${(state.availableCountries ? state.availableCountries.length : state.totalQuestions)}</div>`;
    html += `<h3 class="text-2xl font-bold mb-4">Which country does this flag belong to?</h3>`;
    // Randomly choose transformations
    const transforms = [];
    if (Math.random() < 0.7) transforms.push('mirror'); // scaleX(-1)
    if (Math.random() < 0.7) transforms.push('flip');   // scaleY(-1)
    const doColorReplace = Math.random() < 0.7;
    html += `<div class="mb-6" style="display: flex; justify-content: center;">
      <div id="flag-canvas-container" style="position:relative;display:inline-block;"></div>
    </div>`;
    html += `<div id="answerContainer">`;
    html += `<input type="text" id="countryInput" placeholder="Type the country name..." class="input">`;
    html += `<button id="submitAnswer" class="btn btn-primary mt-2" style="padding: 0.75rem 2rem; margin-top: 1rem; background: #FFB703; color: #fff; border: none;">Submit Answer</button>`;
    html += `</div>`;
    html += `<div id="feedbackContainer" class="hidden mt-6"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    // Draw flag on canvas with color replacement
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = state.currentQuestion.correct.flag;
    img.onload = function() {
        // Resize to display size
        const displayWidth = 400;
        const displayHeight = Math.round(img.height * (displayWidth / img.width));
        const canvas = document.createElement('canvas');
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        const ctx = canvas.getContext('2d');
        // Apply transforms
        ctx.save();
        if (transforms.includes('mirror')) {
            ctx.translate(displayWidth, 0);
            ctx.scale(-1, 1);
        }
        if (transforms.includes('flip')) {
            ctx.translate(0, displayHeight);
            ctx.scale(1, -1);
        }
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        ctx.restore();
        if (doColorReplace) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            // Define target colors for matching
            const COLORS = {
                green:  [252,209,22],
                red:    [252,209,22],
                blue:   [239,43,45],
                yellow: [7,137,48],
                white:  [0, 0, 0],
                black:  [255, 255, 255],
            };
            function colorDistance(r1, g1, b1, r2, g2, b2) {
                return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
            }
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i+1], b = d[i+2];
                let minDist = 80; // threshold for color match
                let match = null;
                for (const [name, [tr, tg, tb]] of Object.entries(COLORS)) {
                    const dist = colorDistance(r, g, b, tr, tg, tb);
                    if (dist < minDist) {
                        minDist = dist;
                        match = name;
                    }
                }
                if (match === 'green') { d[i]=220; d[i+1]=30; d[i+2]=30; } // green→red
                else if (match === 'red') { d[i]=30; d[i+1]=30; d[i+2]=220; } // red→blue
                else if (match === 'blue') { d[i]=240; d[i+1]=220; d[i+2]=30; } // blue→yellow
                else if (match === 'yellow') { d[i]=255; d[i+1]=255; d[i+2]=255; } // yellow→white
                else if (match === 'white') { d[i]=30; d[i+1]=180; d[i+2]=30; } // white→green
            }
            ctx.putImageData(imageData, 0, 0);
        }
        const container = document.getElementById('flag-canvas-container');
        container.innerHTML = '';
        canvas.className = 'flag-img';
        canvas.style.borderRadius = '5px';
        container.appendChild(canvas);
    };
    attachQuestionHandlers();
    patchQuitButton();
}

function renderExtremeQuestion() {
    state.questionNumber++;
    state.currentQuestion = generateQuestion();
    let html = '';
    html += `<div class=\"card text-center\">`;
    html += `<div class=\"mb-6\"><div class=\"text-gray mb-2\" style=\"font-size: 0.875rem;\">Question ${state.questionNumber} of ${(state.availableCountries ? state.availableCountries.length : state.totalQuestions)}</div>`;
    html += `<h3 class=\"text-2xl font-bold mb-4\">Which country does this flag belong to?</h3>`;
    html += `<div class=\"mb-6\" style=\"display: flex; justify-content: center; position: relative;\">`;
    html += `<div id=\"flag-canvas-container\" style=\"position:relative;display:inline-block;\">`;
    html += `<button id=\"showFlagBtn\" class=\"icon-btn\" style=\"position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:3rem;color:#219EBC;z-index:1;pointer-events:auto;\"><i class=\"fa-solid fa-eye\"></i></button>`;
    html += `</div>`;
    html += `</div>`;
    html += `<div id=\"answerContainer\">`;
    html += `<input type=\"text\" id=\"countryInput\" placeholder=\"Type the country name...\" class=\"input\">`;
    html += `<button id=\"submitAnswer\" class=\"btn btn-primary mt-2\" style=\"padding: 0.75rem 2rem; margin-top: 1rem; background: #FFB703; color: #fff; border: none;\">Submit Answer</button>`;
    html += `</div>`;
    html += `<div id=\"feedbackContainer\" class=\"hidden mt-6\"></div>`;
    html += `</div>`;
    gameContainer.innerHTML = renderGameHeader() + html;
    // Draw flag on canvas with color replacement
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = state.currentQuestion.correct.flag;
    img.onload = function() {
        const displayWidth = 400;
        const displayHeight = Math.round(img.height * (displayWidth / img.width));
        const canvas = document.createElement('canvas');
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        const ctx = canvas.getContext('2d');
        // Randomly choose transformations
        const transforms = [];
        if (Math.random() < 0.7) transforms.push('mirror');
        if (Math.random() < 0.7) transforms.push('flip');
        ctx.save();
        if (transforms.includes('mirror')) {
            ctx.translate(displayWidth, 0);
            ctx.scale(-1, 1);
        }
        if (transforms.includes('flip')) {
            ctx.translate(0, displayHeight);
            ctx.scale(1, -1);
        }
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        ctx.restore();
        // Color replacement
        const doColorReplace = Math.random() < 1;
        if (doColorReplace) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            const COLORS = {
                green:  [252,209,22],
                red:    [252,209,22],
                blue:   [239,43,45],
                yellow: [7,137,48],
                white:  [0, 0, 0],
                black:  [255, 255, 255],
            };
            function colorDistance(r1, g1, b1, r2, g2, b2) {
                return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
            }
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i+1], b = d[i+2];
                let minDist = 80;
                let match = null;
                for (const [name, [tr, tg, tb]] of Object.entries(COLORS)) {
                    const dist = colorDistance(r, g, b, tr, tg, tb);
                    if (dist < minDist) {
                        minDist = dist;
                        match = name;
                    }
                }
                if (match === 'green') { d[i]=220; d[i+1]=30; d[i+2]=30; }
                else if (match === 'red') { d[i]=30; d[i+1]=30; d[i+2]=220; }
                else if (match === 'blue') { d[i]=240; d[i+1]=220; d[i+2]=30; }
                else if (match === 'yellow') { d[i]=255; d[i+1]=255; d[i+2]=255; }
                else if (match === 'white') { d[i]=30; d[i+1]=180; d[i+2]=30; }
            }
            ctx.putImageData(imageData, 0, 0);
        }
        const container = document.getElementById('flag-canvas-container');
        container.innerHTML = '';
        // Ensure the button is always present and behind the canvas
        const showFlagBtn = document.createElement('button');
        showFlagBtn.id = 'showFlagBtn';
        showFlagBtn.className = 'icon-btn';
        showFlagBtn.style.position = 'absolute';
        showFlagBtn.style.top = '50%';
        showFlagBtn.style.left = '50%';
        showFlagBtn.style.transform = 'translate(-50%,-50%)';
        showFlagBtn.style.fontSize = '3rem';
        showFlagBtn.style.color = '#219EBC';
        showFlagBtn.style.zIndex = '1';
        showFlagBtn.style.pointerEvents = 'auto';
        showFlagBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        container.appendChild(showFlagBtn);
        canvas.className = 'flag-img';
        canvas.style.borderRadius = '5px';
        canvas.style.position = 'relative';
        canvas.style.zIndex = '2';
        container.appendChild(canvas);
        // Hide after 0.5s by making transparent (Extreme mode only)
        if (state.mode === 'extreme') {
            setTimeout(() => { canvas.style.opacity = '0'; canvas.classList.add('extreme-hidden'); }, 500);
        }
        // Eye icon logic
        let revealsLeft = 2;
        showFlagBtn.onclick = () => {
            if (revealsLeft > 0) {
                revealsLeft--;
                canvas.style.opacity = '1';
                canvas.classList.remove('extreme-hidden');
                setTimeout(() => { canvas.style.opacity = '0'; canvas.classList.add('extreme-hidden'); }, 500);
                if (revealsLeft === 0) {
                    showFlagBtn.innerHTML = '<i class="fa-solid fa-eye-slash" style="color: #aaa;"></i>';
                    showFlagBtn.disabled = true;
                }
            }
        };
    };
    attachQuestionHandlers();
    patchQuitButton();
}

// Patch initGame to support extreme mode
const _initGameExtreme = initGame;
initGame = async function() {
    countries = await getCountries(settings.unOnly);
    if (state.mode === 'extreme') {
        state.score = 0; state.streak = 0; state.bestStreak = 0; state.questionNumber = 0; state.correctAnswers = 0; state.usedQuestions = [];
        state.totalQuestions = availableCountries.length;
        renderExtremeQuestion();
    } else {
        return _initGameExtreme.apply(this, arguments);
    }
}

// Patch feedback for extreme mode
const _showFeedbackExtreme = showFeedback;
showFeedback = function(correct) {
    if (state.mode === 'extreme') {
        const feedback = document.getElementById('feedbackContainer');
        let html = '';
        if (correct) {
            html += '<div class="text-xl font-bold mb-2 text-success">Correct! 🎉</div>';
            html += `<div class="text-gray mb-4">Well done! That's ${state.currentQuestion.correct.name}</div>`;
        } else {
            html += '<div class="text-xl font-bold mb-2 text-danger">Incorrect ❌</div>';
            html += `<div class="text-gray mb-4">The correct answer is ${state.currentQuestion.correct.name}</div>`;
        }
        html += `<button id="nextQuestion" class="btn btn-primary mt-2">Next Question</button>`;
        feedback.innerHTML = html;
        feedback.classList.remove('hidden');
        // Hide answer options
        const ac = document.getElementById('answerContainer');
        if (ac) ac.innerHTML = '';
        // Restore flag opacity
        const container = document.getElementById('flag-canvas-container');
        const canvas = container && container.querySelector('canvas');
        if (canvas) {
            canvas.style.opacity = '1';
            canvas.classList.remove('extreme-hidden');
        }
        document.getElementById('nextQuestion').onclick = () => {
            if (state.questionNumber < state.totalQuestions) {
                renderExtremeQuestion();
            } else {
                endGame();
            }
        };
        // Focus the Next Question button for Enter key
        setTimeout(() => { document.getElementById('nextQuestion').focus(); }, 0);
        return;
    }
    return _showFeedbackExtreme.apply(this, arguments);
}

document.addEventListener('DOMContentLoaded', function() {
    // Insert game logo header at the top
    const logoHeader = document.createElement('div');
    logoHeader.className = 'game-logo-header';
    logoHeader.innerHTML = '<img src="assets/images/logo-light.webp" alt="Geo Frenzy Logo" class="game-logo-img" />';
    document.body.insertBefore(logoHeader, document.body.firstChild);

    const openSettings = document.getElementById('openSettings');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const continentForm = document.getElementById('continentForm');
    if (openSettings && settingsModal && closeSettings && continentForm) {
        openSettings.onclick = () => { settingsModal.style.display = 'flex'; };
        closeSettings.onclick = () => { settingsModal.style.display = 'none'; };
        // Load saved continents
        const enabled = (window.getContinents ? window.getContinents() : (window.flagfrenzy_getContinents && window.flagfrenzy_getContinents())) || [
            'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'
        ];
        Array.from(continentForm.elements['continent']).forEach(cb => {
            cb.checked = enabled.includes(cb.value);
        });
        continentForm.onchange = () => {
            const selected = Array.from(continentForm.elements['continent']).filter(cb => cb.checked).map(cb => cb.value);
            if (window.setContinents) window.setContinents(selected);
            else if (window.flagfrenzy_setContinents) window.flagfrenzy_setContinents(selected);
            // Optionally, reload the game if in a game mode
            if (typeof initGame === 'function') initGame();
        };
    }

  
}); 

// Patch initGame to support correct round count for Hard and Extreme modes
const _initGameOriginal = initGame;
initGame = async function() {
    countries = await getCountries(settings.unOnly);
    const availableCountries = getFilteredFlags();
    if (state.mode === 'extreme') {
        state.score = 0; state.streak = 0; state.bestStreak = 0; state.questionNumber = 0; state.correctAnswers = 0; state.usedQuestions = [];
        state.availableCountries = availableCountries;
        state.totalQuestions = Math.min(availableCountries.length, 195);
        renderExtremeQuestion();
    } else if (state.mode === 'hard') {
        state.score = 0; state.streak = 0; state.bestStreak = 0; state.questionNumber = 0; state.correctAnswers = 0; state.usedQuestions = [];
        state.availableCountries = availableCountries;
        state.totalQuestions = Math.min(50, availableCountries.length);
        renderHardQuestion();
    } else {
        return _initGameOriginal.apply(this, arguments);
    }
} 