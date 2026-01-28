// ==========================================
// JOERIE'S SHOWS - JAVASCRIPT MET FIREBASE
// ==========================================

// ==========================================
// FIREBASE CONFIGURATIE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBWBfyXl7qSt0N-1j0CGCxMl6j25ofIobM",
    authDomain: "joerie-shows.firebaseapp.com",
    databaseURL: "https://joerie-shows-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "joerie-shows",
    storageBucket: "joerie-shows.firebasestorage.app",
    messagingSenderId: "712172161062",
    appId: "1:712172161062:web:68a9ec9c45b38a9d1d3ee7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// ==========================================
// MIJN KAARTJES - LOKALE + FIREBASE OPSLAG
// ==========================================
let allSoldTickets = [];
let currentDashboardFilter = 'all';

function getMyTickets() {
    const tickets = localStorage.getItem('joerie_tickets');
    return tickets ? JSON.parse(tickets) : [];
}

function saveTicket(show, buyerName) {
    const ticketId = 'JOERI-' + Date.now().toString(36).toUpperCase();
    const newTicket = {
        id: ticketId,
        showId: show.id,
        showName: show.name,
        showImage: show.image || null,
        buyerName: buyerName,
        purchaseDate: new Date().toLocaleDateString('nl-NL'),
        purchaseTime: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        scanned: false
    };

    // Lokaal opslaan voor de koper
    const tickets = getMyTickets();
    tickets.push(newTicket);
    localStorage.setItem('joerie_tickets', JSON.stringify(tickets));
    renderMyTickets();

    // Firebase opslaan voor het dashboard
    database.ref('soldTickets/' + ticketId).set(newTicket);

    return newTicket;
}

function loadTicketsDashboard() {
    database.ref('soldTickets').orderByChild('timestamp').on('value', (snapshot) => {
        allSoldTickets = [];
        snapshot.forEach((child) => {
            allSoldTickets.unshift(child.val()); // Nieuwste eerst
        });
        renderTicketsDashboard();
    });
}

function renderTicketsDashboard() {
    const container = document.getElementById('tickets-dashboard-list');
    const totalEl = document.getElementById('total-tickets-sold');
    const scannedEl = document.getElementById('tickets-scanned');
    const pendingEl = document.getElementById('tickets-pending');

    const scannedCount = allSoldTickets.filter(t => t.scanned).length;
    const pendingCount = allSoldTickets.filter(t => !t.scanned).length;

    totalEl.textContent = allSoldTickets.length;
    scannedEl.textContent = scannedCount;
    pendingEl.textContent = pendingCount;

    // Filter toepassen
    let filtered = allSoldTickets;
    if (currentDashboardFilter === 'scanned') {
        filtered = allSoldTickets.filter(t => t.scanned);
    } else if (currentDashboardFilter === 'pending') {
        filtered = allSoldTickets.filter(t => !t.scanned);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">Geen kaartjes gevonden</p>';
        return;
    }

    container.innerHTML = filtered.map(ticket => `
        <div class="ticket-dashboard-item ${ticket.scanned ? 'scanned' : 'pending'}">
            ${ticket.showImage
                ? `<img src="${ticket.showImage}" class="ticket-thumb" alt="${ticket.showName}">`
                : `<div class="ticket-thumb">🎭</div>`
            }
            <div class="ticket-details">
                <h4><span class="ticket-buyer">${escapeHtml(ticket.buyerName)}</span></h4>
                <div class="ticket-show-name">🎭 ${escapeHtml(ticket.showName)}</div>
                <div class="ticket-meta">🎫 ${ticket.id} • 📅 ${ticket.purchaseDate} ${ticket.purchaseTime}</div>
            </div>
            <div class="ticket-status ${ticket.scanned ? 'scanned' : 'pending'}">
                ${ticket.scanned ? '✓ Gescand' : '⏳ Wacht'}
            </div>
        </div>
    `).join('');
}

function markTicketAsScanned(ticketId) {
    database.ref('soldTickets/' + ticketId + '/scanned').set(true);
    database.ref('soldTickets/' + ticketId + '/scannedAt').set(new Date().toLocaleString('nl-NL'));
}

function renderMyTickets() {
    const container = document.getElementById('my-tickets-container');
    const tickets = getMyTickets();

    if (tickets.length === 0) {
        container.innerHTML = '<p class="empty-tickets-message">Je hebt nog geen kaartjes gekocht.</p>';
        return;
    }

    container.innerHTML = tickets.map(ticket => `
        <div class="my-ticket-card" onclick="showMyTicket('${ticket.id}')">
            ${ticket.showImage
                ? `<img src="${ticket.showImage}" class="my-ticket-image" alt="${ticket.showName}">`
                : `<div class="my-ticket-image">🎭</div>`
            }
            <div class="my-ticket-info">
                <h4>${ticket.showName}</h4>
                <p>🎫 ${ticket.id}</p>
                <p>📅 ${ticket.purchaseDate} om ${ticket.purchaseTime}</p>
            </div>
            <div class="my-ticket-arrow">➤</div>
        </div>
    `).join('');
}

function showMyTicket(ticketId) {
    const tickets = getMyTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Vul de ticket modal in
    document.getElementById('ticket-show-name').textContent = ticket.showName;

    const ticketImage = document.querySelector('.ticket-image');
    if (ticket.showImage) {
        ticketImage.src = ticket.showImage;
    } else {
        ticketImage.src = 'kist.jfif';
    }

    // Genereer QR code voor dit kaartje
    generateTicketQRForId(ticket);

    // Toon de modal
    document.getElementById('ticket-modal').classList.remove('hidden');
    playClickSound();
}

function generateTicketQRForId(ticket) {
    const canvas = document.getElementById('ticket-qr-code');
    const qrData = JSON.stringify({
        show: ticket.showName,
        ticketId: ticket.id,
        date: ticket.purchaseDate,
        valid: true
    });

    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(canvas, qrData, {
            width: 120,
            margin: 2,
            color: {
                dark: '#cc0000',
                light: '#ffffff'
            }
        }, function(error) {
            if (error) console.error('QR code error:', error);
        });
    }
}

// ==========================================
// SPLASH SCREEN
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');

    // Na 3.5 seconden de splash screen verbergen en content tonen
    setTimeout(function() {
        splashScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        // Speel een welkomst geluidje
        playClickSound();
    }, 3500);

    // Initialiseer de app
    initApp();
});

// ==========================================
// APP INITIALISATIE
// ==========================================
function initApp() {
    setupAuthListener();
    loadShowsFromFirebase();
    loadEarningsFromFirebase();
    loadSounds();
    setupEventListeners();

    // Laad nieuwe features veilig (zodat een fout niet alles breekt)
    try { loadApplauseCount(); } catch(e) { console.error('Applaus laden mislukt:', e); }
    try { loadCountdown(); } catch(e) { console.error('Countdown laden mislukt:', e); }
    try { loadGuestbook(); } catch(e) { console.error('Gastenboek laden mislukt:', e); }
    try { loadHallOfFame(); } catch(e) { console.error('Hall of Fame laden mislukt:', e); }
    try { loadSpookyMode(); } catch(e) { console.error('Spookmodus laden mislukt:', e); }
    try { renderSavedCharacters(); } catch(e) { console.error('Karakters laden mislukt:', e); }
    try { updateYourStats(); } catch(e) { console.error('Stats laden mislukt:', e); }

    // Nieuwe features
    try { initFortuneWheel(); } catch(e) { console.error('Rad van Fortuin init mislukt:', e); }
    try { loadVotingShows(); } catch(e) { console.error('Voting laden mislukt:', e); }
    try { loadDailyReward(); } catch(e) { console.error('Daily reward laden mislukt:', e); }
    try { loadBadges(); } catch(e) { console.error('Badges laden mislukt:', e); }
    try { loadStickers(); } catch(e) { console.error('Stickers laden mislukt:', e); }
    try { loadEmojiStories(); } catch(e) { console.error('Emoji stories laden mislukt:', e); }
    try { updateHeaderStars(); } catch(e) { console.error('Header stars mislukt:', e); }
    try { initBeatSequencer(); } catch(e) { console.error('Beat sequencer init mislukt:', e); }
    try { renderMyTickets(); } catch(e) { console.error('Mijn kaartjes laden mislukt:', e); }
    try { loadTicketsDashboard(); } catch(e) { console.error('Tickets dashboard laden mislukt:', e); }
    try { setupDashboardFilters(); } catch(e) { console.error('Dashboard filters mislukt:', e); }
}

function setupDashboardFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDashboardFilter = this.dataset.filter;
            renderTicketsDashboard();
            playClickSound();
        });
    });
}

// ==========================================
// GOOGLE LOGIN / AUTHENTICATIE
// ==========================================
let currentUser = null;

function setupAuthListener() {
    auth.onAuthStateChanged(function(user) {
        currentUser = user;
        updateUserUI(user);
    });
}

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            playSuccessSound();
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert('Inloggen mislukt. Probeer opnieuw!');
        });
}

function logout() {
    auth.signOut()
        .then(() => {
            playClickSound();
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

function updateUserUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userPhoto = document.getElementById('user-photo');

    if (user) {
        // Gebruiker is ingelogd
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userName.textContent = user.displayName || 'Gebruiker';
        userPhoto.src = user.photoURL || 'logo.jfif';
    } else {
        // Gebruiker is niet ingelogd
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }
}

// ==========================================
// VERDIENSTEN EN BETALINGEN BIJHOUDEN (FIREBASE)
// ==========================================
const DEFAULT_TICKET_PRICE = 1; // Standaard prijs per kaartje
const ADMIN_PASSWORD = '123123'; // Wachtwoord voor shows beheren
let totalEarnings = 0;
let payments = [];

function loadEarningsFromFirebase() {
    const earningsRef = database.ref('earnings');
    earningsRef.on('value', (snapshot) => {
        totalEarnings = snapshot.val() || 0;
        updateEarningsDisplay();
    });

    // Laad ook de betalingen
    const paymentsRef = database.ref('payments');
    paymentsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            payments = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).sort((a, b) => b.timestamp - a.timestamp); // Nieuwste eerst
        } else {
            payments = [];
        }
        renderPayments();
    });
}

function addPayment(showName, buyerName, price) {
    // Voeg betaling toe aan database
    const paymentsRef = database.ref('payments');
    paymentsRef.push({
        showName: showName,
        buyerName: buyerName,
        amount: price,
        timestamp: Date.now(),
        claimed: false
    });

    // Update totaal
    const earningsRef = database.ref('earnings');
    earningsRef.transaction((current) => {
        return (current || 0) + price;
    });
}

function claimPayment(paymentId) {
    database.ref('payments/' + paymentId + '/claimed').set(true);
    playSuccessSound();
}

function renderPayments() {
    const list = document.getElementById('payments-list');

    if (payments.length === 0) {
        list.innerHTML = '<p class="empty-message">Nog geen betalingen</p>';
        return;
    }

    list.innerHTML = '';
    payments.forEach(payment => {
        const item = document.createElement('div');
        item.className = 'payment-item' + (payment.claimed ? ' claimed' : '');

        const date = new Date(payment.timestamp);
        const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('nl-NL');

        item.innerHTML = `
            <div class="payment-info">
                <span class="payment-buyer">${escapeHtml(payment.buyerName)}</span>
                <span class="payment-show">kocht kaartje voor: ${escapeHtml(payment.showName)}</span>
                <span class="payment-time">${dateStr} ${timeStr}</span>
            </div>
            <div class="payment-amount">
                <span>${payment.amount} euro</span>
                ${payment.claimed
                    ? '<span class="claimed-badge">Opgehaald</span>'
                    : `<button class="claim-btn" onclick="claimPayment('${payment.id}')">Ophalen</button>`
                }
            </div>
        `;
        list.appendChild(item);
    });
}

function updateEarningsDisplay() {
    document.getElementById('total-earnings').textContent = totalEarnings;
}

// ==========================================
// GELUIDJES VOOR DE WEBSITE - VERBETERDE VERSIE
// ==========================================
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Helper: Maak reverb effect
function createReverb(duration = 1) {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        }
    }

    const convolver = audioContext.createConvolver();
    convolver.buffer = impulse;
    return convolver;
}

// Helper: Speel noot met harmonics (voor piano-achtig geluid)
function playNoteWithHarmonics(freq, startTime, duration, volume = 0.15) {
    const harmonics = [1, 2, 3, 4, 5];
    const harmonicVolumes = [1, 0.5, 0.25, 0.125, 0.0625];

    harmonics.forEach((h, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq * h;

        gain.gain.setValueAtTime(volume * harmonicVolumes[i], startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    });
}

function playClickSound() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.05);

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.08);

    // Extra "pop" geluid
    const pop = audioContext.createOscillator();
    const popGain = audioContext.createGain();
    pop.type = 'sine';
    pop.frequency.value = 400;
    popGain.gain.setValueAtTime(0.15, audioContext.currentTime);
    popGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.03);
    pop.connect(popGain);
    popGain.connect(audioContext.destination);
    pop.start();
    pop.stop(audioContext.currentTime + 0.03);
}

function playSuccessSound() {
    // Vrolijke oplopende akkoorden met shimmer
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = audioContext.currentTime;

    notes.forEach((freq, i) => {
        playNoteWithHarmonics(freq, now + i * 0.08, 0.5, 0.12);
    });

    // Sparkle effect erbij
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const sparkle = audioContext.createOscillator();
            const sparkleGain = audioContext.createGain();
            sparkle.type = 'sine';
            sparkle.frequency.value = 2000 + Math.random() * 2000;
            sparkleGain.gain.setValueAtTime(0.05, audioContext.currentTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            sparkle.connect(sparkleGain);
            sparkleGain.connect(audioContext.destination);
            sparkle.start();
            sparkle.stop(audioContext.currentTime + 0.1);
        }, i * 60);
    }
}

// ==========================================
// SHOWS BEHEER (FIREBASE)
// ==========================================
let shows = [];

function loadShowsFromFirebase() {
    const showsRef = database.ref('shows');

    showsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Converteer object naar array
            shows = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            // Geen shows, maak standaard show
            shows = [];
            addDefaultShow();
        }
        renderShows();
    });
}

function addDefaultShow() {
    const showsRef = database.ref('shows');
    showsRef.push({
        name: 'Kist',
        description: 'Een spannende show met een mysterieuze kist!',
        image: 'kist.jfif',
        createdAt: Date.now()
    });
}

function renderShows() {
    const container = document.getElementById('shows-container');
    container.innerHTML = '';

    shows.forEach(show => {
        const card = document.createElement('div');
        card.className = 'show-card';

        // Maak de afbeelding HTML
        let imageHtml;
        if (show.image) {
            imageHtml = `<img src="${show.image}" alt="${escapeHtml(show.name)}" class="show-card-image">`;
        } else {
            imageHtml = `<div class="show-card-no-image">🎭</div>`;
        }

        const showPrice = show.price || DEFAULT_TICKET_PRICE;

        card.innerHTML = `
            <button class="delete-btn" onclick="deleteShow('${show.id}')">&times;</button>
            <button class="edit-price-btn" onclick="editPrice('${show.id}')" title="Prijs aanpassen">💰</button>
            ${imageHtml}
            <h3>${escapeHtml(show.name)}</h3>
            <p>${escapeHtml(show.description)}</p>
            <p class="price">${showPrice} euro</p>
            <button class="buy-btn" onclick="buyTicket('${show.id}')">Koop Kaartje!</button>
        `;
        container.appendChild(card);
    });
}

