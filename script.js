const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Assets
const bgImg = new Image(); bgImg.src = 'background.png';
const heroImg = new Image(); heroImg.src = 'hero.png';
const enemyImg = new Image(); enemyImg.src = 'enemy.png';
const bgm = new Audio('bgm.mp3'); bgm.loop = true;
const fireSound = new Audio('firesound.mp3');
const clickSound = new Audio('click.mp3');
const blastSound = new Audio('blast.mp3'); // New Asset

let data = {
    name: "", totalKills: 0, totalGCEarned: 0, totalGCSpent: 0,
    balanceGC: 0, maxLives: 3, hasExtraHeartPurchased: false,
    shieldDuration: 3.0, shieldCount: 0,
    bgmOn: true, sfxOn: true
};

let gameActive = false, currentKills = 0, enemyCountToSpawn = 1, lastSpawnTime = 0;
let player = { x: 0, y: 0, health: 3, shieldActive: false, shieldTimeLeft: 0 };
let enemies = [], playerBullets = [], enemyBullets = [];
let joystick = { baseX: 80, baseY: 0, currX: 80, currY: 0, active: false, dirX: 0, dirY: 0 };

// --- Loading Screen Logic ---
function runLoadingScreen() {
    const bar = document.getElementById('progressBar');
    let width = 0;
    const interval = setInterval(() => {
        width += (100 / 60); // Roughly 6 seconds at 100ms intervals
        bar.style.width = width + '%';
        if (width >= 100) {
            clearInterval(interval);
            document.getElementById('loadingScreen').classList.remove('active');
            document.getElementById('startPrompt').classList.add('active');
        }
    }, 100);
}

const ui = {
    showPanel(id) {
        game.playClick();
        document.getElementById(id).classList.add('active');
        game.updateUI();
    },
    hidePanels() {
        game.playClick();
        document.querySelectorAll('.overlay').forEach(el => {
            if(el.id !== 'lobby') el.classList.remove('active');
        });
    }
};

const game = {
    initAudio() {
        document.getElementById('startPrompt').classList.remove('active');
        document.getElementById('lobby').classList.add('active');
        if (data.bgmOn) bgm.play().catch(() => {});
        this.playClick();
    },

    loadData() {
        const saved = localStorage.getItem('galaxyProtectorSave');
        if (saved) data = JSON.parse(saved);
        else {
            data.name = prompt("Enter Pilot Name:") || "Subham Pilot";
            this.saveData();
        }
        this.updateUI();
    },

    saveData() {
        localStorage.setItem('galaxyProtectorSave', JSON.stringify(data));
        this.updateUI();
    },

    updateUI() {
        document.querySelectorAll('.GC-balance').forEach(el => el.innerText = data.balanceGC);
        document.getElementById('shopShieldInfo').innerText = `Duration: ${data.shieldDuration.toFixed(1)}s (Stock: ${data.shieldCount})`;
        document.getElementById('shopHeartInfo').innerText = `Max Lives: ${data.maxLives}`;
        document.getElementById('bgmToggle').innerText = data.bgmOn ? "ON" : "OFF";
        document.getElementById('sfxToggle').innerText = data.sfxOn ? "ON" : "OFF";
        document.getElementById('shieldCountLabel').innerText = data.shieldCount;
        document.getElementById('statsContent').innerHTML = `<p><b>Pilot:</b> ${data.name}</p><p><b>Kills:</b> ${data.totalKills}</p><p><b>Balance:</b> ${data.balanceGC} GC</p>`;
    },

    playClick() { if(data.sfxOn) clickSound.play().catch(()=>{}); },
    playBlast() { if(data.sfxOn) { blastSound.currentTime = 0; blastSound.play().catch(()=>{}); } },

    toggleBGM() { 
        data.bgmOn = !data.bgmOn; 
        data.bgmOn ? bgm.play() : bgm.pause();
        this.playClick(); this.saveData(); 
    },
    toggleSFX() { data.sfxOn = !data.sfxOn; this.playClick(); this.saveData(); },

    buyShield() { if(data.balanceGC >= 49) { data.balanceGC -= 49; data.shieldCount++; this.playClick(); this.saveData(); } },
    upgradeShield() { if(data.balanceGC >= 99 && data.shieldDuration < 15) { data.balanceGC -= 99; data.shieldDuration += 0.5; this.playClick(); this.saveData(); } },
    buyHeart() { if(!data.hasExtraHeartPurchased && data.balanceGC >= 999) { data.balanceGC -= 999; data.maxLives = 4; data.hasExtraHeartPurchased = true; this.playClick(); this.saveData(); } },
    upgradeHeart() { if(data.hasExtraHeartPurchased && data.balanceGC >= 499 && data.maxLives < 11) { data.balanceGC -= 499; data.maxLives += 1; this.playClick(); this.saveData(); } },

    startGame() {
        this.playClick();
        document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
        document.getElementById('shieldBtnContainer').style.display = 'flex';
        gameActive = true;
        currentKills = 0;
        player.health = data.maxLives;
        player.x = canvas.width / 2 - 25;
        player.y = canvas.height * 0.8;
        player.shieldActive = false;
        enemies = []; playerBullets = []; enemyBullets = [];
        enemyCountToSpawn = 1;
        lastSpawnTime = Date.now();
        this.updateHUD();
        animate();
    },

    activateShieldInGame() {
        if(!gameActive || player.shieldActive || data.shieldCount <= 0) return;
        data.shieldCount--;
        player.shieldActive = true;
        player.shieldTimeLeft = data.shieldDuration * 60;
        this.playClick();
        this.saveData();
        this.updateHUD();
    },

    updateHUD() {
        document.getElementById('healthDisplay').innerText = `❤️${player.health}`;
        document.getElementById('gameStats').innerHTML = `Kills: ${currentKills} | <span class="currency">GC: ${data.balanceGC}</span>`;
        document.getElementById('shieldCountLabel').innerText = data.shieldCount;
        const sHUD = document.getElementById('shieldStatusHUD');
        if(player.shieldActive) {
            sHUD.style.display = 'block';
            sHUD.innerText = `🛡️ SHIELD: ${(player.shieldTimeLeft/60).toFixed(1)}s`;
        } else sHUD.style.display = 'none';
    },

    backToHome() {
        this.playClick();
        document.getElementById('gameOver').classList.remove('active');
        document.getElementById('lobby').classList.add('active');
    }
};

