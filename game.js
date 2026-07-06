const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

const scoreHud = document.getElementById("scoreHud");
const timeHud = document.getElementById("timeHud");
const restartBtn = document.getElementById("restartBtn");

const pitch = {
  width: canvas.width,
  height: canvas.height,
  goalWidth: 120,
};

const keys = { w: false, a: false, s: false, d: false, space: false };

document.addEventListener("keydown", e => {
  if (e.key === "w" || e.key === "W") keys.w = true;
  if (e.key === "a" || e.key === "A") keys.a = true;
  if (e.key === "s" || e.key === "S") keys.s = true;
  if (e.key === "d" || e.key === "D") keys.d = true;
  if (e.code === "Space") keys.space = true;
});
document.addEventListener("keyup", e => {
  if (e.key === "w" || e.key === "W") keys.w = false;
  if (e.key === "a" || e.key === "A") keys.a = false;
  if (e.key === "s" || e.key === "S") keys.s = false;
  if (e.key === "d" || e.key === "D") keys.d = false;
  if (e.code === "Space") keys.space = false;
});

const state = {
  time: 0,
  homeScore: 0,
  awayScore: 0,
  ball: { x: pitch.width / 2, y: pitch.height / 2, vx: 0, vy: 0, z: 0, vz: 0 },
  players: [],
  controlledIndex: 0,
  lastShotTime: 0,
};

function createPlayer(team, x, y, role) {
  return {
    team,
    x,
    y,
    vx: 0,
    vy: 0,
    speed: 2.2,
    role,
  };
}

function resetMatch() {
  state.time = 0;
  state.homeScore = 0;
  state.awayScore = 0;
  state.ball = { x: pitch.width / 2, y: pitch.height / 2, vx: 0, vy: 0, z: 0, vz: 0 };
  state.players = [];

  // Home team (blue)
  state.players.push(createPlayer("home", pitch.width * 0.3, pitch.height * 0.5, "striker")); // controlled
  state.players.push(createPlayer("home", pitch.width * 0.25, pitch.height * 0.3, "mid"));
  state.players.push(createPlayer("home", pitch.width * 0.25, pitch.height * 0.7, "mid"));
  state.players.push(createPlayer("home", pitch.width * 0.18, pitch.height * 0.4, "def"));
  state.players.push(createPlayer("home", pitch.width * 0.18, pitch.height * 0.6, "def"));

  // Away team (red)
  state.players.push(createPlayer("away", pitch.width * 0.7, pitch.height * 0.5, "striker"));
  state.players.push(createPlayer("away", pitch.width * 0.75, pitch.height * 0.3, "mid"));
  state.players.push(createPlayer("away", pitch.width * 0.75, pitch.height * 0.7, "mid"));
  state.players.push(createPlayer("away", pitch.width * 0.82, pitch.height * 0.4, "def"));
  state.players.push(createPlayer("away", pitch.width * 0.82, pitch.height * 0.6, "def"));

  state.controlledIndex = 0;
  updateHud();
}

