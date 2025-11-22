/**
 * DONOR DASHBOARD LOGIC
 * Connects to the shared 'Cloud' (LocalStorage) to find Hospital requests.
 */

// --- 1. SESSION MANAGEMENT ---
const session = JSON.parse(localStorage.getItem('lifelink_donor_session'));
if (!session) {
    // In real app: Redirect to login
    // window.location.href = 'login_form_donor.html';
}

// --- 2. CONFIGURATION ---
// Use session data or fallback to demo data
const DONOR_DATA = session || {
    id: "D-101", 
    name: "Rahul Sharma", 
    bloodGroup: "A+", 
    lat: 12.965, // Approx (near Domlur)
    lng: 77.65
};

// --- 3. HELPER: Geofencing Math ---
function getDist(lat1, lon1, lat2, lon2) {
    var R = 6371; 
    var dLat = (lat2-lat1) * (Math.PI/180);
    var dLon = (lon2-lon1) * (Math.PI/180);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180)) * Math.cos(lat2*(Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- 4. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Populate UI with Session Data
    if(document.getElementById('header-name')) document.getElementById('header-name').innerText = DONOR_DATA.name;
    if(document.getElementById('sidebar-name')) document.getElementById('sidebar-name').innerText = DONOR_DATA.name;
    if(document.getElementById('sidebar-blood')) document.getElementById('sidebar-blood').innerText = DONOR_DATA.bloodGroup + " Donor";
    if(document.getElementById('my-blood-group')) document.getElementById('my-blood-group').innerText = DONOR_DATA.bloodGroup;
    if(document.getElementById('avatar-initial')) document.getElementById('avatar-initial').innerText = DONOR_DATA.name.charAt(0);

    // Start Polling for Requests
    setInterval(checkForRequests, 2000);
});

// --- 5. POLLING LOGIC ---
function checkForRequests() {
    const statusToggle = document.getElementById('status-toggle');
    const statusText = document.getElementById('status-text');
    
    if(statusToggle) {
        statusText.innerText = statusToggle.checked ? "Available" : "Offline";
        if (!statusToggle.checked) return; // Don't scan if offline
    }

    const allRequests = JSON.parse(localStorage.getItem('lifelink_requests')) || [];
    const radar = document.getElementById('radar-container');
    const feed = document.getElementById('alert-feed');
    const badge = document.getElementById('alert-badge');

    // FILTER LOGIC:
    const myRequests = allRequests.filter(req => {
        // 1. Calculate Distance
        const hLat = req.hospitalLat || 12.9606;
        const hLng = req.hospitalLon || 77.6416;
        const dist = getDist(DONOR_DATA.lat, DONOR_DATA.lng, hLat, hLng);
        req.distanceCalc = dist.toFixed(1);

        // 2. Match Blood Group (FIXED KEY READ)
        // Reads 'bloodGroup' (preferred) or 'group' (fallback)
        const reqBlood = req.bloodGroup || req.group;
        const bgMatch = reqBlood === DONOR_DATA.bloodGroup;
        
        // 3. Check if I already accepted it
        const iAccepted = req.acceptedDonors && req.acceptedDonors.includes(DONOR_DATA.id);

        // Show if: (Match AND Nearby) OR (I already accepted it)
        return (bgMatch && dist <= 10) || iAccepted;
    });

    if (myRequests.length > 0) {
        if(radar) radar.classList.add('hidden');
        if(feed) feed.classList.remove('hidden');
        if(badge) {
            badge.classList.remove('hidden');
            badge.innerText = myRequests.length;
        }
        renderFeed(myRequests);
    } else {
        if(radar) radar.classList.remove('hidden');
        if(feed) feed.classList.add('hidden');
        if(badge) badge.classList.add('hidden');
    }
}

// --- 6. RENDER FEED ---
function renderFeed(requests) {
    const feed = document.getElementById('alert-feed');
    feed.innerHTML = ''; // Clear current

    requests.forEach(req => {
        const iAccepted = req.acceptedDonors && req.acceptedDonors.includes(DONOR_DATA.id);
        
        // Dynamic Card Styling
        let cardHtml = '';
        
        if (iAccepted) {
            // STATE: ACCEPTED / EN ROUTE
            cardHtml = `
            <div class="bg-white rounded-2xl shadow-lg border-l-8 border-green-500 overflow-hidden card-enter p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">ACCEPTED</span>
                        <h3 class="text-2xl font-bold text-gray-800">${req.hospitalName || "Manipal Hospital"}</h3>
                        <p class="text-gray-500 text-sm">Navigation Active • ${req.distanceCalc} km</p>
                    </div>
                    <div class="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 text-xl animate-pulse">
                        <i class="fa-solid fa-location-arrow"></i>
                    </div>
                </div>
                <div class="bg-green-50 rounded-xl p-4 mb-4 border border-green-100">
                    <p class="text-sm text-green-800 font-medium"><strong>Instructions:</strong> Please proceed to the Emergency Ward reception. Show your Donor ID: <strong>${DONOR_DATA.id}</strong>.</p>
                </div>
                <button class="w-full py-3 bg-gray-100 text-gray-400 font-bold rounded-xl cursor-not-allowed">
                    <i class="fa-solid fa-check"></i> You are En Route
                </button>
            </div>`;
        } else {
            // STATE: INCOMING ALERT
            // Ensure blood group is displayed here clearly
            const displayBlood = req.bloodGroup || req.group || "";

            cardHtml = `
            <div class="bg-white rounded-2xl shadow-xl border-l-8 border-red-500 overflow-hidden card-enter relative">
                <div class="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">URGENT</div>
                <div class="p-6">
                    <div class="flex items-start gap-4 mb-4">
                        <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 text-2xl shrink-0">
                            <i class="fa-solid fa-hospital"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-900">${req.hospitalName || "Manipal Hospital"}</h3>
                            <p class="text-sm text-gray-500">${req.distanceCalc} km away • ${req.urgency}hr Window</p>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 mb-6">
                        <span class="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">Patient Critical</span>
                        <span class="px-3 py-1 bg-red-50 rounded-lg text-xs font-bold text-red-600">${req.component}</span>
                        <!-- ADDED: Explicit Blood Group Display -->
                        <span class="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold">${displayBlood}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <button class="py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50">Decline</button>
                        <button onclick="acceptRequest('${req.id}')" class="py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-transform active:scale-95">
                            Accept & Go
                        </button>
                    </div>
                </div>
            </div>`;
        }

        feed.innerHTML += cardHtml;
    });
}

// --- 7. ACTION HANDLERS ---
window.acceptRequest = function(reqId) {
    const requests = JSON.parse(localStorage.getItem('lifelink_requests'));
    const reqIndex = requests.findIndex(r => r.id === reqId);
    
    if (reqIndex !== -1) {
        if (!requests[reqIndex].acceptedDonors) {
            requests[reqIndex].acceptedDonors = [];
        }
        
        // Add ID to list
        if(!requests[reqIndex].acceptedDonors.includes(DONOR_DATA.id)) {
            requests[reqIndex].acceptedDonors.push(DONOR_DATA.id);
        }
        
        // Save back to 'Cloud'
        localStorage.setItem('lifelink_requests', JSON.stringify(requests));
        
        // Force refresh UI
        checkForRequests();
        
        // Optional: Notify
        alert("Thank you! The hospital has been notified of your arrival.");
    }
};

window.logout = function() {
    localStorage.removeItem('lifelink_donor_session');
    window.location.href = 'login_form_donor.html'; 
};