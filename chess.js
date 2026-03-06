// ============================================================
//  ARCANE CIRCUIT — Cyberpunk Alchemist Chess
//  chess.js
// ============================================================

// ---- Constants ----

const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

const PIECE_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

// ---- State ----

let gameState = {};
let gameMode = '2p';
let aiDifficulty = 1;
let thinkingTimeout = null;

// ============================================================
//  GAME INIT
// ============================================================

function initGame() {
  gameState = {
    board: createInitialBoard(),
    turn: 'w',
    selected: null,
    validMoves: [],
    lastMove: null,
    capturedByWhite: [],
    capturedByBlack: [],
    moveHistory: [],
    castlingRights: { wK: true, wR_a: true, wR_h: true, bK: true, bR_a: true, bR_h: true },
    enPassant: null,
    gameOver: false,
    check: false,
    stateHistory: []
  };
  renderBoard();
  updateUI();
}

function createInitialBoard() {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRow = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = 'b' + backRow[c];
    b[1][c] = 'bP';
    b[6][c] = 'wP';
    b[7][c] = 'w' + backRow[c];
  }
  return b;
}

// ============================================================
//  MOVE GENERATION
// ============================================================

function getValidMoves(board, row, col, turn, enPassant, castlingRights) {
  const piece = board[row][col];
  if (!piece || piece[0] !== turn) return [];
  const type = piece[1];
  let moves = [];

  if      (type === 'P') moves = getPawnMoves(board, row, col, turn, enPassant);
  else if (type === 'N') moves = getKnightMoves(board, row, col, turn);
  else if (type === 'B') moves = getBishopMoves(board, row, col, turn);
  else if (type === 'R') moves = getRookMoves(board, row, col, turn);
  else if (type === 'Q') moves = [...getBishopMoves(board, row, col, turn), ...getRookMoves(board, row, col, turn)];
  else if (type === 'K') moves = getKingMoves(board, row, col, turn, castlingRights);

  // Filter moves that leave own king in check
  return moves.filter(([tr, tc, special]) => {
    const newBoard = applyMoveBoard(board, row, col, tr, tc, special, piece);
    return !isInCheck(newBoard, turn);
  });
}

function getPawnMoves(board, r, c, turn, enPassant) {
  const dir = turn === 'w' ? -1 : 1;
  const startRow = turn === 'w' ? 6 : 1;
  const moves = [];

  if (inBounds(r + dir, c) && !board[r + dir][c]) {
    moves.push([r + dir, c, null]);
    if (r === startRow && !board[r + 2 * dir][c]) moves.push([r + 2 * dir, c, 'double']);
  }

  for (const dc of [-1, 1]) {
    if (inBounds(r + dir, c + dc)) {
      if (board[r + dir][c + dc] && board[r + dir][c + dc][0] !== turn)
        moves.push([r + dir, c + dc, null]);
      if (enPassant && enPassant[0] === r + dir && enPassant[1] === c + dc)
        moves.push([r + dir, c + dc, 'ep']);
    }
  }
  return moves;
}

function getKnightMoves(board, r, c, turn) {
  return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    .filter(([dr, dc]) => inBounds(r+dr, c+dc) && (!board[r+dr][c+dc] || board[r+dr][c+dc][0] !== turn))
    .map(([dr, dc]) => [r+dr, c+dc, null]);
}

function getSlidingMoves(board, r, c, turn, dirs) {
  const moves = [];
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc][0] !== turn) moves.push([nr, nc, null]);
        break;
      }
      moves.push([nr, nc, null]);
      nr += dr; nc += dc;
    }
  }
  return moves;
}

function getBishopMoves(board, r, c, turn) {
  return getSlidingMoves(board, r, c, turn, [[-1,-1],[-1,1],[1,-1],[1,1]]);
}
function getRookMoves(board, r, c, turn) {
  return getSlidingMoves(board, r, c, turn, [[-1,0],[1,0],[0,-1],[0,1]]);
}