function editPrice(showId) {
    // Vraag om wachtwoord
    const password = prompt('Voer het geheime wachtwoord in om de prijs aan te passen:');

    if (password !== ADMIN_PASSWORD) {
        alert('Verkeerd wachtwoord! Alleen Joeri mag prijzen aanpassen.');
        return;
    }

    const show = shows.find(s => s.id === showId);
    if (!show) return;

    const currentPrice = show.price || DEFAULT_TICKET_PRICE;
    const newPriceStr = prompt(`Huidige prijs: ${currentPrice} euro\n\nVoer de nieuwe prijs in (in euro's):`, currentPrice);

    if (newPriceStr === null) return; // Geannuleerd

    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
        alert('Ongeldige prijs! Voer een getal in.');
        return;
    }

    // Update prijs in database
    database.ref('shows/' + showId + '/price').set(newPrice);
    playSuccessSound();
    alert(`Prijs aangepast naar ${newPrice} euro!`);
}

function addShow(name, description, image) {
    // Vraag om wachtwoord
    const password = prompt('Voer het geheime wachtwoord in om een show toe te voegen:');

    if (password !== ADMIN_PASSWORD) {
        alert('Verkeerd wachtwoord! Alleen Joeri mag shows toevoegen.');
        return false;
    }

    const showsRef = database.ref('shows');
    showsRef.push({
        name: name,
        description: description || 'Een geweldige show!',
        image: image || null,
        createdAt: Date.now()
    });
    playSuccessSound();
    return true;
}

function deleteShow(id) {
    if (confirm('Weet je zeker dat je deze show wilt verwijderen?')) {
        const password = prompt('Voer het geheime wachtwoord in om te verwijderen:');
        if (password !== ADMIN_PASSWORD) {
            alert('Verkeerd wachtwoord! Alleen Joeri mag shows verwijderen.');
            return;
        }
        database.ref('shows/' + id).remove();
        playClickSound();
    }
}

let currentPaymentShow = null;

function buyTicket(id) {
    const show = shows.find(s => s.id === id);
    if (show) {
        currentPaymentShow = show;

        // Reset naar stap 1
        document.getElementById('payment-step-1').classList.remove('hidden');
        document.getElementById('payment-step-2').classList.add('hidden');
        document.getElementById('payment-step-3').classList.add('hidden');

        // Vul de betaalgegevens in
        const showPrice = show.price || DEFAULT_TICKET_PRICE;
        document.getElementById('payment-show-name').textContent = show.name;
        document.getElementById('payment-amount').textContent = showPrice;

        // Toon het betaalscherm
        document.getElementById('payment-modal').classList.remove('hidden');
        playClickSound();
    }
}

function processPayment(method) {
    // Vraag naam van koper
    const buyerName = prompt('Wat is je naam?');
    if (!buyerName) {
        alert('Je moet je naam invullen!');
        return;
    }

    // Ga naar stap 2 (verwerken)
    document.getElementById('payment-step-1').classList.add('hidden');
    document.getElementById('payment-step-2').classList.remove('hidden');

    const processingText = document.getElementById('processing-text');
    const messages = [
        'Verbinden met ' + getMethodName(method) + '...',
        'Betaling verifiëren...',
        'Transactie verwerken...',
        'Bijna klaar...'
    ];

    let messageIndex = 0;
    processingText.textContent = messages[0];

    // Simuleer verwerking met wisselende berichten
    const messageInterval = setInterval(() => {
        messageIndex++;
        if (messageIndex < messages.length) {
            processingText.textContent = messages[messageIndex];
        }
    }, 600);

    // Na 2.5 seconden: succes!
    setTimeout(() => {
        clearInterval(messageInterval);

        // Ga naar stap 3 (succes)
        document.getElementById('payment-step-2').classList.add('hidden');
        document.getElementById('payment-step-3').classList.remove('hidden');

        // Voeg betaling toe met naam!
        const paymentPrice = currentPaymentShow.price || DEFAULT_TICKET_PRICE;
        addPayment(currentPaymentShow.name, buyerName, paymentPrice);

        // Sla kaartje op voor Mijn Kaartjes
        saveTicket(currentPaymentShow, buyerName);

        // Tel ticket voor stats
        const visitorId = getVisitorId();
        database.ref('tickets/' + visitorId).transaction((current) => (current || 0) + 1);

        // Geef sterren voor aankoop
        addStars(3);

        // Start confetti!
        launchConfetti();

        // Speel succes geluid
        playPaymentSuccessSound();

        // Toon kraskaart na 2 seconden
        setTimeout(() => {
            showScratchCard();
        }, 2000);
    }, 2500);
}

function getMethodName(method) {
    const names = {
        'apple-pay': 'Apple Pay',
        'google-pay': 'Google Pay',
        'ideal': 'iDEAL',
        'creditcard': 'Creditcard'
    };
    return names[method] || method;
}

function showTicketAfterPayment() {
    // Sluit betaalmodal
    document.getElementById('payment-modal').classList.add('hidden');

    // Vul kaartje in
    if (currentPaymentShow) {
        document.getElementById('ticket-show-name').textContent = currentPaymentShow.name;
        const ticketPrice = currentPaymentShow.price || DEFAULT_TICKET_PRICE;
        document.getElementById('ticket-price-display').textContent = ticketPrice;

        const ticketImage = document.querySelector('.ticket-image');
        if (currentPaymentShow.image) {
            ticketImage.src = currentPaymentShow.image;
        } else {
            ticketImage.src = 'kist.jfif';
        }

        // Genereer QR code
        generateTicketQR(currentPaymentShow);
    }

    // Toon kaartje
    document.getElementById('ticket-modal').classList.remove('hidden');
    playSuccessSound();
}

function generateTicketQR(show) {
    const canvas = document.getElementById('ticket-qr-code');
    const ticketId = 'JOERI-' + Date.now().toString(36).toUpperCase();
    const qrData = JSON.stringify({
        show: show.name,
        ticketId: ticketId,
        date: new Date().toLocaleDateString('nl-NL'),
        valid: true
    });

    // Maak de QR code
    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(canvas, qrData, {
            width: 120,
            margin: 2,
            color: {
                dark: '#cc0000',
                light: '#ffffff'
            }
        }, function(error) {
            if (error) console.error('QR code error:', error);
        });
    }
}

// ==================== QR SCANNER ====================
let html5QrCode = null;

function openQRScanner() {
    document.getElementById('scanner-modal').classList.remove('hidden');
    document.getElementById('scan-result').classList.add('hidden');
    document.getElementById('scan-again-btn').classList.add('hidden');
    document.getElementById('scan-success').classList.add('hidden');
    document.getElementById('scan-error').classList.add('hidden');

    // Start de scanner
    if (typeof Html5Qrcode !== 'undefined') {
        html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error("Scanner start error:", err);
            alert("Kan de camera niet starten. Geef toestemming voor de camera.");
        });
    }
}

function onScanSuccess(decodedText) {
    // Stop de scanner
    if (html5QrCode) {
        html5QrCode.stop().catch(err => console.error(err));
    }

    playSuccessSound();

    // Probeer de QR data te parsen
    try {
        const ticketData = JSON.parse(decodedText);

        if (ticketData.valid && ticketData.ticketId && ticketData.ticketId.startsWith('JOERI-')) {
            // Geldig kaartje!
            document.getElementById('scan-result').classList.remove('hidden');
            document.getElementById('scan-success').classList.remove('hidden');
            document.getElementById('scan-error').classList.add('hidden');

            document.querySelector('.scan-show-name').textContent = '🎭 ' + ticketData.show;
            document.querySelector('.scan-ticket-id').textContent = '🎫 ' + ticketData.ticketId;
            document.querySelector('.scan-date').textContent = '📅 ' + ticketData.date;

            // Markeer kaartje als gescand in Firebase
            markTicketAsScanned(ticketData.ticketId);

            // Confetti!
            launchConfetti();
        } else {
            showScanError();
        }
    } catch (e) {
        showScanError();
    }

    document.getElementById('scan-again-btn').classList.remove('hidden');
}

function onScanFailure(error) {
    // Negeer scan fouten tijdens het scannen
}

function showScanError() {
    document.getElementById('scan-result').classList.remove('hidden');
    document.getElementById('scan-success').classList.add('hidden');
    document.getElementById('scan-error').classList.remove('hidden');
    playErrorSound();
}

function resetScanner() {
    document.getElementById('scan-result').classList.add('hidden');
    document.getElementById('scan-again-btn').classList.add('hidden');

    // Herstart scanner
    if (typeof Html5Qrcode !== 'undefined') {
        html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error("Scanner restart error:", err);
        });
    }
}

function playErrorSound() {
    if (!audioContext) initAudio();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, audioContext.currentTime);
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialDecayTo = 0.01;
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
}

