// ==========================================
// JOERIE'S SHOWS - JAVASCRIPT
// ==========================================

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
    loadShows();
    loadSounds();
    setupEventListeners();
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
// SHOWS BEHEER
// ==========================================
let shows = [];

function loadShows() {
    const savedShows = localStorage.getItem('joerieShows');
    if (savedShows) {
        shows = JSON.parse(savedShows);
    } else {
        // Standaard show: Kist
        shows = [{
            id: 1,
            name: 'Kist',
            description: 'Een spannende show met een mysterieuze kist!',
            price: 5,
            image: 'kist.jfif'
        }];
        saveShows();
    }
    renderShows();
}

function saveShows() {
    localStorage.setItem('joerieShows', JSON.stringify(shows));
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
            <button class="delete-btn" onclick="deleteShow(${show.id})">&times;</button>
            ${imageHtml}
            <h3>${escapeHtml(show.name)}</h3>
            <p>${escapeHtml(show.description)}</p>
            <p class="price">${show.price} euro</p>
            <button class="buy-btn" onclick="buyTicket(${show.id})">Koop Kaartje!</button>
        `;
        container.appendChild(card);
    });
}

function addShow(name, description, price, image) {
    const newShow = {
        id: Date.now(),
        name: name,
        description: description || 'Een geweldige show!',
        price: price || 5,
        image: image || null
    };
    shows.push(newShow);
    saveShows();
    renderShows();
    playSuccessSound();
}

function deleteShow(id) {
    if (confirm('Weet je zeker dat je deze show wilt verwijderen?')) {
        shows = shows.filter(show => show.id !== id);
        saveShows();
        renderShows();
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
        document.getElementById('payment-amount').textContent = show.price;

        // Toon het betaalscherm
        document.getElementById('payment-modal').classList.remove('hidden');
        playClickSound();
    }
}

function processPayment(method) {
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
        document.getElementById('ticket-price-display').textContent = currentPaymentShow.price;

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
// GELUIDJES OPSLAAN
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
        const price = parseInt(document.getElementById('show-price').value) || 5;
        const image = imagePreview.src && !imagePreview.classList.contains('hidden') ? imagePreview.src : null;

        addShow(name, description, price, image);
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
