// Configuration des avatars
const AVATAR_CONFIG = {
    male: {
        '1': '/Avatars/male1.jpeg',
        '2': '/Avatars/male2.jpeg',
        '3': '/Avatars/male3.jpeg'
    },
    female: {
        '1': '/Avatars/female1.jpeg',
        '2': '/Avatars/female2.jpeg',
        '3': '/Avatars/female3.jpeg'
    },
    default: '/Avatars/default.jpeg'
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
}

// Initialisation de l'interface utilisateur
function initializeUI() {
    // Mise à jour du profil du joueur actuel
    updatePlayerProfile(userData, false);
    
    // Initialisation du conteneur adversaire (vide pour l'instant)
    initializeOpponentContainer();
}

// Mise à jour du profil d'un joueur
function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';
    
    // Mise à jour de l'avatar
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    if (avatarContainer) {
        const avatarImg = avatarContainer.querySelector('img') || createAvatarElement();
        avatarImg.src = getAvatarPath(player.sex, player.avatarId);
        avatarImg.alt = `Avatar de ${player.name}`;
        avatarImg.onerror = () => {
            avatarImg.src = AVATAR_CONFIG.default;
        };
        avatarContainer.appendChild(avatarImg);
    }

    // Mise à jour du nom
    const nameElement = document.querySelector(`.${prefix}-name`);
    if (nameElement) {
        nameElement.textContent = player.name;
    }

    // Ajout des classes d'animation
    addProfileAnimations(prefix);
}

// Création d'un élément avatar
function createAvatarElement() {
    const img = document.createElement('img');
    img.className = 'avatar-img';
    return img;
}

// Obtenir le chemin de l'avatar
function getAvatarPath(sex, avatarId) {
    return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
}

// Initialisation du conteneur adversaire
function initializeOpponentContainer() {
    const opponentContainer = document.querySelector('.opponent-profile');
    if (opponentContainer) {
        // Création d'un placeholder pour l'adversaire
        opponentContainer.innerHTML = `
            <div class="opponent-avatar">
                <img src="${AVATAR_CONFIG.default}" alt="En attente d'un adversaire" class="avatar-img placeholder">
            </div>
            <div class="opponent-name">En attente...</div>
        `;
    }
}

// Ajout des animations de profil
function addProfileAnimations(prefix) {
    const container = document.querySelector(`.${prefix}-profile`);
    if (container) {
        container.classList.add('profile-loaded');
    }
}

// Configuration des écouteurs Socket
function setupSocketListeners() {
    socket.on('updatePlayers', (players) => {
        console.log('🔄 Mise à jour des joueurs:', players);
        
        // Trouver l'adversaire
        const opponent = players.find(player => player.clientId !== userData.clientId);
        if (opponent) {
            updatePlayerProfile(opponent, true);
        }
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de la partie:', data);
    
        if (!data.players || data.players.length < 2) {
            console.error("❌ Pas assez de joueurs pour démarrer");
            return;
        }
    
        // Identifier les joueurs
        const currentPlayer = data.players.find(player => player.clientId === userData.clientId);
        const opponent = data.players.find(player => player.clientId !== userData.clientId);
    
        if (!currentPlayer || !opponent) {
            console.error("❌ Erreur d'attribution des joueurs");
            return;
        }
    
        console.log(`📌 Vous êtes: ${currentPlayer.name}`);
        console.log(`🎭 Votre adversaire est: ${opponent.name}`);

        // Mise à jour des profils
        updatePlayerProfile(currentPlayer, false);
        updatePlayerProfile(opponent, true);

        // Affichage des mains si nécessaire
        if (data.hands?.playerHand) {
            displayHand(data.hands.playerHand, true);
        }
    });

    socket.on('opponentLeft', () => {
        console.log('👋 Adversaire déconnecté');
        // Réinitialiser le profil de l'adversaire
        initializeOpponentContainer();
        showDisconnectOverlay("Votre adversaire a quitté la partie");
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnexion du serveur');
        showDisconnectOverlay("Déconnecté du serveur...");
    });
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

export { updatePlayerProfile, showDisconnectOverlay };