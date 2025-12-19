let selectedChampions = [];

function populateChampionModal() {
    if (!championData || championData.length === 0) return;

    const grid = document.getElementById('champion-grid');
    grid.innerHTML = '';

    championData.forEach(champ => {
        const item = document.createElement('div');
        item.className = 'champion-item';
        item.dataset.champId = champ.id;
        item.innerHTML = `
            <img src="${RIOT_CDN}/img/champion/${champ.id}.png" alt="${champ.name}">
            <span>${champ.name}</span>
        `;
        item.onclick = () => selectChampion(champ.id, champ.name);
        grid.appendChild(item);
    });
}

function selectChampion(champId, champName) {
    if (selectedChampions.length >= 3) {
        alert('最大3体まで選択できます');
        return;
    }

    if (selectedChampions.find(c => c.id === champId)) {
        alert('このチャンピオンは既に選択されています');
        return;
    }

    selectedChampions.push({ id: champId, name: champName });
    updateSelectedChampionsDisplay();
    closeChampionModal();
}

function removeChampion(champId) {
    selectedChampions = selectedChampions.filter(c => c.id !== champId);
    updateSelectedChampionsDisplay();
}

function updateSelectedChampionsDisplay() {
    const container = document.getElementById('selected-champions');
    container.innerHTML = '';

    selectedChampions.forEach(champ => {
        const badge = document.createElement('div');
        badge.className = 'selected-champ-badge';
        badge.innerHTML = `
            <img src="${RIOT_CDN}/img/champion/${champ.id}.png" alt="${champ.name}">
            <span>${champ.name}</span>
            <button type="button" onclick="removeChampion('${champ.id}')">×</button>
        `;
        container.appendChild(badge);
    });

    // Update hidden inputs
    document.getElementById('champ-1').value = selectedChampions[0]?.id || '';
    document.getElementById('champ-2').value = selectedChampions[1]?.id || '';
    document.getElementById('champ-3').value = selectedChampions[2]?.id || '';
}

function openChampionModal() {
    const modal = document.getElementById('champion-modal');
    modal.classList.add('open');
    populateChampionModal();
    updateChampionGridSelection();
}

function closeChampionModal() {
    const modal = document.getElementById('champion-modal');
    modal.classList.remove('open');
    document.getElementById('champion-search').value = '';
}

function updateChampionGridSelection() {
    const items = document.querySelectorAll('.champion-item');
    items.forEach(item => {
        const champId = item.dataset.champId;
        if (selectedChampions.find(c => c.id === champId)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}
