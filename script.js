// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleNotes');
    const toggleNotationButton = document.getElementById('toggleNotation');
    const fretboard = document.querySelector('.fretboard');
    const modeButtons = document.querySelectorAll('.btn-mode');
    const newQuestionButton = document.getElementById('newQuestion');
    const questionElement = document.getElementById('question');
    const scoreElement = document.getElementById('score');
    const streakElement = document.getElementById('streak');
    const gameArea = document.getElementById('gameArea');
    const startGameButton = document.getElementById('startGame');
    const backToSettingsButton = document.getElementById('backToSettings');
    
    let notesVisible = false;
    let frenchNotation = true; // Par défaut, notation française
    let currentMode = 'find-note';
    let currentQuestion = null;
    let score = 0;
    let streak = 0;
    let waitingForAnswer = false;
    
    // Initialiser les filtres en lisant l'état actuel des formulaires
    let noteTypeFilter = document.querySelector('input[name="noteType"]:checked')?.value || 'both';
    let stringFilter = Array.from(document.querySelectorAll('input[name="string"]:checked')).map(cb => cb.value);
    if (stringFilter.length === 0) {
        stringFilter = ['e', 'B', 'G', 'D', 'A', 'E']; // Toutes les cordes par défaut
    }
    
    console.log('Initialisation - Filtre type:', noteTypeFilter, 'Filtre cordes:', stringFilter);

    // Éléments pour le récapitulatif des options
    const optionModeElement = document.getElementById('optionMode');
    const optionNoteTypeElement = document.getElementById('optionNoteType');
    const optionStringsElement = document.getElementById('optionStrings');
    const optionNotationElement = document.getElementById('optionNotation');

    // Fonction pour mettre à jour le récapitulatif des options
    function updateOptionsDisplay() {
        // Mode de jeu
        const modeText = currentMode === 'practice' ? 'Entraînement libre' : 'Trouver la note';
        optionModeElement.textContent = modeText;
        
        // Type de notes
        const noteTypeText = noteTypeFilter === 'both' ? 'Toutes' : 
                            noteTypeFilter === 'natural' ? 'Naturelles' : 'Altérées';
        optionNoteTypeElement.textContent = noteTypeText;
        
        // Cordes sélectionnées
        if (stringFilter.length === 6) {
            optionStringsElement.textContent = 'Toutes';
        } else {
            const stringLabels = {
                'e': 'Mi aigu',
                'B': 'Si',
                'G': 'Sol',
                'D': 'Ré',
                'A': 'La',
                'E': 'Mi grave'
            };
            const selectedStrings = stringFilter.map(s => stringLabels[s]).join(', ');
            optionStringsElement.textContent = selectedStrings;
        }
        
        // Notation
        optionNotationElement.textContent = frenchNotation ? 'Française' : 'Internationale';
    }

    // Initialiser l'affichage des options
    updateOptionsDisplay();

    // Données pour les notes
    const stringNames = {
        'e': { fr: 'Mi aigu', int: 'High E' },
        'B': { fr: 'Si', int: 'B' },
        'G': { fr: 'Sol', int: 'G' },
        'D': { fr: 'Ré', int: 'D' },
        'A': { fr: 'La', int: 'A' },
        'E': { fr: 'Mi grave', int: 'Low E' }
    };

    // Fonction pour basculer l'affichage des notes
    toggleButton.addEventListener('click', function() {
        notesVisible = !notesVisible;
        
        if (notesVisible) {
            fretboard.classList.add('show-notes');
            toggleButton.textContent = 'Cacher les notes';
        } else {
            fretboard.classList.remove('show-notes');
            toggleButton.textContent = 'Afficher les notes';
        }
    });

    // Fonction pour basculer entre notation française et internationale
    toggleNotationButton.addEventListener('click', function() {
        frenchNotation = !frenchNotation;
        
        // Récupérer toutes les cases
        const frets = document.querySelectorAll('.fret');
        
        frets.forEach(fret => {
            const noteSpan = fret.querySelector('.note');
            if (noteSpan) {
                if (frenchNotation) {
                    noteSpan.textContent = fret.dataset.noteFr;
                    toggleNotationButton.textContent = 'Notation internationale';
                } else {
                    noteSpan.textContent = fret.dataset.noteInt;
                    toggleNotationButton.textContent = 'Notation française';
                }
            }
        });

        // Mettre à jour la question si elle existe
        if (currentQuestion) {
            generateQuestion();
        }
        
        // Mettre à jour l'affichage des options
        updateOptionsDisplay();
    });

    // Gestion des modes de jeu
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Retirer la classe active de tous les boutons
            modeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Ajouter la classe active au bouton cliqué
            this.classList.add('active');
            
            // Changer le mode
            currentMode = this.dataset.mode;
            
            // Mettre à jour l'interface
            updateGameMode();
            updateOptionsDisplay();
        });
    });

    // Gestion du filtre de type de notes
    const noteTypeRadios = document.querySelectorAll('input[name="noteType"]');
    noteTypeRadios.forEach(radio => {
        const updateFilter = function() {
            noteTypeFilter = radio.value;
            console.log('Filtre de type de notes changé:', noteTypeFilter);
            updateOptionsDisplay();
            // Si une question est en cours, en générer une nouvelle avec le nouveau filtre
            if (currentMode === 'find-note' && waitingForAnswer) {
                generateQuestion();
            }
        };
        
        radio.addEventListener('change', updateFilter);
        radio.addEventListener('click', updateFilter);
        
        // Aussi sur le label parent
        const label = radio.closest('.filter-option');
        if (label) {
            label.addEventListener('click', function() {
                radio.checked = true;
                updateFilter();
            });
        }
    });

    // Gestion du filtre de cordes
    document.querySelectorAll('input[name="string"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Mettre à jour le tableau des cordes sélectionnées
            stringFilter = Array.from(document.querySelectorAll('input[name="string"]:checked'))
                .map(cb => cb.value);
            
            // Si aucune corde n'est sélectionnée, empêcher la désélection de toutes
            if (stringFilter.length === 0) {
                this.checked = true;
                stringFilter = [this.value];
                return;
            }
            
            // Mettre à jour l'affichage des options
            updateOptionsDisplay();
            
            // Générer une nouvelle question si on est en mode jeu
            if (waitingForAnswer) {
                generateQuestion();
            }
        });
    });

    // Mettre à jour l'interface selon le mode
    function updateGameMode() {
        // Réinitialiser
        document.body.classList.remove('game-mode-practice', 'game-mode-find-note');
        
        if (currentMode === 'practice') {
            // Mode entraînement libre
            gameArea.classList.add('hidden');
            document.body.classList.add('game-mode-practice');
        } else if (currentMode === 'find-note') {
            // Mode trouver la note
            gameArea.classList.remove('hidden');
            document.body.classList.add('game-mode-find-note');
            resetGame();
        }
    }

    // Réinitialiser le jeu
    function resetGame() {
        score = 0;
        streak = 0;
        updateScore();
        currentQuestion = null;
        questionElement.textContent = 'Cliquez sur "Nouvelle question" pour commencer';
        waitingForAnswer = false;
        
        // Nettoyer les classes de réponse
        document.querySelectorAll('.fret').forEach(fret => {
            fret.classList.remove('correct-answer', 'wrong-answer');
        });
    }

    // Générer une nouvelle question
    function generateQuestion() {
        // Nettoyer les classes de réponse précédentes
        document.querySelectorAll('.fret').forEach(fret => {
            fret.classList.remove('correct-answer', 'wrong-answer');
        });

        // Récupérer toutes les cases
        let allFrets = Array.from(document.querySelectorAll('.fret'));
        
        console.log('Génération question - Filtre type:', noteTypeFilter, 'Filtre cordes:', stringFilter);
        console.log('Nombre de frets avant filtrage:', allFrets.length);
        
        // Filtrer selon le type de notes sélectionné
        if (noteTypeFilter === 'natural') {
            allFrets = allFrets.filter(fret => fret.dataset.type === 'natural');
            console.log('Après filtre natural:', allFrets.length);
        } else if (noteTypeFilter === 'sharp') {
            allFrets = allFrets.filter(fret => fret.dataset.type === 'sharp');
            console.log('Après filtre sharp:', allFrets.length);
        }
        
        // Filtrer selon les cordes sélectionnées
        allFrets = allFrets.filter(fret => stringFilter.includes(fret.dataset.string));
        console.log('Après filtre cordes:', allFrets.length);
        
        // Vérifier qu'il y a des cases disponibles
        if (allFrets.length === 0) {
            questionElement.textContent = 'Aucune note disponible avec ce filtre !';
            waitingForAnswer = false;
            return;
        }
        
        // Choisir une case aléatoire
        const randomFret = allFrets[Math.floor(Math.random() * allFrets.length)];
        
        // Récupérer les infos
        const targetNote = frenchNotation ? randomFret.dataset.noteFr : randomFret.dataset.noteInt;
        const targetString = randomFret.closest('.string').dataset.string;
        const stringName = frenchNotation ? stringNames[targetString].fr : stringNames[targetString].int;
        
        currentQuestion = {
            note: targetNote,
            string: targetString,
            fret: randomFret.dataset.fret,
            element: randomFret
        };
        
        questionElement.textContent = `Où est le ${targetNote} sur la corde de ${stringName} ?`;
        waitingForAnswer = true;
    }

    // Bouton nouvelle question
    newQuestionButton.addEventListener('click', function() {
        generateQuestion();
    });

    // Gestion des clics sur les cases
    fretboard.addEventListener('click', function(e) {
        if (currentMode !== 'find-note' || !waitingForAnswer) return;
        
        const clickedFret = e.target.closest('.fret');
        if (!clickedFret) return;
        
        waitingForAnswer = false;
        
        // Vérifier la réponse
        const clickedString = clickedFret.closest('.string').dataset.string;
        const clickedFretNumber = clickedFret.dataset.fret;
        
        if (clickedString === currentQuestion.string && clickedFretNumber === currentQuestion.fret) {
            // Bonne réponse
            clickedFret.classList.add('correct-answer');
            score += 10;
            streak++;
            updateScore();
            
            // Nouvelle question après un délai
            setTimeout(() => {
                generateQuestion();
            }, 1000);
        } else {
            // Mauvaise réponse
            clickedFret.classList.add('wrong-answer');
            currentQuestion.element.classList.add('correct-answer');
            streak = 0;
            updateScore();
            
            // Afficher la bonne réponse pendant 2 secondes
            setTimeout(() => {
                clickedFret.classList.remove('wrong-answer');
                currentQuestion.element.classList.remove('correct-answer');
                waitingForAnswer = true;
            }, 2000);
        }
    });

    // Mettre à jour le score
    function updateScore() {
        scoreElement.textContent = score;
        streakElement.textContent = streak;
    }

    // Gestion mobile : bouton commencer le jeu
    if (startGameButton) {
        startGameButton.addEventListener('click', function() {
            document.body.classList.add('mobile-game-active');
            // Générer une première question si en mode "find-note"
            if (currentMode === 'find-note') {
                generateQuestion();
            }
        });
    }

    // Gestion mobile : bouton retour paramètres
    if (backToSettingsButton) {
        backToSettingsButton.addEventListener('click', function() {
            document.body.classList.remove('mobile-game-active');
        });
    }

    // Initialiser le mode par défaut
    updateGameMode();
});