function getKingMoves(board, r, c, turn, cr) {
  const opp = turn === 'w' ? 'b' : 'w';
  const moves = [];

  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc][0] !== turn))
      moves.push([nr, nc, null]);
  }

  // Castling — White
  if (turn === 'w' && r === 7 && c === 4) {
    if (cr.wK && cr.wR_h && !board[7][5] && !board[7][6] &&
        !isSquareAttacked(board,7,4,opp) && !isSquareAttacked(board,7,5,opp) && !isSquareAttacked(board,7,6,opp))
      moves.push([7, 6, 'castle-k']);
    if (cr.wR_a && !board[7][3] && !board[7][2] && !board[7][1] &&
        !isSquareAttacked(board,7,4,opp) && !isSquareAttacked(board,7,3,opp) && !isSquareAttacked(board,7,2,opp))
      moves.push([7, 2, 'castle-q']);
  }

  // Castling — Black
  if (turn === 'b' && r === 0 && c === 4) {
    if (cr.bK && cr.bR_h && !board[0][5] && !board[0][6] &&
        !isSquareAttacked(board,0,4,opp) && !isSquareAttacked(board,0,5,opp) && !isSquareAttacked(board,0,6,opp))
      moves.push([0, 6, 'castle-k']);
    if (cr.bR_a && !board[0][3] && !board[0][2] && !board[0][1] &&
        !isSquareAttacked(board,0,4,opp) && !isSquareAttacked(board,0,3,opp) && !isSquareAttacked(board,0,2,opp))
      moves.push([0, 2, 'castle-q']);
  }

  return moves;
}

// ---- Attack detection ----

function isSquareAttacked(board, r, c, byColor) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (!p || p[0] !== byColor) continue;
      const t = p[1];

      if (t === 'P') {
        const dir = byColor === 'w' ? -1 : 1;
        if (r === row + dir && (c === col - 1 || c === col + 1)) return true;
      } else if (t === 'N') {
        const diffs = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
        if (diffs.some(([dr, dc]) => row+dr === r && col+dc === c)) return true;
      }

      if (t === 'B' || t === 'Q') {
        if (isSlidingAttack(board, row, col, r, c, [[-1,-1],[-1,1],[1,-1],[1,1]])) return true;
      }
      if (t === 'R' || t === 'Q') {
        if (isSlidingAttack(board, row, col, r, c, [[-1,0],[1,0],[0,-1],[0,1]])) return true;
      }
      if (t === 'K') {
        if (Math.abs(row - r) <= 1 && Math.abs(col - c) <= 1) return true;
      }
    }
  }
  return false;
}

function isSlidingAttack(board, fr, fc, tr, tc, dirs) {
  for (const [dr, dc] of dirs) {
    let r = fr + dr, c = fc + dc;
    while (inBounds(r, c)) {
      if (r === tr && c === tc) return true;
      if (board[r][c]) break;
      r += dr; c += dc;
    }
  }
  return false;
}

function isInCheck(board, turn) {
  const opp = turn === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] === turn + 'K') return isSquareAttacked(board, r, c, opp);
  }
  return false;
}

function hasAnyMoves(board, turn, enPassant, castlingRights) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] && board[r][c][0] === turn) {
      if (getValidMoves(board, r, c, turn, enPassant, castlingRights).length > 0) return true;
    }
  }
  return false;
}

// ---- Board mutation (pure) ----

function applyMoveBoard(board, fr, fc, tr, tc, special, piece) {
  const nb = board.map(r => [...r]);
  nb[tr][tc] = piece;
  nb[fr][fc] = null;
  if (special === 'ep')       nb[fr][tc] = null;
  if (special === 'castle-k') { nb[fr][5] = nb[fr][7]; nb[fr][7] = null; }
  if (special === 'castle-q') { nb[fr][3] = nb[fr][0]; nb[fr][0] = null; }
  return nb;
}

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// ---- Notation ----

