const canvas = document.getElementById("pitchCanvas");
const ctx = canvas.getContext("2d");

const hudScore = document.getElementById("hudScore");
const hudTime = document.getElementById("hudTime");
const hudCrowd = document.getElementById("hudCrowd");
const hudMode = document.getElementById("hudMode");
const stadiumSelect = document.getElementById("stadiumSelect");
const weatherSelect = document.getElementById("weatherSelect");
const btnKickOff = document.getElementById("btnKickOff");
const btnSimMatch = document.getElementById("btnSimMatch");
const btnPause = document.getElementById("btnPause");
const btnRestartMatch = document.getElementById("btnRestartMatch");

const pitch = {
  width: canvas.width,
  height: canvas.height,
  goalWidth: 140,
};

const keys = { w: false, a: false, s: false, d: false, space: false, q: false, e: false, r: false, f: false };

document.addEventListener("keydown", e => {
  if (e.key === "w" || e.key === "W") keys.w = true;
  if (e.key === "a" || e.key === "A") keys.a = true;
  if (e.key === "s" || e.key === "S") keys.s = true;
  if (e.key === "d" || e.key === "D") keys.d = true;
  if (e.code === "Space") keys.space = true;
  if (e.key === "q" || e.key === "Q") keys.q = true;
  if (e.key === "e" || e.key === "E") keys.e = true;
  if (e.key === "r" || e.key === "R") keys.r = true;
  if (e.key === "f" || e.key === "F") keys.f = true;
});
document.addEventListener("keyup", e => {
  if (e.key === "w" || e.key === "W") keys.w = false;
  if (e.key === "a" || e.key === "A") keys.a = false;
  if (e.key === "s" || e.key === "S") keys.s = false;
  if (e.key === "d" || e.key === "D") keys.d = false;
  if (e.code === "Space") keys.space = false;
  if (e.key === "q" || e.key === "Q") keys.q = false;
  if (e.key === "e" || e.key === "E") keys.e = false;
  if (e.key === "r" || e.key === "R") keys.r = false;
  if (e.key === "f" || e.key === "F") keys.f = false;
});

const state = {
  time: 0,
  paused: false,
  homeScore: 0,
  awayScore: 0,
  crowdPercent: 100,
  weather: "clear",
  stadium: "camp_nou",
  mode: "manager", // manager / career / fantasy etc.
  ball: {
    x: pitch.width / 2,
    y: pitch.height / 2,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spinZ: 0,   // curve spin
    spinX: 0,   // dip / knuckle
    spinY: 0,
  },
  players: [],
  controlledIndex: 0,
  lastShotTime: 0,
};

function createPlayer(team, x, y, role, rating) {
  return {
    team,
    x,
    y,
    vx: 0,
    vy: 0,
    speed: 2.4 + (rating - 70) * 0.02, // stats affect speed
    role,
    rating,
  };
}

function resetMatch() {
  state.time = 0;
  state.homeScore = 0;
  state.awayScore = 0;
  state.crowdPercent = 100;
  state.ball = {
    x: pitch.width / 2,
    y: pitch.height / 2,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spinZ: 0,
    spinX: 0,
    spinY: 0,
  };
  state.players = [];

  // Simple 5v5 for demo (you can expand)
  state.players.push(createPlayer("home", pitch.width * 0.3, pitch.height * 0.5, "ST", 90)); // controlled
  state.players.push(createPlayer("home", pitch.width * 0.25, pitch.height * 0.35, "CM", 86));
  state.players.push(createPlayer("home", pitch.width * 0.25, pitch.height * 0.65, "CM", 84));
  state.players.push(createPlayer("home", pitch.width * 0.18, pitch.height * 0.45, "CB", 82));
  state.players.push(createPlayer("home", pitch.width * 0.18, pitch.height * 0.55, "CB", 80));

  state.players.push(createPlayer("away", pitch.width * 0.7, pitch.height * 0.5, "ST", 90));
  state.players.push(createPlayer("away", pitch.width * 0.75, pitch.height * 0.35, "CM", 86));
  state.players.push(createPlayer("away", pitch.width * 0.75, pitch.height * 0.65, "CM", 84));
  state.players.push(createPlayer("away", pitch.width * 0.82, pitch.height * 0.45, "CB", 82));
  state.players.push(createPlayer("away", pitch.width * 0.82, pitch.height * 0.55, "CB", 80));

  state.controlledIndex = 0;
  updateHud();
}

function updateHud() {
  hudScore.textContent = `HOME ${state.homeScore} - ${state.awayScore} AWAY`;
  const minutes = Math.floor(state.time / 60);
  const seconds = Math.floor(state.time % 60);
  hudTime.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  hudCrowd.textContent = `Crowd: ${Math.max(0, Math.round(state.crowdPercent))}%`;
  hudMode.textContent = `Mode: ${state.mode === "manager" ? "Manager Simulation" : "Career Match"}`;
}

