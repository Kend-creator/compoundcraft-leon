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

