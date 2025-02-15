export function enableDragAndDrop() {
    console.log("🖱️ Activation du Drag & Drop...");

    const playerHand = document.getElementById('player-hand');
    const opponentHand = document.getElementById('opponent-hand');
    const playerDropZones = document.querySelectorAll('.player-areas .drop-area');
    const opponentDropZones = document.querySelectorAll('.opponent-areas .drop-area');

    if (!playerHand || !opponentHand || playerDropZones.length === 0 || opponentDropZones.length === 0) {
        console.warn("⚠️ Zones de Drag & Drop non trouvées !");
        return;
    }

    // Ajout d'événements pour rendre les cartes déplaçables
    playerHand.addEventListener('dragstart', (event) => {
        const card = event.target;
        if (!card.classList.contains('hand-card')) return;

        event.dataTransfer.setData('text/plain', card.id);
        setTimeout(() => card.classList.add('dragging'), 0);
    });

    playerHand.addEventListener('dragend', (event) => {
        event.target.classList.remove('dragging');
    });

    // Gestion du survol des zones valides
    playerDropZones.forEach(zone => {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault();
            zone.classList.add('drop-hover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drop-hover');
        });

        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('drop-hover');

            const cardId = event.dataTransfer.getData('text/plain');
            const card = document.getElementById(cardId);

            if (!card) return;

            // Déplacement de la carte vers la zone choisie
            zone.appendChild(card);
            card.classList.add('played-card');

            // Notifier le serveur
            const roomId = localStorage.getItem('currentRoomId');
            const socket = window.gameSocket;
            if (socket) {
                socket.emit('cardPlayed', {
                    roomId,
                    cardId,
                    slot: zone.dataset.slot
                });
            }

            console.log(`🎴 Carte ${cardId} jouée dans ${zone.dataset.slot}`);
        });
    });

    // Interdire le drop dans la zone de l'adversaire
    opponentDropZones.forEach(zone => {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault();
        });

        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            console.warn("🚫 Vous ne pouvez pas jouer une carte dans la zone de l'adversaire !");
        });
    });
}

// ✅ Activation du Drag & Drop après le chargement de la page
document.addEventListener('DOMContentLoaded', enableDragAndDrop);