function moveToAlgebraic(fr, fc, tr, tc, piece, captured, special, promoted) {
  const files = 'abcdefgh';
  const ranks = '87654321';
  const pType = piece[1];
  if (special === 'castle-k') return 'O-O';
  if (special === 'castle-q') return 'O-O-O';
  let str = pType !== 'P' ? pType : (captured ? files[fc] : '');
  if (captured) str += 'x';
  str += files[tc] + ranks[tr];
  if (promoted) str += '=' + promoted;
  return str;
}

// ============================================================
//  APPLY MOVE (mutates gameState)
// ============================================================

function applyMove(fr, fc, tr, tc, special, promoteTo) {
  const gs = gameState;
  const piece    = gs.board[fr][fc];
  const captured = gs.board[tr][tc];
  const pType    = piece[1];
  const turn     = gs.turn;

  // Save snapshot for undo
  gs.stateHistory.push({
    board:           gs.board.map(r => [...r]),
    turn,
    enPassant:       gs.enPassant,
    castlingRights:  { ...gs.castlingRights },
    capturedByWhite: [...gs.capturedByWhite],
    capturedByBlack: [...gs.capturedByBlack],
    lastMove:        gs.lastMove,
    moveHistory:     [...gs.moveHistory]
  });

  const nb = applyMoveBoard(gs.board, fr, fc, tr, tc, special, piece);

  // Promotion
  let promoted = null;
  if (pType === 'P' && (tr === 0 || tr === 7)) {
    promoted = promoteTo || 'Q';
    nb[tr][tc] = turn + promoted;
  }

  // En passant captured pawn
  let epCaptured = null;
  if (special === 'ep') { epCaptured = gs.board[fr][tc]; nb[fr][tc] = null; }

  // Track captured pieces
  const actualCaptured = captured || epCaptured;
  if (actualCaptured) {
    if (turn === 'w') gs.capturedByWhite.push(actualCaptured);
    else              gs.capturedByBlack.push(actualCaptured);
  }

  // En passant square
  gs.enPassant = (pType === 'P' && Math.abs(fr - tr) === 2)
    ? [(fr + tr) / 2, fc]
    : null;

  // Castling rights
  if (pType === 'K') {
    if (turn === 'w') { gs.castlingRights.wK = false; gs.castlingRights.wR_a = false; gs.castlingRights.wR_h = false; }
    else              { gs.castlingRights.bK = false; gs.castlingRights.bR_a = false; gs.castlingRights.bR_h = false; }
  }
  if (fr===7&&fc===0 || tr===7&&tc===0) gs.castlingRights.wR_a = false;
  if (fr===7&&fc===7 || tr===7&&tc===7) gs.castlingRights.wR_h = false;
  if (fr===0&&fc===0 || tr===0&&tc===0) gs.castlingRights.bR_a = false;
  if (fr===0&&fc===7 || tr===0&&tc===7) gs.castlingRights.bR_h = false;

  gs.board     = nb;
  gs.lastMove  = [fr, fc, tr, tc];
  gs.selected  = null;
  gs.validMoves = [];

  // Switch turn
  gs.turn = turn === 'w' ? 'b' : 'w';

  // Check / checkmate / stalemate
  gs.check = isInCheck(gs.board, gs.turn);
  const noMoves = !hasAnyMoves(gs.board, gs.turn, gs.enPassant, gs.castlingRights);

  // Record notation
  const notation = moveToAlgebraic(fr, fc, tr, tc, piece, actualCaptured, special, promoted);
  gs.moveHistory.push({ notation, turn });

  if (noMoves) {
    gs.gameOver = true;
    gs.gameOverReason = gs.check ? 'checkmate' : 'stalemate';
    gs.winner = gs.check ? turn : null;
  }

  renderBoard();
  updateUI();
}

// ============================================================
//  INPUT HANDLING
// ============================================================

