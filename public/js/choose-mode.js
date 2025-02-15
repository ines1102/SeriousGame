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

    console.log(`📌 Utilisateur : ${userName}, Avatar : ${userAvatar}`);

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
        loadingOverlay.classList.remove("hidden");

        socket.emit("find_random_room", { name: userName, avatar: userAvatar });

        socket.once("room_found", (roomId) => {
            console.log(`✅ Room trouvée : ${roomId}`);

            // **Forcer l'enregistrement des données avant de rediriger**
            sessionStorage.setItem("roomId", roomId);
            sessionStorage.setItem("userName", userName);
            sessionStorage.setItem("userAvatar", userAvatar);

            console.log("📌 `roomId` enregistré :", sessionStorage.getItem("roomId"));
            console.log("📌 `userName` enregistré :", sessionStorage.getItem("userName"));
            console.log("📌 `userAvatar` enregistré :", sessionStorage.getItem("userAvatar"));

            window.location.href = "/gameboard.html";
        });

        socket.once("error", (error) => {
            console.error(`❌ Erreur : ${error}`);
            loadingOverlay.classList.add("hidden");
            errorToast.textContent = error;
            errorToast.classList.add("show");
            setTimeout(() => errorToast.classList.remove("show"), 3000);
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