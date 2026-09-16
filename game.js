const grid = document.getElementById("grid");
const levelElement = document.getElementById("level");
const skillPointsElement = document.getElementById("skillPoints");
const movesElement = document.getElementById("moves");
const attacksElement = document.getElementById("attacks");
const healthTextElement = document.getElementById("healthText");
const healthBarElement = document.getElementById("healthBar");
const manaTextElement = document.getElementById("manaText");
const manaBarElement = document.getElementById("manaBar");
const roundLabelElement = document.getElementById("roundLabel");
const eventLogElement = document.getElementById("eventLog");
const gameMessageElement = document.getElementById("gameMessage");
const skillTreeElement = document.getElementById("skillTree");
const helpDialog = document.getElementById("helpDialog");

const ENEMY_CAP = 20;
const MAX_GRID_SIZE = 12;
const ENEMY_TARGET_CAP = 16;

let level = 1;
let skillPoints = 0;
let round = 1;
let gameOver = false;

let player;
let goal;
let walls = [];
let enemies = [];

// Action economy: 3 actions per round, of which at most 2 (or more with
// the "Leichtfüssig" skill) can be spent on movement. Attacks are not
// separately limited - they simply consume actions.
let actionsLeft = 3;
let movesUsed = 0;

let maxHealth = 10;
let health = 10;

let maxMana = 5;
let mana = 5;

let skills = {
  power: false,
  diagonal: false,
  mobility: false,
  shield: false,
  reserve: false,
  brustschutz: false,
  beinschutz: false,
  manaregen: false,
  manamana: false
};

let activePower = false;
let activeDiagonal = false;

const skillDefinitions = [
  {
    id: "power",
    name: "Kraftschlag",
    cost: 2,
    description: "Der nächste Angriff verursacht 3 zusätzlichen Schaden. Kostet bei Aktivierung 3 Mana.",
    requirement: null
  },
  {
    id: "diagonal",
    name: "Winkelklinge",
    cost: 2,
    description: "Der nächste Angriff trifft zusätzlich diagonale Felder. Kostet bei Aktivierung 2 Mana.",
    requirement: null
  },
  {
    id: "mobility",
    name: "Leichtfüssig",
    cost: 3,
    description: "Deine maximale Bewegung pro Runde steigt von 2 auf 3.",
    requirement: "power"
  },
  {
    id: "shield",
    name: "Energieschild",
    cost: 2,
    description: "Der erste erlittene Schaden pro Runde wird verhindert.",
    requirement: "diagonal"
  },
  {
    id: "reserve",
    name: "Aktionsreserve",
    cost: 3,
    description: "Du erhältst eine zusätzliche Aktion pro Runde (3 auf 4).",
    requirement: "mobility"
  },
  {
    id: "brustschutz",
    name: "Brustschutz",
    cost: 2,
    description: "Du erleidest von allen Gegnern 1 Schaden weniger.",
    requirement: null
  },
  {
    id: "beinschutz",
    name: "Beinschutz",
    cost: 2,
    description: "Du erleidest von allen Gegnern 2 Schaden weniger (zusätzlich zum Brustschutz).",
    requirement: "brustschutz"
  },
  {
    id: "manaregen",
    name: "Manaregen",
    cost: 3,
    description: "Du regenerierst 2 statt 1 Mana pro Runde.",
    requirement: null
  },
  {
    id: "manamana",
    name: "Manamana",
    cost: 3,
    description: "Dein maximales Mana steigt von 5 auf 10.",
    requirement: "manaregen"
  }
];

