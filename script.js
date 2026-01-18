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
    
    let notesVisible = false;
    let frenchNotation = true; // Par défaut, notation française
    let currentMode = 'find-note';
    let currentQuestion = null;
    let score = 0;
    let streak = 0;
    let waitingForAnswer = false;
    let noteTypeFilter = 'both'; // 'both', 'natural', 'sharp'

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
        });
    });

    // Gestion du filtre de type de notes
    const noteTypeRadios = document.querySelectorAll('input[name="noteType"]');
    noteTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            noteTypeFilter = this.value;
            // Si une question est en cours, en générer une nouvelle avec le nouveau filtre
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
        
        // Filtrer selon le type de notes sélectionné
        if (noteTypeFilter === 'natural') {
            allFrets = allFrets.filter(fret => fret.dataset.type === 'natural');
        } else if (noteTypeFilter === 'sharp') {
            allFrets = allFrets.filter(fret => fret.dataset.type === 'sharp');
        }
        
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

    // Initialiser le mode par défaut
    updateGameMode();
});
