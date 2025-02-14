import DragAndDropManager from './dragAndDrop.js';
import Deck from './deck.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userData = loadUserData();
    if (!userData) return redirectToHome();

    const serverConfig = await fetchServerConfig();
    initializeSocket(serverConfig.serverIp, userData);
    setupUI(userData);
});

// 📌 Connexion WebSocket optimisée
function initializeSocket(serverIp, userData) {
    const socket = io(`https://${serverIp}:3443`, {
        secure: true,
        rejectUnauthorized: false,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });

    socket.on('connect', () => console.log(`✅ Connecté au serveur (${serverIp})`));
    socket.on('disconnect', () => console.log('🔌 Déconnecté du serveur'));

    // 📌 Récupération des données de la partie
    socket.on('gameStart', ({ players, playerDeck, opponentDeck }) => {
        console.log('🚀 Partie commencée !');

        updatePlayerProfile(userData);
        updateOpponentProfile(players, userData);

        renderHand(playerDeck.main, 'player-hand');
        renderHand(opponentDeck.main, 'opponent-hand');

        const dragManager = new DragAndDropManager(socket);
        dragManager.initialize();
    });

    socket.on('error', (error) => {
        showError(error.message || 'Une erreur est survenue');
    });
}

// 📌 Mise à jour du profil joueur
function updatePlayerProfile(userData) {
    document.getElementById('player-avatar').src = userData.avatarSrc;
    document.getElementById('player-name').textContent = userData.name;
}

// 📌 Mise à jour du profil adversaire
function updateOpponentProfile(players, userData) {
    const opponent = players.find(player => player.clientId !== userData.clientId);
    if (!opponent) return;

    document.getElementById('opponent-avatar').src = opponent.avatarSrc;
    document.getElementById('opponent-name').textContent = opponent.name;
}

// 📌 Affichage des mains des joueurs
function renderHand(cards, handElementId) {
    const handContainer = document.getElementById(handElementId);
    if (!handContainer) return;

    handContainer.innerHTML = '';
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'hand-card';
        cardElement.style.backgroundImage = `url(${card.name})`;
        cardElement.dataset.cardId = card.id;
        handContainer.appendChild(cardElement);
    });
}

// 📌 Chargement des données utilisateur
function loadUserData() {
    try {
        return JSON.parse(localStorage.getItem('userData'));
    } catch {
        return null;
    }
}

// 📌 Redirection si l'utilisateur n'est pas connecté
function redirectToHome() {
    window.location.href = '/';
}

// 📌 Récupération de l'IP du serveur
async function fetchServerConfig() {
    try {
        const response = await fetch('/server-config');
        const config = await response.json();
        console.log(`📡 Serveur WebSocket détecté sur: ${config.serverIp}`);
        return config;
    } catch (error) {
        console.error('❌ Erreur récupération IP serveur:', error);
        return { serverIp: 'localhost' };
    }
}

// 📌 Affichage des erreurs
function showError(message) {
    alert(`⚠️ ${message}`);
}