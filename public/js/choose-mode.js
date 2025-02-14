// choose-mode.js
import socket from './websocket.js';

let userData = null;

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
    window.location.href = `/gameboard?roomId=${data.roomCode}`;
});

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