const enemyDefinitions = {
  virus: {
    name: "Virus",
    hp: 7,
    dmgMin: 3,
    dmgMax: 5,
    moveSpeed: 1,
    attacksPerTurn: 1,
    emoji: "🦠",
    className: "virus"
  },
  swordsman: {
    name: "Schwertkämpfer",
    hp: 16,
    dmgMin: 1,
    dmgMax: 2,
    moveSpeed: 1,
    attacksPerTurn: 2,
    emoji: "⚔️",
    className: "swordsman"
  },
  runner: {
    name: "Runner",
    hp: 10,
    dmgMin: 7,
    dmgMax: 8,
    moveSpeed: 2,
    attacksPerTurn: 1,
    emoji: "🏃",
    className: "runner"
  },
  shieldbearer: {
    name: "Schild",
    hp: 18,
    dmgMin: 3,
    dmgMax: 4,
    moveSpeed: 1,
    attacksPerTurn: 1,
    emoji: "🛡️",
    className: "shieldbearer",
    damageReduction: 2
  },
  spawner: {
    name: "Spawner",
    hp: 1,
    dmgMin: 0,
    dmgMax: 0,
    moveSpeed: 0,
    attacksPerTurn: 0,
    emoji: "🕸️",
    className: "spawner",
    isSpawner: true
  },
  healer: {
    name: "Heiler",
    hp: 12,
    dmgMin: 1,
    dmgMax: 2,
    moveSpeed: 1,
    attacksPerTurn: 1,
    emoji: "✚",
    className: "healer",
    isHealer: true
  },
  geist: {
    name: "Geist",
    hp: 10,
    dmgMin: 7,
    dmgMax: 8,
    moveSpeed: 2,
    attacksPerTurn: 1,
    emoji: "👻",
    className: "geist",
    passWalls: true
  },
  teleporter: {
    name: "Teleporter",
    hp: 7,
    dmgMin: 9,
    dmgMax: 10,
    moveSpeed: 1,
    attacksPerTurn: 1,
    emoji: "🌀",
    className: "teleporter",
    isTeleporter: true
  },
  boss: {
    name: "Boss",
    hp: 30,
    dmgMin: 4,
    dmgMax: 7,
    moveSpeed: 1,
    attacksPerTurn: 1,
    emoji: "👹",
    className: "boss"
  },
  archer: {
    name: "Bogner",
    hp: 11,
    dmgMin: 3,
    dmgMax: 7,
    moveSpeed: 1,
    attacksPerTurn: 1,
    emoji: "🏹",
    className: "archer",
    range: 2
  }
};

