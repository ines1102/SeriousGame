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

    // Récupération du nom et de l’avatar stockés après `index.html`
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    sessionStorage.setItem("roomId", roomId);

    if (userName) userNameElement.textContent = userName;
    if (userAvatar) userAvatarElement.src = userAvatar;
    else userAvatarElement.src = "/Avatars/default.jpeg"; // Avatar par défaut

    /** Afficher un message d'erreur */
    function showError(message) {
        errorMessageElement.textContent = message;
        errorToast.classList.add("show");
        setTimeout(() => {
            errorToast.classList.remove("show");
        }, 3000);
    }

    /** Mode Joueur Aléatoire */
    randomModeButton.addEventListener("click", () => {
        loadingOverlay.classList.remove("hidden"); // Afficher l'overlay

        socket.emit("find_random_room", { name: userName, avatar: userAvatar });

        socket.on("room_found", (roomId) => {
            sessionStorage.setItem("roomId", roomId);
            window.location.href = "/gameboard.html"; // Redirige vers le plateau de jeu
        });

        socket.on("error", (error) => {
            loadingOverlay.classList.add("hidden");
            showError(error);
        });
    });

    /** Mode Jouer entre amis */
    friendModeButton.addEventListener("click", () => {
        window.location.href = "/room-choice.html"; // Redirection vers le choix de room
    });

    /** Annuler la recherche d'un adversaire */
    cancelSearchButton.addEventListener("click", () => {
        socket.emit("cancel_search");
        loadingOverlay.classList.add("hidden");
    });
});