document.addEventListener('DOMContentLoaded', async () => {
    const userData = loadUserData();
    if (!userData) return redirectToHome();

    const serverConfig = await fetchServerConfig();
    initializeSocket(serverConfig.serverIp, userData);
    setupUI(userData);
});

// 📌 Connexion WebSocket optimisée (compatible Chrome, Firefox, Safari)
function initializeSocket(serverIp, userData) {
    const socket = io("https://seriousgame.onrender.com", {
        transports: ["websocket", "polling"],
        secure: true,
        rejectUnauthorized: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });

    socket.on('connect', () => console.log(`✅ Connecté au serveur (${serverIp})`));
    socket.on('disconnect', () => console.log('🔌 Déconnecté du serveur'));

    socket.on('waitingForOpponent', () => showLoadingScreen('Recherche d\'un adversaire...'));

    socket.on('gameStart', ({ roomCode }) => {
        hideLoadingScreen();
        window.location.href = `/gameboard?roomId=${roomCode}`;
    });

    socket.on('error', (error) => {
        hideLoadingScreen();
        showError(error.message || 'Une erreur est survenue');
    });

    setupEventListeners(socket, userData);
}

// 📌 Configuration de l'interface utilisateur
function setupUI(userData) {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    if (userAvatar && userName) {
        userAvatar.src = userData.avatarSrc;
        userAvatar.alt = `Avatar de ${userData.name}`;
        userName.textContent = userData.name;
    }
}

// 📌 Gestion des événements de l'interface
function setupEventListeners(socket, userData) {
    // 🔹 Recherche de partie aléatoire
    const randomGameBtn = document.getElementById('random-game');
    if (randomGameBtn) {
        randomGameBtn.addEventListener('click', () => {
            showLoadingScreen('Recherche d\'un adversaire...');
            socket.emit('findRandomGame', userData);
        });
    }

    // 🔹 Création d'une room privée
    const createRoomBtn = document.getElementById('create-room');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            window.location.href = '/room-choice';
        });
    }

    // 🔹 Annulation de la recherche
    const cancelSearchBtn = document.getElementById('cancel-search');
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            socket.emit('cancelSearch');
            hideLoadingScreen();
        });
    }
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

// 📌 Gestion du chargement
function showLoadingScreen(message) {
    const overlay = document.getElementById('loading-overlay');
    const messageElement = document.getElementById('loading-message');
    
    if (overlay) overlay.classList.remove('hidden');
    if (messageElement) messageElement.textContent = message;
}

function hideLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// 📌 Affichage d'une erreur simple
function showError(message) {
    alert(`⚠️ ${message}`);
}