document.addEventListener('DOMContentLoaded', async () => {
    const userData = loadUserData();
    if (!userData) return redirectToHome();

    try {
        const serverConfig = await fetchServerConfig();
        initializeSocket(serverConfig.serverIp, serverConfig.serverPort, userData);
        setupUI(userData);
    } catch (error) {
        console.error('❌ Erreur d\'initialisation:', error);
        showError('Erreur de connexion au serveur');
    }
});

// 📌 Connexion WebSocket optimisée (compatible Chrome, Firefox, Safari)
function initializeSocket(serverIp, serverPort, userData) {
    console.log(`📡 Tentative de connexion au serveur WebSocket: ${serverIp}:${serverPort}`);

    const socket = io(`https://seriousgame-ds65.onrender.com`, {
        transports: ["websocket", "polling"],
        secure: false,
        rejectUnauthorized: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });

    socket.on('connect', () => {
        console.log(`✅ Connecté au serveur (${serverIp})`);
        document.body.classList.remove('offline');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnecté du serveur');
        document.body.classList.add('offline');
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion:', error);
        showError('Erreur de connexion au serveur');
    });

    socket.on('waitingForOpponent', () => showLoadingScreen('Recherche d\'un adversaire...'));

    socket.on('gameStart', ({ roomCode }) => {
        console.log(`🎮 Partie trouvée, redirection vers gameboard (Room: ${roomCode})`);
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
    } else {
        console.error('❌ Éléments de l\'interface utilisateur introuvables.');
    }
}

// 📌 Gestion des événements de l'interface
function setupEventListeners(socket, userData) {
    // 🔹 Recherche de partie aléatoire
    const randomGameBtn = document.getElementById('random-game');
    if (randomGameBtn) {
        randomGameBtn.addEventListener('click', () => {
            console.log('🔍 Recherche d\'un adversaire...');
            showLoadingScreen('Recherche d\'un adversaire...');
            socket.emit('findRandomGame', userData);
        });
    } else {
        console.warn('⚠️ Bouton "random-game" introuvable.');
    }

    // 🔹 Création d'une room privée
    const createRoomBtn = document.getElementById('create-room');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            console.log('🏠 Création d\'une room privée.');
            window.location.href = '/room-choice';
        });
    } else {
        console.warn('⚠️ Bouton "create-room" introuvable.');
    }

    // 🔹 Annulation de la recherche
    const cancelSearchBtn = document.getElementById('cancel-search');
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            console.log('❌ Annulation de la recherche.');
            socket.emit('cancelSearch');
            hideLoadingScreen();
        });
    } else {
        console.warn('⚠️ Bouton "cancel-search" introuvable.');
    }
}

// 📌 Chargement des données utilisateur
function loadUserData() {
    try {
        return JSON.parse(localStorage.getItem('userData'));
    } catch {
        console.error('❌ Erreur lors du chargement des données utilisateur.');
        return null;
    }
}

// 📌 Redirection si l'utilisateur n'est pas connecté
function redirectToHome() {
    console.warn('🔄 Redirection vers la page d\'accueil.');
    window.location.href = '/';
}

// 📌 Récupération de l'IP et du port du serveur
async function fetchServerConfig() {
    try {
        const response = await fetch('/server-config');
        const config = await response.json();
        console.log(`📡 Serveur WebSocket détecté sur: ${config.serverIp}:${config.serverPort}`);
        return config;
    } catch (error) {
        console.error('❌ Erreur récupération IP serveur:', error);
        return { serverIp: 'localhost', serverPort: 10000 };
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