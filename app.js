/**
 * LoL Team Builder - Core Logic
 */

// --- Data Models & Constants ---

const LANES = ['Top', 'Jg', 'Mid', 'ADC', 'Sup'];
const MAX_PLAYERS = 14;
const API_URL = "https://script.google.com/macros/s/AKfycbyYXbjAuq7tBnMyG1D4FIQdXRw3QP5rTLMiOy7ffeRaf3Rmaylk00e4andtwHt5ihjf/exec"; // User to replace this

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

// UI Elements (Global)
let drawer, form;
let pendingIconFile = null; // Store selected file


// --- Persistence (GAS) ---
const loadingOverlay = () => document.getElementById('loading-overlay');

async function uploadState() {
    if (API_URL === "YOUR_GAS_DEPLOY_URL" || !API_URL.startsWith('http')) {
        console.warn("API URL not set. Saving locally only.");
        localStorage.setItem('lol_builder_v1_state', JSON.stringify(state));
        return;
    }

    loadingOverlay().classList.remove('hidden');
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(state)
        });
    } catch (e) {
        console.error("Save failed", e);
        alert("保存に失敗しました");
    } finally {
        loadingOverlay().classList.add('hidden');
    }
}

async function fetchState() {
    if (API_URL === "YOUR_GAS_DEPLOY_URL" || !API_URL.startsWith('http')) {
        console.warn("API URL not set. Loading locally only.");
        const saved = localStorage.getItem('lol_builder_v1_state');
        if (saved) {
            state = JSON.parse(saved);
        }
        // Fallthrough to validation
    } else {
        loadingOverlay().classList.remove('hidden');
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            state = data;
        } catch (e) {
            console.error("Load failed", e);
            alert("読み込みに失敗しました");
        } finally {
            loadingOverlay().classList.add('hidden');
        }
    }

    // Comprehensive State Validation
    if (!state.players) state.players = [];
    if (!state.teams) state.teams = {};
    if (!state.teams.A) state.teams.A = { Top: null, Jg: null, Mid: null, ADC: null, Sup: null };
    if (!state.teams.B) state.teams.B = { Top: null, Jg: null, Mid: null, ADC: null, Sup: null };
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Initialize Globals
    drawer = document.getElementById('player-form-drawer');
    form = document.getElementById('player-form');

    await fetchState(); // Async Load
    renderPlayerGrid();
    renderTeamPanels();
    setupEventListeners();
}

// ... (rest of code) ...

// In assignPlayerToTeam
function assignPlayerToTeam(targetTeam, targetLane, playerId) {
    // ... existing logic ...
    // 3. Assign to new slot
    state.teams[targetTeam][targetLane] = playerId;

    uploadState(); // Save
    renderTeamPanels();
}





// --- Logic ---