function onSquareClick(r, c) {
  if (gameState.gameOver) return;
  if (gameMode === 'ai' && gameState.turn === 'b') return;

  const gs    = gameState;
  const piece = gs.board[r][c];

  if (gs.selected) {
    const move = gs.validMoves.find(([tr, tc]) => tr === r && tc === c);

    if (move) {
      const [tr, tc, special] = move;
      const pieceType = gs.board[gs.selected[0]][gs.selected[1]][1];

      if (pieceType === 'P' && (tr === 0 || tr === 7)) {
        showPromotionModal(gs.selected[0], gs.selected[1], tr, tc, special, gs.turn);
        return;
      }

      applyMove(gs.selected[0], gs.selected[1], tr, tc, special);
      if (gameMode === 'ai' && !gameState.gameOver) scheduleAI();
      return;
    }

    // Reselect or deselect
    if (piece && piece[0] === gs.turn) {
      selectPiece(r, c);
    } else {
      gs.selected   = null;
      gs.validMoves = [];
      renderBoard();
    }
    return;
  }

  if (piece && piece[0] === gs.turn) selectPiece(r, c);
}

function selectPiece(r, c) {
  const gs = gameState;
  gs.selected   = [r, c];
  gs.validMoves = getValidMoves(gs.board, r, c, gs.turn, gs.enPassant, gs.castlingRights);
  renderBoard();
}

// ============================================================
//  PROMOTION MODAL
// ============================================================

function showPromotionModal(fr, fc, tr, tc, special, turn) {
  const modal   = document.getElementById('promo-modal');
  const choices = document.getElementById('promo-choices');
  modal.classList.remove('hidden');

  const pieceSymbols = turn === 'w' ? ['♕','♖','♗','♘'] : ['♛','♜','♝','♞'];
  const pieceTypes   = ['Q','R','B','N'];

  choices.innerHTML = '';
  pieceTypes.forEach((t, i) => {
    const btn = document.createElement('button');
    btn.className   = 'promo-btn';
    btn.textContent = pieceSymbols[i];
    btn.onclick = () => {
      modal.classList.add('hidden');
      applyMove(fr, fc, tr, tc, special, t);
      if (gameMode === 'ai' && !gameState.gameOver) scheduleAI();
    };
    choices.appendChild(btn);
  });
}

// ============================================================
//  AI ENGINE
// ============================================================

function scheduleAI() {
  if (thinkingTimeout) clearTimeout(thinkingTimeout);
  setStatus('THE ORACLE CONTEMPLATES...', 'status-thinking');
  document.getElementById('board-outer').insertAdjacentHTML(
    'beforeend',
    '<div class="thinking-overlay" id="thinking-overlay"><div class="thinking-spinner"></div></div>'
  );
  thinkingTimeout = setTimeout(doAIMove, 400 + Math.random() * 400);
}

function doAIMove() {
  const overlay = document.getElementById('thinking-overlay');
  if (overlay) overlay.remove();
  if (gameState.gameOver) return;

  const move = getBestMove(gameState.board, 'b', gameState.enPassant, gameState.castlingRights, aiDifficulty);
  if (move) {
    const [fr, fc, tr, tc, special] = move;
    const pieceType = gameState.board[fr][fc][1];
    applyMove(fr, fc, tr, tc, special, pieceType === 'P' && tr === 0 ? 'Q' : undefined);
  }
}

// ---- Evaluation ----

function evaluateBoard(board) {
  const posBonus = {
    P: [[0,0,0,0,0,0,0,0],[5,5,5,5,5,5,5,5],[1,1,2,3,3,2,1,1],[.5,.5,1,2.5,2.5,1,.5,.5],[0,0,0,2,2,0,0,0],[.5,-.5,-1,0,0,-1,-.5,.5],[.5,1,1,-2,-2,1,1,.5],[0,0,0,0,0,0,0,0]],
    N: [[-5,-4,-3,-3,-3,-3,-4,-5],[-4,-2,0,0,0,0,-2,-4],[-3,0,1,1.5,1.5,1,0,-3],[-3,.5,1.5,2,2,1.5,.5,-3],[-3,0,1.5,2,2,1.5,0,-3],[-3,.5,1,1.5,1.5,1,.5,-3],[-4,-2,0,.5,.5,0,-2,-4],[-5,-4,-3,-3,-3,-3,-4,-5]],
  };
  let score = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const color = p[0], type = p[1];
    let val = PIECE_VALUES[type] * 10;
    if (posBonus[type]) {
      const row = color === 'w' ? r : 7 - r;
      val += posBonus[type][row][c];
    }
    score += color === 'w' ? val : -val;
  }
  return score;
}

