import Game from './game.js';
import DragAndDropManager from './dragAndDrop.js';

// Variables globales
let gameInstance;
let currentRoomId;
let userData;

// Configuration Socket.io
const socket = io(`https://seriousgame-ds65.onrender.com`, {
    secure: true,
    rejectUnauthorized: false,
    transports: ['websocket']
});

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');
    
    // Récupération des données utilisateur et room
    userData = JSON.parse(localStorage.getItem('userData'));
    currentRoomId = new URLSearchParams(window.location.search).get('roomId');

    if (!userData || !currentRoomId) {
        console.error('❌ Données utilisateur ou roomId manquants');
        window.location.href = '/';
        return;
    }

    console.log('📌 Données de session:', { userData, currentRoomId });

    try {
        // Initialisation de l'interface utilisateur
        initializeUI(userData);

        // Création de l'instance du jeu
        gameInstance = new Game(socket);
        window.gameInstance = gameInstance;

        // Initialiser le drag & drop
        const dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize();

        // Rejoindre la room
        socket.emit('joinRoom', { ...userData, roomCode: currentRoomId });

        // Configuration des écouteurs Socket.io
        setupSocketListeners(dragAndDrop);
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        showDisconnectOverlay("Erreur lors de l'initialisation du jeu");
    }
});

// Configuration des écouteurs Socket.io
function setupSocketListeners(dragAndDrop) {
    socket.on('updatePlayers', (players) => {
        console.log('🔄 Mise à jour des joueurs:', players);
        const opponent = players.find(player => player.clientId !== userData.clientId);
        if (opponent) {
            updateOpponentInfo(opponent);
        }
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de la partie:', data);
    
        if (!data.players || data.players.length < 2) {
            console.error("❌ Problème: pas assez de joueurs pour démarrer.");
            return;
        }
    
        // Identifier les joueurs
        const currentPlayer = data.players.find(player => player.clientId === userData.clientId);
        const opponent = data.players.find(player => player.clientId !== userData.clientId);
    
        if (!currentPlayer || !opponent) {
            console.error("❌ Erreur d'attribution des joueurs.");
            return;
        }
    
        console.log(`📌 Vous êtes: ${currentPlayer.name}`);
        console.log(`🎭 Votre adversaire est: ${opponent.name}`);

        // 🔥 Vérification et affichage de la main
        if (typeof displayHand === "function") {
            const myCards = data.hands?.playerHand || [];
            console.log('📌 Affichage de la main du joueur:', myCards);
            displayHand(myCards, true);
        } else {
            console.error("❌ ERREUR: displayHand n'est pas défini !");
        }
    });

    socket.on('cardPlayed', (data) => {
        console.log('🃏 Carte jouée reçue:', data);
        if (!data.cardId || !data.slot) {
            console.error("❌ Données de carte invalides reçues:", data);
            return;
        }

        const dropZone = document.querySelector(`[data-slot="${data.slot}"]`);
        if (dropZone) {
            dragAndDrop.processDrop({
                cardId: data.cardId,
                cardSrc: data.cardSrc || `url(${data.name})`,
                name: data.cardName || data.name
            }, dropZone);
        }
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

// Initialisation de l'interface utilisateur
function initializeUI(userData) {
    console.log('🖥️ Initialisation UI pour:', userData.name);

    const playerAvatar = document.getElementById('player-avatar');
    const playerName = document.getElementById('player-name');

    if (playerAvatar && playerName) {
        playerAvatar.src = userData.avatarSrc || "/Avatars/default-avatar.jpeg";
        playerName.textContent = userData.name;
    }
}

// Mise à jour des informations de l'adversaire
function updateOpponentInfo(opponent) {
    console.log('🔄 Mise à jour infos adversaire:', opponent);

    const opponentAvatar = document.getElementById('opponent-avatar');
    const opponentName = document.getElementById('opponent-name');

    if (!opponentAvatar || !opponentName) {
        console.error("❌ Éléments de l'adversaire non trouvés");
        return;
    }

    opponentAvatar.src = opponent.avatarSrc || "/Avatars/default-avatar.jpeg";
    opponentName.textContent = opponent.name;
}

// Affichage des cartes en main
function displayHand(cards, isPlayer) {
    const handContainer = document.getElementById(isPlayer ? 'player-hand' : 'opponent-hand');
    if (!handContainer || !Array.isArray(cards)) {
        console.error("❌ Problème avec le conteneur de la main ou les cartes:", { handContainer, cards });
        return;
    }

    handContainer.innerHTML = '';

    console.log(`📌 Affichage de la main du ${isPlayer ? 'joueur' : 'l\'adversaire'}:`, cards);

    const totalCards = cards.length;
    if (totalCards === 0) return;

    const radius = 500;  // Rayon de l'arc
    const totalArc = 30;  // Angle total pour l'effet d'éventail
    const startAngle = isPlayer ? -totalArc / 2 : totalArc / 2; // Position ajustée
    const angleStep = totalArc / (totalCards - 1);

    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'hand-card';
        cardElement.dataset.cardId = card.id;
        cardElement.dataset.cardName = card.name;
        cardElement.style.backgroundImage = isPlayer ? `url(${card.name})` : 'url(/Cartes/dos.png)';

        // Position des cartes en éventail (orienté vers le joueur)
        const angle = startAngle + (angleStep * index);
        const radian = (angle * Math.PI) / 180;
        const x = Math.sin(radian) * radius;
        const y = -Math.cos(radian) * radius + radius; // Correction de la hauteur

        cardElement.style.transform = `translate(${x}px, ${y}px)`;
        cardElement.style.transformOrigin = 'bottom center';
        cardElement.style.zIndex = index;

        // Ajout du hover pour agrandir légèrement la carte et la lever
        cardElement.addEventListener('mouseenter', () => {
            cardElement.style.transform = `translate(${x}px, ${y - 20}px) scale(1.1)`;
            cardElement.style.zIndex = 1000;
        });

        cardElement.addEventListener('mouseleave', () => {
            cardElement.style.transform = `translate(${x}px, ${y}px)`;
            cardElement.style.zIndex = index;
        });

        handContainer.appendChild(cardElement);
    });
}

// Affichage de l'overlay de déconnexion
function showDisconnectOverlay(message) {
    console.log('⚠️ Affichage overlay déconnexion:', message);
    
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

export { updateOpponentInfo, showDisconnectOverlay };