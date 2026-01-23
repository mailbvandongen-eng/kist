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

        // Start confetti!
        launchConfetti();

        // Speel succes geluid
        playPaymentSuccessSound();
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

        default:
            source.connect(audioContext.destination);
    }
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

    // Image upload area
    const imageUploadArea = document.getElementById('image-upload-area');
    const imageInput = document.getElementById('show-image');
    const imagePreview = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const removeImageBtn = document.getElementById('remove-image-btn');

    imageUploadArea.addEventListener('click', function(e) {
        if (e.target !== removeImageBtn) {
            imageInput.click();
        }
    });

    imageInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
                uploadPlaceholder.classList.add('hidden');
                removeImageBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(this.files[0]);
            playClickSound();
        }
    });

    removeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        imageInput.value = '';
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        uploadPlaceholder.classList.remove('hidden');
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
        imageInput.value = '';
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        uploadPlaceholder.classList.remove('hidden');
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
}

// ==========================================
// HELPER FUNCTIES
// ==========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