function getAllMovesForColor(board, color, enPassant, cr) {
  const moves = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] && board[r][c][0] === color) {
      const vm = getValidMoves(board, r, c, color, enPassant, cr);
      vm.forEach(([tr, tc, sp]) => moves.push([r, c, tr, tc, sp]));
    }
  }
  return moves;
}

function minimax(board, depth, alpha, beta, maximizing, enPassant, cr) {
  if (depth === 0) return evaluateBoard(board);

  const color = maximizing ? 'w' : 'b';
  const moves = getAllMovesForColor(board, color, enPassant, cr);

  if (moves.length === 0) {
    if (isInCheck(board, color)) return maximizing ? -10000 : 10000;
    return 0; // stalemate
  }

  if (maximizing) {
    let best = -Infinity;
    for (const [fr, fc, tr, tc, sp] of moves) {
      const nb = applyMoveBoard(board, fr, fc, tr, tc, sp, board[fr][fc]);
      if (nb[tr][tc] && nb[tr][tc][1] === 'P' && (tr === 0 || tr === 7)) nb[tr][tc] = color + 'Q';
      const val = minimax(nb, depth - 1, alpha, beta, false, null, cr);
      best  = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [fr, fc, tr, tc, sp] of moves) {
      const nb = applyMoveBoard(board, fr, fc, tr, tc, sp, board[fr][fc]);
      if (nb[tr][tc] && nb[tr][tc][1] === 'P' && (tr === 0 || tr === 7)) nb[tr][tc] = color + 'Q';
      const val = minimax(nb, depth - 1, alpha, beta, true, null, cr);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(board, color, enPassant, cr, difficulty) {
  const depth = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3;
  const moves = getAllMovesForColor(board, color, enPassant, cr);
  if (!moves.length) return null;

  // Difficulty I has a 50% chance to play a random move
  if (difficulty === 1 && Math.random() < 0.5)
    return moves[Math.floor(Math.random() * moves.length)];

  let bestVal  = Infinity;
  let bestMove = null;

  for (const [fr, fc, tr, tc, sp] of moves) {
    const nb = applyMoveBoard(board, fr, fc, tr, tc, sp, board[fr][fc]);
    if (nb[tr][tc] && nb[tr][tc][1] === 'P' && tr === 0) nb[tr][tc] = 'bQ';
    const val = minimax(nb, depth - 1, -Infinity, Infinity, true, null, cr);
    if (val < bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc, sp]; }
  }

  return bestMove;
}

// ============================================================
//  RENDERING
// ============================================================

function renderBoard() {
  const gs      = gameState;
  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';

  const inCheckKing = gs.check ? findKing(gs.board, gs.turn) : null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

      if (gs.selected && gs.selected[0] === r && gs.selected[1] === c)
        sq.classList.add('selected');

      if (gs.lastMove &&
          ((gs.lastMove[0]===r && gs.lastMove[1]===c) ||
           (gs.lastMove[2]===r && gs.lastMove[3]===c)))
        sq.classList.add('last-move');

      const isValid = gs.validMoves.find(([tr, tc]) => tr === r && tc === c);
      if (isValid) sq.classList.add(gs.board[r][c] ? 'valid-capture' : 'valid-move');

      if (inCheckKing && inCheckKing[0] === r && inCheckKing[1] === c)
        sq.classList.add('in-check');

      const piece = gs.board[r][c];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className   = 'piece ' + (piece[0] === 'w' ? 'white-piece' : 'black-piece');
        pieceEl.textContent = PIECES[piece];
        sq.appendChild(pieceEl);
      }

      sq.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c] === color + 'K') return [r, c];
  return null;
}

