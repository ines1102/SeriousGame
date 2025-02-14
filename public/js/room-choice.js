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
        rejectUnauthorized: false, // 🔥 SSL auto-signé supporté
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });

    socket.on('connect', () => console.log(`✅ Connecté au serveur (${serverIp})`));
    socket.on('disconnect', () => console.log('🔌 Déconnecté du serveur'));

    // 📌 Création de la room
    document.getElementById('create-room')?.addEventListener('click', () => {
        showLoadingScreen('Création de la room...');
        socket.emit('createRoom', userData);
    });

    // 📌 Réception du code de room après création
    socket.on('roomCreated', ({ roomCode }) => {
        hideLoadingScreen();
        updateRoomCode(roomCode);
    });

    // 📌 Rejoindre une room
    document.getElementById('join-room')?.addEventListener('click', () => {
        const roomCode = document.getElementById('room-code')?.value.trim();
        if (!roomCode || !/^\d{4}$/.test(roomCode)) {
            showError('Le code doit contenir 4 chiffres');
            return;
        }

        showLoadingScreen('Connexion à la room...');
        socket.emit('joinRoom', { ...userData, roomCode });
    });

    // 📌 Démarrage de la partie après que deux joueurs sont connectés
    socket.on('gameStart', ({ roomCode }) => {
        hideLoadingScreen();
        window.location.href = `/gameboard?roomId=${roomCode}`;
    });

    // 📌 Gestion des erreurs
    socket.on('error', (error) => {
        hideLoadingScreen();
        showError(error.message || 'Une erreur est survenue');
    });
}

// 📌 Affichage du code de room
function updateRoomCode(code) {
    const displayCode = document.getElementById('display-code');
    const roomCodeDisplay = document.getElementById('room-code-display');

    if (displayCode && roomCodeDisplay) {
        displayCode.textContent = code;
        roomCodeDisplay.classList.remove('hidden');
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
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        document.getElementById('loading-message').textContent = message;
        loading.classList.remove('hidden');
    }
}

function hideLoadingScreen() {
    const loading = document.getElementById('loading-overlay');
    if (loading) loading.classList.add('hidden');
}

// 📌 Affichage des erreurs
function showError(message) {
    alert(`⚠️ ${message}`);
}