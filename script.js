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
const TICKET_PRICE = 1; // Alle kaartjes kosten 1 euro
const ADMIN_PASSWORD = '123'; // Wachtwoord voor shows toevoegen
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

function addPayment(showName, buyerName) {
    // Voeg betaling toe aan database
    const paymentsRef = database.ref('payments');
    paymentsRef.push({
        showName: showName,
        buyerName: buyerName,
        amount: TICKET_PRICE,
        timestamp: Date.now(),
        claimed: false
    });

    // Update totaal
    const earningsRef = database.ref('earnings');
    earningsRef.transaction((current) => {
        return (current || 0) + TICKET_PRICE;
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
// GELUIDJES VOOR DE WEBSITE
// ==========================================
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playClickSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playSuccessSound() {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);

        oscillator.start(audioContext.currentTime + i * 0.1);
        oscillator.stop(audioContext.currentTime + i * 0.1 + 0.3);
    });
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

        card.innerHTML = `
            <button class="delete-btn" onclick="deleteShow('${show.id}')">&times;</button>
            ${imageHtml}
            <h3>${escapeHtml(show.name)}</h3>
            <p>${escapeHtml(show.description)}</p>
            <p class="price">${TICKET_PRICE} euro</p>
            <button class="buy-btn" onclick="buyTicket('${show.id}')">Koop Kaartje!</button>
        `;
        container.appendChild(card);
    });
}

function addShow(name, description, image) {
    // Vraag om wachtwoord
    const password = prompt('Voer het geheime wachtwoord in om een show toe te voegen:');

    if (password !== ADMIN_PASSWORD) {
        alert('Verkeerd wachtwoord! Alleen Joerie mag shows toevoegen.');
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
        document.getElementById('payment-show-name').textContent = show.name;
        document.getElementById('payment-amount').textContent = TICKET_PRICE;

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
        addPayment(currentPaymentShow.name, buyerName);

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
        document.getElementById('ticket-price-display').textContent = TICKET_PRICE;

        const ticketImage = document.querySelector('.ticket-image');
        if (currentPaymentShow.image) {
            ticketImage.src = currentPaymentShow.image;
        } else {
            ticketImage.src = 'kist.jfif';
        }
    }

    // Toon kaartje
    document.getElementById('ticket-modal').classList.remove('hidden');
    playSuccessSound();
}

function launchConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';

    const colors = ['#ff4444', '#2266cc', '#ffcc00', '#22cc44', '#ff66cc', '#44ccff'];
    const shapes = ['■', '●', '▲', '★', '♦', '♥'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.style.fontSize = (10 + Math.random() * 20) + 'px';
        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(confetti);
    }

    // Verwijder confetti na 5 seconden
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
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
            this.closest('.modal').classList.add('hidden');
            playClickSound();
        });
    });

    // Sluit modal bij klikken buiten content
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
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
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 200 + Math.random() * 400;
            gain.gain.setValueAtTime(0.05, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + 0.1);
        }, i * 50);
    }
}

function playDrumroll() {
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 150 + Math.random() * 50;
            gain.gain.setValueAtTime(0.1, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + 0.05);
        }, i * 30);
    }
}

function playFanfare() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + 0.3);
        }, i * 150);
    });
}

function playLaughSound() {
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.value = 300 + (i % 2 === 0 ? 100 : 0);
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + 0.1);
        }, i * 80);
    }
}

function playBooSound() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 1);
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 1);
}

function playWowSound() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.6);
}

function playMagicSound() {
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.value = 800 + i * 100 + Math.random() * 200;
            gain.gain.setValueAtTime(0.1, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + 0.2);
        }, i * 50);
    }
}

function playFartSound() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(50, audioContext.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
}

function playBellSound() {
    [880, 1100].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + i * 0.2 + 0.5);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(audioContext.currentTime + i * 0.2);
        osc.stop(audioContext.currentTime + i * 0.2 + 0.5);
    });
}

function playHornSound() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.8);
}

function playWhistleSound() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(1400, audioContext.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.4);
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
}

function playExplosionSound() {
    const bufferSize = audioContext.sampleRate * 0.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    gain.gain.setValueAtTime(0.5, audioContext.currentTime);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start();
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
    { text: 'Gratis Kaartje!', emoji: '🎫', stars: 0 },
    { text: '5 Sterren!', emoji: '⭐', stars: 5 },
    { text: 'Confetti!', emoji: '🎉', stars: 0 },
    { text: 'VIP Badge!', emoji: '👑', stars: 3 },
    { text: 'Speciaal Geluid!', emoji: '🎵', stars: 2 },
    { text: '10 Sterren!', emoji: '🌟', stars: 10 },
    { text: 'Backstage Pass!', emoji: '🎭', stars: 5 },
    { text: 'Diamant!', emoji: '💎', stars: 15 }
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
        resultDiv.innerHTML = `${prize.emoji} ${prize.text}`;
        resultDiv.classList.remove('hidden');
        playFanfare();
        launchConfetti();

        // Voeg sterren toe
        if (prize.stars > 0) {
            addStars(prize.stars);
        }

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
