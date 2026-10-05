const API_URL = "https://api-compoundfinder-leon.vercel.app";
const API_KEY = "student-api-key-123";
const FETCH_OPTIONS = { headers: { "x-api-key": API_KEY } };

const STORAGE_KEY = "compoundcraft_discovered";

let allCompounds = [];
let discoveredIds = new Set();
let bench = {};

// ===========================================================
// LOAD DATA
// ===========================================================
async function init() {
    loadDiscoveredFromStorage();

    try {
        const response = await fetch(`${API_URL}/api/v1/compounds`, FETCH_OPTIONS);
        if (!response.ok) throw new Error("API request failed.");
        const data = await response.json();
        allCompounds = data.compounds;

        buildElementTray(allCompounds);
        renderDiscoveryLog();
        updateProgressTag();
    }
    catch (error) {
        console.error(error);
        document.getElementById("elementTray").innerHTML =
            '<p class="status-text">Unable to connect to the API.</p>';
        document.getElementById("discoveryLog").innerHTML =
            '<p class="status-text">Unable to connect to the API.</p>';
    }
}

// ===========================================================
// LOCAL STORAGE (per-browser progress, not shared)
// ===========================================================
function loadDiscoveredFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        discoveredIds = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (error) {
        console.error("Could not read saved progress:", error);
        discoveredIds = new Set();
    }
}

function saveDiscoveredToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...discoveredIds]));
    } catch (error) {
        console.error("Could not save progress:", error);
    }
}

// ===========================================================
// ELEMENT TRAY
// ===========================================================
function buildElementTray(compounds) {
    const tray = document.getElementById("elementTray");
    const seen = new Map(); // symbol -> element name

    compounds.forEach(compound => {
        compound.composition.forEach(c => {
            if (!seen.has(c.symbol)) seen.set(c.symbol, c.element);
        });
    });

    const symbols = [...seen.keys()].sort();

    tray.innerHTML = "";
    symbols.forEach(symbol => {
        const tile = document.createElement("div");
        tile.className = "element-tile";
        tile.innerHTML = `
            <span class="symbol">${symbol}</span>
            <span class="el-name">${seen.get(symbol)}</span>
        `;
        tile.addEventListener("click", () => addToBench(symbol));
        tray.appendChild(tile);
    });
}

// ===========================================================
// BENCH LOGIC
// ===========================================================
function addToBench(symbol) {
    bench[symbol] = (bench[symbol] || 0) + 1;
    renderBench();
    checkForMatch();
}

function removeFromBench(symbol) {
    if (!bench[symbol]) return;
    bench[symbol] -= 1;
    if (bench[symbol] <= 0) delete bench[symbol];
    renderBench();
    checkForMatch();
}

function clearBench() {
    bench = {};
    renderBench();
    setStatus("", false);
}

function renderBench() {
    const slots = document.getElementById("benchSlots");
    const symbols = Object.keys(bench);

    if (symbols.length === 0) {
        slots.innerHTML = '<p class="bench-placeholder">Click elements above to place them here</p>';
        return;
    }

    slots.innerHTML = "";
    symbols.sort().forEach(symbol => {
        const chip = document.createElement("div");
        chip.className = "bench-chip";
        chip.innerHTML = `<span>${symbol} &times; ${bench[symbol]}</span>`;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "\u2212";
        removeBtn.setAttribute("aria-label", `Remove one ${symbol}`);
        removeBtn.addEventListener("click", () => removeFromBench(symbol));

        chip.appendChild(removeBtn);
        slots.appendChild(chip);
    });
}

// ===========================================================
// MATCHING
// ===========================================================
function compositionSignature(compositionArray) {
    const map = {};
    compositionArray.forEach(c => { map[c.symbol] = c.atoms; });
    return JSON.stringify(Object.keys(map).sort().map(k => `${k}:${map[k]}`));
}

function benchSignature() {
    return JSON.stringify(Object.keys(bench).sort().map(k => `${k}:${bench[k]}`));
}

function checkForMatch() {
    const symbolCount = Object.keys(bench).length;
    if (symbolCount === 0) {
        setStatus("", false);
        return;
    }

    const signature = benchSignature();
    const match = allCompounds.find(c => compositionSignature(c.composition) === signature);

    if (match) {
        discover(match);
        return;
    }

    setStatus("No match yet \u2014 keep experimenting...", false);
}

// ===========================================================
// DISCOVERY
// ===========================================================
function discover(compound) {
    const isNew = !discoveredIds.has(compound.id);
    if (isNew) {
        discoveredIds.add(compound.id);
        saveDiscoveredToStorage();
        renderDiscoveryLog();
        updateProgressTag();
    }

    setStatus(`Match found \u2014 that's ${compound.name}!`, true);
    showReveal(compound, isNew);

    bench = {};
    renderBench();
}

function setStatus(message, success) {
    const el = document.getElementById("benchStatus");
    el.textContent = message;
    el.classList.toggle("success", success);
}

// ===========================================================
// DISCOVERY LOG
// ===========================================================
function renderDiscoveryLog() {
    const log = document.getElementById("discoveryLog");
    log.innerHTML = "";

    allCompounds.forEach(compound => {
        const unlocked = discoveredIds.has(compound.id);
        const card = document.createElement("div");
        card.className = `log-card ${unlocked ? "unlocked" : "locked"}`;
        card.innerHTML = `
            <div class="log-formula">${unlocked ? compound.formula : "?????"}</div>
            <div class="log-name">${unlocked ? compound.name : "Undiscovered"}</div>
        `;
        if (unlocked) {
            card.addEventListener("click", () => showReveal(compound, false));
        }
        log.appendChild(card);
    });
}

function updateProgressTag() {
    document.getElementById("progressTag").textContent =
        `${discoveredIds.size} / ${allCompounds.length} discovered`;
}

// ===========================================================
// HINT
// ===========================================================
function giveHint() {
    const undiscovered = allCompounds.filter(c => !discoveredIds.has(c.id));
    if (undiscovered.length === 0) {
        setStatus("You've discovered every compound!", true);
        return;
    }

    const target = undiscovered[Math.floor(Math.random() * undiscovered.length)];
    const element = target.composition[Math.floor(Math.random() * target.composition.length)];
    setStatus(`Hint: one undiscovered compound contains ${element.element} (${element.symbol}).`, false);
}

