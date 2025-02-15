// 📌 Configuration des avatars et chemins
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

// ✅ Fonction pour récupérer le bon chemin d'avatar
function getAvatarPath(sex, avatarId) {
    if (!sex || !avatarId) {
        console.warn("⚠️ Avatar non défini, utilisation de l'avatar par défaut");
        return AVATAR_CONFIG.default;
    }
    return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
}

// ✅ Mise à jour du profil d'un joueur (Joueur ou Adversaire)
export function updatePlayerProfile(player, isOpponent = false) {
    try {
        if (!player || !player.name || !player.avatarId) {
            console.warn(`⚠️ Impossible de mettre à jour le profil de ${isOpponent ? 'l\'adversaire' : 'joueur'}`);
            return;
        }

        const prefix = isOpponent ? 'opponent' : 'player';
        const profileContainer = document.querySelector(`.${prefix}-profile`);
        const avatarContainer = document.querySelector(`.${prefix}-avatar img`);
        const nameContainer = document.querySelector(`.${prefix}-name`);
        const healthBar = document.querySelector(`.${prefix}-health .health-bar-fill`);

        if (!profileContainer || !avatarContainer || !nameContainer || !healthBar) {
            console.warn(`⚠️ Conteneurs introuvables pour ${prefix}`);
            return;
        }

        // ✅ Mise à jour du nom
        nameContainer.textContent = player.name || 'Joueur inconnu';

        // ✅ Mise à jour de l'avatar
        const avatarPath = getAvatarPath(player.sex, player.avatarId);
        avatarContainer.src = avatarPath;
        avatarContainer.alt = `Avatar de ${player.name}`;

        // ✅ Gestion des erreurs de chargement d'avatar
        avatarContainer.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarContainer.src = AVATAR_CONFIG.default;
        };

        // ✅ Réinitialisation de la barre de vie
        healthBar.style.width = '100%';
        healthBar.dataset.health = 100;

        console.log(`📌 Profil mis à jour pour ${player.name}:`, player);

    } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour du profil ${isOpponent ? 'adversaire' : 'joueur'}:`, error);
    }
}

// ✅ Mise à jour des barres de vie (après un tour)
export function updateHealthBar(playerId, newHealth) {
    try {
        const isOpponent = playerId !== localStorage.getItem('userData').clientId;
        const prefix = isOpponent ? 'opponent' : 'player';
        const healthBarFill = document.querySelector(`.${prefix}-health .health-bar-fill`);

        if (!healthBarFill) {
            console.warn(`⚠️ Barre de vie introuvable pour ${prefix}`);
            return;
        }

        // ✅ Mise à jour visuelle de la barre de vie
        healthBarFill.style.width = `${newHealth}%`;
        healthBarFill.dataset.health = newHealth;

        console.log(`💖 Mise à jour de la vie de ${prefix}: ${newHealth}%`);

    } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour de la barre de vie:`, error);
    }
}

// ✅ Ajout des profils aux coins de l'écran
function initializeProfiles() {
    try {
        const playerContainer = document.querySelector('.player-profile');
        const opponentContainer = document.querySelector('.opponent-profile');

        if (playerContainer) {
            playerContainer.style.position = 'fixed';
            playerContainer.style.bottom = '20px';
            playerContainer.style.right = '20px';
        }

        if (opponentContainer) {
            opponentContainer.style.position = 'fixed';
            opponentContainer.style.top = '20px';
            opponentContainer.style.left = '20px';
        }
        
        console.log('📌 Initialisation des profils aux coins de l’écran');

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des profils:', error);
    }
}

// ✅ Exécution automatique après chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log("📌 Initialisation de l'interface utilisateur...");
    initializeProfiles();
});