// choose-mode.js
import socket from './websocket.js';

let userData = null;

// Configuration des chemins d'avatars
const AVATAR_PATHS = {
    male: {
        '1': '/Avatars/male1.jpeg',
        '2': '/Avatars/male2.jpeg',
        '3': '/Avatars/male3.jpeg'
    },
    female: {
        '1': '/Avatars/female1.jpeg',
        '2': '/Avatars/female2.jpeg',
        '3': '/Avatars/female3.jpeg'
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Charger les données utilisateur
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            console.error('❌ Données utilisateur non trouvées');
            window.location.href = '/';
            return;
        }
        console.log('🔒 Données utilisateur chargées:', userData);

        // Initialiser l'interface utilisateur
        initializeUI();

        // Attendre la connexion WebSocket avant de continuer
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        // Configuration des boutons
        setupButtons();
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showError("Une erreur est survenue lors de l'initialisation");
    }
});

function initializeUI() {
    // Mise à jour de l'avatar et du nom
    updateUserDisplay();
    
    // Initialisation des overlays
    initializeOverlays();
}

function updateUserDisplay() {
    // Mise à jour de l'avatar
    const avatarElement = document.querySelector('.player-avatar img');
    if (avatarElement) {
        // Vérifier si l'avatar existe dans les chemins prédéfinis
        const defaultAvatarPath = userData.sex === 'male' ? 
            AVATAR_PATHS.male['1'] : AVATAR_PATHS.female['1'];
            
        avatarElement.src = userData.avatarSrc || defaultAvatarPath;
        avatarElement.onerror = function() {
            console.warn('❌ Erreur de chargement de l\'avatar, utilisation de l\'avatar par défaut');
            this.src = defaultAvatarPath;
        };
    } else {
        console.warn('⚠️ Élément avatar non trouvé dans le DOM');
    }

    // Mise à jour du nom
    const nameElement = document.querySelector('.player-name');
    if (nameElement) {
        nameElement.textContent = userData.name;
    } else {
        console.warn('⚠️ Élément nom non trouvé dans le DOM');
    }
}

function initializeOverlays() {
    // Initialisation de l'overlay d'attente
    const waitingOverlay = document.getElementById('waiting-overlay');
    if (waitingOverlay) {
        waitingOverlay.innerHTML = `
            <div class="overlay-content">
                <h2>Recherche d'un adversaire</h2>
                <div class="spinner"></div>
                <p>Veuillez patienter...</p>
            </div>
        `;
    }

    // Initialisation de l'overlay d'erreur
    const errorOverlay = document.getElementById('error-overlay');
    if (!errorOverlay) {
        const overlay = document.createElement('div');
        overlay.id = 'error-overlay';
        overlay.className = 'overlay hidden';
        overlay.innerHTML = `
            <div class="overlay-content">
                <p id="error-message"></p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

function setupButtons() {
    const randomGameBtn = document.getElementById('random-game');
    const createRoomBtn = document.getElementById('create-room');
    const joinRoomBtn = document.getElementById('join-room');

    if (randomGameBtn) {
        randomGameBtn.addEventListener('click', async () => {
            try {
                randomGameBtn.disabled = true;
                randomGameBtn.textContent = 'Recherche en cours...';

                await socket.emit('findRandomGame', userData);
                showWaitingScreen();
            } catch (error) {
                console.error('❌ Erreur lors de la recherche de partie:', error);
                randomGameBtn.disabled = false;
                randomGameBtn.textContent = 'Partie Aléatoire';
                showError("Erreur lors de la recherche d'une partie");
            }
        });
    }

    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            window.location.href = '/room-choice?mode=create';
        });
    }

    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            window.location.href = '/room-choice?mode=join';
        });
    }
}

// Configuration des écouteurs socket
socket.on('waitingForOpponent', () => {
    console.log('⌛ En attente d\'un adversaire...');
    showWaitingScreen();
});

socket.on('gameStart', (data) => {
    console.log('🎮 Partie trouvée !', data);
    window.location.href = `/gameboard?roomId=${data.roomCode}`;});

socket.on('error', (error) => {
    console.error('❌ Erreur socket:', error);
    hideWaitingScreen();
    showError("Une erreur est survenue");
});

function showWaitingScreen() {
    const waitingOverlay = document.getElementById('waiting-overlay');
    if (waitingOverlay) {
        waitingOverlay.classList.remove('hidden');
    }
}

function hideWaitingScreen() {
    const waitingOverlay = document.getElementById('waiting-overlay');
    if (waitingOverlay) {
        waitingOverlay.classList.add('hidden');
    }
}

function showError(message) {
    const errorOverlay = document.getElementById('error-overlay');
    const errorMessage = document.getElementById('error-message');
    
    if (errorOverlay && errorMessage) {
        errorMessage.textContent = message;
        errorOverlay.classList.remove('hidden');
        
        setTimeout(() => {
            errorOverlay.classList.add('hidden');
        }, 3000);
    }
}

export { showWaitingScreen, hideWaitingScreen, showError };