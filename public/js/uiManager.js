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

function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';

    console.log(`🔄 Mise à jour du profil ${prefix}:`, player);

    // Sélection des éléments HTML
    const avatarContainer = document.querySelector(`.${prefix}-avatar img`);
    const nameElement = document.querySelector(`.${prefix}-name`);

    if (!player || !avatarContainer || !nameElement) {
        console.warn(`⚠️ Impossible de mettre à jour le profil de ${prefix}`);
        return;
    }

    // Correction : Utiliser l'avatar spécifique au joueur
    const avatarPath = player.avatarSrc ? player.avatarSrc : `/Avatars/default.jpeg`;
    console.log(`📸 Avatar choisi pour ${player.name}:`, avatarPath);

    avatarContainer.src = avatarPath;
    avatarContainer.alt = `Avatar de ${player.name}`;
    nameElement.textContent = player.name || 'Joueur inconnu';

    // Gestion des erreurs de chargement d'image
    avatarContainer.onerror = () => {
        console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
        avatarContainer.src = "/Avatars/default.jpeg";
    };
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