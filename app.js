const API_URL = "https://api-compoundfinder-leon.vercel.app";
const API_KEY = "student-api-key-123";
const FETCH_OPTIONS = { headers: { "x-api-key": API_KEY } };

const STORAGE_KEY = "compoundcraft_discovered";

let allCompounds = [];
let discoveredIds = new Set();
let bench = {}; // { symbol: count }

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

        buildPeriodicTable(allCompounds);
        renderDiscoveryLog();
        updateProgressTag();
    }
    catch (error) {
        console.error(error);
        document.getElementById("periodicTable").innerHTML =
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
// PERIODIC TABLE LAYOUT
// (Compact row strings, not 118 separate position objects.
//  "." marks an empty cell in that 18-column row.)
// ===========================================================
const PERIODIC_ROWS = [
    "H,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,.,He",
    "Li,Be,.,.,.,.,.,.,.,.,.,.,B,C,N,O,F,Ne",
    "Na,Mg,.,.,.,.,.,.,.,.,.,.,Al,Si,P,S,Cl,Ar",
    "K,Ca,Sc,Ti,V,Cr,Mn,Fe,Co,Ni,Cu,Zn,Ga,Ge,As,Se,Br,Kr",
    "Rb,Sr,Y,Zr,Nb,Mo,Tc,Ru,Rh,Pd,Ag,Cd,In,Sn,Sb,Te,I,Xe",
    "Cs,Ba,La,Hf,Ta,W,Re,Os,Ir,Pt,Au,Hg,Tl,Pb,Bi,Po,At,Rn",
    "Fr,Ra,Ac,Rf,Db,Sg,Bh,Hs,Mt,Ds,Rg,Cn,Nh,Fl,Mc,Lv,Ts,Og"
].map(row => row.split(","));

const LANTHANIDES = "La,Ce,Pr,Nd,Pm,Sm,Eu,Gd,Tb,Dy,Ho,Er,Tm,Yb,Lu".split(",");
const ACTINIDES = "Ac,Th,Pa,U,Np,Pu,Am,Cm,Bk,Cf,Es,Fm,Md,No,Lr".split(",");

// ===========================================================
// PERIODIC TABLE RENDER
// ===========================================================
function buildPeriodicTable(compounds) {
    const container = document.getElementById("periodicTable");
    const elementNames = new Map(); // symbol -> element name, only for active ones

    compounds.forEach(compound => {
        compound.composition.forEach(c => {
            if (!elementNames.has(c.symbol)) elementNames.set(c.symbol, c.element);
        });
    });

    document.getElementById("activeCount").textContent = elementNames.size;

    container.innerHTML = "";

    // Main 7 periods
    PERIODIC_ROWS.forEach(row => {
        row.forEach(symbol => {
            container.appendChild(buildCell(symbol, elementNames));
        });
    });

    // Spacer before the f-block rows
    const spacer = document.createElement("div");
    spacer.className = "pt-spacer-row";
    container.appendChild(spacer);

    // Lanthanides / Actinides, offset to start at column 3
    appendFBlockRow(container, LANTHANIDES, elementNames);
    appendFBlockRow(container, ACTINIDES, elementNames);
}

function appendFBlockRow(container, symbols, elementNames) {
    // Two empty cells so the row visually starts at column 3,
    // matching where La/Ac sit in the main table above.
    container.appendChild(buildCell(".", elementNames));
    container.appendChild(buildCell(".", elementNames));
    symbols.forEach(symbol => {
        container.appendChild(buildCell(symbol, elementNames));
    });
}

function buildCell(symbol, elementNames) {
    if (symbol === ".") {
        const blank = document.createElement("div");
        return blank; // empty grid cell, no tile
    }

    const isActive = elementNames.has(symbol);
    const tile = document.createElement("div");
    tile.className = `element-tile ${isActive ? "" : "inactive"}`;
    tile.title = isActive ? elementNames.get(symbol) : `${symbol} (not in current dataset)`;

    tile.innerHTML = `
        <span class="symbol">${symbol}</span>
        ${isActive ? `<span class="el-name">${elementNames.get(symbol)}</span>` : ""}
    `;

    if (isActive) {
        tile.addEventListener("click", () => addToBench(symbol));
    }

    return tile;
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

// ===========================================================
// REVEAL MODAL
// ===========================================================
function showReveal(compound, isNewDiscovery) {
    const props = compound.physicalProperties;
    const content = document.getElementById("revealContent");

    content.innerHTML = `
        <div class="reveal-card">
            ${isNewDiscovery ? '<p class="reveal-tag">New discovery</p>' : ""}
            <div class="reveal-formula">${compound.formula}</div>
            <h3 id="revealTitle">${compound.name}</h3>

            <div class="reveal-props">
                <div><span>State</span>${props.state}</div>
                <div><span>Molar mass</span>${props.molarMass} g/mol</div>
                <div><span>Melting point</span>${props.meltingPointCelsius ?? "N/A"} &deg;C</div>
                <div><span>Boiling point</span>${props.boilingPointCelsius ?? "N/A"} &deg;C</div>
            </div>

            <p class="reveal-description">${compound.description}</p>
        </div>
    `;

    const overlay = document.getElementById("revealOverlay");
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("visible"));
}

function closeReveal() {
    const overlay = document.getElementById("revealOverlay");
    overlay.classList.remove("visible");
    setTimeout(() => { overlay.hidden = true; }, 200);
}

document.getElementById("revealOverlay").addEventListener("click", (e) => {
    if (e.target.id === "revealOverlay") closeReveal();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeReveal();
});

// ===========================================================
// CONTROLS
// ===========================================================
document.getElementById("clearBtn").addEventListener("click", clearBench);
document.getElementById("hintBtn").addEventListener("click", giveHint);

init();