stadiumSelect.addEventListener("change", () => {
  state.stadium = stadiumSelect.value;
});
weatherSelect.addEventListener("change", () => {
  state.weather = weatherSelect.value;
});

btnKickOff.addEventListener("click", () => {
  state.paused = false;
});
btnPause.addEventListener("click", () => {
  state.paused = !state.paused;
});
btnRestartMatch.addEventListener("click", () => {
  resetMatch();
});
btnSimMatch.addEventListener("click", () => {
  // simple sim: random result weighted by ratings
  const homeRating = state.players.filter(p => p.team === "home").reduce((a, p) => a + p.rating, 0) / 5;
  const awayRating = state.players.filter(p => p.team === "away").reduce((a, p) => a + p.rating, 0) / 5;
  const homeGoals = Math.max(0, Math.round((homeRating - 70) / 8 + Math.random() * 2));
  const awayGoals = Math.max(0, Math.round((awayRating - 70) / 8 + Math.random() * 2));
  state.homeScore = homeGoals;
  state.awayScore = awayGoals;
  updateHud();
});

function update(dt) {
  if (state.paused) return;

  state.time += dt;

  // Crowd leaving if home is 4 goals down
  const diff = state.homeScore - state.awayScore;
  if (diff <= -4) {
    state.crowdPercent -= dt * 10;
  } else if (diff >= 2) {
    state.crowdPercent = Math.min(100, state.crowdPercent + dt * 3);
  }

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
    p.x += moveX * p.speed * dt * 4;
    p.y += moveY * p.speed * dt * 4;
  }

  // Clamp players
  state.players.forEach(pl => {
    pl.x = Math.max(60, Math.min(pitch.width - 60, pl.x));
    pl.y = Math.max(60, Math.min(pitch.height - 60, pl.y));
  });

  // Simple AI: shape + ball attraction
  state.players.forEach((pl, idx) => {
    if (idx === state.controlledIndex) return;
    const baseX = pl.team === "home" ? pitch.width * 0.3 : pitch.width * 0.7;
    let baseY = pitch.height * 0.5;
    if (pl.role === "CM") baseY = idx % 2 === 0 ? pitch.height * 0.4 : pitch.height * 0.6;
    if (pl.role === "CB") baseY = idx % 2 === 0 ? pitch.height * 0.45 : pitch.height * 0.55;

    const ballInfluence = 0.5;
    const dxBall = state.ball.x - pl.x;
    const dyBall = state.ball.y - pl.y;
    const dxShape = baseX - pl.x;
    const dyShape = baseY - pl.y;

    const dx = dxShape * (1 - ballInfluence) + dxBall * ballInfluence;
    const dy = dyShape * (1 - ballInfluence) + dyBall * ballInfluence;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      pl.x += (dx / dist) * pl.speed * dt * 3.5;
      pl.y += (dy / dist) * pl.speed * dt * 3.5;
    }
  });

  // HyperMotion‑style shot types
  if (keys.space && state.time - state.lastShotTime > 0.5) {
    state.lastShotTime = state.time;
    const dirX = p.team === "home" ? 1 : -1;
    const centerY = pitch.height / 2;

    // Default power shot
    let power = 9;
    let curveSpin = 0;
    let dipSpin = 0;

    // Q = finesse (curved)
    if (keys.q) {
      power = 7;
      curveSpin = (p.team === "home" ? 1 : -1) * 0.08;
      dipSpin = 0.03;
    }

    // E = trivela (outside curve)
    if (keys.e) {
      power = 8;
      curveSpin = (p.team === "home" ? 1 : -1) * 0.12;
      dipSpin = 0.02;
    }

    // R = lob
    if (keys.r) {
      power = 6;
      dipSpin = 0.05;
    }

    // F = chip
    if (keys.f) {
      power = 5;
      dipSpin = 0.08;
    }

    const verticalOffset = (state.ball.y - centerY) * 0.004;

    state.ball.vx = dirX * power;
    state.ball.vy = -verticalOffset * 10;
    state.ball.vz = power + 3;
    state.ball.spinZ = curveSpin;
    state.ball.spinX = dipSpin;
    state.ball.spinY = 0;
  }

  // Weather impact
  let friction = 0.985;
  let airDrag = 0.995;
  let bounceLoss = 0.4;
  if (state.weather === "rain") {
    friction = 0.96;   // ball slows more on ground
    airDrag = 0.99;
    bounceLoss = 0.35;
  }
  if (state.weather === "night") {
    friction = 0.982;
    airDrag = 0.993;
  }

  // HyperMotion‑style ball physics
  // Position update
  state.ball.x += state.ball.vx * dt * 4;
  state.ball.y += state.ball.vy * dt * 4;
  state.ball.z += state.ball.vz * dt * 4;

  // Spin‑induced curve (Magnus effect style)
  state.ball.vx += state.ball.spinZ * dt * 20; // side curve
  state.ball.vy += state.ball.spinX * dt * 15; // dip / rise

  // Ground friction vs air drag
  if (state.ball.z <= 0.5) {
    state.ball.vx *= friction;
    state.ball.vy *= friction;
  } else {
    state.ball.vx *= airDrag;
    state.ball.vy *= airDrag;
  }

  // Gravity
  state.ball.vz -= 0.5 * dt * 4;

  // Bounce
  if (state.ball.z < 0) {
    state.ball.z = 0;
    state.ball.vz *= -bounceLoss;
    // reduce spin slightly on bounce
    state.ball.spinZ *= 0.9;
    state.ball.spinX *= 0.9;
  }

  // Out of bounds reset
  if (
    state.ball.x < 0 ||
    state.ball.x > pitch.width ||
    state.ball.y < 0 ||
    state.ball.y > pitch.height
  ) {
    state.ball = {
      x: pitch.width / 2,
      y: pitch.height / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spinZ: 0,
      spinX: 0,
      spinY: 0,
    };
  }

  // Player–ball interaction (control / tackles)
  state.players.forEach(pl => {
    const dx = state.ball.x - pl.x;
    const dy = state.ball.y - pl.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 18 && state.ball.z < 12) {
      // better players control better
      const controlFactor = 0.25 + (pl.rating - 70) * 0.002;
      state.ball.x = pl.x + dx * controlFactor;
      state.ball.y = pl.y + dy * controlFactor;
      state.ball.vx += dx * 0.015;
      state.ball.vy += dy * 0.015;
    }
  });

  // Goals
  const goalTop = pitch.height / 2 - pitch.goalWidth / 2;
  const goalBottom = pitch.height / 2 + pitch.goalWidth / 2;

  if (state.ball.x < 5 && state.ball.y > goalTop && state.ball.y < goalBottom) {
    state.awayScore += 1;
    state.ball = {
      x: pitch.width / 2,
      y: pitch.height / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spinZ: 0,
      spinX: 0,
      spinY: 0,
    };
  }

  if (state.ball.x > pitch.width - 5 && state.ball.y > goalTop && state.ball.y < goalBottom) {
    state.homeScore += 1;
    state.ball = {
      x: pitch.width / 2,
      y: pitch.height / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spinZ: 0,
      spinX: 0,
      spinY: 0,
    };
  }

  updateHud();
}