function launchConfetti() {
    const colors = ['#ff4444', '#2266cc', '#ffcc00', '#22cc44', '#ff66cc', '#44ccff', '#ff9900', '#9933ff'];
    const stickers = ['🎉', '🎊', '🎈', '🎁', '⭐', '✨', '💫', '🌟', '🎭', '🎪', '🎵', '🎶', '❤️', '💖', '🥳', '🎀'];
    const confettiShapes = ['■', '●', '▲', '★', '♦', '♥', '◆', '▼'];

    // Maak confetti container in body voor volledige scherm effect
    let container = document.getElementById('party-confetti-overlay');
    if (!container) {
        container = document.createElement('div');
        container.id = 'party-confetti-overlay';
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
        document.body.appendChild(container);
    }
    container.innerHTML = '';

    // Stickers die van boven vallen
    for (let i = 0; i < 30; i++) {
        const sticker = document.createElement('div');
        sticker.textContent = stickers[Math.floor(Math.random() * stickers.length)];
        sticker.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: -50px;
            font-size: ${25 + Math.random() * 30}px;
            animation: stickerFall ${3 + Math.random() * 2}s ease-out forwards;
            animation-delay: ${Math.random() * 1}s;
        `;
        container.appendChild(sticker);
    }

    // Slingers (golvende lijnen)
    for (let i = 0; i < 15; i++) {
        const slinger = document.createElement('div');
        slinger.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: -100px;
            width: 8px;
            height: ${80 + Math.random() * 60}px;
            background: linear-gradient(180deg, ${colors[Math.floor(Math.random() * colors.length)]}, ${colors[Math.floor(Math.random() * colors.length)]});
            border-radius: 4px;
            animation: slingerFall ${2.5 + Math.random() * 2}s ease-out forwards;
            animation-delay: ${Math.random() * 0.8}s;
            transform-origin: top center;
        `;
        container.appendChild(slinger);
    }

    // Confetti shapes
    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.textContent = confettiShapes[Math.floor(Math.random() * confettiShapes.length)];
        confetti.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: -30px;
            font-size: ${10 + Math.random() * 15}px;
            color: ${colors[Math.floor(Math.random() * colors.length)]};
            animation: confettiFallSpin ${2 + Math.random() * 3}s ease-out forwards;
            animation-delay: ${Math.random() * 1.5}s;
        `;
        container.appendChild(confetti);
    }

    // Voeg CSS animaties toe als ze nog niet bestaan
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes stickerFall {
                0% { transform: translateY(0) translateX(0) rotate(0deg) scale(0.5); opacity: 0; }
                10% { transform: translateY(50px) translateX(10px) rotate(15deg) scale(1); opacity: 1; }
                30% { transform: translateY(200px) translateX(-20px) rotate(-10deg) scale(1); opacity: 1; }
                50% { transform: translateY(400px) translateX(15px) rotate(20deg) scale(0.95); opacity: 0.9; }
                70% { transform: translateY(600px) translateX(-10px) rotate(-15deg) scale(0.9); opacity: 0.7; }
                100% { transform: translateY(100vh) translateX(5px) rotate(25deg) scale(0.8); opacity: 0; }
            }
            @keyframes slingerFall {
                0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
                10% { transform: translateY(80px) translateX(20px) rotate(8deg); opacity: 1; }
                30% { transform: translateY(250px) translateX(-15px) rotate(-5deg); opacity: 1; }
                50% { transform: translateY(450px) translateX(25px) rotate(10deg); opacity: 0.9; }
                70% { transform: translateY(650px) translateX(-10px) rotate(-8deg); opacity: 0.7; }
                100% { transform: translateY(100vh) translateX(5px) rotate(3deg); opacity: 0; }
            }
            @keyframes confettiFallSpin {
                0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
                25% { transform: translateY(25vh) translateX(30px) rotate(180deg); opacity: 1; }
                50% { transform: translateY(50vh) translateX(-20px) rotate(360deg); opacity: 0.8; }
                75% { transform: translateY(75vh) translateX(25px) rotate(540deg); opacity: 0.5; }
                100% { transform: translateY(100vh) translateX(-10px) rotate(720deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Verwijder na 6 seconden
    setTimeout(() => {
        container.innerHTML = '';
    }, 6000);
}

function playPaymentSuccessSound() {
    // Speciaal vrolijk geluid voor betaling
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime + i * 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.4);

        oscillator.start(audioContext.currentTime + i * 0.15);
        oscillator.stop(audioContext.currentTime + i * 0.15 + 0.4);
    });
}

// ==========================================
// GELUID OPNEMEN EN AFSPELEN
// ==========================================
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let recordedAudioBuffer = null;
let currentEffect = null;

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = async () => {
            recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });

            // Converteer naar AudioBuffer voor effecten
            const arrayBuffer = await recordedBlob.arrayBuffer();
            recordedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            document.getElementById('play-btn').disabled = false;
            document.getElementById('save-sound-btn').disabled = false;
            document.getElementById('play-status').textContent = 'Klaar om af te spelen!';

            // Stop alle tracks
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        document.getElementById('record-btn').classList.add('recording');
        document.getElementById('record-status').textContent = 'Opnemen... Klik om te stoppen';
        playClickSound();
    } catch (err) {
        alert('Kon de microfoon niet gebruiken. Geef toestemming!');
        console.error(err);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        document.getElementById('record-btn').classList.remove('recording');
        document.getElementById('record-status').textContent = 'Opname klaar!';
        playSuccessSound();
    }
}

function playRecording() {
    if (!recordedAudioBuffer) return;

    // Maak een nieuwe buffer source
    const source = audioContext.createBufferSource();
    source.buffer = recordedAudioBuffer;

    // Als er een effect is geselecteerd, pas het toe
    if (currentEffect) {
        applyEffect(source, currentEffect);
    } else {
        source.connect(audioContext.destination);
    }

    source.start(0);
    document.getElementById('play-status').textContent = 'Afspelen...';

    source.onended = () => {
        document.getElementById('play-status').textContent = 'Klaar om af te spelen!';
    };
}

// ==========================================
// GRAPPIGE EFFECTEN
// ==========================================
function applyEffect(source, effect) {
    switch (effect) {
        case 'chipmunk':
            // Hoge stem (chipmunk)
            source.playbackRate.value = 1.8;
            source.connect(audioContext.destination);
            break;

        case 'monster':
            // Lage stem (monster)
            source.playbackRate.value = 0.6;
            source.connect(audioContext.destination);
            break;

        case 'robot':
            // Robot stem met ringmodulator effect
            const oscillator = audioContext.createOscillator();
            const ringMod = audioContext.createGain();

            oscillator.frequency.value = 50;
            oscillator.connect(ringMod.gain);
            source.connect(ringMod);
            ringMod.connect(audioContext.destination);

            oscillator.start();
            source.onended = () => {
                oscillator.stop();
                document.getElementById('play-status').textContent = 'Klaar om af te spelen!';
            };
            break;

        case 'echo':
            // Echo effect
            const delay = audioContext.createDelay();
            const feedback = audioContext.createGain();
            const wetGain = audioContext.createGain();
            const dryGain = audioContext.createGain();

            delay.delayTime.value = 0.3;
            feedback.gain.value = 0.5;
            wetGain.gain.value = 0.5;
            dryGain.gain.value = 1;

            source.connect(dryGain);
            dryGain.connect(audioContext.destination);

            source.connect(delay);
            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(wetGain);
            wetGain.connect(audioContext.destination);
            break;

        case 'alien':
            // Alien stem - hoog met vibrato
            source.playbackRate.value = 1.5;
            const alienOsc = audioContext.createOscillator();
            const alienGain = audioContext.createGain();
            alienOsc.frequency.value = 8; // Snelle vibrato
            alienOsc.connect(alienGain);
            alienGain.gain.value = 100;
            alienGain.connect(source.playbackRate);
            source.connect(audioContext.destination);
            alienOsc.start();
            source.onended = () => {
                alienOsc.stop();
                document.getElementById('play-status').textContent = 'Klaar om af te spelen!';
            };
            break;

        case 'underwater':
            // Onder water - lowpass filter
            const underwaterFilter = audioContext.createBiquadFilter();
            underwaterFilter.type = 'lowpass';
            underwaterFilter.frequency.value = 500;
            underwaterFilter.Q.value = 10;
            source.playbackRate.value = 0.9;
            source.connect(underwaterFilter);
            underwaterFilter.connect(audioContext.destination);
            break;

        case 'telephone':
            // Oude telefoon - bandpass filter
            const phoneFilter = audioContext.createBiquadFilter();
            phoneFilter.type = 'bandpass';
            phoneFilter.frequency.value = 1500;
            phoneFilter.Q.value = 5;
            const phoneDistortion = audioContext.createWaveShaper();
            phoneDistortion.curve = makeDistortionCurve(20);
            source.connect(phoneFilter);
            phoneFilter.connect(phoneDistortion);
            phoneDistortion.connect(audioContext.destination);
            break;

        case 'ghost':
            // Spook - langzaam met veel reverb/echo
            source.playbackRate.value = 0.7;
            const ghostDelay1 = audioContext.createDelay();
            const ghostDelay2 = audioContext.createDelay();
            const ghostGain1 = audioContext.createGain();
            const ghostGain2 = audioContext.createGain();
            ghostDelay1.delayTime.value = 0.1;
            ghostDelay2.delayTime.value = 0.2;
            ghostGain1.gain.value = 0.7;
            ghostGain2.gain.value = 0.5;
            source.connect(audioContext.destination);
            source.connect(ghostDelay1);
            ghostDelay1.connect(ghostGain1);
            ghostGain1.connect(audioContext.destination);
            ghostGain1.connect(ghostDelay2);
            ghostDelay2.connect(ghostGain2);
            ghostGain2.connect(audioContext.destination);
            break;

        case 'megaphone':
            // Megafoon - distortion met highpass
            const megaFilter = audioContext.createBiquadFilter();
            megaFilter.type = 'highpass';
            megaFilter.frequency.value = 800;
            const megaDistortion = audioContext.createWaveShaper();
            megaDistortion.curve = makeDistortionCurve(50);
            const megaGain = audioContext.createGain();
            megaGain.gain.value = 0.5;
            source.connect(megaFilter);
            megaFilter.connect(megaDistortion);
            megaDistortion.connect(megaGain);
            megaGain.connect(audioContext.destination);
            break;

        case 'wobble':
            // Wiebelig - snelle pitch veranderingen
            const wobbleOsc = audioContext.createOscillator();
            const wobbleGain = audioContext.createGain();
            wobbleOsc.frequency.value = 5;
            wobbleOsc.connect(wobbleGain);
            wobbleGain.gain.value = 0.3;
            wobbleGain.connect(source.playbackRate);
            source.connect(audioContext.destination);
            wobbleOsc.start();
            source.onended = () => {
                wobbleOsc.stop();
                document.getElementById('play-status').textContent = 'Klaar om af te spelen!';
            };
            break;

        default:
            source.connect(audioContext.destination);
    }
}

// Helper functie voor distortion
function makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

function selectEffect(effect) {
    currentEffect = currentEffect === effect ? null : effect;

    // Update UI
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.effect === currentEffect) {
            btn.classList.add('active');
        }
    });

    playClickSound();
}

// ==========================================
// GELUIDJES OPSLAAN (lokaal)
// ==========================================
let savedSounds = [];

function loadSounds() {
    const saved = localStorage.getItem('joerieSounds');
    if (saved) {
        savedSounds = JSON.parse(saved);
        renderSounds();
    }
}

function saveSoundsToStorage() {
    localStorage.setItem('joerieSounds', JSON.stringify(savedSounds));
}

function renderSounds() {
    const list = document.getElementById('sounds-list');

    if (savedSounds.length === 0) {
        list.innerHTML = '<p class="empty-message">Nog geen geluidjes opgeslagen</p>';
        return;
    }

    list.innerHTML = '';
    savedSounds.forEach((sound, index) => {
        const item = document.createElement('div');
        item.className = 'sound-item';
        item.innerHTML = `
            <span class="sound-item-name">${escapeHtml(sound.name)}</span>
            <div class="sound-item-buttons">
                <button class="sound-item-btn" onclick="playSavedSound(${index})">Afspelen</button>
                <button class="sound-item-btn delete" onclick="deleteSavedSound(${index})">Verwijder</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function saveCurrentSound() {
    if (!recordedBlob) return;

    const name = prompt('Geef je geluidje een naam:');
    if (!name) return;

    // Converteer blob naar base64 voor opslag
    const reader = new FileReader();
    reader.onloadend = () => {
        savedSounds.push({
            name: name,
            data: reader.result,
            effect: currentEffect
        });
        saveSoundsToStorage();
        renderSounds();
        playSuccessSound();
    };
    reader.readAsDataURL(recordedBlob);
}

async function playSavedSound(index) {
    const sound = savedSounds[index];
    if (!sound) return;

    try {
        // Converteer base64 terug naar blob
        const response = await fetch(sound.data);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        if (sound.effect) {
            applyEffect(source, sound.effect);
        } else {
            source.connect(audioContext.destination);
        }

        source.start(0);
    } catch (err) {
        console.error('Kon geluidje niet afspelen:', err);
        alert('Oeps! Kon het geluidje niet afspelen.');
    }
}

function deleteSavedSound(index) {
    if (confirm('Weet je zeker dat je dit geluidje wilt verwijderen?')) {
        savedSounds.splice(index, 1);
        saveSoundsToStorage();
        renderSounds();
        playClickSound();
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    // Login knop
    document.getElementById('login-btn').addEventListener('click', loginWithGoogle);

    // Logout knop
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Opneem knop
    document.getElementById('record-btn').addEventListener('click', function() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    });

    // Afspeel knop
    document.getElementById('play-btn').addEventListener('click', playRecording);

    // Opslaan knop
    document.getElementById('save-sound-btn').addEventListener('click', saveCurrentSound);

    // Effect knoppen
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectEffect(this.dataset.effect);
        });
    });

    // Nieuwe show knop
    document.getElementById('add-show-btn').addEventListener('click', function() {
        document.getElementById('show-modal').classList.remove('hidden');
        playClickSound();
    });

    // QR Scanner knop
    document.getElementById('scan-ticket-btn').addEventListener('click', function() {
        openQRScanner();
        playClickSound();
    });

    // Scan opnieuw knop
    document.getElementById('scan-again-btn').addEventListener('click', function() {
        resetScanner();
        playClickSound();
    });

    // Foto knoppen
    const cameraInput = document.getElementById('show-image-camera');
    const galleryInput = document.getElementById('show-image-gallery');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    // Foto maken knop
    document.getElementById('take-photo-btn').addEventListener('click', function() {
        cameraInput.click();
        playClickSound();
    });

    // Foto kiezen knop
    document.getElementById('choose-photo-btn').addEventListener('click', function() {
        galleryInput.click();
        playClickSound();
    });

    // Verwerk foto van camera
    cameraInput.addEventListener('change', function() {
        handleImageSelect(this);
    });

    // Verwerk foto uit galerij
    galleryInput.addEventListener('change', function() {
        handleImageSelect(this);
    });

    function handleImageSelect(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
                removeImageBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(input.files[0]);
            playSuccessSound();
        }
    }

    // Verwijder foto knop
    removeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        cameraInput.value = '';
        galleryInput.value = '';
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        removeImageBtn.classList.add('hidden');
        playClickSound();
    });

    // Show formulier
    document.getElementById('show-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('show-name').value;
        const description = document.getElementById('show-description').value;
        const image = imagePreview.src && !imagePreview.classList.contains('hidden') ? imagePreview.src : null;

        // Alleen doorgaan als wachtwoord correct is
        const success = addShow(name, description, image);
        if (!success) {
            return; // Stop als wachtwoord fout is
        }

        document.getElementById('show-modal').classList.add('hidden');

        // Reset formulier inclusief afbeelding
        this.reset();
        cameraInput.value = '';
        galleryInput.value = '';
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        removeImageBtn.classList.add('hidden');
    });

    // Print kaartje knop
    document.getElementById('print-ticket-btn').addEventListener('click', function() {
        window.print();
        playSuccessSound();
    });

    // Betaalmethode knoppen
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const method = this.dataset.method;
            playClickSound();
            processPayment(method);
        });
    });

    // Bekijk kaartje knop (na betaling)
    document.getElementById('show-ticket-btn').addEventListener('click', function() {
        showTicketAfterPayment();
    });

    // Sluit modals
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.add('hidden');
            // Stop scanner als die draait
            if (modal.id === 'scanner-modal' && html5QrCode) {
                html5QrCode.stop().catch(err => console.error(err));
            }
            playClickSound();
        });
    });

    // Sluit modal bij klikken buiten content
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
                // Stop scanner als die draait
                if (this.id === 'scanner-modal' && html5QrCode) {
                    html5QrCode.stop().catch(err => console.error(err));
                }
                playClickSound();
            }
        });
    });

    // Resume AudioContext na user interactie (voor browsers die dit vereisen)
    document.addEventListener('click', function() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, { once: true });

    // ==========================================
    // NIEUWE FEATURES EVENT LISTENERS (veilig)
    // ==========================================

    // Geluidsbord
    document.querySelectorAll('.soundboard-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            playSoundboardSound(this.dataset.sound);
        });
    });

    // Applaus knop
    const applauseBtn = document.getElementById('big-applause-btn');
    if (applauseBtn) applauseBtn.addEventListener('click', addApplause);

    // Countdown
    const setCountdownBtn = document.getElementById('set-countdown-btn');
    const resetCountdownBtn = document.getElementById('reset-countdown-btn');
    if (setCountdownBtn) setCountdownBtn.addEventListener('click', setCountdown);
    if (resetCountdownBtn) resetCountdownBtn.addEventListener('click', resetCountdown);

    // Rad van Fortuin
    const spinBtn = document.getElementById('spin-wheel-btn');
    if (spinBtn) spinBtn.addEventListener('click', spinWheel);

    // Gastenboek
    const postMsgBtn = document.getElementById('post-message-btn');
    if (postMsgBtn) postMsgBtn.addEventListener('click', postGuestbookMessage);

    // Emoji picker
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const textarea = document.getElementById('guest-message');
            if (textarea) {
                textarea.value += this.dataset.emoji;
                textarea.focus();
            }
        });
    });

    // Karakter maker
    document.querySelectorAll('.option-buttons').forEach(group => {
        const target = group.dataset.target;
        group.querySelectorAll('.char-option').forEach(btn => {
            btn.addEventListener('click', function() {
                selectCharacterOption(target, this.dataset.value);
            });
        });
    });

    const saveCharBtn = document.getElementById('save-character-btn');
    if (saveCharBtn) saveCharBtn.addEventListener('click', saveCharacter);

    // Spookmodus
    const spookyBtn = document.getElementById('toggle-spooky-btn');
    if (spookyBtn) spookyBtn.addEventListener('click', toggleSpookyMode);

    // Kraskaart
    const claimScratchBtn = document.getElementById('claim-scratch-btn');
    if (claimScratchBtn) claimScratchBtn.addEventListener('click', claimScratchPrize);

    // ==========================================
    // TAB NAVIGATIE
    // ==========================================
    setupTabNavigation();

    // ==========================================
    // SPELLETJES
    // ==========================================

    // Memory
    const memoryRestartBtn = document.getElementById('memory-restart-btn');
    if (memoryRestartBtn) {
        memoryRestartBtn.addEventListener('click', initMemoryGame);
        initMemoryGame(); // Start met een spel
    }

    // Quiz
    const quizStartBtn = document.getElementById('quiz-start-btn');
    if (quizStartBtn) quizStartBtn.addEventListener('click', startQuiz);

    // Balloon Pop
    const balloonStartBtn = document.getElementById('balloon-start-btn');
    if (balloonStartBtn) balloonStartBtn.addEventListener('click', startBalloonGame);

    // Whack-a-Mole
    const whackStartBtn = document.getElementById('whack-start-btn');
    if (whackStartBtn) whackStartBtn.addEventListener('click', startWhackGame);

    document.querySelectorAll('.whack-hole').forEach(hole => {
        hole.addEventListener('click', () => whackMole(hole));
    });

    // ==========================================
    // MUZIEK MAKER
    // ==========================================
    document.querySelectorAll('.piano-key').forEach(key => {
        key.addEventListener('click', function() {
            playPianoNote(this.dataset.note);
            this.classList.add('playing');
            setTimeout(() => this.classList.remove('playing'), 200);
        });
    });

    document.querySelectorAll('.drum-pad').forEach(pad => {
        pad.addEventListener('click', function() {
            playDrumSound(this.dataset.drum);
            this.classList.add('playing');
            setTimeout(() => this.classList.remove('playing'), 200);
        });
    });

    // ==========================================
    // EMOJI VERHAAL
    // ==========================================
    document.querySelectorAll('.story-emoji').forEach(emoji => {
        emoji.addEventListener('click', function() {
            addEmojiToStory(this.dataset.emoji);
        });
    });

    const clearStoryBtn = document.getElementById('clear-story-btn');
    if (clearStoryBtn) clearStoryBtn.addEventListener('click', clearEmojiStory);

    const saveStoryBtn = document.getElementById('save-story-btn');
    if (saveStoryBtn) saveStoryBtn.addEventListener('click', saveEmojiStory);

    // ==========================================
    // FAN MAIL
    // ==========================================
    const sendFanmailBtn = document.getElementById('send-fanmail-btn');
    if (sendFanmailBtn) sendFanmailBtn.addEventListener('click', sendFanMail);

    // ==========================================
    // FAN CLUB KAART
    // ==========================================
    const generateFanclubBtn = document.getElementById('generate-fanclub-btn');
    if (generateFanclubBtn) generateFanclubBtn.addEventListener('click', generateFanClubCard);

    // ==========================================
    // DAGELIJKSE BELONING
    // ==========================================
    const claimDailyBtn = document.getElementById('claim-daily-btn');
    if (claimDailyBtn) claimDailyBtn.addEventListener('click', claimDailyReward);

    // ==========================================
    // COMPLIMENTEN
    // ==========================================
    const complimentBtn = document.getElementById('compliment-btn');
    if (complimentBtn) complimentBtn.addEventListener('click', generateCompliment);

    // ==========================================
    // DANCE PARTY
    // ==========================================
    const dancePartyBtn = document.getElementById('dance-party-btn');
    if (dancePartyBtn) dancePartyBtn.addEventListener('click', toggleDanceParty);

    const stopPartyBtn = document.getElementById('stop-party-btn');
    if (stopPartyBtn) stopPartyBtn.addEventListener('click', toggleDanceParty);

    // ==========================================
    // CONFETTI KANON
    // ==========================================
    const confettiCannonBtn = document.getElementById('confetti-cannon-btn');
    if (confettiCannonBtn) confettiCannonBtn.addEventListener('click', fireConfettiCannon);

    // ==========================================
    // POPCORN
    // ==========================================
    const eatPopcornBtn = document.getElementById('eat-popcorn-btn');
    if (eatPopcornBtn) eatPopcornBtn.addEventListener('click', eatPopcorn);

    // ==========================================
    // LOAD GAME COUNT
    // ==========================================
    try { loadGameCount(); } catch(e) { console.error('Game count laden mislukt:', e); }
}

