// game.js — Swipe-style visual upgrade (bricks, balls, items)
// Based on your original logic — only drawing/style/visual effects changed.
// Keep your HTML spans: #score, #ballsCount, #round

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400; // keep consistent with your HTML/CSS
canvas.height = 700;

// ===== DOM 요소 (점수판) =====
const scoreEl = document.getElementById('score');
const ballsCountEl = document.getElementById('ballsCount');
const roundEl = document.getElementById('round');

// ===== Game Variables =====
let balls = [];
let bricks = [];
let items = [];
let particles = []; // small particle effects for collisions
let round = 1;
let ballsToShoot = 1;
let shooting = false;
let nextBallDelay = 5;
let ballSpeed = 7;
let turnEnded = true;
const gameOverLineY = canvas.height - 50;
let isGameOver = false;

let nextPlayerX = canvas.width / 2;

// Player position
const player = { x: nextPlayerX, y: canvas.height - 10, radius: 6 };

// Aiming angle
let angle = -90;
const angleSpeed = 2;
const minAngle = -160;
const maxAngle = -20;

// Mouse tracking
let mouseDown = false;

// ===== Score =====
let score = 0;

// update UI helper
function updateUI() {
    if (scoreEl) scoreEl.textContent = score;
    if (ballsCountEl) ballsCountEl.textContent = ballsToShoot;
    if (roundEl) roundEl.textContent = round;
}

function getColorByLastDigit(value) {
    const last = value % 10;

    const colors = {
        0: "#c09a67ff",
        1: "#10c93eff",
        2: "#2495e0ff",
        3: "#b91056ff",
        4: "#3724e4ff",
        5: "#1b6946ff",
        6: "#ccbc29ff",
        7: "#e95fa4ff",
        8: "#35066eff",
        9: "#ec1212ff"
    };

    return colors[last];
}

// initialize UI on load
updateUI();

// ===== Utility: rounded rect drawing =====
function drawRoundedRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();
}

// small particle spawn
function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.8) * 6,
            life: Math.random() * 30 + 20,
            color: color,
            size: Math.random() * 2 + 1
        });
    }
}

// ===== Mouse Input =====
canvas.addEventListener("mousedown", () => {
    if (turnEnded) mouseDown = true;
});
canvas.addEventListener("mouseup", () => {
    mouseDown = false;
});

// touch support for mobile (swipe start/end)
canvas.addEventListener("touchstart", (e) => {
    if (turnEnded) mouseDown = true;
    e.preventDefault();
});
canvas.addEventListener("touchend", (e) => {
    mouseDown = false;
    e.preventDefault();
});

// ===== Key Input =====
document.addEventListener("keydown", (e) => {
    if (isGameOver) return;
    if (!turnEnded) return;

    if (e.code === "ArrowLeft") {
        angle -= angleSpeed;
        if (angle < minAngle) angle = minAngle;
    }
    if (e.code === "ArrowRight") {
        angle += angleSpeed;
        if (angle > maxAngle) angle = maxAngle;
    }
    if (e.code === "Space") {
        startTurn();
    }
});

// ===== Turn Start =====
function startTurn() {
    if (shooting || isGameOver) return;
    shooting = true;
    turnEnded = false;

    let shotCount = 0;

    function shootNext() {
        if (shotCount >= ballsToShoot) return;

        const rad = angle * Math.PI / 180;
        // add trail buffer to each ball
        balls.push({
            x: player.x,
            y: player.y,
            radius: 6,
            dx: Math.cos(rad) * ballSpeed,
            dy: Math.sin(rad) * ballSpeed,
            trail: [] // store last positions for simple trail effect
        });

        shotCount++;
        if (shotCount < ballsToShoot) {
            setTimeout(shootNext, nextBallDelay * 16);
        }
    }

    shootNext();
}

// ===== Brick Spawn =====
function spawnBrickRow() {
    const brickCount = 7;
    const brickWidth = canvas.width / brickCount;
    const brickHeight = 50;
    const startY = 50;

    let baseHP;
    let numBricksToSpawn;

    if (round === 1) {
        numBricksToSpawn = 2;
        baseHP = 1;
    } else if (round <= 3) {
        baseHP = round;
        numBricksToSpawn = Math.floor(Math.random() * 3) + 1;
    } else {
        baseHP = round;
        numBricksToSpawn = Math.floor(Math.random() * 5) + 1;
    }

    const availableSlots = Array.from({ length: brickCount }, (_, i) => i);

    // ===== ITEM 1개 고정 스폰 =====
    let numItemsToSpawn = 1;

    const itemSlots = [];
    for (let i = 0; i < numItemsToSpawn && availableSlots.length > 0; i++) {
        const idx = Math.floor(Math.random() * availableSlots.length);
        const slot = availableSlots.splice(idx, 1)[0];
        itemSlots.push(slot);
    }

    itemSlots.forEach(i => {
        const x = i * brickWidth;
        items.push({
            x: x + brickWidth / 2,
            y: startY + brickHeight / 2,
            radius: 12,
            type: 'ballCount',
            wobble: Math.random() * Math.PI * 2 // visual wobble phase
        });
    });

    // ===== BRICKS =====
    const brickSlots = [];
    for (let i = 0; i < numBricksToSpawn && availableSlots.length > 0; i++) {
        const idx = Math.floor(Math.random() * availableSlots.length);
        const slot = availableSlots.splice(idx, 1)[0];
        brickSlots.push(slot);
    }

    brickSlots.forEach(i => {
        bricks.push({
            x: i * brickWidth + 6,
            y: startY + 6,
            width: brickWidth - 12,
            height: brickHeight - 12,
            hp: baseHP
        });
    });

    // update UI (safe call)
    updateUI();
}

