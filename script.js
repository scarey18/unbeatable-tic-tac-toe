const startBtn = document.getElementById("start-button");
const goFirstBtn = document.getElementById("go-first");
const goSecondBtn = document.getElementById("go-second");
const playerSymbol = document.getElementById("player-symbol");
const cpuSymbol = document.getElementById("cpu-symbol");
const playerScore = document.getElementById('player-score');
const cpuScore = document.getElementById('cpu-score');
const cells = document.querySelectorAll('.cell');
const message = document.getElementById('message');

const PATTERNS = [[1, 2, 3], [4, 5, 6], [7, 8, 9], 
				  [1, 4, 7], [2, 5, 8], [3, 6, 9], 
				  [1, 5, 9], [3, 5, 7]];
let game;
let player;
let cpu;
let gameOver = false;


// EVENT LISTENERS

for (let button of [goFirstBtn, goSecondBtn]) {
	button.addEventListener('click', () => {
		if (button.classList.contains("is-selected")) return;

		const otherBtn = button === goFirstBtn ? goSecondBtn : goFirstBtn;

		otherBtn.classList.remove("is-selected");
		button.classList.add("is-selected");
		playerSymbol.dataset.symbol = button.dataset.symbol;
		cpuSymbol.dataset.symbol = otherBtn.dataset.symbol;
	});
}


startBtn.addEventListener('click', () => {
	[startBtn, goFirstBtn, goSecondBtn].map(b => b.disabled = true);

	for (let cell of cells) {
		cell.textContent = '';
		cell.classList.remove('highlighted');
	}

	game = Game()
	player = Player(playerSymbol.dataset.symbol, game);
	cpu = Player(cpuSymbol.dataset.symbol, game);
	gameOver = false;
	message.textContent = "You are " + player.symbol;

	if (cpu.symbol === 'X') {
		const cpuMove = game.cells[randomIndex(9)];
		cpu.makeMove(cpuMove, player);
		document.getElementById(`cell-${cpuMove}`).textContent = 'X';
	}
});


for (let cell of cells) {
	cell.addEventListener('click', () => {
		if (cell.textContent !== '' || gameOver) return;

		const index = parseInt(cell.dataset.index);

		let gameState = player.makeMove(index, cpu);
		cell.textContent = player.symbol;
		if (gameState) {
			highlightSquares(cell);
			return endGame(gameState);
		}

		if (game.moves === 1) game.firstMove = index;

		const cpuMove = cpu.evaluateBoard(player);
		gameState = cpu.makeMove(cpuMove, player);
		const cpuCell = document.getElementById(`cell-${cpuMove}`);
		cpuCell.textContent = cpu.symbol;
		if (gameState) {
			highlightSquares(cpuCell);
			return endGame(gameState);
		}
	});
}

function endGame(gameState) {
	gameOver = true;
	[startBtn, goFirstBtn, goSecondBtn].map(b => b.disabled = false);

	switch (gameState) {
		case "draw":
			message.textContent = "It's a draw!";
			break;
		case player:
			message.textContent = "You win!";
			playerScore.textContent = parseInt(playerScore.textContent) + 1;
			break;
		case cpu:
			message.textContent = "You lose!";
			cpuScore.textContent = parseInt(cpuScore.textContent) + 1;
			break;
	}
}

function highlightSquares(cell) {
	const index = parseInt(cell.dataset.index)
	const symbol = cell.textContent

	for (let pattern of PATTERNS.filter(p => p.includes(index))) {
		const cellsInARow = [cell];
		for (let num of pattern.filter(n => n !== index)) {
			const cell2 = document.getElementById(`cell-${num}`);
			if (cell2.textContent === symbol) cellsInARow.push(cell2);
		}
		if (cellsInARow.length === 3) {
			cellsInARow.map(c => c.classList.add('highlighted'));
			return;
		}
	}
}


// GAME LOGIC

function Game() {
	let moves = 0;
	
	// Represents empty cells
	let cells = [1, 2, 3, 4, 5, 6, 7, 8, 9];

	// Potential winning combos- horizontal, vertical, and diagonal
	let patterns = [[1, 2, 3], [4, 5, 6], [7, 8, 9], 
				    [1, 4, 7], [2, 5, 8], [3, 6, 9], 
				    [1, 5, 9], [3, 5, 7]];
	return {moves, cells, patterns}
}


