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

// 📌 Fonction pour récupérer le bon chemin d'avatar
function getAvatarPath(sex, avatarId) {
    if (!sex || !avatarId) {
        console.warn("⚠️ Avatar non défini, utilisation de l'avatar par défaut");
        return AVATAR_CONFIG.default;
    }
    return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
}

// ✅ Attente de l'affichage d'un élément avant exécution d'une fonction
function waitForElement(selector, callback, attempts = 50) {
    const element = document.querySelector(selector);
    if (element) {
        callback(element);
    } else if (attempts > 0) {
        setTimeout(() => waitForElement(selector, callback, attempts - 1), 100);
    } else {
        console.warn(`⚠️ L'élément "${selector}" n'a pas été trouvé après 50 tentatives.`);
    }
}

// ✅ Mise à jour du profil joueur ou adversaire
export function updatePlayerProfile(player, isOpponent = false) {
    if (!player) {
        console.warn("❌ Données du joueur manquantes");
        return;
    }

    const prefix = isOpponent ? 'opponent' : 'player';
    console.log(`🔄 Mise à jour du profil ${prefix}:`, player);

    try {
        // Sélectionner les éléments avec une meilleure gestion d'erreur
        const profileContainer = document.querySelector(`.${prefix}-profile`);
        if (!profileContainer) {
            throw new Error(`Container ${prefix}-profile non trouvé`);
        }

        // Mettre à jour l'avatar
        const avatarImg = profileContainer.querySelector(`.${prefix}-avatar img`);
        if (avatarImg) {
            const avatarPath = getAvatarPath(player.sex, player.avatarId);
            avatarImg.src = avatarPath;
            avatarImg.alt = `Avatar de ${player.name}`;
            
            // Gérer les erreurs de chargement d'image
            avatarImg.onerror = () => {
                console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
                avatarImg.src = AVATAR_CONFIG.default;
            };
        }

        // Mettre à jour le nom
        const nameElement = profileContainer.querySelector(`.${prefix}-name`);
        if (nameElement) {
            nameElement.textContent = player.name;
        }

        // Mettre à jour la barre de vie si nécessaire
        const healthBar = profileContainer.querySelector(`.${prefix}-health-bar-fill`);
        if (healthBar) {
            healthBar.style.width = '100%';
        }

        console.log(`✅ Profil ${prefix} mis à jour:`, {
            name: player.name,
            avatar: getAvatarPath(player.sex, player.avatarId)
        });
    } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour du profil ${prefix}:`, error);
    }
}

// ✅ Correction du problème de chargement des profils
document.addEventListener('DOMContentLoaded', () => {
    console.log("📌 Initialisation de l'interface utilisateur...");

    // Attente que le DOM soit prêt et mise à jour du profil du joueur
    waitForElement('.player-profile', () => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) updatePlayerProfile(userData, false);
    });
});