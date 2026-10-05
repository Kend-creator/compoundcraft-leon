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