// ==========================================
// HELPER FUNCTIES
// ==========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// GELUIDSBORD
// ==========================================
const soundboardSounds = {
    applause: { notes: [400, 450, 500, 550, 600, 650], duration: 0.8, type: 'noise' },
    drumroll: { notes: [200], duration: 1.5, type: 'drum' },
    tada: { notes: [523, 659, 784, 1047], duration: 0.6, type: 'fanfare' },
    laugh: { notes: [300, 350, 300, 380, 300, 400], duration: 0.8, type: 'haha' },
    boo: { notes: [150, 140, 130, 120], duration: 1, type: 'boo' },
    wow: { notes: [300, 400, 500, 600, 700], duration: 0.8, type: 'wow' },
    magic: { notes: [800, 900, 1000, 1100, 1200, 1300], duration: 1, type: 'sparkle' },
    fart: { notes: [80, 90, 70, 100, 60], duration: 0.5, type: 'fart' },
    bell: { notes: [880, 1100], duration: 0.8, type: 'bell' },
    horn: { notes: [220, 277, 330], duration: 0.6, type: 'horn' },
    whistle: { notes: [1000, 1200, 1400, 1200, 1000], duration: 0.8, type: 'whistle' },
    explosion: { notes: [60, 50, 40, 30], duration: 1.2, type: 'boom' }
};

function playSoundboardSound(soundName) {
    const sound = soundboardSounds[soundName];
    if (!sound) return;

    switch(sound.type) {
        case 'noise':
            playApplauseSound();
            break;
        case 'drum':
            playDrumroll();
            break;
        case 'fanfare':
            playFanfare();
            break;
        case 'haha':
            playLaughSound();
            break;
        case 'boo':
            playBooSound();
            break;
        case 'wow':
            playWowSound();
            break;
        case 'sparkle':
            playMagicSound();
            break;
        case 'fart':
            playFartSound();
            break;
        case 'bell':
            playBellSound();
            break;
        case 'horn':
            playHornSound();
            break;
        case 'whistle':
            playWhistleSound();
            break;
        case 'boom':
            playExplosionSound();
            break;
    }
}

function playApplauseSound() {
    const now = audioContext.currentTime;
    const duration = 2.5;

    // Veel individuele handklappen voor realistisch effect
    for (let i = 0; i < 60; i++) {
        const time = now + Math.random() * duration * 0.8;
        const intensity = Math.sin(Math.PI * (i / 60)); // Crescendo-decrescendo

        // Elke klap bestaat uit een korte noise burst
        const clapLength = 0.015 + Math.random() * 0.01;
        const clapBuffer = audioContext.createBuffer(2, audioContext.sampleRate * clapLength, audioContext.sampleRate);

        for (let ch = 0; ch < 2; ch++) {
            const data = clapBuffer.getChannelData(ch);
            for (let j = 0; j < data.length; j++) {
                // Snelle attack, snelle decay
                const env = Math.pow(1 - j / data.length, 1.5);
                data[j] = (Math.random() * 2 - 1) * env;
            }
        }

        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        const hipass = audioContext.createBiquadFilter();
        const lopass = audioContext.createBiquadFilter();

        source.buffer = clapBuffer;

        // Clap frequency range: 1kHz - 3kHz
        hipass.type = 'highpass';
        hipass.frequency.value = 1000 + Math.random() * 500;
        lopass.type = 'lowpass';
        lopass.frequency.value = 3000 + Math.random() * 1000;

        gain.gain.value = (0.15 + Math.random() * 0.1) * intensity;

        source.connect(hipass);
        hipass.connect(lopass);
        lopass.connect(gain);
        gain.connect(audioContext.destination);
        source.start(time);
    }

    // Achtergrond "woo" geluid van publiek
    for (let v = 0; v < 3; v++) {
        const woo = audioContext.createOscillator();
        const wooGain = audioContext.createGain();
        const wooFilter = audioContext.createBiquadFilter();

        woo.type = 'sawtooth';
        woo.frequency.setValueAtTime(200 + v * 50, now);
        woo.frequency.linearRampToValueAtTime(250 + v * 50, now + 1);
        woo.frequency.linearRampToValueAtTime(200 + v * 50, now + 2);

        wooFilter.type = 'bandpass';
        wooFilter.frequency.value = 800;
        wooFilter.Q.value = 2;

        wooGain.gain.setValueAtTime(0, now);
        wooGain.gain.linearRampToValueAtTime(0.03, now + 0.5);
        wooGain.gain.linearRampToValueAtTime(0.02, now + 1.5);
        wooGain.gain.linearRampToValueAtTime(0, now + duration);

        woo.connect(wooFilter);
        wooFilter.connect(wooGain);
        wooGain.connect(audioContext.destination);
        woo.start(now);
        woo.stop(now + duration);
    }
}

function playDrumroll() {
    const now = audioContext.currentTime;
    const duration = 2;
    const hitsPerSecond = 30; // Snelle drumroll

    for (let i = 0; i < hitsPerSecond * duration; i++) {
        const time = now + (i / hitsPerSecond);
        // Crescendo effect
        const volume = 0.1 + (i / (hitsPerSecond * duration)) * 0.25;

        // Alterneer links/rechts voor realistisch effect
        const pan = audioContext.createStereoPanner();
        pan.pan.value = (i % 2 === 0) ? -0.3 : 0.3;

        // Snare hit met body + snares
        const bodyOsc = audioContext.createOscillator();
        const bodyGain = audioContext.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.value = 180 + Math.random() * 20;
        bodyGain.gain.setValueAtTime(volume * 0.4, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        bodyOsc.connect(bodyGain);
        bodyGain.connect(pan);
        pan.connect(audioContext.destination);
        bodyOsc.start(time);
        bodyOsc.stop(time + 0.03);

        // Snare wires (noise)
        const noiseLen = 0.04;
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * noiseLen, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let j = 0; j < noiseData.length; j++) {
            noiseData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / noiseData.length, 2);
        }

        const noise = audioContext.createBufferSource();
        const noiseGain = audioContext.createGain();
        const noiseFilter = audioContext.createBiquadFilter();
        noise.buffer = noiseBuffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 5000;
        noiseFilter.Q.value = 0.5;
        noiseGain.gain.value = volume * 0.6;

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(pan);
        noise.start(time);
    }

    // Finale crash
    setTimeout(() => playCymbal(), duration * 1000 - 100);
}

function playFanfare() {
    const now = audioContext.currentTime;

    // Epische fanfare melodie (zoals bij prijsuitreiking)
    const melody = [
        // Intro
        { note: 392, time: 0, dur: 0.12 },      // G4
        { note: 392, time: 0.12, dur: 0.12 },   // G4
        { note: 392, time: 0.24, dur: 0.12 },   // G4
        { note: 523, time: 0.4, dur: 0.4 },     // C5 (lang)
        { note: 466, time: 0.85, dur: 0.12 },   // Bb4
        { note: 440, time: 0.97, dur: 0.12 },   // A4
        { note: 392, time: 1.09, dur: 0.12 },   // G4
        { note: 523, time: 1.25, dur: 0.6 },    // C5 (lang)
        // Slot akkoord
        { note: 523, time: 1.9, dur: 0.8 },     // C5
        { note: 659, time: 1.9, dur: 0.8 },     // E5
        { note: 784, time: 1.9, dur: 0.8 },     // G5
    ];

    melody.forEach(({ note, time, dur }) => {
        // Trompet met meerdere oscillators voor brass sound
        [1, 2, 3, 4].forEach((harmonic, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();

            osc.type = i === 0 ? 'sawtooth' : 'square';
            osc.frequency.value = note * harmonic;

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(note * 6, now + time);
            filter.frequency.exponentialRampToValueAtTime(note * 3, now + time + dur);

            const vol = [0.2, 0.08, 0.04, 0.02][i];
            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(vol, now + time + 0.03);
            gain.gain.setValueAtTime(vol * 0.8, now + time + dur - 0.05);
            gain.gain.linearRampToValueAtTime(0.001, now + time + dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now + time);
            osc.stop(now + time + dur + 0.1);
        });
    });

    // Cymbal crashes bij hoogtepunten
    setTimeout(() => {
        const crash = audioContext.createBuffer(2, audioContext.sampleRate * 0.8, audioContext.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = crash.getChannelData(ch);
            for (let i = 0; i < data.length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
            }
        }
        const src = audioContext.createBufferSource();
        const g = audioContext.createGain();
        const f = audioContext.createBiquadFilter();
        src.buffer = crash;
        f.type = 'highpass';
        f.frequency.value = 5000;
        g.gain.value = 0.2;
        src.connect(f);
        f.connect(g);
        g.connect(audioContext.destination);
        src.start();
    }, 400);
}

function playLaughSound() {
    const now = audioContext.currentTime;
    // Gelaagde lach met meerdere "stemmen"

    // Hoofd lach
    const haPattern = [
        { pitch: 380, time: 0 },
        { pitch: 350, time: 0.15 },
        { pitch: 400, time: 0.28 },
        { pitch: 360, time: 0.42 },
        { pitch: 420, time: 0.55 },
        { pitch: 340, time: 0.7 },
        { pitch: 380, time: 0.85 },
    ];

    haPattern.forEach(({ pitch, time }) => {
        // Stem formant
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(pitch, now + time);
        osc1.frequency.linearRampToValueAtTime(pitch * 0.85, now + time + 0.1);

        osc2.type = 'sine';
        osc2.frequency.value = pitch * 2;

        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 2;

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.15, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.12);

        osc1.connect(filter);
        osc2.connect(gain);
        filter.connect(gain);
        gain.connect(audioContext.destination);

        osc1.start(now + time);
        osc2.start(now + time);
        osc1.stop(now + time + 0.12);
        osc2.stop(now + time + 0.12);

        // "H" breath
        const hLen = 0.025;
        const hBuf = audioContext.createBuffer(1, audioContext.sampleRate * hLen, audioContext.sampleRate);
        const hData = hBuf.getChannelData(0);
        for (let i = 0; i < hData.length; i++) {
            hData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / hData.length, 2);
        }
        const hSrc = audioContext.createBufferSource();
        const hGain = audioContext.createGain();
        const hFilter = audioContext.createBiquadFilter();
        hSrc.buffer = hBuf;
        hFilter.type = 'highpass';
        hFilter.frequency.value = 3000;
        hGain.gain.value = 0.08;
        hSrc.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(audioContext.destination);
        hSrc.start(now + time);
    });
}

function playBooSound() {
    const now = audioContext.currentTime;
    const duration = 1.5;

    // Menigte "boooo" met veel stemmen
    for (let v = 0; v < 12; v++) {
        const startTime = now + Math.random() * 0.2;
        const baseFreq = 100 + Math.random() * 80;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, startTime);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.6, startTime + duration);

        // Formant filter voor "oo" klank
        filter.type = 'bandpass';
        filter.frequency.value = 400 + Math.random() * 200;
        filter.Q.value = 3;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.06, startTime + 0.15);
        gain.gain.setValueAtTime(0.05, startTime + duration - 0.3);
        gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
    }

    // Tumult/onrust noise
    const tumultLen = duration;
    const tumult = audioContext.createBuffer(2, audioContext.sampleRate * tumultLen, audioContext.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = tumult.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            const env = Math.sin(Math.PI * i / data.length);
            data[i] = (Math.random() * 2 - 1) * env * 0.05;
        }
    }
    const tumultSrc = audioContext.createBufferSource();
    const tumultFilter = audioContext.createBiquadFilter();
    tumultSrc.buffer = tumult;
    tumultFilter.type = 'bandpass';
    tumultFilter.frequency.value = 600;
    tumultFilter.Q.value = 0.5;
    tumultSrc.connect(tumultFilter);
    tumultFilter.connect(audioContext.destination);
    tumultSrc.start(now);
}

function playWowSound() {
    const now = audioContext.currentTime;

    // Menigte "wooooow!" - stijgend enthousiasme
    for (let v = 0; v < 8; v++) {
        const startTime = now + Math.random() * 0.1;
        const baseFreq = 150 + Math.random() * 50;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        // Stijgend "wow" effect
        osc.frequency.setValueAtTime(baseFreq, startTime);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, startTime + 0.3);
        osc.frequency.linearRampToValueAtTime(baseFreq * 2, startTime + 0.6);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, startTime + 1);

        // Formant beweging W-O-W
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, startTime);
        filter.frequency.linearRampToValueAtTime(600, startTime + 0.2);
        filter.frequency.linearRampToValueAtTime(900, startTime + 0.5);
        filter.frequency.linearRampToValueAtTime(500, startTime + 1);
        filter.Q.value = 4;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.1);
        gain.gain.setValueAtTime(0.1, startTime + 0.5);
        gain.gain.linearRampToValueAtTime(0.001, startTime + 1.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(startTime);
        osc.stop(startTime + 1.2);
    }
}

