// 📌 uiManager.js - Gestion de l'affichage des profils et de l'UI

export function initializeUI(userData) {
    try {
        console.log("📌 Initialisation de l'interface utilisateur...");

        // ✅ Met à jour le profil du joueur
        updatePlayerProfile(userData, false);

        // ✅ Initialise le conteneur de l’adversaire (vide au départ)
        initializeOpponentContainer();
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
        let avatarImg = avatarContainer.querySelector('img');
        if (!avatarImg) {
            avatarImg = document.createElement('img');
            avatarImg.className = 'avatar-img';
            avatarContainer.appendChild(avatarImg);
        }

        const avatarPath = player.avatarSrc || `/Avatars/default.jpeg`;
        console.log(`📸 Avatar choisi pour ${player.name}: ${avatarPath}`);

        avatarImg.src = avatarPath;
        avatarImg.alt = `Avatar de ${player.name}`;

        avatarImg.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarImg.src = "/Avatars/default.jpeg";
        };
    }

    // ✅ Mise à jour du nom
    const nameElement = document.querySelector(`.${prefix}-name`);
    if (nameElement) {
        nameElement.textContent = player.name || "Joueur inconnu";
    }
}

// ✅ Initialisation du conteneur de l'adversaire
function initializeOpponentContainer() {
    const opponentContainer = document.querySelector('.opponent-profile');
    if (opponentContainer) {
        opponentContainer.innerHTML = `
            <div class="opponent-avatar">
                <img src="/Avatars/default.jpeg" alt="En attente d'un adversaire" class="avatar-img">
            </div>
            <div class="opponent-name">En attente...</div>
            <div class="status-indicator"></div>
        `;
    }
}