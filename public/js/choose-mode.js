import { socket } from './websocket.js'; // ✅ Importation du WebSocket centralisé

document.addEventListener('DOMContentLoaded', () => {
    try {
        const userData = JSON.parse(localStorage.getItem('userData'));

        if (!userData) {
            console.error('🚨 Aucune donnée utilisateur, retour à l\'accueil.');
            window.location.href = '/';
            return;
        }

        console.log('🔒 Données utilisateur chargées:', userData);

        initializeUI(userData);
        setupEventListeners(userData);
        setupSocketListeners();
        socket.emit('userConnected', userData);
    } catch (error) {
        console.error('❌ Erreur lors du chargement:', error);
    }
});

// 📌 Initialisation de l'UI avec les infos de l'utilisateur
function initializeUI(userData) {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    if (userAvatar && userName) {
        userAvatar.src = userData.avatarSrc;
        userName.textContent = userData.name;
    } else {
        console.error('❌ Éléments UI utilisateur non trouvés');
    }
}

// 📌 Ajout des écouteurs d'événements pour la gestion des modes de jeu
function setupEventListeners(userData) {
    const randomGameBtn = document.getElementById('random-game');
    const friendGameBtn = document.getElementById('friend-game');
    const cancelSearchBtn = document.getElementById('cancel-search');

    if (randomGameBtn) {
        randomGameBtn.addEventListener('click', () => {
            console.log('🎲 Recherche de partie aléatoire...');
            localStorage.setItem('gameMode', 'random');
            showLoadingScreen('Recherche d\'un adversaire...');
            socket.emit('findRandomGame', userData);
        });
    }

    if (friendGameBtn) {
        friendGameBtn.addEventListener('click', () => {
            console.log('👥 Mode ami sélectionné');
            localStorage.setItem('gameMode', 'friend');
            window.location.href = '/room-choice';
        });
    }

    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            console.log('🛑 Recherche annulée');
            hideLoadingScreen();
            socket.emit('cancelSearch');
            window.location.reload();
        });
    }
}

// 📌 Gestion des événements WebSocket
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('✅ Connecté au serveur');
    });

    socket.on('waitingForOpponent', () => {
        console.log('⌛ En attente d\'un adversaire');
        showLoadingScreen('Recherche d\'un adversaire...');
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de partie:', data);
        hideLoadingScreen();
        window.location.href = `/gameboard?roomId=${data.roomCode}`;
    });

    socket.on('roomError', (error) => {
        console.error('❌ Erreur:', error);
        hideLoadingScreen();
        alert(error);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnecté du serveur');
        hideLoadingScreen();
        alert('🔄 Déconnecté du serveur. Rechargement...');
        window.location.reload();
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion:', error);
        alert('Impossible de se connecter au serveur. Vérifiez votre connexion.');
        hideLoadingScreen();
    });
}

// 📌 Affichage du message de chargement
function showLoadingScreen(message) {
    const overlay = document.getElementById('loading-overlay');
    const messageElement = document.getElementById('loading-message');

    if (overlay) overlay.classList.remove('hidden');
    if (messageElement) messageElement.textContent = message;
}

// 📌 Masquer l'écran de chargement
function hideLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}