// ============================================================
//  UI UPDATES
// ============================================================

function updateUI() {
  const gs = gameState;

  // Turn indicators
  const wt = document.getElementById('white-turn');
  const bt = document.getElementById('black-turn');
  wt.className = 'turn-indicator ' + (gs.turn === 'w' && !gs.gameOver ? 'active-gold'   : 'inactive');
  bt.className = 'turn-indicator ' + (gs.turn === 'b' && !gs.gameOver ? 'active-purple' : 'inactive');

  // Status message
  if (gs.gameOver) {
    if (gs.gameOverReason === 'checkmate') {
      const msg = gs.winner === 'w' ? '⚡ AURUM ORDER VICTORIOUS' : '☠ VOID CULT DOMINATES';
      setStatus(msg, 'status-win');
    } else {
      setStatus('⊕ STALEMATE — BALANCE', 'status-normal');
    }
  } else if (gs.check) {
    setStatus('⚠ CHECK — DEFEND YOUR KING', 'status-check');
  } else {
    const who = gs.turn === 'w' ? 'AURUM' : (gameMode === 'ai' ? 'ORACLE' : 'VOID');
    setStatus(`${who} MOVES`, 'status-normal');
  }

  // Captured pieces
  document.getElementById('white-captured').textContent =
    gs.capturedByWhite.map(p => PIECES[p]).join('');
  document.getElementById('black-captured').textContent =
    gs.capturedByBlack.map(p => PIECES[p]).join('');

  updateMoveHistory();
}

function setStatus(text, cls) {
  const el = document.getElementById('status-text');
  el.textContent = text;
  el.className   = 'status-text ' + cls;
}

function updateMoveHistory() {
  const list  = document.getElementById('move-list');
  const moves = gameState.moveHistory;
  let html = '';
  for (let i = 0; i < moves.length; i += 2) {
    const num    = Math.floor(i / 2) + 1;
    const wMove  = moves[i]   ? `<span class="move-white">${moves[i].notation}</span>`   : '';
    const bMove  = moves[i+1] ? `<span class="move-black">${moves[i+1].notation}</span>` : '';
    html += `<div class="move-entry"><span class="move-num">${num}.</span>${wMove}${bMove}</div>`;
  }
  list.innerHTML    = html;
  list.scrollTop    = list.scrollHeight;
}

// ============================================================
//  CONTROLS
// ============================================================

function newGame() {
  if (thinkingTimeout) clearTimeout(thinkingTimeout);
  const overlay = document.getElementById('thinking-overlay');
  if (overlay) overlay.remove();
  initGame();
}

function undoMove() {
  if (!gameState.stateHistory.length) return;

  // In AI mode, undo both the AI's move and the player's move
  if (gameMode === 'ai' && gameState.stateHistory.length >= 2)
    gameState.stateHistory.pop();

  const prev = gameState.stateHistory.pop();
  if (!prev) return;

  Object.assign(gameState, prev);
  gameState.selected    = null;
  gameState.validMoves  = [];
  gameState.gameOver    = false;
  gameState.check       = isInCheck(gameState.board, gameState.turn);

  renderBoard();
  updateUI();
}

function setMode(mode) {
  gameMode = mode;
  document.getElementById('btn-2p').classList.toggle('active', mode === '2p');
  document.getElementById('btn-ai').classList.toggle('active', mode === 'ai');

  const blackName    = document.getElementById('black-name');
  const blackFaction = document.getElementById('black-faction');
  if (mode === 'ai') {
    blackName.textContent    = 'AI ORACLE';
    blackFaction.textContent = 'The Synthetic Mind';
  } else {
    blackName.textContent    = 'BLACK MAGE';
    blackFaction.textContent = 'The Void Circuit';
  }

  newGame();
}

function setDiff(d) {
  aiDifficulty = d;
  [1, 2, 3].forEach(i => {
    document.getElementById('diff-' + i).classList.toggle('active', i === d);
  });
}

// ============================================================
//  BOOT
// ============================================================
initGame();
