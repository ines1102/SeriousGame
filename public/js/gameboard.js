import socket from './websocket.js';

// Configuration des avatars
const AVATAR_CONFIG = {
    male: {
        '1': '../Avatars/male1.jpeg',
        '2': '../Avatars/male2.jpeg',
        '3': '../Avatars/male3.jpeg'
    },
    female: {
        '1': '../Avatars/female1.jpeg',
        '2': '../Avatars/female2.jpeg',
        '3': '../Avatars/female3.jpeg'
    },
    default: '../Avatars/default.jpeg'
};

// Variables globales
let gameInstance;
let currentRoomId;
let userData;

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');
    
    try {
        // Récupération des données
        await initializeGameData();
        
        // Initialisation de l'interface
        initializeUI();

        // Configuration des écouteurs Socket.io
        setupSocketListeners();

        // Rejoindre la room
        socket.emit('joinRoom', { 
            ...userData, 
            roomCode: currentRoomId 
        });

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        showDisconnectOverlay("Erreur lors de l'initialisation du jeu");
    }
});

// Initialisation des données de jeu
async function initializeGameData() {
    try{
        // Récupération des données utilisateur
        const storedData = localStorage.getItem('userData');
        if (!storedData) {
            throw new Error('Session expirée');
        }
        userData = JSON.parse(storedData);

        // Récupération de l'ID de room
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) {
            throw new Error('ID de room manquant');
        }

        console.log('📌 Données de session:', { userData, currentRoomId });
        return true;
        } catch (error) {
            console.error("❌ Erreur lors du chargement des données:", error);
            showDisconnectOverlay(error.message);
            return false;
        }
}

// Initialisation de l'interface utilisateur
function initializeUI() {
    try{
        // Mise à jour du profil du joueur
        updatePlayerProfile(userData, false);
        
        // Initialisation du conteneur adversaire
        initializeOpponentContainer();
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation de l'UI:", error);
    }
    
}

// Mise à jour du profil d'un joueur
function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';
    
    // Mise à jour de l'avatar
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    if (avatarContainer) {
        const avatarImg = avatarContainer.querySelector('img') || document.createElement('img');
        avatarImg.className = 'avatar-img';
        avatarImg.src = getAvatarPath(player.sex, player.avatarId);
        avatarImg.alt = `Avatar de ${player.name}`;
        avatarImg.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarImg.src = AVATAR_CONFIG.default;
        };
        
        if (!avatarContainer.contains(avatarImg)) {
            avatarContainer.appendChild(avatarImg);
        }
    }

    // Mise à jour du nom
    const nameElement = document.querySelector(`.${prefix}-name`);
    if (nameElement) {
        nameElement.textContent = player.name;
    }
}

// Obtenir le chemin de l'avatar
function getAvatarPath(sex, avatarId) {
    try {
        return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'avatar:', error);
        return AVATAR_CONFIG.default;
    }
}

// Initialisation du conteneur adversaire
function initializeOpponentContainer() {
    const opponentContainer = document.querySelector('.opponent-profile');
    if (opponentContainer) {
        opponentContainer.innerHTML = `
            <div class="opponent-avatar">
                <img src="${AVATAR_CONFIG.default}" alt="En attente d'un adversaire" class="avatar-img placeholder">
            </div>
            <div class="opponent-name">En attente...</div>
        `;
    }
}

// Configuration des écouteurs Socket
// Configuration des écouteurs Socket
function setupSocketListeners() {
    if (!socket) {
        console.error('❌ Socket non initialisé');
        return;
    }

    socket.on('updatePlayers', (players) => {
        console.log('🔄 Mise à jour des joueurs:', players);
        const opponent = players.find(player => player.clientId !== userData.clientId);
        if (opponent) {
            updatePlayerProfile(opponent, true);
        }
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de la partie:', data);
        handleGameStart(data);
    });

    socket.on('opponentLeft', () => {
        console.log('👋 Adversaire déconnecté');
        showDisconnectOverlay("Votre adversaire a quitté la partie.");
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnexion du serveur');
        showDisconnectOverlay("Déconnecté du serveur...");
    });
}


// Gestion du début de partie
function handleGameStart(data) {
    if (!data.players || data.players.length < 2) {
        console.error("❌ Pas assez de joueurs pour démarrer");
        return;
    }

    const currentPlayer = data.players.find(player => player.clientId === userData.clientId);
    const opponent = data.players.find(player => player.clientId !== userData.clientId);

    if (!currentPlayer || !opponent) {
        console.error("❌ Erreur d'attribution des joueurs");
        return;
    }

    updatePlayerProfile(currentPlayer, false);
    updatePlayerProfile(opponent, true);

    if (data.hands?.playerHand) {
        displayHand(data.hands.playerHand, true);
    }
}

// Affichage de l'overlay de déconnexion
function showDisconnectOverlay(message) {
    const overlay = document.getElementById('disconnect-overlay');
    if (overlay) {
        const messageElement = overlay.querySelector('p');
        if (messageElement) messageElement.textContent = message;
        overlay.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = '/choose-mode';
        }, 3000);
    }
}

// Fonction pour afficher la main
function displayHand(cards, isPlayer) {
    const handContainer = document.getElementById(isPlayer ? 'player-hand' : 'opponent-hand');
    if (!handContainer || !Array.isArray(cards)) {
        console.error("❌ Problème avec le conteneur de main ou les cartes");
        return;
    }

    handContainer.innerHTML = '';
    console.log(`📌 Affichage de la main ${isPlayer ? 'du joueur' : 'de l\'adversaire'}:`, cards);

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = card.id;
        cardElement.dataset.cardName = card.name;
        cardElement.style.backgroundImage = isPlayer ? `url(${card.name})` : 'url(/Cartes/dos.png)';
        handContainer.appendChild(cardElement);
    });
}

export { updatePlayerProfile, showDisconnectOverlay };