function createPlayer(data) {
    return {
        id: Date.now().toString(), // Simple unique ID
        name: data.name,
        ratingTotal: parseInt(data.ratingTotal),
        favoriteLanes: data.favoriteLanes || [],
        favoriteChamps: data.favoriteChamps || "",
        iconUrl: data.iconUrl || "",
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

            let iconHtml = `<span class="slot-initials">${player.name.substring(0, 2).toUpperCase()}</span>`;
            if (player.iconUrl) {
                slot.classList.add('has-icon');
                iconHtml = `<img src="${player.iconUrl}" alt="${player.name}">`;
            } else {
                slot.classList.remove('has-icon');
            }


            slot.innerHTML = `
                <div class="slot-inner">
                    ${iconHtml}
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

    // Icon in Header
    const iconDiv = document.getElementById('detail-icon');
    if (player.iconUrl) {
        iconDiv.innerHTML = `<img src="${player.iconUrl}">`;
    } else {
        iconDiv.innerHTML = `<span class="default-icon">${player.name.charAt(0)}</span>`;
    }

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
                    suggestedMax: 2500 // Scale to rate?
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

    const meter = document.getElementById('tug-meter');
    if (statA.count === 0 && statB.count === 0) {
        textArea.textContent = "評価: 待機中 (メンバー未割り当て)";
        meter.classList.add('hidden');
        return;
    }

    const diff = Math.abs(statA.avg - statB.avg);
    // ... label logic ...
    let label = "";
    if (diff < 50) label = "ほぼ拮抗";
    else if (diff < 150) label = "やや拮抗";
    else label = "差あり";

    textArea.innerHTML = `
        Team A: ${statA.avg} / Team B: ${statB.avg}<br>
        <span style="color: var(--accent-gold)">差: ${diff} → ${label}</span>
    `;

    // Tug Logic
    meter.classList.remove('hidden');
    const total = statA.avg + statB.avg;
    const pctA = total > 0 ? (statA.avg / total) * 100 : 50;
    const pctB = 100 - pctA;

    document.getElementById('tug-bar-a').style.width = `${pctA}%`;
    document.getElementById('tug-bar-b').style.width = `${pctB}%`;

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

    uploadState();
    renderTeamPanels();
}

// Side Selection
// (Handler moved to setupEventListeners)

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    // Auto hide after 3s
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Form / Drawer Handling

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
        document.getElementById('input-champs').value = player.favoriteChamps;
        document.getElementById('input-icon-url').value = player.iconUrl || "";
        // Note: Cannot set file input value programmatically for security
        pendingIconFile = null;
        document.getElementById('input-icon').value = ""; // Reset file input


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

async function processFormSubmit(e) {
    e.preventDefault();
    loadingOverlay().classList.remove('hidden'); // Start Loading

    try {
        let iconUrl = document.getElementById('input-icon-url').value;

        // 1. Upload Image (if selected)
        if (pendingIconFile) {
            console.log("Uploading image...", pendingIconFile.name);
            const base64 = await readFileAsBase64(pendingIconFile);
            const uploadRes = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'upload',
                    fileData: base64,
                    fileName: pendingIconFile.name,
                    mimeType: pendingIconFile.type
                })
            });
            const uploadData = await uploadRes.json();
            if (uploadData.url) {
                iconUrl = uploadData.url;
                console.log("Upload success:", iconUrl);
            } else {
                console.warn("Upload response:", uploadData);
                throw new Error(uploadData.error || "Upload failed: Unknown error (check console)");
            }
        }

        // 2. Save Player Data
        const id = document.getElementById('form-player-id').value;
        const name = document.getElementById('input-name').value;
        const rate = document.getElementById('input-rate').value;
        const champs = document.getElementById('input-champs').value;

        const favLanes = [];
        document.querySelectorAll('input[name="fav-lane"]:checked').forEach(cb => {
            favLanes.push(cb.value);
        });
        const formattedFavs = favLanes.map(l => l.charAt(0).toUpperCase() + l.slice(1));

        const laneRates = {
            Top: document.getElementById('rate-top').value || null,
            Jg: document.getElementById('rate-jg').value || null,
            Mid: document.getElementById('rate-mid').value || null,
            ADC: document.getElementById('rate-adc').value || null,
            Sup: document.getElementById('rate-sup').value || null,
        };

        if (id) {
            const p = getPlayer(id);
            Object.assign(p, { name, ratingTotal: parseInt(rate), favoriteChamps: champs, favoriteLanes: formattedFavs, laneRatings: laneRates, iconUrl });
        } else {
            if (state.players.length >= MAX_PLAYERS) {
                alert('最大人数です');
                return;
            }
            state.players.push(createPlayer({
                name, ratingTotal: rate, favoriteChamps: champs, favoriteLanes: formattedFavs, laneRatings: laneRates, iconUrl
            }));
        }

        await uploadState(); // Save to Sheet
        renderPlayerGrid();
        renderTeamPanels();
        if (state.selectedPlayerId === id) renderPlayerDetail();

        drawer.classList.remove('open');

    } catch (err) {
        console.error(err);
        alert("エラーが発生しました: " + err.message);
    } finally {
        loadingOverlay().classList.add('hidden');
    }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove "data:image/png;base64," prefix for GAS
            const content = reader.result.split(',')[1];
            resolve(content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function setupEventListeners() {
    const closeBtn = document.getElementById('close-drawer');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (drawer) drawer.classList.remove('open');
        };
    }

    const editBtn = document.getElementById('edit-player-btn');
    if (editBtn) {
        editBtn.onclick = () => {
            openDrawer('edit');
        };
    }

    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.onclick = () => {
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

                uploadState();
                renderPlayerGrid();
                renderTeamPanels(); // Update team lists (remove option)
                renderPlayerDetail(); // Clear selection
                if (drawer) drawer.classList.remove('open');
            }
        };
    }

    if (form) {
        form.onsubmit = processFormSubmit;
    }

    const fileInput = document.getElementById('input-icon');
    if (fileInput) {
        fileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                pendingIconFile = e.target.files[0];
            }
        };
    }
}