function updateHud() {
  scoreHud.textContent = `Home ${state.homeScore} - ${state.awayScore} Away`;
  const minutes = Math.floor(state.time / 60);
  const seconds = Math.floor(state.time % 60);
  timeHud.textContent =
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function update(dt) {
  state.time += dt;

  // Controlled player movement
  const p = state.players[state.controlledIndex];
  let moveX = 0;
  let moveY = 0;
  if (keys.w) moveY -= 1;
  if (keys.s) moveY += 1;
  if (keys.a) moveX -= 1;
  if (keys.d) moveX += 1;
  const mag = Math.hypot(moveX, moveY);
  if (mag > 0) {
    moveX /= mag;
    moveY /= mag;
    p.x += moveX * p.speed * dt * 3;
    p.y += moveY * p.speed * dt * 3;
  }

  // Clamp to pitch
  state.players.forEach(pl => {
    pl.x = Math.max(20, Math.min(pitch.width - 20, pl.x));
    pl.y = Math.max(20, Math.min(pitch.height - 20, pl.y));
  });

  // Simple AI: move toward ball, but keep shape
  state.players.forEach((pl, idx) => {
    if (idx === state.controlledIndex) return;
    const targetX = pl.team === "home"
      ? pitch.width * 0.3
      : pitch.width * 0.7;
    const targetY = pl.role === "striker"
      ? pitch.height * 0.5
      : pl.role === "mid"
      ? (idx % 2 === 0 ? pitch.height * 0.35 : pitch.height * 0.65)
      : (idx % 2 === 0 ? pitch.height * 0.4 : pitch.height * 0.6);

    const ballInfluence = 0.4;
    const dxBall = state.ball.x - pl.x;
    const dyBall = state.ball.y - pl.y;
    const dxShape = targetX - pl.x;
    const dyShape = targetY - pl.y;

    const dx = dxShape * (1 - ballInfluence) + dxBall * ballInfluence;
    const dy = dyShape * (1 - ballInfluence) + dyBall * ballInfluence;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      pl.x += (dx / dist) * pl.speed * dt * 2;
      pl.y += (dy / dist) * pl.speed * dt * 2;
    }
  });

  // Shooting
  if (keys.space && state.time - state.lastShotTime > 0.5) {
    state.lastShotTime = state.time;
    const dirX = p.team === "home" ? 1 : -1;
    const dirY = (state.ball.y - p.y) * 0.01;
    state.ball.vx = dirX * 6;
    state.ball.vy = dirY * 4;
    state.ball.vz = 6; // lift
  }

  // Ball physics
  state.ball.x += state.ball.vx * dt * 3;
  state.ball.y += state.ball.vy * dt * 3;
  state.ball.z += state.ball.vz * dt * 3;

  state.ball.vx *= 0.985;
  state.ball.vy *= 0.985;
  state.ball.vz -= 0.4 * dt * 3;

  if (state.ball.z < 0) {
    state.ball.z = 0;
    state.ball.vz *= -0.4;
  }

  // Collisions with pitch edges
  if (state.ball.x < 10) {
    state.ball.x = 10;
    state.ball.vx *= -0.6;
  }
  if (state.ball.x > pitch.width - 10) {
    state.ball.x = pitch.width - 10;
    state.ball.vx *= -0.6;
  }
  if (state.ball.y < 10) {
    state.ball.y = 10;
    state.ball.vy *= -0.6;
  }
  if (state.ball.y > pitch.height - 10) {
    state.ball.y = pitch.height - 10;
    state.ball.vy *= -0.6;
  }

  // Player–ball interaction (simple control)
  state.players.forEach(pl => {
    const dx = state.ball.x - pl.x;
    const dy = state.ball.y - pl.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 14 && state.ball.z < 10) {
      state.ball.x = pl.x + dx * 0.3;
      state.ball.y = pl.y + dy * 0.3;
      state.ball.vx += dx * 0.02;
      state.ball.vy += dy * 0.02;
    }
  });

  // Goals
  const goalTop = pitch.height / 2 - pitch.goalWidth / 2;
  const goalBottom = pitch.height / 2 + pitch.goalWidth / 2;

  // Left goal (away scores)
  if (state.ball.x < 5 && state.ball.y > goalTop && state.ball.y < goalBottom) {
    state.awayScore += 1;
    state.ball = { x: pitch.width / 2, y: pitch.height / 2, vx: 0, vy: 0, z: 0, vz: 0 };
  }

  // Right goal (home scores)
  if (state.ball.x > pitch.width - 5 && state.ball.y > goalTop && state.ball.y < goalBottom) {
    state.homeScore += 1;
    state.ball = { x: pitch.width / 2, y: pitch.height / 2, vx: 0, vy: 0, z: 0, vz: 0 };
  }

  updateHud();
}

function drawPitch() {
  ctx.clearRect(0, 0, pitch.width, pitch.height);

  // Grass
  ctx.fillStyle = "#0f513f";
  ctx.fillRect(0, 0, pitch.width, pitch.height);

  // Stripes
  ctx.fillStyle = "#0b3b2e";
  for (let i = 0; i < 8; i++) {
    ctx.fillRect((pitch.width / 8) * i, 0, pitch.width / 16, pitch.height);
  }

  // Center line & circle
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pitch.width / 2, 0);
  ctx.lineTo(pitch.width / 2, pitch.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pitch.width / 2, pitch.height / 2, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Goals
  const goalTop = pitch.height / 2 - pitch.goalWidth / 2;
  const goalBottom = pitch.height / 2 + pitch.goalWidth / 2;

  ctx.beginPath();
  ctx.rect(0, goalTop, 6, pitch.goalWidth);
  ctx.rect(pitch.width - 6, goalTop, 6, pitch.goalWidth);
  ctx.stroke();
}

function drawPlayers() {
  state.players.forEach((pl, idx) => {
    ctx.fillStyle = pl.team === "home" ? "#00b4d8" : "#e63946";
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, 10, 0, Math.PI * 2);
    ctx.fill();

    if (idx === state.controlledIndex) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawBall() {
  // Shadow
  const shadowY = state.ball.y + 8;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.ellipse(state.ball.x, shadowY, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball (height)
  const screenY = state.ball.y - state.ball.z;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(state.ball.x, screenY, 7, 0, Math.PI * 2);
  ctx.fill();
}

let lastTime = performance.now();
function loop(now) {
  const dt = (now - lastTime) / 1000; // seconds
  lastTime = now;
  update(dt);
  drawPitch();
  drawPlayers();
  drawBall();
  requestAnimationFrame(loop);
}

restartBtn.addEventListener("click", () => {
  resetMatch();
});

resetMatch();
requestAnimationFrame(loop);