function playMagicSound() {
    const now = audioContext.currentTime;

    // Stijgende arpeggio (zoals in Harry Potter/Disney)
    const magicNotes = [
        { note: 784, time: 0 },      // G5
        { note: 988, time: 0.08 },   // B5
        { note: 1175, time: 0.16 },  // D6
        { note: 1568, time: 0.24 },  // G6
        { note: 1976, time: 0.32 },  // B6
        { note: 2349, time: 0.40 },  // D7
    ];

    // Magische tonen
    magicNotes.forEach(({ note, time }) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = note;
        gain.gain.setValueAtTime(0.12, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.6);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(now + time);
        osc.stop(now + time + 0.7);

        // Celeste-achtig geluid met harmonics
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = note * 2;
        gain2.gain.setValueAtTime(0.04, now + time);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + time + 0.3);
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.start(now + time);
        osc2.stop(now + time + 0.35);
    });

    // Sparkle/shimmer effect
    for (let i = 0; i < 25; i++) {
        const sparkleTime = now + 0.1 + Math.random() * 1.2;
        const sparkleFreq = 2000 + Math.random() * 4000;

        const sparkle = audioContext.createOscillator();
        const sparkleGain = audioContext.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.value = sparkleFreq;
        sparkleGain.gain.setValueAtTime(0.04, sparkleTime);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, sparkleTime + 0.15);
        sparkle.connect(sparkleGain);
        sparkleGain.connect(audioContext.destination);
        sparkle.start(sparkleTime);
        sparkle.stop(sparkleTime + 0.2);
    }

    // Wind chime achtergrond
    const chimeLen = 1.5;
    const chime = audioContext.createBuffer(2, audioContext.sampleRate * chimeLen, audioContext.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = chime.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            const env = Math.sin(Math.PI * i / data.length);
            data[i] = (Math.random() * 2 - 1) * env * 0.015;
        }
    }
    const chimeSrc = audioContext.createBufferSource();
    const chimeFilter = audioContext.createBiquadFilter();
    chimeSrc.buffer = chime;
    chimeFilter.type = 'highpass';
    chimeFilter.frequency.value = 6000;
    chimeSrc.connect(chimeFilter);
    chimeFilter.connect(audioContext.destination);
    chimeSrc.start(now);
}

function playFartSound() {
    const now = audioContext.currentTime;
    // Grappiger "prrrrt" geluid
    const duration = 0.4 + Math.random() * 0.2;

    const osc = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // Hoofdtoon met trillingen
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 + Math.random() * 30, now);
    osc.frequency.linearRampToValueAtTime(40, now + duration);

    // LFO voor het "flapperen"
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(25, now);
    lfo.frequency.linearRampToValueAtTime(15, now + duration);
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + duration);
    lfo.stop(now + duration);
}

function playBellSound() {
    const now = audioContext.currentTime;
    // Kerkklok-achtig geluid met overtonen
    const fundamental = 440;
    const harmonics = [1, 2, 2.4, 3, 4.5, 5.33, 6.5, 8];
    const volumes = [1, 0.6, 0.4, 0.25, 0.2, 0.15, 0.1, 0.05];

    // Twee slagen
    [0, 0.5].forEach(offset => {
        harmonics.forEach((h, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.value = fundamental * h;
            gain.gain.setValueAtTime(volumes[i] * 0.1, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 2);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 2);
        });

        // Strike attack
        const strikeBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.01, audioContext.sampleRate);
        const strikeData = strikeBuffer.getChannelData(0);
        for (let i = 0; i < strikeData.length; i++) {
            strikeData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / strikeData.length, 4);
        }
        const strike = audioContext.createBufferSource();
        const strikeGain = audioContext.createGain();
        const strikeFilter = audioContext.createBiquadFilter();
        strike.buffer = strikeBuffer;
        strikeFilter.type = 'highpass';
        strikeFilter.frequency.value = 2000;
        strikeGain.gain.value = 0.3;
        strike.connect(strikeFilter);
        strikeFilter.connect(strikeGain);
        strikeGain.connect(audioContext.destination);
        strike.start(now + offset);
    });
}

function playHornSound() {
    const now = audioContext.currentTime;
    // Auto toeter "tuut tuut!"
    const pattern = [
        { start: 0, dur: 0.25 },
        { start: 0.35, dur: 0.4 }
    ];

    pattern.forEach(({ start, dur }) => {
        const osc = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 310;
        osc2.type = 'sawtooth';
        osc2.frequency.value = 392;

        filter.type = 'lowpass';
        filter.frequency.value = 1500;

        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.2, now + start + 0.02);
        gain.gain.setValueAtTime(0.2, now + start + dur - 0.02);
        gain.gain.linearRampToValueAtTime(0.001, now + start + dur);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(now + start);
        osc2.start(now + start);
        osc.stop(now + start + dur);
        osc2.stop(now + start + dur);
    });
}

function playWhistleSound() {
    const now = audioContext.currentTime;
    // Scheidsrechter fluitje
    const osc = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc2.type = 'sine';

    // Twee tonen die licht variëren
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.setValueAtTime(2850, now + 0.1);
    osc.frequency.setValueAtTime(2800, now + 0.2);

    osc2.frequency.setValueAtTime(2400, now);
    osc2.frequency.setValueAtTime(2450, now + 0.1);
    osc2.frequency.setValueAtTime(2400, now + 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.setValueAtTime(0.15, now + 0.5);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.6);
    osc2.stop(now + 0.6);

    // Breath/air component
    const breathBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.6, audioContext.sampleRate);
    const breathData = breathBuffer.getChannelData(0);
    for (let i = 0; i < breathData.length; i++) {
        const env = i < breathData.length * 0.1 ? i / (breathData.length * 0.1) : 1 - (i - breathData.length * 0.1) / (breathData.length * 0.9);
        breathData[i] = (Math.random() * 2 - 1) * env * 0.1;
    }
    const breath = audioContext.createBufferSource();
    const breathFilter = audioContext.createBiquadFilter();
    const breathGain = audioContext.createGain();
    breath.buffer = breathBuffer;
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = 4000;
    breathFilter.Q.value = 1;
    breathGain.gain.value = 0.5;
    breath.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(audioContext.destination);
    breath.start(now);
}

function playExplosionSound() {
    const now = audioContext.currentTime;
    const duration = 1;

    // Lage dreun
    const boom = audioContext.createOscillator();
    const boomGain = audioContext.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(100, now);
    boom.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    boomGain.gain.setValueAtTime(0.5, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    boom.connect(boomGain);
    boomGain.connect(audioContext.destination);
    boom.start(now);
    boom.stop(now + 0.5);

    // Noise burst
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
        }
    }

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start(now);

    // Debris/crackle
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const crackle = audioContext.createOscillator();
            const crackleGain = audioContext.createGain();
            crackle.type = 'sawtooth';
            crackle.frequency.value = 100 + Math.random() * 200;
            crackleGain.gain.setValueAtTime(0.05, audioContext.currentTime);
            crackleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
            crackle.connect(crackleGain);
            crackleGain.connect(audioContext.destination);
            crackle.start();
            crackle.stop(audioContext.currentTime + 0.05);
        }, 100 + Math.random() * 500);
    }
}

// ==========================================
// APPLAUS KNOP
// ==========================================
let applauseCount = 0;

function loadApplauseCount() {
    const ref = database.ref('applause');
    ref.on('value', (snapshot) => {
        applauseCount = snapshot.val() || 0;
        const el = document.getElementById('applause-count');
        if (el) el.textContent = applauseCount;
    });
}

function addApplause() {
    database.ref('applause').transaction((current) => (current || 0) + 1);
    playApplauseSound();
    createClapEffect();
    launchConfetti();
}

function createClapEffect() {
    const container = document.getElementById('clap-effects');
    const emoji = document.createElement('div');
    emoji.className = 'clap-emoji';
    emoji.textContent = ['👏', '🎉', '⭐', '❤️'][Math.floor(Math.random() * 4)];
    emoji.style.left = Math.random() * 80 + 10 + '%';
    container.appendChild(emoji);
    setTimeout(() => emoji.remove(), 1000);
}

// ==========================================
// COUNTDOWN TIMER
// ==========================================
let countdownInterval = null;

function loadCountdown() {
    const setupEl = document.getElementById('countdown-setup');
    const displayEl = document.getElementById('countdown-display');
    const titleEl = document.getElementById('countdown-show-title');
    if (!setupEl || !displayEl) return;

    const ref = database.ref('countdown');
    ref.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.targetTime > Date.now()) {
            setupEl.classList.add('hidden');
            displayEl.classList.remove('hidden');
            if (titleEl) titleEl.textContent = data.showName;
            startCountdown(data.targetTime);
        } else {
            setupEl.classList.remove('hidden');
            displayEl.classList.add('hidden');
            if (countdownInterval) clearInterval(countdownInterval);
        }
    });
}

function setCountdown() {
    const datetime = document.getElementById('show-datetime').value;
    const showName = document.getElementById('show-countdown-name').value || 'Volgende Show';

    if (!datetime) {
        alert('Kies een datum en tijd!');
        return;
    }

    const targetTime = new Date(datetime).getTime();
    if (targetTime <= Date.now()) {
        alert('Kies een moment in de toekomst!');
        return;
    }

    database.ref('countdown').set({
        targetTime: targetTime,
        showName: showName
    });

    playSuccessSound();
}

function startCountdown(targetTime) {
    if (countdownInterval) clearInterval(countdownInterval);

    function updateDisplay() {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
            document.getElementById('countdown-days').textContent = '0';
            document.getElementById('countdown-hours').textContent = '0';
            document.getElementById('countdown-minutes').textContent = '0';
            document.getElementById('countdown-seconds').textContent = '0';
            clearInterval(countdownInterval);
            launchConfetti();
            playFanfare();
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('countdown-days').textContent = days;
        document.getElementById('countdown-hours').textContent = hours;
        document.getElementById('countdown-minutes').textContent = minutes;
        document.getElementById('countdown-seconds').textContent = seconds;
    }

    updateDisplay();
    countdownInterval = setInterval(updateDisplay, 1000);
}

function resetCountdown() {
    database.ref('countdown').remove();
}

// ==========================================
// RAD VAN FORTUIN
// ==========================================
const wheelPrizes = [
    { text: 'Sticker!', emoji: '🎫', stars: 2, action: 'sticker' },
    { text: '5 Sterren!', emoji: '⭐', stars: 5, action: 'stars' },
    { text: 'MEGA Confetti!', emoji: '🎉', stars: 1, action: 'confetti' },
    { text: 'VIP Badge!', emoji: '👑', stars: 5, action: 'vip' },
    { text: 'Magisch Geluid!', emoji: '🎵', stars: 2, action: 'magic' },
    { text: '10 Sterren!', emoji: '🌟', stars: 10, action: 'stars' },
    { text: '2 Stickers!', emoji: '🎭', stars: 3, action: 'doublesticker' },
    { text: 'JACKPOT 25!', emoji: '💎', stars: 25, action: 'jackpot' }
];

let isSpinning = false;

function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;

    const wheel = document.getElementById('fortune-wheel');
    const resultDiv = document.getElementById('wheel-result');
    resultDiv.classList.add('hidden');

    // Random hoek (minimaal 5 volledige rotaties + random positie)
    const spins = 5 + Math.random() * 3;
    const segmentAngle = 360 / 8;
    const prizeIndex = Math.floor(Math.random() * 8);
    const targetAngle = spins * 360 + (360 - prizeIndex * segmentAngle - segmentAngle / 2);

    wheel.style.transform = `rotate(${targetAngle}deg)`;

    playDrumroll();

    setTimeout(() => {
        const prize = wheelPrizes[prizeIndex];

        // Voer actie uit gebaseerd op prijs
        let extraMessage = '';
        switch (prize.action) {
            case 'sticker':
                giveRandomSticker();
                extraMessage = ' + Nieuwe sticker!';
                break;
            case 'confetti':
                fireConfettiCannon();
                extraMessage = ' BOEM!';
                break;
            case 'vip':
                unlockBadge('vip');
                extraMessage = ' VIP Badge ontgrendeld!';
                break;
            case 'magic':
                playMagicSound();
                extraMessage = ' ✨';
                break;
            case 'doublesticker':
                giveRandomSticker();
                giveRandomSticker();
                extraMessage = ' + 2 Stickers!';
                break;
            case 'jackpot':
                unlockBadge('stars-100');
                fireConfettiCannon();
                extraMessage = ' JACKPOT!!!';
                break;
            default:
                extraMessage = '';
        }

        resultDiv.innerHTML = `${prize.emoji} ${prize.text}${extraMessage}`;
        resultDiv.classList.remove('hidden');

        if (prize.action !== 'confetti') {
            playFanfare();
            launchConfetti();
        }

        // Voeg sterren toe
        if (prize.stars > 0) {
            addStars(prize.stars);
        }

        // Unlock wheel-spin badge
        unlockBadge('wheel-spin');

        isSpinning = false;
    }, 4000);
}

// ==========================================
// STERREN SYSTEEM
// ==========================================
function addStars(amount) {
    const visitorId = getVisitorId();
    const ref = database.ref('stars/' + visitorId);
    ref.transaction((current) => (current || 0) + amount);
    updateYourStats();
}

function getVisitorId() {
    let id = localStorage.getItem('joerieVisitorId');
    if (!id) {
        id = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('joerieVisitorId', id);
    }
    return id;
}

function updateYourStats() {
    const visitorId = getVisitorId();

    database.ref('stars/' + visitorId).on('value', (snapshot) => {
        const el = document.getElementById('your-stars');
        if (el) el.textContent = snapshot.val() || 0;
    });

    database.ref('tickets/' + visitorId).on('value', (snapshot) => {
        const el = document.getElementById('your-tickets');
        if (el) el.textContent = snapshot.val() || 0;
    });

    database.ref('badges/' + visitorId).on('value', (snapshot) => {
        const el = document.getElementById('your-badges');
        if (el) el.textContent = snapshot.val() || 0;
    });
}

function loadHallOfFame() {
    const ref = database.ref('stars');
    ref.orderByValue().limitToLast(10).on('value', (snapshot) => {
        try {
            const data = snapshot.val() || {};
            const sorted = Object.entries(data)
                .map(([id, stars]) => ({ id, stars }))
                .sort((a, b) => b.stars - a.stars);

            // Update podium
            updatePodium(sorted);

            // Update list
            updateFameList(sorted.slice(3));
        } catch(e) {
            console.error('Hall of Fame update fout:', e);
        }
    });
}

function updatePodium(sorted) {
    for (let i = 0; i < 3; i++) {
        const spot = document.getElementById('podium-' + (i + 1));
        if (sorted[i]) {
            const name = sorted[i].id.startsWith('visitor_') ? 'Fan #' + sorted[i].id.slice(-4) : sorted[i].id;
            spot.querySelector('.podium-name').textContent = name;
            spot.querySelector('.podium-stars').textContent = sorted[i].stars + ' ⭐';
        }
    }
}

function updateFameList(others) {
    const list = document.getElementById('fame-list');
    list.innerHTML = '';

    others.forEach((item, index) => {
        const name = item.id.startsWith('visitor_') ? 'Fan #' + item.id.slice(-4) : item.id;
        const div = document.createElement('div');
        div.className = 'fame-item';
        div.innerHTML = `
            <span class="fame-rank">${index + 4}</span>
            <span class="fame-name">${escapeHtml(name)}</span>
            <span class="fame-stars">${item.stars} ⭐</span>
        `;
        list.appendChild(div);
    });
}

// ==========================================
// GASTENBOEK
// ==========================================
function loadGuestbook() {
    const container = document.getElementById('guestbook-messages');
    if (!container) return;

    const ref = database.ref('guestbook');
    ref.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        const data = snapshot.val();

        if (!data) {
            container.innerHTML = '<p class="empty-message">Nog geen berichten</p>';
            return;
        }

        const messages = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
        container.innerHTML = '';

        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'guest-message';
            const date = new Date(msg.timestamp);
            div.innerHTML = `
                <div class="guest-header">
                    <span class="guest-name">${escapeHtml(msg.name || '')}</span>
                    <span class="guest-time">${date.toLocaleDateString('nl-NL')}</span>
                </div>
                <div class="guest-text">${escapeHtml(msg.message || '')}</div>
            `;
            container.appendChild(div);
        });
    });
}