function drawPitch() {
  ctx.clearRect(0, 0, pitch.width, pitch.height);

  // Fake 3D grass with stadium‑dependent tint
  let topColor = "#0f513f";
  let bottomColor = "#0b3b2e";
  if (state.stadium === "bernabeu") {
    topColor = "#0b4b3a";
    bottomColor = "#073328";
  }
  if (state.stadium === "wembley") {
    topColor = "#0f5b3f";
    bottomColor = "#0a3b2a";
  }
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
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let i = 0; i < 10; i++) {
    const yTop = (pitch.height / 10) * i;
    const yBottom = yTop + pitch.height / 20;
    ctx.beginPath();
    ctx.moveTo(0, yTop);
    ctx.lineTo(pitch.width, yTop + 12);
    ctx.lineTo(pitch.width, yBottom + 12);
    ctx.lineTo(0, yBottom);
    ctx.closePath();
    ctx.fill();
  }

  // Lines
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pitch.width / 2, 0);
  ctx.lineTo(pitch.width / 2, pitch.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pitch.width / 2, pitch.height / 2, 80, 0, Math.PI * 2);
  ctx.stroke();

  const goalTop = pitch.height / 2 - pitch.goalWidth / 2;
  const goalBottom = pitch.height / 2 + pitch.goalWidth / 2;
  ctx.beginPath();
  ctx.rect(0, goalTop, 8, pitch.goalWidth);
  ctx.rect(pitch.width - 8, goalTop, 8, pitch.goalWidth);
  ctx.stroke();

  // Stadium lights (night)
  if (state.weather === "night") {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(pitch.width * 0.1, 60, 50, 0, Math.PI * 2);
    ctx.arc(pitch.width * 0.9, 60, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rain overlay
  if (state.weather === "rain") {
    ctx.strokeStyle = "rgba(200, 220, 255, 0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * pitch.width;
      const y = Math.random() * pitch.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 5, y + 14);
      ctx.stroke();
    }
  }
}

function drawPlayers() {
  state.players.forEach((pl, idx) => {
    const scale = 0.8 + (pl.y / pitch.height) * 0.4;
    const radius = 10 * scale;

    ctx.fillStyle = pl.team === "home" ? "#00b4d8" : "#e63946";
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (idx === state.controlledIndex) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawBall() {
  const shadowY = state.ball.y + 12;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.ellipse(state.ball.x, shadowY, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const screenY = state.ball.y - state.ball.z;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(state.ball.x, screenY, 9, 0, Math.PI * 2);
  ctx.fill();
}

let lastTime = performance.now();
function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  update(dt);
  drawPitch();
  drawPlayers();
  drawBall();
  requestAnimationFrame(loop);
}

resetMatch();
requestAnimationFrame(loop);


