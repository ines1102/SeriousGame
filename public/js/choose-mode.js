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

    // ✅ Vérification et récupération des données utilisateur stockées après `index.html`
    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");

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

        console.log("📌 Envoi de `find_random_room` avec :", { name: userName, avatar: userAvatar });

        socket.emit("find_random_room", { name: userName, avatar: userAvatar });

        socket.once("room_found", (roomId) => {
            console.log(`✅ Room trouvée : ${roomId}`);

            // **Stockage sécurisé avant la redirection**
            sessionStorage.setItem("roomId", roomId);
            sessionStorage.setItem("userName", userName);
            sessionStorage.setItem("userAvatar", userAvatar);

            console.log("📌 `roomId` enregistré :", sessionStorage.getItem("roomId"));
            console.log("📌 `userName` enregistré :", sessionStorage.getItem("userName"));
            console.log("📌 `userAvatar` enregistré :", sessionStorage.getItem("userAvatar"));

            // ✅ Vérification du stockage avant la redirection
            setTimeout(() => {
                console.log("✅ `sessionStorage` après 500ms :", {
                    roomId: sessionStorage.getItem("roomId"),
                    userName: sessionStorage.getItem("userName"),
                    userAvatar: sessionStorage.getItem("userAvatar")
                });

                // 🔄 Réessai de stockage si nécessaire
                if (!sessionStorage.getItem("roomId") || !sessionStorage.getItem("userName") || !sessionStorage.getItem("userAvatar")) {
                    console.error("❌ Erreur : `sessionStorage` incomplet avant la redirection, tentative de correction...");
                    sessionStorage.setItem("roomId", roomId);
                    sessionStorage.setItem("userName", userName);
                    sessionStorage.setItem("userAvatar", userAvatar);

                    console.log("📌 `sessionStorage` corrigé :", {
                        roomId: sessionStorage.getItem("roomId"),
                        userName: sessionStorage.getItem("userName"),
                        userAvatar: sessionStorage.getItem("userAvatar")
                    });
                }

                // Vérification finale avant redirection
                if (!sessionStorage.getItem("roomId") || !sessionStorage.getItem("userName") || !sessionStorage.getItem("userAvatar")) {
                    console.error("❌ Erreur critique : `sessionStorage` reste incomplet après correction !");
                    return;
                }

                window.location.href = "/gameboard.html";
            }, 500);
        });

        socket.once("error", (error) => {
            console.error(`❌ Erreur : ${error}`);
            loadingOverlay.classList.add("hidden");
            showError(error);
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