function postGuestbookMessage() {
    const name = document.getElementById('guest-name').value.trim();
    const message = document.getElementById('guest-message').value.trim();

    if (!name || !message) {
        alert('Vul je naam en bericht in!');
        return;
    }

    database.ref('guestbook').push({
        name: name,
        message: message,
        timestamp: Date.now()
    });

    document.getElementById('guest-name').value = '';
    document.getElementById('guest-message').value = '';

    playSuccessSound();
    addStars(1); // 1 ster voor gastenboek bericht
}

// ==========================================
// KARAKTER MAKER
// ==========================================
let currentCharacter = {
    hat: '🎩',
    face: '😊',
    body: '👔',
    accessory: ''
};

function updateCharacterPreview() {
    document.getElementById('char-hat').textContent = currentCharacter.hat;
    document.getElementById('char-face').textContent = currentCharacter.face;
    document.getElementById('char-body').textContent = currentCharacter.body;
    document.getElementById('char-accessory').textContent = currentCharacter.accessory;
}

function selectCharacterOption(target, value) {
    currentCharacter[target] = value;
    updateCharacterPreview();
    playClickSound();

    // Update active state
    document.querySelectorAll(`.option-buttons[data-target="${target}"] .char-option`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === value);
    });
}

function saveCharacter() {
    const name = document.getElementById('character-name').value.trim();
    if (!name) {
        alert('Geef je karakter een naam!');
        return;
    }

    const characters = JSON.parse(localStorage.getItem('joerieCharacters') || '[]');
    characters.push({
        name: name,
        ...currentCharacter
    });
    localStorage.setItem('joerieCharacters', JSON.stringify(characters));

    document.getElementById('character-name').value = '';
    renderSavedCharacters();
    playSuccessSound();
    addStars(2); // 2 sterren voor karakter maken
}

function renderSavedCharacters() {
    const container = document.getElementById('characters-list');
    if (!container) return;

    const characters = JSON.parse(localStorage.getItem('joerieCharacters') || '[]');

    if (characters.length === 0) {
        container.innerHTML = '<p class="empty-message">Nog geen karakters opgeslagen</p>';
        return;
    }

    container.innerHTML = '';
    characters.forEach((char, index) => {
        const div = document.createElement('div');
        div.className = 'saved-character';
        div.innerHTML = `
            <div class="saved-char-display">
                ${char.hat || ''} ${char.face || ''} ${char.body || ''} ${char.accessory || ''}
            </div>
            <div class="saved-char-name">${escapeHtml(char.name || '')}</div>
        `;
        container.appendChild(div);
    });
}

// ==========================================
// SPOOKMODUS
// ==========================================
function toggleSpookyMode() {
    document.body.classList.toggle('spooky-mode');
    const isSpooky = document.body.classList.contains('spooky-mode');
    localStorage.setItem('joerieSpookyMode', isSpooky);

    if (isSpooky) {
        playBooSound();
    } else {
        playSuccessSound();
    }
}

function loadSpookyMode() {
    const isSpooky = localStorage.getItem('joerieSpookyMode') === 'true';
    if (isSpooky) {
        document.body.classList.add('spooky-mode');
    }
}

// ==========================================
// KRASKAART
// ==========================================
const scratchPrizes = [
    { emoji: '⭐', text: '3 Sterren!', stars: 3 },
    { emoji: '🎉', text: 'Extra Confetti!', stars: 0 },
    { emoji: '👑', text: 'VIP Status!', stars: 5 },
    { emoji: '🌟', text: '10 Sterren!', stars: 10 },
    { emoji: '💎', text: 'Diamant!', stars: 15 },
    { emoji: '🎭', text: 'Bonus Show!', stars: 2 }
];

let scratchPrize = null;

function initScratchCard() {
    const canvas = document.getElementById('scratch-canvas');
    const ctx = canvas.getContext('2d');

    // Kies random prijs
    scratchPrize = scratchPrizes[Math.floor(Math.random() * scratchPrizes.length)];
    document.getElementById('scratch-prize').innerHTML = `
        <span class="prize-emoji">${scratchPrize.emoji}</span>
        <span class="prize-text">${scratchPrize.text}</span>
    `;

    // Teken krasklaag
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Voeg patroon toe
    ctx.fillStyle = '#ff4444';
    ctx.font = '20px Arial';
    for (let y = 20; y < canvas.height; y += 40) {
        for (let x = 10; x < canvas.width; x += 50) {
            ctx.fillText('🎁', x, y);
        }
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.fillText('KRAS HIER!', canvas.width/2, canvas.height/2);

    let isDrawing = false;
    let scratched = 0;
    const totalPixels = canvas.width * canvas.height;

    function scratch(x, y) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();

        // Check hoeveel gekrast is
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let transparent = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] === 0) transparent++;
        }
        scratched = transparent / (totalPixels);

        if (scratched > 0.5) {
            // Prijs gewonnen!
            document.getElementById('claim-scratch-btn').classList.remove('hidden');
            canvas.style.opacity = '0';
        }
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        return { x, y };
    }

    canvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(getPos(e).x, getPos(e).y); });
    canvas.addEventListener('mousemove', (e) => { if (isDrawing) scratch(getPos(e).x, getPos(e).y); });
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; scratch(getPos(e).x, getPos(e).y); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (isDrawing) scratch(getPos(e).x, getPos(e).y); });
    canvas.addEventListener('touchend', () => isDrawing = false);
}

function claimScratchPrize() {
    if (scratchPrize && scratchPrize.stars > 0) {
        addStars(scratchPrize.stars);
    }
    launchConfetti();
    playSuccessSound();
    document.getElementById('scratch-modal').classList.add('hidden');
}

function showScratchCard() {
    document.getElementById('scratch-modal').classList.remove('hidden');
    document.getElementById('claim-scratch-btn').classList.add('hidden');
    document.getElementById('scratch-canvas').style.opacity = '1';
    initScratchCard();
}

// ==========================================
// TAB NAVIGATIE
// ==========================================
function setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;

            // Update active button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Update active content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('tab-' + tabId).classList.add('active');

            playClickSound();
        });
    });
}

// ==========================================
// HEADER STERREN
// ==========================================
function updateHeaderStars() {
    const visitorId = getVisitorId();
    database.ref('stars/' + visitorId).on('value', (snapshot) => {
        const stars = snapshot.val() || 0;
        const el = document.getElementById('header-stars');
        if (el) el.textContent = stars;
    });
}

// ==========================================
// RAD VAN FORTUIN - FIX
// ==========================================
function initFortuneWheel() {
    const wheel = document.getElementById('fortune-wheel');
    if (!wheel) return;

    // Emoji's voor elk segment
    const prizes = ['🎫', '⭐', '🎉', '👑', '🎵', '🌟', '🎭', '💎'];

    // Clear wheel (maar hou de achtergrond via CSS)
    wheel.innerHTML = '';

    // Voeg emoji's toe in een cirkel
    prizes.forEach((prize, i) => {
        const emoji = document.createElement('div');
        emoji.className = 'wheel-emoji';
        emoji.textContent = prize;

        // Bereken positie in cirkel (elk segment = 45 graden)
        const angle = (i * 45 + 22.5) * (Math.PI / 180); // +22.5 voor midden van segment
        const radius = 75; // afstand van centrum
        const x = 125 + radius * Math.sin(angle) - 15; // 125 = helft van 250px wheel
        const y = 125 - radius * Math.cos(angle) - 15;

        emoji.style.left = x + 'px';
        emoji.style.top = y + 'px';

        wheel.appendChild(emoji);
    });
}

// ==========================================
// MEMORY SPEL
// ==========================================
let memoryCards = [];
let memoryFlipped = [];
let memoryMoves = 0;
let memoryScore = 0;
let memoryLocked = false;

const memoryEmojis = ['🎭', '🎪', '🎨', '🎵', '⭐', '🎁', '🎈', '🎉'];

