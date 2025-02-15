// dragAndDrop.js
class DragAndDropManager {
    constructor() {
        this.draggedElement = null;
        this.draggedCard = null;
        this.isDragging = false;
        this.dropZones = new Set();
        this.dragStartPosition = { x: 0, y: 0 };
        this.originalTransform = '';
    }

    initialize() {
        console.log("🖱️ Activation du Drag & Drop...");
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Cartes dans la main du joueur
        document.querySelectorAll('.hand-card').forEach(card => {
            this.setupCardDraggable(card);
        });

        // Zones de dépôt
        document.querySelectorAll('.drop-area').forEach(zone => {
            this.setupDropZone(zone);
        });

        // Événements globaux pour le drag & drop
        this.setupGlobalEvents();
    }

    setupCardDraggable(card) {
        card.setAttribute('draggable', 'true');
        
        card.addEventListener('dragstart', (e) => this.handleDragStart(e));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));
        card.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        card.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        card.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Ajout des effets visuels
        card.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        card.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    setupDropZone(zone) {
        this.dropZones.add(zone);
        
        zone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        zone.addEventListener('dragover', (e) => this.handleDragOver(e));
        zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        zone.addEventListener('drop', (e) => this.handleDrop(e));
    }

    setupGlobalEvents() {
        document.addEventListener('mouseup', () => {
            if (this.draggedElement) {
                this.resetDraggedElement();
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    handleDragStart(e) {
        this.draggedElement = e.target;
        this.originalTransform = e.target.style.transform;
        
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.cardId);
        
        // Créer une image fantôme personnalisée
        this.createDragImage(e);
    }

    handleDragEnd(e) {
        this.resetDragState(e.target);
    }

    handleDragEnter(e) {
        if (this.isValidDropZone(e.target)) {
            e.target.classList.add('drag-over');
        }
    }

    handleDragOver(e) {
        if (this.isValidDropZone(e.target)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    }

    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        
        const dropZone = e.target.closest('.drop-area');
        if (!dropZone || !this.draggedElement) return;

        dropZone.classList.remove('drag-over');
        
        const cardId = e.dataTransfer.getData('text/plain');
        this.emitCardPlayed(cardId, dropZone.dataset.slot);
        
        this.resetDragState(this.draggedElement);
    }

    handleTouchStart(e) {
        const touch = e.touches[0];
        this.dragStartPosition = {
            x: touch.clientX,
            y: touch.clientY
        };
        
        this.draggedElement = e.target;
        this.isDragging = true;
        
        e.target.classList.add('dragging');
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.dragStartPosition.x;
        const deltaY = touch.clientY - this.dragStartPosition.y;
        
        this.draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        // Vérifier les zones de dépôt
        this.checkDropZones(touch.clientX, touch.clientY);
    }

    handleTouchEnd(e) {
        if (!this.isDragging) return;
        
        const touch = e.changedTouches[0];
        const dropZone = this.findDropZone(touch.clientX, touch.clientY);
        
        if (dropZone) {
            const cardId = this.draggedElement.dataset.cardId;
            this.emitCardPlayed(cardId, dropZone.dataset.slot);
        }
        
        this.resetDragState(this.draggedElement);
    }

    handleMouseDown(e) {
        const card = e.target;
        card.classList.add('card-grabbed');
        this.saveInitialPosition(card);
    }

    handleMouseUp(e) {
        const card = e.target;
        card.classList.remove('card-grabbed');
        this.resetPosition(card);
    }

    // Utilitaires
    createDragImage(e) {
        const dragImage = e.target.cloneNode(true);
        dragImage.classList.add('drag-image');
        document.body.appendChild(dragImage);
        
        e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);
        
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
    }

    isValidDropZone(element) {
        return element.classList.contains('drop-area') && !element.querySelector('.played-card');
    }

    findDropZone(x, y) {
        return Array.from(this.dropZones).find(zone => {
            const rect = zone.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        });
    }

    checkDropZones(x, y) {
        this.dropZones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            const isOver = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
            
            zone.classList.toggle('drag-over', isOver);
        });
    }

    emitCardPlayed(cardId, slot) {
        const playCardEvent = new CustomEvent('cardPlayed', {
            detail: { cardId, slot }
        });
        document.dispatchEvent(playCardEvent);
    }

    resetDragState(element) {
        if (!element) return;
        
        element.classList.remove('dragging', 'card-grabbed');
        element.style.transform = this.originalTransform;
        
        this.draggedElement = null;
        this.isDragging = false;
        
        this.dropZones.forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }

    saveInitialPosition(element) {
        element.dataset.initialTransform = element.style.transform || '';
    }

    resetPosition(element) {
        element.style.transform = element.dataset.initialTransform;
    }

    // Animation des cartes
    animateCard(element, properties) {
        element.animate(properties, {
            duration: 300,
            easing: 'ease-out',
            fill: 'forwards'
        });
    }
}

// Styles CSS nécessaires
const styles = `
    .hand-card {
        cursor: grab;
        transition: transform 0.2s ease;
        user-select: none;
        touch-action: none;
    }

    .hand-card.dragging {
        opacity: 0.7;
        cursor: grabbing;
    }

    .hand-card.card-grabbed {
        cursor: grabbing;
        transform: scale(1.05);
        z-index: 1000;
    }

    .drop-area {
        transition: all 0.2s ease;
    }

    .drop-area.drag-over {
        background-color: rgba(74, 144, 226, 0.1);
        border-color: #4a90e2;
    }

    .drag-image {
        position: absolute;
        pointer-events: none;
        opacity: 0.7;
        z-index: 1000;
    }
`;

// Injection des styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Export de la fonction d'initialisation
const dragAndDropManager = new DragAndDropManager();

export function enableDragAndDrop() {
    dragAndDropManager.initialize();
}

export default dragAndDropManager;