const HEAL_AMOUNT_PER_HEALER = 4;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function randomRange(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isWall(x, y) {
  return walls.some((wall) => wall.x === x && wall.y === y);
}

function isOccupied(x, y) {
  return enemies.some((enemy) => enemy.x === x && enemy.y === y);
}

function isOccupiedByOther(x, y, self) {
  return enemies.some((enemy) => enemy !== self && enemy.x === x && enemy.y === y);
}

function isOrthogonalNeighbor(x, y, cx, cy) {
  return Math.abs(x - cx) + Math.abs(y - cy) === 1;
}

function isFree(x, y) {
  return (
    x >= 0 &&
    y >= 0 &&
    x < player.size &&
    y < player.size &&
    !isWall(x, y) &&
    !isOccupied(x, y) &&
    !(x === player.x && y === player.y) &&
    !(x === goal.x && y === goal.y)
  );
}

function getMaxMoves() {
  return skills.mobility ? 3 : 2;
}

function getMaxActions() {
  return skills.reserve ? 4 : 3;
}

function addLog(message) {
  const entry = document.createElement("p");
  entry.textContent = message;
  eventLogElement.prepend(entry);

  while (eventLogElement.children.length > 7) {
    eventLogElement.lastElementChild.remove();
  }
}

function getAvailableEnemyTypes() {
  return Object.keys(enemyDefinitions);
}

function createLevel() {
  const size = Math.min(5 + level, MAX_GRID_SIZE);

  player = {
    x: 0,
    y: 0,
    size
  };

  goal = {
    x: size - 1,
    y: size - 1
  };

  walls = [];
  enemies = [];
  health = maxHealth;
  mana = maxMana;

  const wallTarget = Math.min(level + 2, Math.floor(size * size * 0.22));

  while (walls.length < wallTarget) {
    const position = {
      x: randomInt(size),
      y: randomInt(size)
    };

    if (
      !isWall(position.x, position.y) &&
      !(
        (position.x === 0 && position.y === 0) ||
        (position.x === goal.x && position.y === goal.y)
      ) &&
      !isOrthogonalNeighbor(position.x, position.y, 0, 0) &&
      !isOrthogonalNeighbor(position.x, position.y, goal.x, goal.y)
    ) {
      walls.push(position);
    }
  }

  const enemyTypes = getAvailableEnemyTypes();
  const enemyTarget = Math.min(level, ENEMY_TARGET_CAP);

  let attempts = 0;
  while (enemies.length < enemyTarget && attempts < 4000) {
    attempts += 1;
    const type = enemyTypes[randomInt(enemyTypes.length)];
    const position = {
      x: randomInt(size),
      y: randomInt(size)
    };

    if (
      isFree(position.x, position.y) &&
      Math.abs(position.x - player.x) + Math.abs(position.y - player.y) > 3
    ) {
      enemies.push(createEnemy(type, position.x, position.y));
    }
  }

  startRound(true);
  addLog(`Sektor ${level} betreten (${enemies.length} Gegner).`);
  draw();
}

function createEnemy(type, x, y) {
  const def = enemyDefinitions[type];

  return {
    x,
    y,
    type,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    dmgMin: def.dmgMin,
    dmgMax: def.dmgMax,
    moveSpeed: def.moveSpeed,
    attacksPerTurn: def.attacksPerTurn,
    emoji: def.emoji,
    className: def.className,
    passWalls: !!def.passWalls,
    isSpawner: !!def.isSpawner,
    isHealer: !!def.isHealer,
    isTeleporter: !!def.isTeleporter,
    range: def.range || 0,
    damageReduction: def.damageReduction || 0
  };
}

function getPlayerDamageReduction() {
  let reduction = 0;
  if (skills.brustschutz) reduction += 1;
  if (skills.beinschutz) reduction += 2;
  return reduction;
}

// Sprites live in a "gegner" folder next to this file, named after the
// enemy's (or the player's) German display name, e.g. gegner/Virus.png.
// If no matching image is found, the existing emoji/colour look is used.
function applySprite(cell, spriteName, fallbackEmoji) {
  const img = document.createElement("img");
  img.className = "sprite";
  img.src = `gegner/${spriteName}.png`;
  img.alt = spriteName;
  img.onerror = () => {
    img.remove();
    cell.textContent = fallbackEmoji;
  };
  cell.appendChild(img);
}

function startRound(isSectorStart) {
  if (!isSectorStart) {
    const regen = skills.manaregen ? 2 : 1;
    mana = Math.min(maxMana, mana + regen);
  }

  actionsLeft = getMaxActions();
  movesUsed = 0;
  activePower = false;
  activeDiagonal = false;
  round += 1;
}

function draw() {
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${player.size}, 1fr)`;

  for (let y = 0; y < player.size; y += 1) {
    for (let x = 0; x < player.size; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell floor";

      if (isWall(x, y)) {
        cell.className = "cell wall";
        applySprite(cell, "Wand", "🧱");
      } else if (player.x === x && player.y === y) {
        cell.className = "cell player";
        applySprite(cell, "Spieler", "🧍");
      } else if (goal.x === x && goal.y === y) {
        cell.className = "cell goal";
        applySprite(cell, "Ziel", "🏁");
      } else {
        const enemy = enemies.find((item) => item.x === x && item.y === y);

        if (enemy) {
          cell.className = `cell enemy ${enemy.className}`;
          applySprite(cell, enemy.name, enemy.emoji);

          const hp = document.createElement("span");
          hp.className = "enemy-hp";
          hp.textContent = `${enemy.hp}/${enemy.maxHp}`;
          cell.appendChild(hp);
        }
      }

      grid.appendChild(cell);
    }
  }

  updateCellFontSize();
  updateInterface();
}

function updateCellFontSize() {
  const gridWidth = grid.clientWidth || 620;
  const cols = player.size;
  const gap = 5;
  const padding = 16;
  const usableWidth = gridWidth - padding - gap * (cols - 1);
  const cellSize = usableWidth / cols;
  const fontSize = Math.max(12, Math.min(cellSize * 0.62, 34));

  grid.style.setProperty("--cell-font-size", `${fontSize}px`);
}

window.addEventListener("resize", () => {
  if (player) updateCellFontSize();
});

function updateInterface() {
  levelElement.textContent = level;
  skillPointsElement.textContent = skillPoints;
  roundLabelElement.textContent = `Runde ${round}`;

  const maxMoves = getMaxMoves();
  const movesRemaining = Math.max(0, Math.min(actionsLeft, maxMoves - movesUsed));
  movesElement.textContent = movesRemaining;
  attacksElement.textContent = actionsLeft;

  healthTextElement.textContent = `${health} / ${maxHealth}`;
  healthBarElement.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;

  manaTextElement.textContent = `${mana} / ${maxMana}`;
  manaBarElement.style.width = `${Math.max(0, (mana / maxMana) * 100)}%`;

  renderSkills();
}

function renderSkills() {
  skillTreeElement.innerHTML = "";

  skillDefinitions.forEach((skill) => {
    const unlocked = skills[skill.id];
    const available =
      !unlocked &&
      skillPoints >= skill.cost &&
      (!skill.requirement || skills[skill.requirement]);

    const card = document.createElement("button");
    card.className = `skill ${unlocked ? "active" : ""} ${!available && !unlocked ? "locked" : ""}`;
    card.disabled = !available;
    card.innerHTML = `
      <span class="skill-cost">${unlocked ? "FREI" : `${skill.cost} SP`}</span>
      <span class="skill-name">${skill.name}</span>
      <span class="skill-description">${skill.description}</span>
    `;

    card.addEventListener("click", () => unlockSkill(skill.id));
    skillTreeElement.appendChild(card);
  });
}

function unlockSkill(id) {
  const skill = skillDefinitions.find((item) => item.id === id);

  if (
    !skill ||
    skills[id] ||
    skillPoints < skill.cost ||
    (skill.requirement && !skills[skill.requirement])
  ) {
    return;
  }

  skills[id] = true;
  skillPoints -= skill.cost;

  if (id === "manamana") {
    maxMana = 10;
    mana = maxMana;
  }

  addLog(`${skill.name} wurde freigeschaltet.`);
  draw();
}

function movePlayer(dx, dy) {
  if (gameOver || actionsLeft <= 0) return;

  if (movesUsed >= getMaxMoves()) {
    addLog("Keine Bewegungen mehr übrig diese Runde.");
    return;
  }

  const nextX = player.x + dx;
  const nextY = player.y + dy;

  if (
    nextX < 0 ||
    nextY < 0 ||
    nextX >= player.size ||
    nextY >= player.size ||
    isWall(nextX, nextY) ||
    isOccupied(nextX, nextY)
  ) {
    addLog("Dieser Weg ist blockiert.");
    return;
  }

  player.x = nextX;
  player.y = nextY;
  actionsLeft -= 1;
  movesUsed += 1;

  if (samePosition(player, goal)) {
    level += 1;
    skillPoints += 1;
    gameMessageElement.textContent = "Sektor erfolgreich abgeschlossen.";
    addLog("Ziel erreicht. Ein Skillpunkt erhalten.");
    createLevel();
    return;
  }

  finishActionsIfNeeded();
  draw();
}

function attack() {
  if (gameOver || actionsLeft <= 0) return;

  let damage = randomRange(4, 10);

  if (activePower && skills.power) {
    damage += 3;
  }

  let directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  if (activeDiagonal && skills.diagonal) {
    directions = directions.concat([
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1]
    ]);
  }

  directions.forEach(([dx, dy]) => {
    const enemy = enemies.find(
      (item) => item.x === player.x + dx && item.y === player.y + dy
    );

    if (enemy) {
      const effectiveDamage = Math.max(0, damage - (enemy.damageReduction || 0));
      enemy.hp -= effectiveDamage;
      addLog(`${enemy.emoji} ${enemy.name} erleidet ${effectiveDamage} Schaden.`);
    }
  });

  enemies = enemies.filter((enemy) => {
    if (enemy.hp <= 0) {
      addLog(`${enemy.emoji} ${enemy.name} wurde besiegt.`);
      return false;
    }
    return true;
  });

  actionsLeft -= 1;
  activePower = false;
  activeDiagonal = false;

  finishActionsIfNeeded();
  draw();
}

function activatePower() {
  if (!skills.power) return;

  if (activePower) {
    activePower = false;
    addLog("Kraftschlag deaktiviert.");
    draw();
    return;
  }

  if (mana < 3) {
    addLog("Nicht genug Mana für Kraftschlag.");
    return;
  }

  mana -= 3;
  activePower = true;
  addLog("Kraftschlag vorbereitet (3 Mana verbraucht).");
  draw();
}

function activateDiagonal() {
  if (!skills.diagonal) return;

  if (activeDiagonal) {
    activeDiagonal = false;
    addLog("Winkelklinge deaktiviert.");
    draw();
    return;
  }

  if (mana < 2) {
    addLog("Nicht genug Mana für Winkelklinge.");
    return;
  }

  mana -= 2;
  activeDiagonal = true;
  addLog("Winkelklinge vorbereitet (2 Mana verbraucht).");
  draw();
}

function finishActionsIfNeeded() {
  if (actionsLeft <= 0) {
    enemyTurn();
  }
}

function enemyTurn() {
  if (gameOver) return;

  let shieldAvailable = skills.shield;

  // Phase 1: healers restore group health.
  const healers = enemies.filter((enemy) => enemy.isHealer);

  if (healers.length > 0) {
    const healAmount = healers.length * HEAL_AMOUNT_PER_HEALER;
    let healedAny = false;

    enemies.forEach((enemy) => {
      if (enemy.hp < enemy.maxHp) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmount);
        healedAny = true;
      }
    });

    if (healedAny) {
      addLog(`✚ Heiler heilen die Gruppe um ${healAmount} LP.`);
    }
  }

  // Phase 2: spawners create new viruses nearby.
  enemies
    .filter((enemy) => enemy.isSpawner)
    .forEach((spawner) => {
      if (enemies.length >= ENEMY_CAP) return;

      const adjacent = [
        { x: spawner.x + 1, y: spawner.y },
        { x: spawner.x - 1, y: spawner.y },
        { x: spawner.x, y: spawner.y + 1 },
        { x: spawner.x, y: spawner.y - 1 }
      ];

      const options = adjacent.filter(
        (position) =>
          position.x >= 0 &&
          position.y >= 0 &&
          position.x < player.size &&
          position.y < player.size &&
          !isWall(position.x, position.y) &&
          !isOccupied(position.x, position.y) &&
          !(position.x === player.x && position.y === player.y) &&
          !(position.x === goal.x && position.y === goal.y)
      );

      if (options.length > 0) {
        const spot = options[randomInt(options.length)];
        const spawned = createEnemy("virus", spot.x, spot.y);
        spawned.justSpawned = true;
        enemies.push(spawned);
        addLog("🕸️ Spawner erschafft einen neuen Virus.");
      }
    });

  // Phase 3: movement and attacks. An enemy only ever deals damage when a
  // move step would actually carry it onto the player's tile - standing
  // next to the player without being able to step onto them does nothing.
  enemies.forEach((enemy) => {
    if (gameOver || enemy.isSpawner) return;

    if (enemy.justSpawned) {
      enemy.justSpawned = false;
      return;
    }

    let hitPlayer = false;

    const startDistance = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);

    if (enemy.range > 0 && startDistance <= enemy.range) {
      const hits = enemy.attacksPerTurn || 1;
      const reduction = getPlayerDamageReduction();

      for (let i = 0; i < hits; i += 1) {
        if (gameOver) break;

        const dmg = Math.max(0, randomRange(enemy.dmgMin, enemy.dmgMax) - reduction);
        if (dmg <= 0) continue;

        if (shieldAvailable) {
          shieldAvailable = false;
          addLog(`${enemy.emoji} ${enemy.name} schiesst, aber dein Schild hält.`);
        } else {
          health -= dmg;
          hitPlayer = true;
          addLog(`${enemy.emoji} ${enemy.name} trifft dich aus der Distanz für ${dmg} Schaden.`);
        }
      }

      return;
    }

    for (let step = 0; step < enemy.moveSpeed; step += 1) {
      if (gameOver) break;

      const dx = Math.sign(player.x - enemy.x);
      const dy = Math.sign(player.y - enemy.y);
      const candidates = [];

      if (dx !== 0) candidates.push({ x: enemy.x + dx, y: enemy.y });
      if (dy !== 0) candidates.push({ x: enemy.x, y: enemy.y + dy });

      const attackCandidate = candidates.find(
        (position) => position.x === player.x && position.y === player.y
      );

      if (attackCandidate) {
        const hits = enemy.attacksPerTurn || 1;
        const reduction = getPlayerDamageReduction();

        for (let i = 0; i < hits; i += 1) {
          if (gameOver) break;

          const dmg = Math.max(0, randomRange(enemy.dmgMin, enemy.dmgMax) - reduction);
          if (dmg <= 0) continue;

          if (shieldAvailable) {
            shieldAvailable = false;
            addLog(`${enemy.emoji} ${enemy.name} greift an, aber dein Schild hält.`);
          } else {
            health -= dmg;
            hitPlayer = true;
            addLog(`${enemy.emoji} ${enemy.name} trifft dich für ${dmg} Schaden.`);
          }
        }

        break;
      }

      const next = candidates.find(
        (position) =>
          position.x >= 0 &&
          position.y >= 0 &&
          position.x < player.size &&
          position.y < player.size &&
          (enemy.passWalls || !isWall(position.x, position.y)) &&
          !isOccupiedByOther(position.x, position.y, enemy) &&
          !(position.x === player.x && position.y === player.y)
      );

      if (next) {
        enemy.x = next.x;
        enemy.y = next.y;
      } else {
        break;
      }
    }

    if (enemy.isTeleporter && !hitPlayer) {
      const spots = [];

      for (let y = 0; y < player.size; y += 1) {
        for (let x = 0; x < player.size; x += 1) {
          if (
            !isWall(x, y) &&
            !isOccupied(x, y) &&
            !(x === player.x && y === player.y) &&
            !(x === goal.x && y === goal.y)
          ) {
            spots.push({ x, y });
          }
        }
      }

      if (spots.length > 0) {
        const spot = spots[randomInt(spots.length)];
        enemy.x = spot.x;
        enemy.y = spot.y;
        addLog("🌀 Teleporter verschwindet und taucht anderswo wieder auf.");
      }
    }
  });

  enemies = enemies.filter((enemy) => enemy.hp > 0);

  if (health <= 0) {
    gameOver = true;
    gameMessageElement.textContent = "GAME OVER - Drücke R für einen Neustart.";
    addLog("Mission fehlgeschlagen.");
    draw();
    return;
  }

  startRound();
  addLog("Die Gegner haben gehandelt.");
  draw();
}

function restart() {
  level = 1;
  skillPoints = 0;
  round = 0;
  maxHealth = 10;
  health = maxHealth;
  maxMana = 5;
  mana = maxMana;
  gameOver = false;
  gameMessageElement.textContent = "";

  skills = {
    power: false,
    diagonal: false,
    mobility: false,
    shield: false,
    reserve: false,
    brustschutz: false,
    beinschutz: false,
    manaregen: false,
    manamana: false
  };

  eventLogElement.innerHTML = "";
  createLevel();
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "r") {
    restart();
    return;
  }

  if (gameOver) return;

  if (event.code === "Space") {
    event.preventDefault();
    attack();
    return;
  }

  if (key === "q") {
    activatePower();
    return;
  }

  if (key === "e") {
    activateDiagonal();
    return;
  }

  const movement = {
    arrowup: [0, -1],
    w: [0, -1],
    arrowdown: [0, 1],
    s: [0, 1],
    arrowleft: [-1, 0],
    a: [-1, 0],
    arrowright: [1, 0],
    d: [1, 0]
  };

  if (movement[key]) {
    movePlayer(...movement[key]);
  }
});

document.getElementById("helpButton").addEventListener("click", () => {
  helpDialog.showModal();
});

document.getElementById("closeHelpButton").addEventListener("click", () => {
  helpDialog.close();
});

document.getElementById("endTurnButton").addEventListener("click", () => {
  if (!gameOver) {
    actionsLeft = 0;
    enemyTurn();
  }
});

document.getElementById("restartButton").addEventListener("click", restart);

createLevel();
