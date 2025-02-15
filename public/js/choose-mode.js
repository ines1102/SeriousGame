document.addEventListener("DOMContentLoaded", () => {
    const userNameElement = document.getElementById("user-name");
    const userAvatarElement = document.getElementById("user-avatar");
    const randomModeButton = document.getElementById("random-mode");
    const friendModeButton = document.getElementById("friend-mode");
    const loadingOverlay = document.getElementById("loading-overlay");
    const cancelSearchButton = document.getElementById("cancel-search");
    const errorToast = document.getElementById("error-toast");
    const errorMessageElement = document.getElementById("error-message");

    const socket = io(); // Connexion au serveur Socket.io

    // ✅ Vérification des données utilisateur stockées après `index.html`
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");

    if (!userName || !userAvatar) {
        console.error("⚠️ Données utilisateur incomplètes !");
        alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    // ✅ Mise à jour de l'interface utilisateur
    userNameElement.textContent = userName;
    userAvatarElement.src = userAvatar || "/Avatars/default.jpeg";

    /** ✅ Fonction pour afficher un message d'erreur */
    function showError(message) {
        errorMessageElement.textContent = message;
        errorToast.classList.add("show");
        setTimeout(() => {
            errorToast.classList.remove("show");
        }, 3000);
    }

    /** ✅ Mode Joueur Aléatoire */
    randomModeButton.addEventListener("click", () => {
        console.log("🔄 Recherche d'une room aléatoire...");
        loadingOverlay.classList.remove("hidden"); // Afficher l'overlay
    
        socket.emit("find_random_room", { name: userName, avatar: userAvatar });
    
        socket.once("room_found", (roomId) => {
            console.log(`✅ Room trouvée : ${roomId}`);
            
            // Vérification du stockage de `roomId`
            sessionStorage.setItem("roomId", roomId);
            console.log("📌 `roomId` enregistré dans sessionStorage :", sessionStorage.getItem("roomId"));
    
            window.location.href = "/gameboard.html";
        });
    });

    /** ✅ Mode Jouer entre amis */
    friendModeButton.addEventListener("click", () => {
        console.log("👥 Choix de jouer entre amis.");
        window.location.href = "/room-choice.html"; // Redirection vers le choix de room
    });

    /** ✅ Annuler la recherche d'un adversaire */
    cancelSearchButton.addEventListener("click", () => {
        console.log("❌ Annulation de la recherche d'un adversaire.");
        socket.emit("cancel_search");
        loadingOverlay.classList.add("hidden");
    });
});