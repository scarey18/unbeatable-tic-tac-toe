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

[goFirstBtn, goSecondBtn].forEach(button => {
	button.addEventListener('click', () => {
		if (button.classList.contains("is-selected")) return;

		const otherBtn = button === goFirstBtn ? goSecondBtn : goFirstBtn;

		otherBtn.classList.remove("is-selected");
		button.classList.add("is-selected");
		playerSymbol.dataset.symbol = button.dataset.symbol;
		cpuSymbol.dataset.symbol = otherBtn.dataset.symbol;
	});
});


startBtn.addEventListener('click', () => {
	[startBtn, goFirstBtn, goSecondBtn].forEach(b => b.disabled = true);

	cells.forEach(cell => {
		cell.textContent = '';
		cell.classList.remove('highlighted');
	});

	game = Game();
	player = Player(playerSymbol.dataset.symbol, game);
	cpu = Player(cpuSymbol.dataset.symbol, game);
	gameOver = false;
	message.textContent = "You are " + player.symbol;

	if (cpu.symbol === 'X') {
		const cpuMove = random(game.cells);
		cpu.makeMove(cpuMove, player);
		document.getElementById(`cell-${cpuMove}`).textContent = 'X';
	}
});


cells.forEach(cell => {
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
});

function endGame(gameState) {
	gameOver = true;
	[startBtn, goFirstBtn, goSecondBtn].forEach(b => b.disabled = false);

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
	const index = parseInt(cell.dataset.index);
	const symbol = cell.textContent;

	PATTERNS.filter(p => p.includes(index)).forEach(pattern => {
		const cellsInARow = [cell];

		pattern.filter(n => n !== index).forEach(num => {
			const cell2 = document.getElementById(`cell-${num}`);
			if (cell2.textContent === symbol) cellsInARow.push(cell2);
		});

		if (cellsInARow.length === 3) 
			cellsInARow.forEach(c => c.classList.add('highlighted'));
	});
}


// GAME LOGIC

function Game() {
	const moves = 0;
	
	// Represents empty cells
	const cells = [1, 2, 3, 4, 5, 6, 7, 8, 9];

	// Potential winning combos- horizontal, vertical, and diagonal
	const patterns = PATTERNS.map(p => [...p]);

	return {moves, cells, patterns}
}


function Player(symbol, game) {

	// Represents patterns the player has started to complete
	const patterns = [];

	function makeMove(index, opponent) {
		// If player's own pattern contains cell, remove cell from pattern
		for (const pattern of this.patterns.filter(p => p.includes(index))) {
			pattern.splice(pattern.indexOf(index), 1);
			if (pattern.length === 0) return this;
		}

		// If unowned pattern contains cell, splice pattern and add it to player
		this.game.patterns.filter(p => p.includes(index)).forEach(pattern => {
			pattern.splice(pattern.indexOf(index), 1);
			this.game.patterns.splice(this.game.patterns.indexOf(pattern), 1);
			this.patterns.push(pattern);
		});

		// If opponent's pattern contains cell, remove the pattern entirely
		opponent.patterns.filter(p => p.includes(index)).forEach(pattern => {
			opponent.patterns.splice(opponent.patterns.indexOf(pattern), 1);
		});

		opponent.patterns.filter(p => p.includes(index)).forEach(pattern => opponent.patterns.splice(opponent.patterns.indexOf(pattern, 1)));

		this.game.cells.splice(this.game.cells.indexOf(index), 1);
		if (this.game.cells.length === 0) return 'draw';

		this.game.moves++;
	}

	function evaluateBoard(opponent) {
		if (this.game.moves === 1 && this.game.firstMove === 5)
			return random([1, 3, 7, 9]);
		else if (this.game.moves === 1) return 5;

		// Checks if there's a winning move to make or block
		for (const patterns of [this.patterns, opponent.patterns]) {
			const winningMoves = patterns.filter(p => p.length === 1);
			if (winningMoves.length > 0) return random(random(winningMoves));
		}

		// Checks for traps (moves to complete two owned patterns at once)
		const potentialTraps = findCommonOccurrences(this.patterns);
		if (potentialTraps.length > 0) return random(potentialTraps);

		// Checks for potential opponent traps
		const potentialOppTraps = findCommonOccurrences(opponent.patterns);
		if (potentialOppTraps.length === 1) return random(potentialOppTraps);

		// If opponent has multiple potential traps, attempts to force a draw
		if (potentialOppTraps.length > 1) {
			const safeMoves = [];
			this.patterns.forEach(pattern => {
				pattern.forEach(num => {
					const otherNum = pattern.filter(n => n !== num)[0];
					if (!potentialOppTraps.includes(otherNum)) 
						safeMoves.push(num);
				});
			});
			return random(safeMoves);
	}

		// Finally, scores potential moves and chooses best option
		let indexes;
		let maxScore = -2;
		this.game.cells.forEach(num => {
			const score = this.simulateMove(num, opponent);
			if (score > maxScore) {
				indexes = [num];
				maxScore = score;
			} else if (score === maxScore) indexes.push(num);
		});
		return random(indexes);
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

		if (gameState === 'draw') return 0;
		else if (currentPlayer === newPlayer) return 1;
		else return -1;
	}

	return {symbol, game, patterns, makeMove, evaluateBoard, simulateMove};
}


function copyGame(game) {
	const newGame = Game();
	newGame.moves = game.moves;
	newGame.cells = [...game.cells];
	newGame.patterns = game.patterns.map(p => [...p]);
	return newGame;
}

function copyPlayer(player, game) {
	const newPlayer = Player(player.symbol, game);
	newPlayer.patterns = player.patterns.map(p => [...p]);
	return newPlayer;
}

function findCommonOccurrences(patterns) {
	const nums = [];
	const commonOccurrences = [];
	patterns.forEach(pattern => {
		pattern.forEach(num => {
			if (!nums.includes(num)) nums.push(num);
			else if (!commonOccurrences.includes(num))
				commonOccurrences.push(num);
		});
	});
	return commonOccurrences;
}

function random(arr) {
	const index = Math.floor(Math.random() * Math.floor(arr.length));
	return arr[index];
}