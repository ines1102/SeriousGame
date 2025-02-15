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
    
    waitForElement(`.${prefix}-profile`, (profileContainer) => {
        try {
            const avatarContainer = profileContainer.querySelector(`.${prefix}-avatar img`);
            const nameContainer = profileContainer.querySelector(`.${prefix}-name`);
            
            if (!avatarContainer || !nameContainer) {
                throw new Error(`Éléments manquants pour ${prefix}`);
            }

            // Mise à jour sécurisée des informations
            nameContainer.textContent = player.name || 'Joueur inconnu';
            
            const avatarPath = getAvatarPath(player.sex, player.avatarId);
            if (avatarPath) {
                avatarContainer.src = avatarPath;
                avatarContainer.alt = `Avatar de ${player.name}`;
            }

            console.log(`✅ Profil ${prefix} mis à jour:`, {
                name: player.name,
                avatar: avatarPath
            });
        } catch (error) {
            console.error(`❌ Erreur lors de la mise à jour du profil ${prefix}:`, error);
        }
    }, 100); // Augmenter le nombre de tentatives si nécessaire
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