function animate() {
    if(!gameActive) return;
    ctx.clearRect(0,0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    if(player.shieldActive) {
        player.shieldTimeLeft--;
        if(player.shieldTimeLeft <= 0) player.shieldActive = false;
        game.updateHUD();
        ctx.beginPath(); ctx.arc(player.x+25, player.y+25, 45, 0, Math.PI*2);
        ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 4; ctx.stroke();
    }

    player.x = Math.max(0, Math.min(canvas.width - 50, player.x + joystick.dirX * 7));
    player.y = Math.max(0, Math.min(canvas.height - 50, player.y + joystick.dirY * 7));

    if(Date.now() % 400 < 25) {
        playerBullets.push({x: player.x+23, y: player.y, s: 12});
        if(data.sfxOn) { fireSound.currentTime = 0; fireSound.play(); }
    }

    ctx.drawImage(heroImg, player.x, player.y, 50, 50);

    ctx.fillStyle = "yellow";
    playerBullets.forEach((b, i) => {
        b.y -= b.s; ctx.fillRect(b.x, b.y, 4, 10);
        if(b.y < 0) playerBullets.splice(i, 1);
    });

    if(Date.now() - lastSpawnTime > 5000) {
        let count = Math.min(enemyCountToSpawn++, 10);
        for(let i=0; i<count; i++) enemies.push({ x: (i%6+1)*(canvas.width/7)-25, y: -50-(Math.floor(i/6)*70), hp: 2 });
        lastSpawnTime = Date.now();
    }

    enemies.forEach((en, ei) => {
        en.y += 1.8;
        ctx.drawImage(enemyImg, en.x, en.y, 50, 50);
        if(Math.random() < 0.008) enemyBullets.push({x: en.x+25, y: en.y+50, s: 4});
        playerBullets.forEach((pb, pi) => {
            if(pb.x > en.x && pb.x < en.x+50 && pb.y > en.y && pb.y < en.y+50) {
                playerBullets.splice(pi, 1);
                if(--en.hp <= 0) { 
                    game.playBlast(); // Trigger blast sound
                    enemies.splice(ei, 1); 
                    currentKills++; data.totalKills++; 
                    if(currentKills%2===0){data.balanceGC++; data.totalGCEarned++;} 
                    game.updateHUD(); 
                }
            }
        });
    });

    enemyBullets.forEach((eb, ebi) => {
        eb.y += eb.s; ctx.fillStyle = "red"; ctx.fillRect(eb.x, eb.y, 4, 10);
        if(eb.x > player.x && eb.x < player.x+50 && eb.y > player.y && eb.y < player.y+50) {
            enemyBullets.splice(ebi, 1);
            if(!player.shieldActive) { if(--player.health <= 0) gameOver(); game.updateHUD(); }
        }
    });

    // Joystick Draw
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.arc(joystick.baseX, joystick.baseY, 50, 0, Math.PI*2); ctx.strokeStyle = "white"; ctx.stroke();
    ctx.beginPath(); ctx.arc(joystick.currX, joystick.currY, 25, 0, Math.PI*2); ctx.fillStyle = "white"; ctx.fill();
    ctx.globalAlpha = 1.0;

    requestAnimationFrame(animate);
}

function gameOver() {
    gameActive = false; game.saveData();
    document.getElementById('shieldBtnContainer').style.display = 'none';
    document.getElementById('gameOver').classList.add('active');
    document.getElementById('finalScore').innerText = `Kills: ${currentKills}`;
}

function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    joystick.baseY = canvas.height - 100;
    joystick.currY = joystick.baseY;
}

window.addEventListener('resize', init);
canvas.addEventListener('touchstart', (e) => { if(e.touches[0].clientX < 200) joystick.active = true; });
canvas.addEventListener('touchmove', (e) => {
    if(!joystick.active) return;
    const t = e.touches[0];
    const dx = t.clientX - joystick.baseX, dy = t.clientY - joystick.baseY;
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 50), angle = Math.atan2(dy, dx);
    joystick.currX = joystick.baseX + Math.cos(angle) * dist;
    joystick.currY = joystick.baseY + Math.sin(angle) * dist;
    joystick.dirX = (Math.cos(angle) * dist) / 50;
    joystick.dirY = (Math.sin(angle) * dist) / 50;
});
window.addEventListener('touchend', () => { joystick.active = false; joystick.dirX = 0; joystick.dirY = 0; joystick.currX = joystick.baseX; joystick.currY = joystick.baseY; });

// Execution
init();
game.loadData();
runLoadingScreen();
