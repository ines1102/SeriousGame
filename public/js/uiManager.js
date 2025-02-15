export function updatePlayerProfile(playerData) {
    console.log("🔄 Mise à jour du profil player:", playerData);
    
    const playerContainer = document.getElementById("player-container");
    const playerAvatar = document.getElementById("player-avatar");
    const playerName = document.getElementById("player-name");

    if (!playerContainer || !playerAvatar || !playerName) {
        console.warn("⚠️ Impossible de mettre à jour le profil du joueur, éléments manquants.");
        return;
    }

    playerName.textContent = playerData.name || "Joueur inconnu";
    playerAvatar.src = playerData.avatarSrc || "/Avatars/default.jpeg";

    playerAvatar.onerror = () => {
        console.warn(`⚠️ Erreur de chargement de l'avatar pour ${playerData.name}, remplacement par défaut.`);
        playerAvatar.src = "/Avatars/default.jpeg";
    };

    playerContainer.classList.remove("hidden");
}

export function updateOpponentProfile(opponentData) {
    console.log("🔄 Mise à jour du profil opponent:", opponentData);
    
    const opponentContainer = document.getElementById("opponent-container");
    const opponentAvatar = document.getElementById("opponent-avatar");
    const opponentName = document.getElementById("opponent-name");

    if (!opponentContainer || !opponentAvatar || !opponentName) {
        console.warn("⚠️ Impossible de mettre à jour le profil de l'adversaire, éléments manquants.");
        return;
    }

    opponentName.textContent = opponentData.name || "Adversaire";
    opponentAvatar.src = opponentData.avatarSrc || "/Avatars/default.jpeg";

    opponentAvatar.onerror = () => {
        console.warn(`⚠️ Erreur de chargement de l'avatar pour ${opponentData.name}, remplacement par défaut.`);
        opponentAvatar.src = "/Avatars/default.jpeg";
    };

    opponentContainer.classList.remove("hidden");
}

export function initializeUI() {
    console.log("📌 Initialisation de l'interface utilisateur...");

    // Afficher les containers des profils (Joueur et Adversaire)
    const playerContainer = document.getElementById("player-container");
    const opponentContainer = document.getElementById("opponent-container");

    if (playerContainer) playerContainer.classList.remove("hidden");
    if (opponentContainer) opponentContainer.classList.remove("hidden");
}

export function showDisconnectOverlay(message) {
    console.log("🔌 Déconnexion:", message);
    
    const overlay = document.getElementById("disconnect-overlay");
    const messageElement = overlay.querySelector("p");

    if (overlay && messageElement) {
        messageElement.textContent = message;
        overlay.classList.remove("hidden");
    }

    setTimeout(() => {
        window.location.href = "/choose-mode";
    }, 3000);
}

export function showError(message) {
    console.error("❌ Erreur:", message);

    const errorToast = document.getElementById("error-message");
    if (errorToast) {
        errorToast.textContent = message;
        errorToast.classList.remove("hidden");
        setTimeout(() => {
            errorToast.classList.add("hidden");
        }, 3000);
    }
}