spawnBrickRow();

// ===== Collision Check =====
function checkBallBrickCollision(ball, brick) {
    const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
    const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    return (dx * dx + dy * dy) < (ball.radius * ball.radius);
}

// ===== Update =====
function update() {
    if (isGameOver) return;

    // update balls (position + trail)
    balls.forEach(ball => {
        // store trail
        ball.trail.unshift({ x: ball.x, y: ball.y });
        if (ball.trail.length > 8) ball.trail.pop();

        ball.x += ball.dx;
        ball.y += ball.dy;

        // wall bounce
        if (ball.x < ball.radius) {
            ball.dx = Math.abs(ball.dx);
            spawnParticles(ball.x + 4, ball.y, 'rgba(255,255,255,0.9)', 6);
        }
        if (ball.x > canvas.width - ball.radius) {
            ball.dx = -Math.abs(ball.dx);
            spawnParticles(ball.x - 4, ball.y, 'rgba(255,255,255,0.9)', 6);
        }
        if (ball.y < ball.radius) {
            ball.dy = Math.abs(ball.dy);
            spawnParticles(ball.x, ball.y + 4, 'rgba(255,255,255,0.9)', 6);
        }

        // item collision
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const dx = ball.x - item.x;
            const dy = ball.y - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ball.radius + item.radius) {
                if (item.type === 'ballCount') {
                    ballsToShoot++;
                    updateUI();
                    spawnParticles(item.x, item.y, 'rgba(80,200,255,1)', 10);
                }
                items.splice(i, 1);
            }
        }

        // brick collision
        for (let i = bricks.length - 1; i >= 0; i--) {
            const brick = bricks[i];

            if (checkBallBrickCollision(ball, brick)) {
                const cx = ball.x - (brick.x + brick.width / 2);
                const cy = ball.y - (brick.y + brick.height / 2);

                if (Math.abs(cx) > Math.abs(cy)) ball.dx *= -1;
                else ball.dy *= -1;

                brick.hp--;
                score += 1;

                // small sparks and audio-ish visual
                spawnParticles(ball.x, ball.y, 'rgba(255,220,120,1)', 12);

                // update score UI immediately
                updateUI();

                if (brick.hp <= 0) {
                    // bigger particle burst
                    spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, 'rgba(255,120,80,1)', 20);
                    bricks.splice(i, 1);
                }
                break;
            }
        }
    });

    // bottom detection
    balls = balls.filter(ball => {
        if (ball.y >= player.y - ball.radius) {
            nextPlayerX = ball.x;
        }
        return ball.y < canvas.height + 50;
    });

    // turn end
    if (shooting && balls.length === 0) {
        shooting = false;
        turnEnded = true;
        player.x = nextPlayerX;
        angle = -90;

        round++;
        updateUI(); // update round on UI
        moveBricksDown();
        spawnBrickRow();
    }

    // update items wobble
    items.forEach(it => {
        it.wobble += 0.12;
    });

    // update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity-like
        p.life -= 1;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // ===== FIXED GAME OVER =====
    for (const brick of bricks) {
        if (!isGameOver && brick.y + brick.height >= gameOverLineY) {
            isGameOver = true;

            setTimeout(() => {
                alert(`Game Over!\nRound: ${round - 1}라운드 생존. \nScore: ${score}점. \n확인 버튼을 누르거나 엔터 키를 입력하여 재시작하십시오.`);
                document.location.reload();
            }, 50);

            break;
        }
    }
}

// ===== Move Bricks Down =====
function moveBricksDown() {
    const h = 50;
    bricks.forEach(b => b.y += h);
    items.forEach(i => i.y += h);
}

