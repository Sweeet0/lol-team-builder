/**
 * LoL Team Builder - Core Logic
 */

// --- Data Models & Constants ---

const LANES = ['Top', 'Jg', 'Mid', 'ADC', 'Sup'];
const MAX_PLAYERS = 14;

// State
let state = {
    players: [], // Array of Player objects
    teams: {
        A: { Top: null, Jg: null, Mid: null, ADC: null, Sup: null },
        B: { Top: null, Jg: null, Mid: null, ADC: null, Sup: null }
    },
    side: null, // null | 'A-Blue' | 'B-Blue'
    selectedPlayerId: null
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderPlayerGrid();
    renderTeamPanels();
    setupEventListeners();
}

// --- Logic ---

function createPlayer(data) {
    return {
        id: Date.now().toString(), // Simple unique ID
        name: data.name,
        ratingTotal: parseInt(data.ratingTotal),
        favoriteLanes: data.favoriteLanes || [],
        favoriteChamps: data.favoriteChamps || "",
        laneRatings: data.laneRatings || { Top: null, Jg: null, Mid: null, ADC: null, Sup: null }
    };
}

function getPlayer(id) {
    return state.players.find(p => p.id === id);
}

// --- Rendering ---

function renderPlayerGrid() {
    const grid = document.getElementById('player-grid');
    grid.innerHTML = '';

    for (let i = 0; i < MAX_PLAYERS; i++) {
        const player = state.players[i];
        const slot = document.createElement('div');
        slot.className = 'player-slot';

        if (player) {
            slot.classList.add('filled');
            if (state.selectedPlayerId === player.id) {
                slot.classList.add('active');
            }
            slot.innerHTML = `
                <div class="slot-inner">
                    <span class="slot-initials">${player.name.substring(0, 2).toUpperCase()}</span>
                    <span class="slot-rate">${player.ratingTotal}</span>
                </div>
            `;
            slot.onclick = () => selectPlayer(player.id);
        } else {
            slot.innerHTML = `<span class="plus-icon">+</span>`;
            slot.onclick = () => openDrawer('create');
        }
        grid.appendChild(slot);
    }
}

function renderTeamPanels() {
    renderTeam('A');
    renderTeam('B');
    updateBalanceDisplay();
    updateSideStyles();
}

