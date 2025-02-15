export function enableDragAndDrop(cardElement) {
    cardElement.setAttribute('draggable', 'true');

    cardElement.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', event.target.src);
    });

    cardElement.addEventListener('dragend', () => {
        document.querySelectorAll('.drop-hover').forEach(zone => 
            zone.classList.remove('drop-hover')
        );
    });
}

// 📌 Initialisation du Drag & Drop
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.drop-area').forEach(area => {
        area.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (!area.hasChildNodes()) {
                area.classList.add('drop-hover');
            }
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('drop-hover');
        });

        area.addEventListener('drop', (event) => {
            event.preventDefault();
            area.classList.remove('drop-hover');

            if (area.hasChildNodes()) return;

            const cardSrc = event.dataTransfer.getData('text/plain');
            const playedCard = document.createElement('img');
            playedCard.src = cardSrc;
            playedCard.classList.add('played-card');

            area.appendChild(playedCard);

            // Envoi de l'action au serveur
            const socket = io('/');
            socket.emit('cardPlayed', { cardSrc, slot: area.dataset.slot });

            // Suppression de la carte de la main du joueur
            document.querySelectorAll('#player-hand img').forEach(card => {
                if (card.src === cardSrc) {
                    card.remove();
                }
            });
        });
    });
});

class DragAndDropManager {
    constructor(gameInstance, socket) {
        this.gameInstance = gameInstance;
        this.socket = socket;
    }

    initialize() {
        console.log('🖱️ Drag & Drop initialisé');
        document.querySelectorAll('.drop-area').forEach(area => {
            area.addEventListener('dragover', (event) => {
                event.preventDefault();
                if (!area.hasChildNodes()) {
                    area.classList.add('drop-hover');
                }
            });

            area.addEventListener('dragleave', () => {
                area.classList.remove('drop-hover');
            });

            area.addEventListener('drop', (event) => {
                event.preventDefault();
                area.classList.remove('drop-hover');

                if (area.hasChildNodes()) return;

                const cardSrc = event.dataTransfer.getData('text/plain');
                const playedCard = document.createElement('img');
                playedCard.src = cardSrc;
                playedCard.classList.add('played-card');

                area.appendChild(playedCard);

                // Envoi de l'action au serveur
                this.socket.emit('cardPlayed', { cardSrc, slot: area.dataset.slot });

                // Suppression de la carte de la main du joueur
                document.querySelectorAll('#player-hand img').forEach(card => {
                    if (card.src === cardSrc) {
                        card.remove();
                    }
                });
            });
        });
    }
}

export default DragAndDropManager; // ✅ Ajout de l'export