function Player(symbol, game) {

	// Represents patterns the player has started to complete
	let patterns = [];

	function makeMove(index, opponent) {
		// If player's own pattern contains cell, remove cell from pattern
		for (let pattern of this.patterns.filter(p => p.includes(index))) {
			pattern.splice(pattern.indexOf(index), 1);
			if (pattern.length === 0) return this;
		}

		// If unowned pattern contains cell, splice pattern and add it to player
		for (let i = this.game.patterns.length - 1; i >= 0; i--) {
			const pattern = this.game.patterns[i];
			if (pattern.includes(index)) {
				pattern.splice(pattern.indexOf(index), 1);
				this.game.patterns.splice(i, 1);
				this.patterns.push(pattern);
			}
		}

		// If opponent's pattern contains cell, remove the pattern entirely
		for (let i = opponent.patterns.length - 1; i >= 0; i--) {
			if (opponent.patterns[i].includes(index)) 
				opponent.patterns.splice(i, 1);
		}

		this.game.cells.splice(this.game.cells.indexOf(index), 1);
		if (this.game.cells.length === 0) return 'draw';

		this.game.moves++;
	}

	function evaluateBoard(opponent) {
		if (this.game.moves === 1 && this.game.firstMove === 5) {
			return [1, 3, 7, 9][randomIndex(4)];
		} else if (this.game.moves === 1) return 5;

		// Checks if there's a winning move to make or block
		const mergedPatterns = this.patterns.concat(opponent.patterns);
		const winningMoves = mergedPatterns.filter(p => p.length === 1);
		if (winningMoves.length > 0) return winningMoves[0][0];

		// Checks for traps (moves to complete two owned patterns at once)
		const potentialTraps = findCommonOccurrences(this.patterns);
		if (potentialTraps.length > 0) return potentialTraps[0];

		// Checks for potential opponent traps
		const potentialOppTraps = findCommonOccurrences(opponent.patterns);
		if (potentialOppTraps.length === 1) return potentialOppTraps[0];

		// If opponent has multiple potential traps, attempts to force a draw
		if (potentialOppTraps.length > 1) {
			for (let pattern of this.patterns) {
				for (let i = 0; i <= 1; i++) {
					const j = i === 0 ? 1 : 0;
					if (!potentialOppTraps.includes(pattern[j])) 
						return pattern[i];
				}
			}
		}

		// Finally, scores potential moves and chooses best option
		let index;
		let maxScore = -2;
		for (let num of this.game.cells) {
			const score = this.simulateMove(num, opponent);
			if (score === 1) {
				return num;
			} else if (score > maxScore) {
				index = num;
				maxScore = score;
			}
		}
		return index;
	}

	function simulateMove(num, opponent) {
		const newGame = copyGame(this.game);
		const newPlayer = copyPlayer(this, newGame);
		const newOpp = copyPlayer(opponent, newGame);

		let currentPlayer = newPlayer;
		let currentOpp = newOpp;
		let gameState = newPlayer.makeMove(num, newOpp);
		while (!gameState) {
			currentPlayer = currentPlayer === newPlayer ? newOpp : newPlayer;
			currentOpp = currentOpp === newPlayer ? newOpp : newPlayer;
			const move = currentPlayer.evaluateBoard(currentOpp);
			gameState = currentPlayer.makeMove(move, currentOpp);
		}

		if (gameState === 'draw') {
			return 0;
		} else if (currentPlayer === newPlayer) {
			return 1;
		} else return -1;
	}

	return {symbol, game, patterns, makeMove, evaluateBoard, simulateMove};
}


function copyGame(game) {
	const newGame = Game();
	newGame.moves = game.moves;
	newGame.cells = [...game.cells];
	newGame.patterns = copyPatterns(game.patterns);
	return newGame;
}

function copyPlayer(player, game) {
	const newPlayer = Player(player.symbol, game);
	newPlayer.patterns = copyPatterns(player.patterns);
	return newPlayer;
}

function copyPatterns(patterns) {
	const newPatterns = [];
	for (let pattern of patterns) {
		newPatterns.push([...pattern]);
	}
	return newPatterns;
}

function findCommonOccurrences(patterns) {
	const nums = [];
	const commonOccurrences = [];

	for (let pattern of patterns) {
		for (let num of pattern) {
			if (!nums.includes(num)) {
				nums.push(num);
			} else if (!commonOccurrences.includes(num)) {
				commonOccurrences.push(num);
			}
		}
	}
	return commonOccurrences;
}

function randomIndex(length) {
	return Math.floor(Math.random() * Math.floor(length));
}