function renderTeam(teamKey) { // 'A' or 'B'
    const container = document.getElementById(`team-${teamKey.toLowerCase()}-lanes`);
    container.innerHTML = '';

    // Calculate Average
    let totalRate = 0;
    let count = 0;

    LANES.forEach(lane => {
        const playerId = state.teams[teamKey][lane];

        // Row
        const row = document.createElement('div');
        row.className = 'lane-row';

        // Icon
        const iconInfo = document.createElement('div');
        iconInfo.className = 'lane-icon';
        iconInfo.textContent = lane.substring(0, 1); // T, J, M...

        // Select
        const select = document.createElement('select');
        select.className = 'player-select';

        // Options: Default + All Players
        const defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.textContent = "未選択";
        select.appendChild(defaultOpt);

        state.players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.ratingTotal})`;
            if (p.id === playerId) opt.selected = true;
            select.appendChild(opt);
        });

        // Event: Assign Player
        select.onchange = (e) => assignPlayerToTeam(teamKey, lane, e.target.value);

        row.appendChild(iconInfo);
        row.appendChild(select);
        container.appendChild(row);

        // Stats accumulation
        if (playerId) {
            const p = getPlayer(playerId);
            if (p) {
                totalRate += p.ratingTotal;
                count++;
            }
        }
    });

    const avg = count > 0 ? Math.round(totalRate / count) : '-';
    document.getElementById(`team-${teamKey.toLowerCase()}-avg`).textContent = avg;
}

function renderPlayerDetail() {
    const card = document.getElementById('player-detail-card');
    const content = card.querySelector('.detail-content');
    const placeholder = card.querySelector('.placeholder-text');

    if (!state.selectedPlayerId) {
        content.classList.add('hidden');
        placeholder.classList.remove('hidden');
        return;
    }

    const player = getPlayer(state.selectedPlayerId);
    if (!player) return; // Should not happen

    placeholder.classList.add('hidden');
    content.classList.remove('hidden');

    document.getElementById('detail-name').textContent = player.name;
    document.getElementById('detail-rate').textContent = `Rate: ${player.ratingTotal}`;
    document.getElementById('detail-lanes').textContent = player.favoriteLanes.join(', ') || '-';
    document.getElementById('detail-champs').textContent = player.favoriteChamps || '-';

    // Chart update placeholder
    updateChart(player);
}

let radarChart = null;
function updateChart(player) {
    const ctx = document.getElementById('rate-chart');
    if (!window.Chart) return;

    // Mock data if specific lane ratings missing, or use Total for all
    // In V1 prompt, laneRatings are optional. If null, we might show 0 or flat.
    const dataValues = LANES.map(l => player.laneRatings[l] || 0);

    if (radarChart) radarChart.destroy();

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: LANES,
            datasets: [{
                label: 'Competency',
                data: dataValues,
                fill: true,
                backgroundColor: 'rgba(88, 166, 255, 0.2)',
                borderColor: 'rgb(88, 166, 255)',
                pointBackgroundColor: 'rgb(88, 166, 255)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(88, 166, 255)'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: {
                        color: '#f0f6fc',
                        font: { size: 14 }
                    },
                    ticks: {
                        backdropColor: 'transparent', /* Fixes "White Box" issue */
                        color: 'rgba(255, 255, 255, 0.5)',
                        showLabelBackdrop: false
                    },
                    suggestedMin: 0,
                    suggestedMax: 2000 // Scale to rate?
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateBalanceDisplay() {
    // Calculate Averages needed
    const getAvg = (team) => {
        let sum = 0, c = 0;
        Object.values(team).forEach(pid => {
            if (pid) {
                const p = getPlayer(pid);
                if (p) { sum += p.ratingTotal; c++; }
            }
        });
        return { avg: c > 0 ? Math.round(sum / c) : 0, count: c };
    };

    const statA = getAvg(state.teams.A);
    const statB = getAvg(state.teams.B);

    const textArea = document.getElementById('balance-text');

    if (statA.count === 0 && statB.count === 0) {
        textArea.textContent = "評価: 待機中 (メンバー未割り当て)";
        return;
    }

    const diff = Math.abs(statA.avg - statB.avg);
    let label = "";
    if (diff < 50) label = "ほぼ拮抗";
    else if (diff < 150) label = "やや拮抗";
    else label = "差あり";

    textArea.innerHTML = `
        Team A: ${statA.avg} / Team B: ${statB.avg}<br>
        <span style="color: var(--accent-gold)">差: ${diff} → ${label}</span>
    `;

    // Warning
    const warnArea = document.getElementById('balance-warning');
    if (statA.count !== statB.count) {
        warnArea.textContent = `人数不均衡 (A:${statA.count} vs B:${statB.count})`;
        warnArea.classList.remove('hidden');
    } else {
        warnArea.classList.add('hidden');
    }
}

function updateSideStyles() {
    const panelA = document.getElementById('team-a-panel');
    const panelB = document.getElementById('team-b-panel');

    panelA.classList.remove('side-blue', 'side-red');
    panelB.classList.remove('side-blue', 'side-red');

    if (state.side === 'A-Blue') {
        panelA.classList.add('side-blue');
        panelB.classList.add('side-red');
    } else if (state.side === 'B-Blue') {
        panelA.classList.add('side-red');
        panelB.classList.add('side-blue');
    }
}

// --- Actions ---

function selectPlayer(id) {
    state.selectedPlayerId = id;
    renderPlayerGrid(); // update active outline
    renderPlayerDetail();
}

function assignPlayerToTeam(targetTeam, targetLane, playerId) {
    // 1. If we selected "None" (empty string)
    if (!playerId) {
        state.teams[targetTeam][targetLane] = null;
        renderTeamPanels();
        return;
    }

    // 2. Conflict Handling: Remove this player from ANY other slot
    ['A', 'B'].forEach(t => {
        LANES.forEach(l => {
            if (state.teams[t][l] === playerId) {
                state.teams[t][l] = null;
            }
        });
    });

    // 3. Assign to new slot
    state.teams[targetTeam][targetLane] = playerId;

    renderTeamPanels();
}

// Side Selection
document.getElementById('side-select-btn').onclick = () => {
    // Randomize
    const isABlue = Math.random() < 0.5;
    state.side = isABlue ? 'A-Blue' : 'B-Blue';
    updateSideStyles();
};

// Form / Drawer Handling
const drawer = document.getElementById('player-form-drawer');
const form = document.getElementById('player-form');

function openDrawer(mode) { // 'create' or 'edit'
    drawer.classList.add('open');
    form.reset();

    if (mode === 'create') {
        document.getElementById('form-title').textContent = "新規プレイヤー";
        document.getElementById('form-player-id').value = "";
        document.getElementById('delete-btn').classList.add('hidden');
    } else if (mode === 'edit') {
        const player = getPlayer(state.selectedPlayerId);
        if (!player) return;

        console.log("Edit Mode for", player);
        document.getElementById('form-title').textContent = "プレイヤー編集";
        document.getElementById('form-player-id').value = player.id;
        document.getElementById('input-name').value = player.name;
        document.getElementById('input-rate').value = player.ratingTotal;
        document.getElementById('input-champs').value = player.favoriteChamps;

        // checkboxes
        document.querySelectorAll('input[name="fav-lane"]').forEach(cb => {
            cb.checked = player.favoriteLanes.includes(cb.value);
        });

        // Advanced rates
        document.getElementById('rate-top').value = player.laneRatings.Top || '';
        document.getElementById('rate-jg').value = player.laneRatings.Jg || '';
        document.getElementById('rate-mid').value = player.laneRatings.Mid || '';
        document.getElementById('rate-adc').value = player.laneRatings.ADC || '';
        document.getElementById('rate-sup').value = player.laneRatings.Sup || '';

        document.getElementById('delete-btn').classList.remove('hidden');
    }
}

document.getElementById('close-drawer').onclick = () => {
    drawer.classList.remove('open');
};

document.getElementById('edit-player-btn').onclick = () => {
    openDrawer('edit');
};

document.getElementById('delete-btn').onclick = () => {
    const id = document.getElementById('form-player-id').value;
    if (confirm('削除しますか？')) {
        state.players = state.players.filter(p => p.id !== id);
        if (state.selectedPlayerId === id) state.selectedPlayerId = null;

        // Remove from teams
        ['A', 'B'].forEach(t => {
            LANES.forEach(l => {
                if (state.teams[t][l] === id) state.teams[t][l] = null;
            });
        });

        renderPlayerGrid();
        renderTeamPanels(); // Update team lists (remove option)
        renderPlayerDetail(); // Clear selection
        drawer.classList.remove('open');
    }
};

form.onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('form-player-id').value;
    const name = document.getElementById('input-name').value;
    const rate = document.getElementById('input-rate').value;
    const champs = document.getElementById('input-champs').value;

    const favLanes = [];
    document.querySelectorAll('input[name="fav-lane"]:checked').forEach(cb => {
        favLanes.push(cb.value); // top, jg...
    });
    // Format favLanes to match case 'Top' etc if needed, but value is lowercase. 
    // Let's capitalize for display consistency
    const formattedFavs = favLanes.map(l => l.charAt(0).toUpperCase() + l.slice(1));

    const laneRates = {
        Top: document.getElementById('rate-top').value || null,
        Jg: document.getElementById('rate-jg').value || null,
        Mid: document.getElementById('rate-mid').value || null,
        ADC: document.getElementById('rate-adc').value || null,
        Sup: document.getElementById('rate-sup').value || null,
    };

    if (id) {
        // Update
        const p = getPlayer(id);
        p.name = name;
        p.ratingTotal = parseInt(rate);
        p.favoriteChamps = champs;
        p.favoriteLanes = formattedFavs;
        p.laneRatings = laneRates;
    } else {
        // Create
        if (state.players.length >= MAX_PLAYERS) {
            alert('最大人数です');
            return;
        }
        const newP = createPlayer({
            name, ratingTotal: rate, favoriteChamps: champs, favoriteLanes: formattedFavs, laneRatings: laneRates
        });
        state.players.push(newP);
    }

    renderPlayerGrid();
    renderTeamPanels(); // Update dropdowns
    if (state.selectedPlayerId === id) renderPlayerDetail(); // Update detail if editing active

    drawer.classList.remove('open');
};