// ===== Prediction Path =====
function drawPredictionPath() {
    if (!mouseDown || !turnEnded) return;

    const rad = angle * Math.PI / 180;

    let x = player.x;
    let y = player.y;
    let dx = Math.cos(rad) * ballSpeed;
    let dy = Math.sin(rad) * ballSpeed;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 100; i++) {
        if (x < 5) { x = 5; dx *= -1; }
        if (x > canvas.width - 5) { x = canvas.width - 5; dx *= -1; }
        if (y < 5) { y = 5; dy *= -1; }

        // simple collision bounce for prediction (no side-effect)
        for (const brick of bricks) {
            if (x + 2 > brick.x && x - 2 < brick.x + brick.width &&
                y + 2 > brick.y && y - 2 < brick.y + brick.height) {
                const cx = x - (brick.x + brick.width / 2);
                const cy = y - (brick.y + brick.height / 2);
                if (Math.abs(cx) > Math.abs(cy)) dx *= -1;
                else dy *= -1;
            }
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx * 3, y + dy * 3);
        ctx.stroke();

        x += dx * 3;
        y += dy * 3;
    }

    ctx.restore();
}

// ===== Draw visuals (swipe-brick style) =====
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background subtle gradient
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#07070a");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw items (+1) with fancy style
    items.forEach(item => {
        const wob = Math.sin(item.wobble) * 2;
        const size = item.radius * 2;
        const x = item.x - size / 2 + wob;
        const y = item.y - size / 2;

        // rounded square background
        ctx.save();
        // gradient base
        const ig = ctx.createLinearGradient(x, y, x + size, y + size);
        ig.addColorStop(0, "#7fe6ff");
        ig.addColorStop(1, "#2db6ff");
        ctx.fillStyle = ig;

        // shadow/glow
        ctx.shadowColor = "rgba(45,182,255,0.6)";
        ctx.shadowBlur = 10;
        drawRoundedRect(x, y, size, size, 8);

        // inner white badge
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawRoundedRect(x + 6, y + 6, size - 12, size - 12, 6);

        // +1 text
        ctx.fillStyle = "#0b72a8";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+1", item.x, item.y + 1);

        ctx.restore();
    });

    // draw bricks (rounded, gradient, highlight)
    bricks.forEach(brick => {
        ctx.save();
        const bx = brick.x;
        const by = brick.y;
        const bw = brick.width;
        const bh = brick.height;
        const radius = Math.min(12, bw * 0.08);

        // color based on hp
        const hp = Math.max(1, brick.hp);
        // 끝자리 숫자로 색 선택
        const color = getColorByLastDigit(hp);

        // 단색 그라데이션(위-아래 같은 색)
        let fillA = color;
        let fillB = color;

        const bgGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
        bgGrad.addColorStop(0, fillA);
        bgGrad.addColorStop(1, fillB);

        ctx.fillStyle = bgGrad;
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 8;
        drawRoundedRect(bx, by, bw, bh, radius);

        // top highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        drawRoundedRect(bx + 2, by + 2, bw - 4, bh / 2 - 4, radius - 2);

        // stroke
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // HP text
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(brick.hp, bx + bw / 2, by + bh / 2);

        ctx.restore();
    });

    // draw particles (sparks)
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 40);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // draw balls (with glow and trail)
    balls.forEach(ball => {
        // trail
        for (let t = 0; t < ball.trail.length; t++) {
            const pos = ball.trail[t];
            const alpha = 0.12 * (1 - t / ball.trail.length);
            ctx.beginPath();
            ctx.fillStyle = `rgba(80,220,255,${alpha})`;
            ctx.arc(pos.x, pos.y, ball.radius * (0.6 - t * 0.04), 0, Math.PI * 2);
            ctx.fill();
        }

        // ball glow
        ctx.save();
        ctx.beginPath();
        ctx.shadowColor = "rgba(80,220,255,0.9)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#62f0ff";
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // small center
        ctx.beginPath();
        ctx.fillStyle = "#01232a";
        ctx.arc(ball.x, ball.y, Math.max(1, ball.radius - 2), 0, Math.PI * 2);
        ctx.fill();
    });

    // Game over line
    ctx.save();
    ctx.strokeStyle = "rgba(255,80,80,0.8)";
    ctx.beginPath();
    ctx.moveTo(0, gameOverLineY);
    ctx.lineTo(canvas.width, gameOverLineY);
    ctx.stroke();
    ctx.restore();

    // 발사 화살표 (aim) when ready
    if (turnEnded) {
        const radArrow = angle * Math.PI / 180;
        const arrowLength = 70;
        const endX = player.x + Math.cos(radArrow) * arrowLength;
        const endY = player.y + Math.sin(radArrow) * arrowLength;

        ctx.save();
        ctx.strokeStyle = "rgba(255,220,130,0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // arrow head
        const headSize = 10;
        const leftX = endX - Math.cos(radArrow - Math.PI / 6) * headSize;
        const leftY = endY - Math.sin(radArrow - Math.PI / 6) * headSize;
        const rightX = endX - Math.cos(radArrow + Math.PI / 6) * headSize;
        const rightY = endY - Math.sin(radArrow + Math.PI / 6) * headSize;

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,195,90,0.95)";
        ctx.fill();
        ctx.restore();
    }

    drawPredictionPath();
}

// ===== Game Loop =====
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();