function initMemoryGame() {
    const grid = document.getElementById('memory-grid');
    if (!grid) return;

    // Reset
    memoryMoves = 0;
    memoryScore = 0;
    memoryFlipped = [];
    memoryLocked = false;
    document.getElementById('memory-moves').textContent = '0';
    document.getElementById('memory-score').textContent = '0';

    // Maak kaarten (elk emoji 2x)
    memoryCards = [...memoryEmojis, ...memoryEmojis];

    // Shuffle
    for (let i = memoryCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [memoryCards[i], memoryCards[j]] = [memoryCards[j], memoryCards[i]];
    }

    // Render
    grid.innerHTML = '';
    memoryCards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.index = index;
        card.dataset.emoji = emoji;
        card.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-front">?</div>
                <div class="memory-card-back">${emoji}</div>
            </div>
        `;
        card.addEventListener('click', () => flipMemoryCard(card));
        grid.appendChild(card);
    });
}

function flipMemoryCard(card) {
    if (memoryLocked) return;
    if (card.classList.contains('flipped')) return;
    if (memoryFlipped.length >= 2) return;

    card.classList.add('flipped');
    memoryFlipped.push(card);
    playClickSound();

    if (memoryFlipped.length === 2) {
        memoryMoves++;
        document.getElementById('memory-moves').textContent = memoryMoves;

        const [card1, card2] = memoryFlipped;

        if (card1.dataset.emoji === card2.dataset.emoji) {
            // Match!
            memoryScore += 10;
            document.getElementById('memory-score').textContent = memoryScore;
            playSuccessSound();
            memoryFlipped = [];

            // Check win
            const allFlipped = document.querySelectorAll('.memory-card.flipped');
            if (allFlipped.length === memoryCards.length) {
                setTimeout(() => {
                    alert('Gewonnen! Score: ' + memoryScore);
                    addStars(5);
                    unlockBadge('memory-win');
                    incrementGameCount();
                }, 500);
            }
        } else {
            // No match
            memoryLocked = true;
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                memoryFlipped = [];
                memoryLocked = false;
            }, 1000);
        }
    }
}

// ==========================================
// QUIZ SPEL
// ==========================================
const quizQuestions = [
    { q: 'Welke kleur heeft de zon?', a: ['Geel', 'Blauw', 'Groen', 'Paars'], correct: 0 },
    { q: 'Hoeveel poten heeft een hond?', a: ['2', '4', '6', '8'], correct: 1 },
    { q: 'Welk dier zegt "Boe"?', a: ['Kip', 'Varken', 'Koe', 'Schaap'], correct: 2 },
    { q: 'Wat eet een konijn graag?', a: ['Vis', 'Wortel', 'Spaghetti', 'Kaas'], correct: 1 },
    { q: 'Hoeveel dagen heeft een week?', a: ['5', '6', '7', '8'], correct: 2 },
    { q: 'Welke kleur krijg je van rood + geel?', a: ['Groen', 'Paars', 'Oranje', 'Bruin'], correct: 2 },
    { q: 'Waar woont een vis?', a: ['Boom', 'Water', 'Berg', 'Wolk'], correct: 1 },
    { q: 'Wat komt er uit een ei?', a: ['Appel', 'Steen', 'Kuiken', 'Bloem'], correct: 2 },
];

let currentQuestion = 0;
let quizPoints = 0;
let quizActive = false;

function startQuiz() {
    currentQuestion = 0;
    quizPoints = 0;
    quizActive = true;
    document.getElementById('quiz-points').textContent = '0';
    showQuizQuestion();
    playClickSound();
}

function showQuizQuestion() {
    if (currentQuestion >= quizQuestions.length) {
        endQuiz();
        return;
    }

    const q = quizQuestions[currentQuestion];
    document.getElementById('quiz-question').textContent = q.q;

    const answersDiv = document.getElementById('quiz-answers');
    answersDiv.innerHTML = '';

    q.a.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-answer-btn';
        btn.textContent = answer;
        btn.addEventListener('click', () => checkQuizAnswer(index));
        answersDiv.appendChild(btn);
    });
}

function checkQuizAnswer(index) {
    if (!quizActive) return;

    const q = quizQuestions[currentQuestion];
    const buttons = document.querySelectorAll('.quiz-answer-btn');

    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correct) {
            btn.classList.add('correct');
        } else if (i === index) {
            btn.classList.add('wrong');
        }
    });

    if (index === q.correct) {
        quizPoints += 10;
        document.getElementById('quiz-points').textContent = quizPoints;
        playSuccessSound();
    } else {
        playBooSound();
    }

    currentQuestion++;
    setTimeout(showQuizQuestion, 1500);
}

function endQuiz() {
    quizActive = false;
    document.getElementById('quiz-question').textContent = `Quiz klaar! Score: ${quizPoints}/${quizQuestions.length * 10}`;
    document.getElementById('quiz-answers').innerHTML = '';

    addStars(Math.floor(quizPoints / 10));
    incrementGameCount();

    if (quizPoints === quizQuestions.length * 10) {
        unlockBadge('quiz-perfect');
        launchConfetti();
    }
}

// ==========================================
// BALLOON POP
// ==========================================
let balloonScore = 0;
let balloonTime = 30;
let balloonInterval = null;
let balloonSpawnInterval = null;
let balloonActive = false;

function startBalloonGame() {
    // Stop als er al een spel loopt
    if (balloonActive) {
        endBalloonGame();
        return;
    }

    const area = document.getElementById('balloon-area');
    if (!area) return;

    balloonScore = 0;
    balloonTime = 30;
    balloonActive = true;

    document.getElementById('balloon-score').textContent = '0';
    document.getElementById('balloon-time').textContent = '30';
    document.getElementById('balloon-start-btn').textContent = 'Stop!';
    area.innerHTML = '';

    // Spawn balloons
    balloonSpawnInterval = setInterval(spawnBalloon, 800);

    // Timer
    balloonInterval = setInterval(() => {
        if (!balloonActive) return;

        balloonTime--;
        const timeEl = document.getElementById('balloon-time');
        if (timeEl) timeEl.textContent = Math.max(0, balloonTime);

        if (balloonTime <= 0) {
            endBalloonGame();
        }
    }, 1000);

    playClickSound();
}

function spawnBalloon() {
    if (!balloonActive) return;

    const area = document.getElementById('balloon-area');
    if (!area) return;

    const balloon = document.createElement('div');
    balloon.className = 'balloon';

    // Alleen echte ballonnen!
    const balloonColors = ['🎈', '🩷', '💙', '💚', '💛', '🩵', '💜', '🧡'];
    balloon.textContent = balloonColors[Math.floor(Math.random() * balloonColors.length)];
    balloon.style.left = Math.random() * 80 + 10 + '%';
    balloon.style.animationDuration = (2 + Math.random() * 2) + 's';

    balloon.addEventListener('click', () => popBalloon(balloon));
    balloon.addEventListener('touchstart', (e) => {
        e.preventDefault();
        popBalloon(balloon);
    });
    area.appendChild(balloon);

    // Remove after animation
    setTimeout(() => {
        if (balloon.parentNode) balloon.remove();
    }, 4000);
}

function popBalloon(balloon) {
    if (!balloonActive) return;
    if (balloon.classList.contains('popped')) return;

    balloon.classList.add('popped');
    balloonScore += 10;
    document.getElementById('balloon-score').textContent = balloonScore;

    // Pop geluid
    const pop = audioContext.createOscillator();
    const popGain = audioContext.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(800, audioContext.currentTime);
    pop.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.05);
    popGain.gain.setValueAtTime(0.2, audioContext.currentTime);
    popGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
    pop.connect(popGain);
    popGain.connect(audioContext.destination);
    pop.start();
    pop.stop(audioContext.currentTime + 0.05);

    setTimeout(() => balloon.remove(), 200);
}

function endBalloonGame() {
    balloonActive = false;

    if (balloonInterval) {
        clearInterval(balloonInterval);
        balloonInterval = null;
    }
    if (balloonSpawnInterval) {
        clearInterval(balloonSpawnInterval);
        balloonSpawnInterval = null;
    }

    const startBtn = document.getElementById('balloon-start-btn');
    if (startBtn) startBtn.textContent = 'Start!';

    const area = document.getElementById('balloon-area');
    if (area && balloonScore > 0) {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.className = 'game-over';
        gameOverDiv.textContent = `Game Over! Score: ${balloonScore} - Klik om opnieuw te spelen`;
        gameOverDiv.addEventListener('click', () => {
            gameOverDiv.remove();
            startBalloonGame();
        });
        area.innerHTML = '';
        area.appendChild(gameOverDiv);

        addStars(Math.floor(balloonScore / 20));
        incrementGameCount();
        playFanfare();
    }
}

// ==========================================
// WHACK-A-MOLE
// ==========================================
let whackScore = 0;
let whackTime = 30;
let whackInterval = null;
let whackMoleInterval = null;
let whackActive = false;

function startWhackGame() {
    // Stop als er al een spel loopt
    if (whackActive) {
        endWhackGame();
        return;
    }

    whackScore = 0;
    whackTime = 30;
    whackActive = true;

    document.getElementById('whack-score').textContent = '0';
    document.getElementById('whack-time').textContent = '30';
    document.getElementById('whack-start-btn').textContent = 'Stop!';

    // Hide all moles
    document.querySelectorAll('.mole').forEach(m => {
        m.classList.remove('visible');
        m.classList.remove('hit');
    });

    // Show random moles
    whackMoleInterval = setInterval(showRandomMole, 700);

    // Timer
    whackInterval = setInterval(() => {
        if (!whackActive) return;

        whackTime--;
        const timeEl = document.getElementById('whack-time');
        if (timeEl) timeEl.textContent = Math.max(0, whackTime);

        if (whackTime <= 0) {
            endWhackGame();
        }
    }, 1000);

    playClickSound();
}

function showRandomMole() {
    if (!whackActive) return;

    const moles = document.querySelectorAll('.mole');
    const randomIndex = Math.floor(Math.random() * moles.length);
    const mole = moles[randomIndex];

    // Alleen tonen als niet al zichtbaar
    if (!mole.classList.contains('visible')) {
        mole.classList.add('visible');

        setTimeout(() => {
            if (whackActive) {
                mole.classList.remove('visible');
            }
        }, 500 + Math.random() * 500);
    }
}

function whackMole(hole) {
    if (!whackActive) return;

    const mole = hole.querySelector('.mole');
    if (mole && mole.classList.contains('visible')) {
        mole.classList.remove('visible');
        mole.classList.add('hit');
        whackScore += 10;
        document.getElementById('whack-score').textContent = whackScore;

        // Whack geluid
        const whack = audioContext.createOscillator();
        const whackGain = audioContext.createGain();
        whack.type = 'triangle';
        whack.frequency.setValueAtTime(300, audioContext.currentTime);
        whack.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
        whackGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        whackGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        whack.connect(whackGain);
        whackGain.connect(audioContext.destination);
        whack.start();
        whack.stop(audioContext.currentTime + 0.1);

        setTimeout(() => mole.classList.remove('hit'), 200);
    }
}

function endWhackGame() {
    whackActive = false;

    if (whackInterval) {
        clearInterval(whackInterval);
        whackInterval = null;
    }
    if (whackMoleInterval) {
        clearInterval(whackMoleInterval);
        whackMoleInterval = null;
    }

    const startBtn = document.getElementById('whack-start-btn');
    if (startBtn) startBtn.textContent = 'Start!';

    // Hide all moles
    document.querySelectorAll('.mole').forEach(m => {
        m.classList.remove('visible');
        m.classList.remove('hit');
    });

    if (whackScore > 0) {
        playFanfare();
        addStars(Math.floor(whackScore / 20));
        incrementGameCount();

        // Toon score in het speelveld
        const grid = document.getElementById('whack-grid');
        if (grid) {
            const gameOver = document.createElement('div');
            gameOver.className = 'game-over-overlay';
            gameOver.innerHTML = `<div class="game-over-text">Score: ${whackScore}!</div>`;
            gameOver.addEventListener('click', () => gameOver.remove());
            grid.appendChild(gameOver);

            setTimeout(() => {
                if (gameOver.parentNode) gameOver.remove();
            }, 3000);
        }
    }
}

// ==========================================
// MUZIEK MAKER
// ==========================================
const pianoNotes = {
    'C': 261.63, 'Cs': 277.18, 'D': 293.66, 'Ds': 311.13,
    'E': 329.63, 'F': 349.23, 'Fs': 369.99, 'G': 392.00,
    'Gs': 415.30, 'A': 440.00, 'As': 466.16, 'B': 493.88
};

function playPianoNote(note) {
    const freq = pianoNotes[note];
    if (!freq) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
}

function playDrumSound(drum) {
    switch(drum) {
        case 'kick':
            playKickDrum();
            break;
        case 'snare':
            playSnareDrum();
            break;
        case 'hihat':
            playHiHat();
            break;
        case 'cymbal':
            playCymbal();
            break;
    }
}

function playKickDrum() {
    const now = audioContext.currentTime;

    // Sub bass
    const sub = audioContext.createOscillator();
    const subGain = audioContext.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    sub.connect(subGain);
    subGain.connect(audioContext.destination);
    sub.start(now);
    sub.stop(now + 0.3);

    // Click/attack
    const click = audioContext.createOscillator();
    const clickGain = audioContext.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(1000, now);
    click.frequency.exponentialRampToValueAtTime(200, now + 0.02);
    clickGain.gain.setValueAtTime(0.4, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    click.connect(clickGain);
    clickGain.connect(audioContext.destination);
    click.start(now);
    click.stop(now + 0.05);

    // Punch
    const punch = audioContext.createOscillator();
    const punchGain = audioContext.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(80, now);
    punch.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    punchGain.gain.setValueAtTime(0.5, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    punch.connect(punchGain);
    punchGain.connect(audioContext.destination);
    punch.start(now);
    punch.stop(now + 0.15);
}

function playSnareDrum() {
    const now = audioContext.currentTime;

    // Snare body (toon)
    const body = audioContext.createOscillator();
    const bodyGain = audioContext.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(200, now);
    body.frequency.exponentialRampToValueAtTime(120, now + 0.05);
    bodyGain.gain.setValueAtTime(0.4, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    body.connect(bodyGain);
    bodyGain.connect(audioContext.destination);
    body.start(now);
    body.stop(now + 0.1);

    // Snare wires (noise)
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.15, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 2);
    }

    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 4000;
    noiseFilter.Q.value = 1;
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now);
}

function playHiHat() {
    const now = audioContext.currentTime;

    // Metallic component (multiple high frequencies)
    const freqs = [4000, 6000, 8000, 10000];
    freqs.forEach(freq => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'square';
        osc.frequency.value = freq + Math.random() * 500;
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    });

    // Noise
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.05, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 4);
    }

    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 7000;
    noiseGain.gain.setValueAtTime(0.3, now);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now);
}

function playCymbal() {
    const now = audioContext.currentTime;

    // Multiple metallic frequencies
    const freqs = [300, 450, 600, 800, 1200, 2000, 3000, 5000, 7000];
    freqs.forEach(freq => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq * (0.98 + Math.random() * 0.04);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 1.5);
    });

    // Crash noise
    const noiseBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 1.5, audioContext.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = noiseBuffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.2);
        }
    }

    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 5000;
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now);

    // Attack transient
    const attack = audioContext.createOscillator();
    const attackGain = audioContext.createGain();
    attack.type = 'sawtooth';
    attack.frequency.value = 200;
    attackGain.gain.setValueAtTime(0.2, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    attack.connect(attackGain);
    attackGain.connect(audioContext.destination);
    attack.start(now);
    attack.stop(now + 0.02);
}

// ==========================================
// EMOJI VERHAAL
// ==========================================
let currentStory = [];

function addEmojiToStory(emoji) {
    currentStory.push(emoji);
    renderEmojiStory();
    playClickSound();
}

function renderEmojiStory() {
    const display = document.getElementById('emoji-story-display');
    if (currentStory.length === 0) {
        display.innerHTML = '<p class="empty-message">Klik op emoji\'s om je verhaal te maken!</p>';
    } else {
        display.innerHTML = currentStory.map(e => `<span class="story-item">${e}</span>`).join('');
    }
}

function clearEmojiStory() {
    currentStory = [];
    renderEmojiStory();
    playClickSound();
}

function saveEmojiStory() {
    if (currentStory.length === 0) {
        alert('Maak eerst een verhaal!');
        return;
    }

    const stories = JSON.parse(localStorage.getItem('joerieStories') || '[]');
    stories.push({
        story: [...currentStory],
        date: Date.now()
    });
    localStorage.setItem('joerieStories', JSON.stringify(stories));

    playSuccessSound();
    addStars(2);
    alert('Verhaal opgeslagen!');
}

function loadEmojiStories() {
    // Verhalen worden lokaal opgeslagen
}

// ==========================================
// FAN MAIL
// ==========================================
function sendFanMail() {
    const name = document.getElementById('fanmail-name').value.trim();
    const message = document.getElementById('fanmail-message').value.trim();

    if (!name || !message) {
        alert('Vul je naam en bericht in!');
        return;
    }

    database.ref('fanmail').push({
        name: name,
        message: message,
        timestamp: Date.now()
    });

    document.getElementById('fanmail-name').value = '';
    document.getElementById('fanmail-message').value = '';
    document.querySelector('.fanmail-form').classList.add('hidden');
    document.getElementById('fanmail-sent').classList.remove('hidden');

    playSuccessSound();
    addStars(2);

    setTimeout(() => {
        document.querySelector('.fanmail-form').classList.remove('hidden');
        document.getElementById('fanmail-sent').classList.add('hidden');
    }, 3000);
}

// ==========================================
// STEMMEN
// ==========================================
function loadVotingShows() {
    const container = document.getElementById('voting-shows');
    if (!container) return;

    database.ref('shows').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = '<p class="empty-message">Nog geen shows om op te stemmen</p>';
            return;
        }

        container.innerHTML = '';
        Object.keys(data).forEach(id => {
            const show = data[id];
            const div = document.createElement('div');
            div.className = 'voting-item';

            database.ref('votes/' + id).on('value', (voteSnap) => {
                const votes = voteSnap.val() || 0;
                div.innerHTML = `
                    <span class="vote-name">${escapeHtml(show.name)}</span>
                    <span class="vote-count">${votes} ❤️</span>
                    <button class="vote-btn" onclick="voteForShow('${id}')">Stem!</button>
                `;
            });

            container.appendChild(div);
        });
    });
}

function voteForShow(showId) {
    const visitorId = getVisitorId();
    const voteRef = database.ref('userVotes/' + visitorId + '/' + showId);

    voteRef.once('value', (snapshot) => {
        if (snapshot.val()) {
            alert('Je hebt al op deze show gestemd!');
            return;
        }

        voteRef.set(true);
        database.ref('votes/' + showId).transaction((current) => (current || 0) + 1);
        playSuccessSound();
        addStars(1);
    });
}

// ==========================================
// FAN CLUB KAART
// ==========================================
function generateFanClubCard() {
    const name = document.getElementById('fanclub-name-input').value.trim();
    if (!name) {
        alert('Vul je naam in!');
        return;
    }

    document.getElementById('fanclub-name-display').textContent = name;
    document.getElementById('fanclub-id').textContent = Math.floor(Math.random() * 900000 + 100000);

    playSuccessSound();
    addStars(2);
}

// ==========================================
// DAGELIJKSE BELONING
// ==========================================
function loadDailyReward() {
    const lastClaim = localStorage.getItem('joerieLastDailyClaim');
    const today = new Date().toDateString();

    if (lastClaim === today) {
        document.getElementById('daily-status').textContent = 'Kom morgen terug voor meer sterren!';
        document.getElementById('claim-daily-btn').disabled = true;
        document.getElementById('claim-daily-btn').classList.add('claimed');
    }
}

function claimDailyReward() {
    const lastClaim = localStorage.getItem('joerieLastDailyClaim');
    const today = new Date().toDateString();

    if (lastClaim === today) {
        alert('Je hebt vandaag al geclaimd!');
        return;
    }

    // Track streak
    const streak = parseInt(localStorage.getItem('joerieDailyStreak') || '0');
    const lastDate = new Date(lastClaim || 0);
    const todayDate = new Date();
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

    let newStreak = diffDays === 1 ? streak + 1 : 1;
    localStorage.setItem('joerieDailyStreak', newStreak);
    localStorage.setItem('joerieLastDailyClaim', today);

    // Bonus sterren bij streak
    const bonus = Math.min(newStreak, 7);
    const totalStars = 3 + bonus;

    addStars(totalStars);

    document.getElementById('daily-status').textContent = `Je kreeg ${totalStars} sterren! (${newStreak} dagen op rij!)`;
    document.getElementById('claim-daily-btn').disabled = true;
    document.getElementById('claim-daily-btn').classList.add('claimed');

    playSuccessSound();
    launchConfetti();

    if (newStreak >= 7) {
        unlockBadge('daily-7');
    }

    // Random sticker kans
    if (Math.random() < 0.3) {
        giveRandomSticker();
    }
}

// ==========================================
// BADGES
// ==========================================
const badgeList = [
    'first-ticket', 'applause-10', 'wheel-spin', 'memory-win',
    'quiz-perfect', 'daily-7', 'stars-100', 'vip'
];

function loadBadges() {
    const unlockedBadges = JSON.parse(localStorage.getItem('joerieBadges') || '[]');

    badgeList.forEach(badge => {
        const el = document.querySelector(`.badge[data-badge="${badge}"]`);
        if (el && unlockedBadges.includes(badge)) {
            el.classList.remove('locked');
            el.classList.add('unlocked');
        }
    });

    document.getElementById('your-badges').textContent = unlockedBadges.length;
}

function unlockBadge(badgeId) {
    const unlockedBadges = JSON.parse(localStorage.getItem('joerieBadges') || '[]');

    if (unlockedBadges.includes(badgeId)) return;

    unlockedBadges.push(badgeId);
    localStorage.setItem('joerieBadges', JSON.stringify(unlockedBadges));

    const el = document.querySelector(`.badge[data-badge="${badgeId}"]`);
    if (el) {
        el.classList.remove('locked');
        el.classList.add('unlocked');
    }

    document.getElementById('your-badges').textContent = unlockedBadges.length;

    // Badge aantal in Firebase voor leaderboard
    const visitorId = getVisitorId();
    database.ref('badges/' + visitorId).set(unlockedBadges.length);

    playFanfare();
    alert('Badge ontgrendeld: ' + el?.querySelector('.badge-name')?.textContent || badgeId);
}

// ==========================================
// STICKERS
// ==========================================
function loadStickers() {
    const collected = JSON.parse(localStorage.getItem('joerieStickers') || '[]');

    collected.forEach(num => {
        const slot = document.querySelector(`.sticker-slot[data-sticker="${num}"]`);
        if (slot) {
            slot.classList.add('collected');
        }
    });

    document.getElementById('sticker-count').textContent = collected.length;
}

function giveRandomSticker() {
    const collected = JSON.parse(localStorage.getItem('joerieStickers') || '[]');
    const available = [];

    for (let i = 1; i <= 12; i++) {
        if (!collected.includes(i)) available.push(i);
    }

    if (available.length === 0) return;

    const newSticker = available[Math.floor(Math.random() * available.length)];
    collected.push(newSticker);
    localStorage.setItem('joerieStickers', JSON.stringify(collected));

    const slot = document.querySelector(`.sticker-slot[data-sticker="${newSticker}"]`);
    if (slot) {
        slot.classList.add('collected');
        const emoji = slot.querySelector('span').textContent;
        alert('Nieuwe sticker verzameld: ' + emoji);
    }

    document.getElementById('sticker-count').textContent = collected.length;
}

// ==========================================
// COMPLIMENTEN
// ==========================================
const compliments = [
    'Je bent super!',
    'Wat ben jij slim!',
    'Je lach is geweldig!',
    'Je bent een ster!',
    'Wat knap van jou!',
    'Je bent de beste!',
    'Jij maakt de wereld mooier!',
    'Je bent fantastisch!',
    'Wat ben jij leuk!',
    'Je bent een held!',
    'Iedereen houdt van jou!',
    'Je bent briljant!',
    'Wat een talent heb jij!',
    'Je bent ongelooflijk!',
    'De wereld is blij met jou!'
];

function generateCompliment() {
    const random = compliments[Math.floor(Math.random() * compliments.length)];
    document.getElementById('compliment-display').innerHTML = `<p class="compliment-text">${random}</p>`;
    playSuccessSound();
}

// ==========================================
// DANCE PARTY
// ==========================================
let dancePartyActive = false;
let danceInterval = null;

function toggleDanceParty() {
    dancePartyActive = !dancePartyActive;
    const overlay = document.getElementById('dance-party-overlay');

    if (dancePartyActive) {
        overlay.classList.remove('hidden');
        startDanceParty();
    } else {
        overlay.classList.add('hidden');
        stopDanceParty();
    }
}

function startDanceParty() {
    const container = document.getElementById('dancing-emojis');
    const emojis = ['💃', '🕺', '🎉', '🎊', '✨', '🌟', '🎵', '🎶'];

    danceInterval = setInterval(() => {
        const emoji = document.createElement('div');
        emoji.className = 'dancing-emoji';
        emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        emoji.style.left = Math.random() * 100 + '%';
        emoji.style.animationDuration = (2 + Math.random() * 2) + 's';
        container.appendChild(emoji);

        setTimeout(() => emoji.remove(), 4000);
    }, 300);

    // Party music
    playDanceMusic();
}

function stopDanceParty() {
    clearInterval(danceInterval);
    document.getElementById('dancing-emojis').innerHTML = '';
}

function playDanceMusic() {
    if (!audioContext) initAudio();

    // Techno: vier-op-de-vloer, constant en stabiel
    // 125 BPM = 480ms per beat, we doen 8e noten = 240ms
    const tempo = 240;

    const musicInterval = setInterval(() => {
        if (!dancePartyActive) {
            clearInterval(musicInterval);
            return;
        }

        // Kick op elke beat (vier-op-de-vloer techno)
        playKickDrum();

    }, tempo * 2); // Kick elke halve maat

    // Hi-hat op 8e noten (constant tsss tsss tsss)
    const hihatInterval = setInterval(() => {
        if (!dancePartyActive) {
            clearInterval(hihatInterval);
            return;
        }
        playHiHat();
    }, tempo);

    // Clap/snare op 2 en 4
    let clapBeat = 0;
    const clapInterval = setInterval(() => {
        if (!dancePartyActive) {
            clearInterval(clapInterval);
            return;
        }
        if (clapBeat % 2 === 1) {
            playSnareDrum();
        }
        clapBeat++;
    }, tempo * 2);
}

function playTomHit(freq) {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.12);
}

// ==========================================
// CONFETTI KANON
// ==========================================
function fireConfettiCannon() {
    // MEGA confetti explosie
    playCannonSound();

    // Meerdere golven confetti
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            launchMegaConfetti();
        }, i * 100);
    }
}

function playCannonSound() {
    const now = audioContext.currentTime;

    // Luide KNAL
    const bangOsc = audioContext.createOscillator();
    const bangGain = audioContext.createGain();
    bangOsc.type = 'sawtooth';
    bangOsc.frequency.setValueAtTime(200, now);
    bangOsc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    bangGain.gain.setValueAtTime(0.8, now);
    bangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    bangOsc.connect(bangGain);
    bangGain.connect(audioContext.destination);
    bangOsc.start(now);
    bangOsc.stop(now + 0.2);

    // Pop/crack
    const popLen = 0.05;
    const popBuffer = audioContext.createBuffer(2, audioContext.sampleRate * popLen, audioContext.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = popBuffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 0.5);
        }
    }
    const pop = audioContext.createBufferSource();
    const popGain = audioContext.createGain();
    pop.buffer = popBuffer;
    popGain.gain.value = 0.6;
    pop.connect(popGain);
    popGain.connect(audioContext.destination);
    pop.start(now);

    // Whoosh van confetti door de lucht
    const whooshLen = 0.5;
    const whoosh = audioContext.createBuffer(2, audioContext.sampleRate * whooshLen, audioContext.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = whoosh.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            const env = Math.pow(1 - i / data.length, 0.8);
            data[i] = (Math.random() * 2 - 1) * env;
        }
    }
    const whooshSrc = audioContext.createBufferSource();
    const whooshGain = audioContext.createGain();
    const whooshFilter = audioContext.createBiquadFilter();
    whooshSrc.buffer = whoosh;
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(2000, now);
    whooshFilter.frequency.exponentialRampToValueAtTime(500, now + whooshLen);
    whooshFilter.Q.value = 1;
    whooshGain.gain.value = 0.3;
    whooshSrc.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(audioContext.destination);
    whooshSrc.start(now + 0.02);

    // Feestelijk geluidje erna
    setTimeout(() => {
        const yay = audioContext.createOscillator();
        const yayGain = audioContext.createGain();
        yay.type = 'sine';
        yay.frequency.setValueAtTime(800, audioContext.currentTime);
        yay.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.15);
        yayGain.gain.setValueAtTime(0.15, audioContext.currentTime);
        yayGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        yay.connect(yayGain);
        yayGain.connect(audioContext.destination);
        yay.start();
        yay.stop(audioContext.currentTime + 0.2);
    }, 200);
}

function launchMegaConfetti() {
    const colors = ['#ff4444', '#2266cc', '#ffcc00', '#22cc44', '#ff66cc', '#44ccff', '#ff9933', '#9933ff', '#ff0066', '#00ff66'];
    const stickers = ['🎉', '🎊', '🎈', '🎁', '⭐', '✨', '💫', '🌟', '🎭', '🎪', '🥳', '🎀', '💖', '🎵', '🏆', '👑'];
    const shapes = ['★', '●', '■', '▲', '♦', '♥', '✦', '❋'];

    // Zorg dat confetti-styles bestaan
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes stickerFall {
                0% { transform: translateY(0) rotate(0deg) scale(0); opacity: 1; }
                20% { transform: translateY(100px) rotate(20deg) scale(1.2); opacity: 1; }
                100% { transform: translateY(100vh) rotate(360deg) scale(0.8); opacity: 0; }
            }
            @keyframes slingerFall {
                0% { transform: translateY(0) rotate(0deg) scaleY(0); opacity: 1; }
                30% { transform: translateY(150px) rotate(-15deg) scaleY(1); opacity: 1; }
                60% { transform: translateY(400px) rotate(15deg) scaleY(1); opacity: 0.8; }
                100% { transform: translateY(100vh) rotate(-10deg) scaleY(0.5); opacity: 0; }
            }
            @keyframes confettiFallSpin {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // MEGA stickers
    for (let i = 0; i < 25; i++) {
        const sticker = document.createElement('div');
        sticker.textContent = stickers[Math.floor(Math.random() * stickers.length)];
        sticker.style.cssText = `
            position: fixed;
            left: ${20 + Math.random() * 60}%;
            top: -60px;
            font-size: ${30 + Math.random() * 40}px;
            pointer-events: none;
            z-index: 9999;
            animation: stickerFall ${2.5 + Math.random() * 2}s ease-out forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        document.body.appendChild(sticker);
        setTimeout(() => sticker.remove(), 5000);
    }

    // MEGA slingers
    for (let i = 0; i < 20; i++) {
        const slinger = document.createElement('div');
        slinger.style.cssText = `
            position: fixed;
            left: ${Math.random() * 100}%;
            top: -120px;
            width: 10px;
            height: ${100 + Math.random() * 80}px;
            background: linear-gradient(180deg, ${colors[Math.floor(Math.random() * colors.length)]}, ${colors[Math.floor(Math.random() * colors.length)]}, ${colors[Math.floor(Math.random() * colors.length)]});
            border-radius: 5px;
            pointer-events: none;
            z-index: 9998;
            animation: slingerFall ${2 + Math.random() * 2}s ease-out forwards;
            animation-delay: ${Math.random() * 0.3}s;
        `;
        document.body.appendChild(slinger);
        setTimeout(() => slinger.remove(), 5000);
    }

    // Confetti shapes
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.style.cssText = `
            position: fixed;
            left: ${10 + Math.random() * 80}%;
            top: -30px;
            font-size: ${12 + Math.random() * 18}px;
            color: ${colors[Math.floor(Math.random() * colors.length)]};
            pointer-events: none;
            z-index: 9997;
            animation: confettiFallSpin ${2 + Math.random() * 3}s ease-out forwards;
            animation-delay: ${Math.random() * 1}s;
        `;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 6000);
    }
}

