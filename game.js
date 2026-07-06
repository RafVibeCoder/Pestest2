const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

const scoreHud = document.getElementById("scoreHud");
const timeHud = document.getElementById("timeHud");
const crowdHud = document.getElementById("crowdHud");
const restartBtn = document.getElementById("restartBtn");
const weatherSelect = document.getElementById("weatherSelect");

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
  weather: "clear",
  crowdPercent: 100,
};

function createPlayer(team, x, y, role) {
  return {
    team,
    x,
    y,
    vx: 0,
    vy: 0,
    speed: 2.6,
    role,
  };
}

function resetMatch() {
  state.time = 0;
  state.homeScore = 0;
  state.awayScore = 0;
  state.ball = { x: pitch.width / 2, y: pitch.height / 2, vx: 0, vy: 0, z: 0, vz: 0 };
  state.players = [];
  state.crowdPercent = 100;

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
  crowdHud.textContent = `Crowd: ${Math.max(0, Math.round(state.crowdPercent))}%`;
}

weatherSelect.addEventListener("change", () => {
  state.weather = weatherSelect.value;
});

function update(dt) {
  state.time += dt;

  // Crowd leaving if home is 4 goals down at home
  const diff = state.homeScore - state.awayScore;
  if (diff <= -4) {
    state.crowdPercent -= dt * 8; // leave fast
  } else if (diff >= 2) {
    state.crowdPercent = Math.min(100, state.crowdPercent + dt * 2); // come back
  }
  updateHud();

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
    p.x += moveX * p.speed * dt * 3.5;
    p.y += moveY * p.speed * dt * 3.5;
  }

  // Clamp to pitch
  state.players.forEach(pl => {
    pl.x = Math.max(40, Math.min(pitch.width - 40, pl.x));
    pl.y = Math.max(40, Math.min(pitch.height - 40, pl.y));
  });

  // Simple AI: shape + ball attraction
  state.players.forEach((pl, idx) => {
    if (idx === state.controlledIndex) return;
    const baseX = pl.team === "home" ? pitch.width * 0.3 : pitch.width * 0.7;
    let baseY;
    if (pl.role === "striker") baseY = pitch.height * 0.5;
    else if (pl.role === "mid") baseY = idx % 2 === 0 ? pitch.height * 0.35 : pitch.height * 0.65;
    else baseY = idx % 2 === 0 ? pitch.height * 0.4 : pitch.height * 0.6;

    const ballInfluence = 0.45;
    const dxBall = state.ball.x - pl.x;
    const dyBall = state.ball.y - pl.y;
    const dxShape = baseX - pl.x;
    const dyShape = baseY - pl.y;

    const dx = dxShape * (1 - ballInfluence) + dxBall * ballInfluence;
    const dy = dyShape * (1 - ballInfluence) + dyBall * ballInfluence;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      pl.x += (dx / dist) * pl.speed * dt * 3;
      pl.y += (dy / dist) * pl.speed * dt * 3;
    }
  });

  // Shooting (simple “finesse” toward goal)
  if (keys.space && state.time - state.lastShotTime > 0.5) {
    state.lastShotTime = state.time;
    const dirX = p.team === "home" ? 1 : -1;
    const curve = (state.ball.y - pitch.height / 2) * 0.004;
    state.ball.vx = dirX * 7;
    state.ball.vy = -curve * 8;
    state.ball.vz = 7; // lift
  }

  // Weather impact on physics
  let friction = 0.985;
  if (state.weather === "rain") friction = 0.97;
  if (state.weather === "night") friction = 0.982;

  // Ball physics
  state.ball.x += state.ball.vx * dt * 3.5;
  state.ball.y += state.ball.vy * dt * 3.5;
  state.ball.z += state.ball.vz * dt * 3.5;

  state.ball.vx *= friction;
  state.ball.vy *= friction;
  state.ball.vz -= 0.4 * dt * 3.5;

  if (state.ball.z < 0) {
    state.ball.z = 0;
    state.ball.vz *= -0.4;
  }

  // Out of bounds: reset to center
  if (
    state.ball.x < 0 ||
    state.ball.x > pitch.width ||
    state.ball.y < 0 ||
    state.ball.y > pitch.height
  ) {
    state.ball = { x: pitch.width / 2, y: pitch.height / 2, vx: 0, vy: 0, z: 0, vz: 0 };
  }

  // Player–ball interaction
  state.players.forEach(pl => {
    const dx = state.ball.x - pl.x;
    const dy = state.ball.y - pl.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 16 && state.ball.z < 12) {
      state.ball.x = pl.x + dx * 0.25;
      state.ball.y = pl.y + dy * 0.25;
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
}

function drawPitch() {
  ctx.clearRect(0, 0, pitch.width, pitch.height);

  // Fake 3D: gradient grass + perspective stripes
  let topColor = "#0f513f";
  let bottomColor = "#0b3b2e";
  if (state.weather === "night") {
    topColor = "#053326";
    bottomColor = "#021c14";
  }

  const grad = ctx.createLinearGradient(0, 0, 0, pitch.height);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, pitch.width, pitch.height);

  // Perspective stripes
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  for (let i = 0; i < 8; i++) {
    const yTop = (pitch.height / 8) * i;
    const yBottom = yTop + pitch.height / 16;
    ctx.beginPath();
    ctx.moveTo(0, yTop);
    ctx.lineTo(pitch.width, yTop + 10);
    ctx.lineTo(pitch.width, yBottom + 10);
    ctx.lineTo(0, yBottom);
    ctx.closePath();
    ctx.fill();
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

  // Fake stadium lights (night)
  if (state.weather === "night") {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(pitch.width * 0.1, 40, 40, 0, Math.PI * 2);
    ctx.arc(pitch.width * 0.9, 40, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rain overlay
  if (state.weather === "rain") {
    ctx.strokeStyle = "rgba(200, 220, 255, 0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * pitch.width;
      const y = Math.random() * pitch.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 4, y + 10);
      ctx.stroke();
    }
  }
}

function drawPlayers() {
  state.players.forEach((pl, idx) => {
    // Fake 3D: scale based on y (closer to bottom = “bigger”)
    const scale = 0.8 + (pl.y / pitch.height) * 0.4;
    const radius = 8 * scale;

    ctx.fillStyle = pl.team === "home" ? "#00b4d8" : "#e63946";
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (idx === state.controlledIndex) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawBall() {
  // Shadow
  const shadowY = state.ball.y + 10;
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

