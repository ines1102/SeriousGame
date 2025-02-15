// uiManager.js - Gère l'affichage et l'interface utilisateur
export function initializeUI(userData) {
    try {
        console.log("📌 Initialisation de l'interface utilisateur...");

        // ✅ Met à jour le profil du joueur
        updatePlayerProfile(userData, false);
        
        // ✅ Initialise le conteneur de l’adversaire
        initializeOpponentContainer();

        // ✅ Initialise les zones de jeu
        initializeGameAreas();
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation de l'UI:", error);
    }
}

export function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';
    
    console.log(`🔄 Mise à jour du profil ${prefix}:`, player);

    // ✅ Mise à jour de l'avatar
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    if (avatarContainer) {
        const avatarImg = avatarContainer.querySelector('img') || document.createElement('img');
        avatarImg.className = 'avatar-img';

        // 📌 Vérification du bon avatar
        const avatarPath = player.avatarSrc || "/Avatars/default.jpeg";
        console.log(`📸 Avatar choisi pour ${player.name}: ${avatarPath}`);

        avatarImg.src = avatarPath;
        avatarImg.alt = `Avatar de ${player.name}`;

        // ✅ Gestion des erreurs de chargement d’image
        avatarImg.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarImg.src = "/Avatars/default.jpeg";
        };

        if (!avatarContainer.contains(avatarImg)) {
            avatarContainer.appendChild(avatarImg);
        }
    }

    // ✅ Mise à jour du nom
    const nameElement = document.querySelector(`.${prefix}-name`);
    if (nameElement) {
        nameElement.textContent = player.name || "Joueur inconnu";
    }
}

// ✅ Initialisation du conteneur adversaire
function initializeOpponentContainer() {
    const opponentContainer = document.querySelector('.opponent-profile');
    if (opponentContainer) {
        opponentContainer.innerHTML = `
            <div class="opponent-avatar">
                <img src="/Avatars/default.jpeg" alt="En attente d'un adversaire" class="avatar-img placeholder">
            </div>
            <div class="opponent-name">En attente...</div>
            <div class="status-indicator"></div>
        `;
    }
}

// ✅ Initialisation des zones de jeu
function initializeGameAreas() {
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
        gameBoard.innerHTML = '';

        // 📌 Création des zones de jeu
        ['player-hand', 'game-zones', 'opponent-hand'].forEach(zone => {
            const div = document.createElement('div');
            div.id = zone;
            div.className = zone;
            gameBoard.appendChild(div);
        });
    }
}

export function showDisconnectOverlay(message) {
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