// ==========================================
// POPCORN TELLER
// ==========================================
let popcornCount = 0;

function eatPopcorn() {
    popcornCount++;
    document.getElementById('popcorn-count').textContent = popcornCount;
    playClickSound();

    // Animate
    const btn = document.getElementById('eat-popcorn-btn');
    btn.classList.add('eating');
    setTimeout(() => btn.classList.remove('eating'), 200);

    if (popcornCount % 10 === 0) {
        addStars(1);
    }
}

// ==========================================
// GAME COUNT
// ==========================================
function incrementGameCount() {
    const visitorId = getVisitorId();
    database.ref('games/' + visitorId).transaction((current) => (current || 0) + 1);

    database.ref('games/' + visitorId).once('value', (snapshot) => {
        const el = document.getElementById('your-games');
        if (el) el.textContent = snapshot.val() || 0;
    });
}

function loadGameCount() {
    const visitorId = getVisitorId();
    database.ref('games/' + visitorId).on('value', (snapshot) => {
        const el = document.getElementById('your-games');
        if (el) el.textContent = snapshot.val() || 0;
    });
}

// ==========================================
// BEAT SEQUENCER
// ==========================================
let beatSequence = {
    kick: new Array(16).fill(false),
    snare: new Array(16).fill(false),
    hihat: new Array(16).fill(false),
    cymbal: new Array(16).fill(false)
};

let beatPlaying = false;
let beatStep = 0;
let beatInterval = null;
let beatTempo = 120; // BPM

function initBeatSequencer() {
    // Step click handlers
    document.querySelectorAll('.seq-step').forEach(step => {
        step.addEventListener('click', () => toggleStep(step));
    });

    // Play/Stop buttons
    const playBtn = document.getElementById('beat-play-btn');
    const stopBtn = document.getElementById('beat-stop-btn');
    if (playBtn) playBtn.addEventListener('click', playBeat);
    if (stopBtn) stopBtn.addEventListener('click', stopBeat);

    // Tempo slider
    const tempoSlider = document.getElementById('tempo-slider');
    if (tempoSlider) {
        tempoSlider.addEventListener('input', (e) => {
            beatTempo = parseInt(e.target.value);
            document.getElementById('tempo-display').textContent = beatTempo + ' BPM';

            // Update interval als beat speelt
            if (beatPlaying) {
                stopBeat();
                playBeat();
            }
        });
    }

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
    });
}

function toggleStep(stepEl) {
    const row = stepEl.parentElement;
    const drum = row.dataset.drum;
    const stepIndex = parseInt(stepEl.dataset.step);

    beatSequence[drum][stepIndex] = !beatSequence[drum][stepIndex];
    stepEl.classList.toggle('active');

    playClickSound();
}

function playBeat() {
    if (beatPlaying) return;

    beatPlaying = true;
    beatStep = 0;

    const playBtn = document.getElementById('beat-play-btn');
    if (playBtn) playBtn.textContent = '▶️ Playing...';

    // Interval berekenen: 60000ms / BPM / 4 (voor 16th notes)
    const intervalMs = 60000 / beatTempo / 4;

    beatInterval = setInterval(() => {
        // Verwijder playing class van vorige step
        document.querySelectorAll('.seq-step.playing').forEach(s => s.classList.remove('playing'));

        // Speel alle actieve drums voor deze step
        Object.keys(beatSequence).forEach(drum => {
            if (beatSequence[drum][beatStep]) {
                playDrumSound(drum);
            }

            // Highlight huidige step
            const stepEl = document.querySelector(`.seq-steps[data-drum="${drum}"] .seq-step[data-step="${beatStep}"]`);
            if (stepEl) stepEl.classList.add('playing');
        });

        // Volgende step
        beatStep = (beatStep + 1) % 16;
    }, intervalMs);
}

function stopBeat() {
    beatPlaying = false;

    if (beatInterval) {
        clearInterval(beatInterval);
        beatInterval = null;
    }

    const playBtn = document.getElementById('beat-play-btn');
    if (playBtn) playBtn.textContent = '▶️ Play';

    // Verwijder alle playing highlights
    document.querySelectorAll('.seq-step.playing').forEach(s => s.classList.remove('playing'));
}

function loadPreset(presetName) {
    // Reset alle steps
    Object.keys(beatSequence).forEach(drum => {
        beatSequence[drum].fill(false);
    });

    // Presets
    const presets = {
        basic: {
            kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
            snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
            cymbal:[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
        },
        rock: {
            kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
            snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
            cymbal:[1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
        },
        disco: {
            kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
            snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
            cymbal:[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
        },
        clear: {
            kick:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
            snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
            hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
            cymbal:[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
        }
    };

    const preset = presets[presetName];
    if (!preset) return;

    // Laad preset
    Object.keys(preset).forEach(drum => {
        preset[drum].forEach((val, i) => {
            beatSequence[drum][i] = val === 1;
        });
    });

    // Update UI
    updateSequencerUI();
    playClickSound();
}

function updateSequencerUI() {
    Object.keys(beatSequence).forEach(drum => {
        beatSequence[drum].forEach((active, i) => {
            const stepEl = document.querySelector(`.seq-steps[data-drum="${drum}"] .seq-step[data-step="${i}"]`);
            if (stepEl) {
                stepEl.classList.toggle('active', active);
            }
        });
    });
}
