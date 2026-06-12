/* ============================================================
   SHINOBI CLASH — game logic
   ============================================================ */

/* ---------- AUDIO (lightweight WebAudio synth, no files needed) ---------- */
const AudioFX = (() => {
  let ctx;
  function ensure(){
    if(!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function tone(freq, dur, type='sine', vol=0.2, glideTo=null){
    try{
      const c = ensure();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if(glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + dur);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    }catch(e){}
  }
  return {
    click: () => tone(440, 0.08, 'triangle', 0.15),
    select: () => tone(660, 0.1, 'sine', 0.15),
    clash: () => { tone(120, 0.25, 'sawtooth', 0.25); tone(80, 0.3, 'square', 0.15); },
    win: () => { tone(523,0.12,'triangle',0.2); setTimeout(()=>tone(659,0.12,'triangle',0.2),120); setTimeout(()=>tone(784,0.2,'triangle',0.25),240); },
    lose: () => { tone(300,0.3,'sawtooth',0.2,150); },
    jutsu: () => { tone(200,0.15,'sine',0.2,500); setTimeout(()=>tone(700,0.2,'sine',0.2),100); },
    heal: () => { tone(440,0.1,'sine',0.15,660); setTimeout(()=>tone(660,0.15,'sine',0.15,880),90); },
    gameStart: () => { tone(220,0.15,'triangle',0.2); setTimeout(()=>tone(330,0.15,'triangle',0.2),150); setTimeout(()=>tone(440,0.25,'triangle',0.25),300); }
  };
})();

/* ---------- CARD DATA ---------- */
/* element types: fire > wind > earth > lightning > water > fire (cycle, +6 bonus dmg if attacker beats defender) */
const ELEMENT_BEATS = {
  fire: 'wind',
  wind: 'earth',
  earth: 'lightning',
  lightning: 'water',
  water: 'fire'
};

const cards = [
  {
    name:"Deidara", element:"earth", rarity:"A", cost:3,
    attack:30, defense:20, power:45, image:"images/deidara.jpg",
    jutsu:{name:"C1 Explosion", desc:"Deals bonus damage equal to half your power.", type:"burst", value:0.5}
  },
  {
    name:"Gaara", element:"earth", rarity:"A", cost:3,
    attack:25, defense:40, power:35, image:"images/gaara.jpg",
    jutsu:{name:"Sand Shield", desc:"Heals you for 15 HP.", type:"heal", value:15}
  },
  {
    name:"Might Guy", element:"earth", rarity:"S", cost:5,
    attack:52, defense:38, power:55, image:"images/guy.jpg",
    jutsu:{name:"Eight Gates", desc:"Guarantees this card wins the clash.", type:"autowin", value:0}
  },
  {
    name:"Hashirama Senju", element:"earth", rarity:"S", cost:5,
    attack:42, defense:48, power:55, image:"images/hashirama.jpg",
    jutsu:{name:"Wood Style", desc:"Heals you for 20 HP.", type:"heal", value:20}
  },
  {
    name:"Hidan", element:"fire", rarity:"B", cost:3,
    attack:38, defense:18, power:40, image:"images/hidan.jpg",
    jutsu:{name:"Curse Ritual", desc:"Rival loses 12 HP regardless of clash result.", type:"poison", value:12}
  },
  {
    name:"Hinata Hyuga", element:"water", rarity:"B", cost:2,
    attack:24, defense:32, power:38, image:"images/hinata.jpg",
    jutsu:{name:"Gentle Fist", desc:"Negates all damage you would take this turn.", type:"shield", value:0}
  },
  {
    name:"Itachi Uchiha", element:"fire", rarity:"S", cost:4,
    attack:46, defense:30, power:58, image:"images/itachi.jpg",
    jutsu:{name:"Tsukuyomi", desc:"Rival's next card is revealed before you choose.", type:"scout", value:0}
  },
  {
    name:"Jiraiya", element:"water", rarity:"A", cost:4,
    attack:40, defense:32, power:48, image:"images/jiraiya.jpg",
    jutsu:{name:"Sage Mode", desc:"Heals you for 18 HP.", type:"heal", value:18}
  },
  {
    name:"Kakashi Hatake", element:"lightning", rarity:"S", cost:4,
    attack:44, defense:30, power:52, image:"images/kakashi.jpg",
    jutsu:{name:"Raikiri", desc:"Deals 18 extra damage to the rival.", type:"burst", value:18}
  },
  {
    name:"Kakuzu", element:"earth", rarity:"A", cost:4,
    attack:40, defense:42, power:46, image:"images/kakuzu.jpg",
    jutsu:{name:"Earth Grudge Fear", desc:"Drains 14 HP from the rival to heal you.", type:"drain", value:14}
  },
  {
    name:"Kisame Hoshigaki", element:"water", rarity:"A", cost:4,
    attack:42, defense:34, power:46, image:"images/kisame.jpg",
    jutsu:{name:"Water Shark Bomb", desc:"Deals bonus damage equal to half your power.", type:"burst", value:0.5}
  },
  {
    name:"Konan", element:"wind", rarity:"A", cost:3,
    attack:34, defense:24, power:44, image:"images/konan.jpg",
    jutsu:{name:"Paper Storm", desc:"Rival's next card is revealed before you choose.", type:"scout", value:0}
  },
  {
    name:"Madara Uchiha", element:"fire", rarity:"S", cost:5,
    attack:50, defense:35, power:60, image:"images/madara.jpg",
    jutsu:{name:"Susanoo", desc:"Deals 20 extra damage to the rival.", type:"burst", value:20}
  },
  {
    name:"Minato Namikaze", element:"lightning", rarity:"S", cost:5,
    attack:45, defense:25, power:50, image:"images/minato.jpg",
    jutsu:{name:"Flying Raijin", desc:"Guarantees this card wins the clash.", type:"autowin", value:0}
  },
  {
    name:"Naruto Uzumaki", element:"wind", rarity:"S", cost:4,
    attack:44, defense:32, power:52, image:"images/naruto.jpg",
    jutsu:{name:"Rasengan", desc:"Deals 16 extra damage to the rival.", type:"burst", value:16}
  },
  {
    name:"Neji Hyuga", element:"water", rarity:"B", cost:2,
    attack:28, defense:34, power:38, image:"images/neji.jpg",
    jutsu:{name:"Eight Trigrams", desc:"Negates all damage you would take this turn.", type:"shield", value:0}
  },
  {
    name:"Obito Uchiha", element:"fire", rarity:"A", cost:4,
    attack:40, defense:30, power:50, image:"images/obito.jpg",
    jutsu:{name:"Kamui", desc:"Negates all damage you would take this turn.", type:"shield", value:0}
  },
  {
    name:"Orochimaru", element:"earth", rarity:"A", cost:4,
    attack:38, defense:30, power:48, image:"images/orochimaru.jpg",
    jutsu:{name:"Cursed Seal", desc:"Drains 14 HP from the rival to heal you.", type:"drain", value:14}
  },
  {
    name:"Pain", element:"lightning", rarity:"S", cost:5,
    attack:48, defense:34, power:58, image:"images/pain.jpg",
    jutsu:{name:"Shinra Tensei", desc:"Deals 20 extra damage to the rival.", type:"burst", value:20}
  },
  {
    name:"Rock Lee", element:"wind", rarity:"B", cost:3,
    attack:36, defense:22, power:40, image:"images/rocklee.jpg",
    jutsu:{name:"Primary Lotus", desc:"Guarantees this card wins the clash.", type:"autowin", value:0}
  },
  {
    name:"Sasori", element:"earth", rarity:"B", cost:2,
    attack:35, defense:25, power:40, image:"images/sasori.jpg",
    jutsu:{name:"Poison Senbon", desc:"Rival loses 10 HP regardless of clash result.", type:"poison", value:10}
  },
  {
    name:"Sasuke Uchiha", element:"lightning", rarity:"S", cost:4,
    attack:48, defense:28, power:55, image:"images/sasuke.jpg",
    jutsu:{name:"Chidori", desc:"Deals 18 extra damage to the rival.", type:"burst", value:18}
  },
  {
    name:"Shikamaru Nara", element:"wind", rarity:"B", cost:2,
    attack:20, defense:35, power:40, image:"images/shikamaru.jpg",
    jutsu:{name:"Shadow Bind", desc:"Rival's next card is revealed before you choose.", type:"scout", value:0}
  },
  {
    name:"Tsunade", element:"earth", rarity:"S", cost:4,
    attack:40, defense:40, power:50, image:"images/tsunade.jpg",
    jutsu:{name:"Healing Jutsu", desc:"Heals you for 22 HP.", type:"heal", value:22}
  },
  {
    name:"Zetsu", element:"earth", rarity:"B", cost:3,
    attack:32, defense:28, power:42, image:"images/zetsu.jpg",
    jutsu:{name:"Spore Infection", desc:"Rival loses 10 HP regardless of clash result.", type:"poison", value:10}
  }
];

/* ---------- GAME STATE ---------- */
const MAX_HP = 100;
const MAX_CHAKRA = 10;

let playerHP, enemyHP;
let playerChakra, enemyChakra;
let playerHand, enemyHand;
let playerDeck, enemyDeck; // full pools to redraw from
let round;
let playerShielded = false;
let revealedEnemyCard = null; // for Shikamaru scout
let gameOver = false;

/* ---------- UTIL ---------- */
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function freshCard(deck){
  // pulls the next unique card from this player's shuffled deck, reshuffling if empty
  if(deck.length === 0){
    deck.push(...shuffle(cards));
  }
  return JSON.parse(JSON.stringify(deck.pop()));
}

function buildHand(deck, n=5){
  const hand = [];
  for(let i=0;i<n;i++) hand.push(freshCard(deck));
  return hand;
}

function logMsg(msg){
  const el = byId("logFeed");
  el.textContent = msg;
}

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

const NULL_EL = { textContent:"", innerHTML:"", className:"", style:{}, classList:{add(){},remove(){},contains(){return false;}}, appendChild(){}, getBoundingClientRect(){return {left:0,top:0,width:0,height:0};} };
function byId(id){ return document.getElementById(id) || NULL_EL; }

/* ---------- INIT / RESTART ---------- */
function initGame(){
  playerHP = MAX_HP;
  enemyHP = MAX_HP;
  playerChakra = MAX_CHAKRA;
  enemyChakra = MAX_CHAKRA;
  playerDeck = shuffle(cards);
  enemyDeck = shuffle(cards);
  playerHand = buildHand(playerDeck, 5);
  enemyHand = buildHand(enemyDeck, 5);
  round = 1;
  playerShielded = false;
  revealedEnemyCard = null;
  gameOver = false;

  updateHP();
  renderChakra();
  renderHand();
  updateTurnIndicator();
  byId("roundCounter").textContent = "Round " + round;
  byId("result").textContent = "Choose your card to attack";
  logMsg("");

  byId("playerCardPlayed").className = "battle-card empty";
  byId("playerCardPlayed").innerHTML = "Awaiting move";
  byId("enemyCardPlayed").className = "battle-card empty";
  byId("enemyCardPlayed").innerHTML = "Awaiting move";
}

function restartGame(){
  byId("endScreenBox").classList.remove("show");
  initGame();
}

/* ---------- RENDERING ---------- */
function renderChakra(){
  const pEl = byId("playerChakra");
  const eEl = byId("enemyChakra");
  pEl.innerHTML = "";
  eEl.innerHTML = "";
  for(let i=0;i<MAX_CHAKRA;i++){
    const p = document.createElement("div");
    p.className = "chakra-orb" + (i < playerChakra ? "" : " empty");
    pEl.appendChild(p);

    const e = document.createElement("div");
    e.className = "chakra-orb" + (i < enemyChakra ? "" : " empty");
    eEl.appendChild(e);
  }
}

function elementClass(elem){
  return "elem-" + elem;
}

function renderHand(){
  const hand = document.getElementById("playerHand");
  if(!hand) return;
  hand.innerHTML = "";

  playerHand.forEach((card, index) => {
    const div = document.createElement("div");
    const canAfford = card.cost <= playerChakra;
    div.className = "card rarity-" + card.rarity + (canAfford ? "" : " disabled");

    div.innerHTML = `
      <div class="rarity-badge ${card.rarity}">${card.rarity}</div>
      <img src="${card.image}" alt="${card.name}">
      <div class="c-name">${card.name}</div>
      <div class="c-stats">
        <span>ATK ${card.attack}</span>
        <span>DEF ${card.defense}</span>
        <span>PWR ${card.power}</span>
      </div>
      <div class="c-elem-cost">
        <span class="c-elem ${elementClass(card.element)}">${card.element}</span>
        <span class="c-cost">⚡${card.cost}</span>
      </div>
      <div class="c-jutsu-name">🔹 ${card.jutsu.name}</div>
    `;

    if(canAfford && !gameOver){
      div.onclick = () => playCard(index);
    }
    hand.appendChild(div);
  });
}

function updateHP(){
  const p = clamp(playerHP, 0, MAX_HP);
  const e = clamp(enemyHP, 0, MAX_HP);

  byId("playerHPBar").style.width = p + "%";
  byId("enemyHPBar").style.width = e + "%";

  byId("playerHPText").textContent = Math.max(playerHP,0);
  byId("enemyHPText").textContent = Math.max(enemyHP,0);
}

function updateTurnIndicator(text){
  byId("turnIndicator").textContent = text || "Your Turn";
}

/* floating damage numbers */
function spawnFloat(targetId, text, isHeal){
  const target = document.getElementById(targetId);
  if(!target) return;
  const rect = target.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "dmg-float " + (isHeal ? "heal" : "dmg");
  f.textContent = text;
  f.style.left = (rect.left + rect.width/2 - 20) + "px";
  f.style.top = (rect.top + window.scrollY - 10) + "px";
  document.body.appendChild(f);
  setTimeout(()=>f.remove(), 1000);
}

function shakeScreen(){
  document.body.classList.add("shake");
  setTimeout(()=>document.body.classList.remove("shake"), 350);
}

/* ---------- ENEMY AI ---------- */
/* Enemy picks the card that maximizes (its total + elemental bonus vs a guessed player card)
   while respecting chakra cost. Adds slight randomness so it's not perfectly predictable. */
function enemyChooseCard(){
  const affordable = enemyHand
    .map((c,i)=>({c,i}))
    .filter(o => o.c.cost <= enemyChakra);

  const pool = affordable.length ? affordable : enemyHand.map((c,i)=>({c,i}));

  // score each card: total stats + small bonus if it can exploit common player elements
  let best = pool[0];
  let bestScore = -Infinity;
  pool.forEach(o => {
    const total = o.c.attack + o.c.defense + o.c.power;
    const jutsuBonus = (o.c.jutsu.type === 'autowin') ? 25 : (o.c.jutsu.type === 'burst' ? o.c.jutsu.value || o.c.jutsu.value*0 : 0);
    const score = total + jutsuBonus + (Math.random()*10 - 5);
    if(score > bestScore){
      bestScore = score;
      best = o;
    }
  });
  return best.i;
}

/* ---------- CORE TURN LOGIC ---------- */
function playCard(index){
  if(gameOver) return;
  if(playerHP <= 0 || enemyHP <= 0) return;

  const playerCard = playerHand[index];
  if(playerCard.cost > playerChakra) return;

  AudioFX.select();

  const enemyIndex = enemyChooseCard();
  const enemyCard = enemyHand[enemyIndex];

  // spend chakra
  playerChakra -= playerCard.cost;
  enemyChakra -= enemyCard.cost;

  let playerTotal = playerCard.attack + playerCard.defense + playerCard.power;
  let enemyTotal = enemyCard.attack + enemyCard.defense + enemyCard.power;

  // elemental advantage: +6 to attacker's total if their element beats opponent's
  let playerElemBonus = 0, enemyElemBonus = 0;
  if(ELEMENT_BEATS[playerCard.element] === enemyCard.element){ playerElemBonus = 6; playerTotal += 6; }
  if(ELEMENT_BEATS[enemyCard.element] === playerCard.element){ enemyElemBonus = 6; enemyTotal += 6; }

  // Jutsu pre-clash effects
  let preLog = [];
  let playerAutowin = false, enemyAutowin = false;
  let poisonToEnemy = 0, poisonToPlayer = 0;
  let healPlayer = 0, healEnemy = 0;
  let playerShieldActive = false, enemyShieldActive = false;
  let drainToPlayer = 0, drainToEnemy = 0; // extra dmg+heal from drain jutsu

  if(playerCard.jutsu.type === 'autowin'){ playerAutowin = true; preLog.push(`${playerCard.name} activates ${playerCard.jutsu.name}!`); }
  if(enemyCard.jutsu.type === 'autowin'){ enemyAutowin = true; preLog.push(`${enemyCard.name} activates ${enemyCard.jutsu.name}!`); }

  if(playerCard.jutsu.type === 'heal'){ healPlayer = playerCard.jutsu.value; preLog.push(`${playerCard.name} uses ${playerCard.jutsu.name}!`); }
  if(enemyCard.jutsu.type === 'heal'){ healEnemy = enemyCard.jutsu.value; preLog.push(`${enemyCard.name} uses ${enemyCard.jutsu.name}!`); }

  if(playerCard.jutsu.type === 'poison'){ poisonToEnemy = playerCard.jutsu.value; preLog.push(`${playerCard.name} uses ${playerCard.jutsu.name}!`); }
  if(enemyCard.jutsu.type === 'poison'){ poisonToPlayer = enemyCard.jutsu.value; preLog.push(`${enemyCard.name} uses ${enemyCard.jutsu.name}!`); }

  if(playerCard.jutsu.type === 'shield'){ playerShieldActive = true; preLog.push(`${playerCard.name} activates ${playerCard.jutsu.name}!`); }
  if(enemyCard.jutsu.type === 'shield'){ enemyShieldActive = true; preLog.push(`${enemyCard.name} activates ${enemyCard.jutsu.name}!`); }

  if(playerCard.jutsu.type === 'drain'){ drainToEnemy = playerCard.jutsu.value; preLog.push(`${playerCard.name} uses ${playerCard.jutsu.name}!`); }
  if(enemyCard.jutsu.type === 'drain'){ drainToPlayer = enemyCard.jutsu.value; preLog.push(`${enemyCard.name} uses ${enemyCard.jutsu.name}!`); }

  if(playerCard.jutsu.type === 'burst'){
    let bonus = playerCard.jutsu.value;
    if(playerCard.jutsu.name === "C1 Explosion") bonus = Math.round(playerCard.power * 0.5);
    preLog.push(`${playerCard.name} unleashes ${playerCard.jutsu.name}! (+${bonus} dmg if it wins)`);
    playerCard._burstBonus = bonus;
  }
  if(enemyCard.jutsu.type === 'burst'){
    let bonus = enemyCard.jutsu.value;
    if(enemyCard.jutsu.name === "C1 Explosion") bonus = Math.round(enemyCard.power * 0.5);
    preLog.push(`${enemyCard.name} unleashes ${enemyCard.jutsu.name}! (+${bonus} dmg if it wins)`);
    enemyCard._burstBonus = bonus;
  }

  // determine clash winner
  let result = "";
  let winnerSide = null; // 'player' | 'enemy' | 'tie'

  if(playerAutowin && !enemyAutowin) winnerSide = 'player';
  else if(enemyAutowin && !playerAutowin) winnerSide = 'enemy';
  else if(playerTotal > enemyTotal) winnerSide = 'player';
  else if(enemyTotal > playerTotal) winnerSide = 'enemy';
  else winnerSide = 'tie';

  let dmgToEnemy = 0, dmgToPlayer = 0;

  if(winnerSide === 'player'){
    dmgToEnemy = playerTotal - enemyTotal;
    if(playerAutowin) dmgToEnemy = Math.max(dmgToEnemy, 5);
    if(playerCard._burstBonus) dmgToEnemy += playerCard._burstBonus;
    result = `${playerCard.name} overpowers ${enemyCard.name}! ${dmgToEnemy} damage dealt.`;
  } else if(winnerSide === 'enemy'){
    dmgToPlayer = enemyTotal - playerTotal;
    if(enemyAutowin) dmgToPlayer = Math.max(dmgToPlayer, 5);
    if(enemyCard._burstBonus) dmgToPlayer += enemyCard._burstBonus;
    result = `${enemyCard.name} overpowers ${playerCard.name}! ${dmgToPlayer} damage dealt.`;
  } else {
    result = "Clash of equals — both jutsu cancel out!";
  }

  // shields negate incoming damage
  if(playerShieldActive){ dmgToPlayer = 0; }
  if(enemyShieldActive){ dmgToEnemy = 0; }

  // apply poison/drain regardless of clash
  dmgToEnemy += poisonToEnemy + drainToEnemy;
  dmgToPlayer += poisonToPlayer + drainToPlayer;

  // apply
  enemyHP -= dmgToEnemy;
  playerHP -= dmgToPlayer;
  playerHP = Math.min(MAX_HP, playerHP + healPlayer + drainToEnemy);
  enemyHP = Math.min(MAX_HP, enemyHP + healEnemy + drainToPlayer);

  // sound + screen effects
  if(dmgToEnemy > 0 || dmgToPlayer > 0) { AudioFX.clash(); shakeScreen(); }
  if(playerCard.jutsu.type !== 'normal' && (playerAutowin || playerCard.jutsu.type==='burst' || playerShieldActive || playerCard.jutsu.type==='poison')) AudioFX.jutsu();
  if(healPlayer > 0 || healEnemy > 0) AudioFX.heal();

  // render battle cards
  renderBattleCard("playerCardPlayed", playerCard, playerTotal, playerElemBonus, winnerSide === 'player' ? 'win' : (winnerSide==='enemy' ? 'lose' : null));
  renderBattleCard("enemyCardPlayed", enemyCard, enemyTotal, enemyElemBonus, winnerSide === 'enemy' ? 'win' : (winnerSide==='player' ? 'lose' : null));

  // floating numbers
  if(dmgToEnemy > 0) spawnFloat("enemyCardPlayed", "-" + dmgToEnemy, false);
  if(dmgToPlayer > 0) spawnFloat("playerCardPlayed", "-" + dmgToPlayer, false);
  if(healPlayer > 0) spawnFloat("playerCardPlayed", "+" + healPlayer, true);
  if(healEnemy > 0) spawnFloat("enemyCardPlayed", "+" + healEnemy, true);

  byId("result").textContent = result;
  logMsg(preLog.join("  ·  "));

  updateHP();

  // remove played cards, draw replacements
  playerHand.splice(index,1,freshCard(playerDeck));
  enemyHand.splice(enemyIndex,1,freshCard(enemyDeck));

  // chakra regen for next round
  round++;
  byId("roundCounter").textContent = "Round " + round;
  setTimeout(()=>{
    playerChakra = Math.min(MAX_CHAKRA, playerChakra + 3);
    enemyChakra = Math.min(MAX_CHAKRA, enemyChakra + 3);
    renderChakra();
    renderHand();
    updateTurnIndicator("Your Turn");

    // If neither side can afford ANY card in hand, settle the match by remaining HP
    const playerCanPlay = playerHand.some(c => c.cost <= playerChakra);
    const enemyCanPlay = enemyHand.some(c => c.cost <= enemyChakra);

    if(!gameOver && !playerCanPlay && !enemyCanPlay){
      gameOver = true;
      setTimeout(()=>{
        if(playerHP > enemyHP) endGame("VICTORY", "Out of chakra — you win on remaining HP!");
        else if(enemyHP > playerHP) endGame("DEFEAT", "Out of chakra — your rival wins on remaining HP!");
        else endGame("DRAW", "Out of chakra — HP tied!");
      }, 400);
    }
  }, 700);

  // check end
  if(playerHP <= 0 || enemyHP <= 0){
    gameOver = true;
    setTimeout(()=>{
      if(playerHP <= 0 && enemyHP <= 0) endGame("DRAW", "Both shinobi fall together.");
      else if(playerHP <= 0) endGame("DEFEAT", "Your chakra has run out.");
      else endGame("VICTORY", "Your rival has been defeated!");
    }, 900);
  }
}

function renderBattleCard(elId, card, total, elemBonus, status){
  const el = document.getElementById(elId);
  if(!el) return;
  el.className = "battle-card";
  if(status === 'win') el.classList.add("bc-winner");
  if(status === 'lose') el.classList.add("bc-loser");

  el.innerHTML = `
    <img src="${card.image}" alt="${card.name}">
    <div class="bc-name">${card.name}</div>
    <div class="bc-total">${total}</div>
    <div class="bc-elem">${card.element}${elemBonus ? " +"+elemBonus+" adv" : ""}</div>
    <div class="bc-jutsu">${card.jutsu.name}</div>
  `;
}

/* ---------- END GAME ---------- */
function endGame(title, sub){
  const screen = byId("endScreenBox");
  const titleEl = byId("endText");
  const subEl = byId("endSub");

  if(!screen || !titleEl){
    logMsg(title + " — " + sub);
    return;
  }

  titleEl.textContent = title === "VICTORY" ? "YOU WIN 🏆" : title === "DEFEAT" ? "YOU LOSE 💀" : "DRAW";
  if(subEl) subEl.textContent = sub;

  titleEl.classList.remove("winText","loseText");
  if(title === "VICTORY"){ titleEl.classList.add("winText"); AudioFX.win(); }
  else if(title === "DEFEAT"){ titleEl.classList.add("loseText"); AudioFX.lose(); }

  screen.classList.add("show");
}

/* ---------- CARD GALLERY ---------- */
function renderGallery(){
  const grid = document.getElementById("galleryGrid");
  if(!grid) return;
  grid.innerHTML = "";

  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "gallery-card rarity-" + card.rarity;
    div.innerHTML = `
      <div class="rarity-badge ${card.rarity}">${card.rarity}</div>
      <img src="${card.image}" alt="${card.name}">
      <div class="g-name">${card.name}</div>
      <div class="g-stats">
        <span>ATK ${card.attack}</span>
        <span>DEF ${card.defense}</span>
        <span>PWR ${card.power}</span>
      </div>
      <div class="g-elem-cost">
        <span class="c-elem ${elementClass(card.element)}">${card.element}</span>
        <span class="c-cost">⚡${card.cost}</span>
      </div>
      <div class="g-jutsu">${card.jutsu.name}: ${card.jutsu.desc}</div>
    `;
    grid.appendChild(div);
  });
}

/* ---------- STARTUP ---------- */
function bootGame(){
  const startBtn = document.getElementById("startBtn");
  const titleScreen = document.getElementById("titleScreen");
  const howToPlayBtn = document.getElementById("howToPlayBtn");
  const closeHowToPlayBtn = document.getElementById("closeHowToPlayBtn");
  const howToPlayScreen = document.getElementById("howToPlayScreen");
  const cardGalleryBtn = document.getElementById("cardGalleryBtn");
  const closeGalleryBtn = document.getElementById("closeGalleryBtn");
  const cardGalleryScreen = document.getElementById("cardGalleryScreen");
  const exitBtn = document.getElementById("exitBtn");

  if(startBtn && titleScreen){
    startBtn.addEventListener("click", () => {
      AudioFX.gameStart();
      titleScreen.classList.remove("show");
      titleScreen.style.display = "none";
      initGame();
    });

    // show title screen on load, prep state underneath
    initGame();
    titleScreen.classList.add("show");
    titleScreen.style.display = "flex";
  } else {
    // no title screen in this HTML — start the game immediately
    initGame();
  }

  if(howToPlayBtn && howToPlayScreen){
    howToPlayBtn.addEventListener("click", () => {
      AudioFX.click();
      howToPlayScreen.classList.add("show");
      howToPlayScreen.style.display = "flex";
    });
  }
  if(closeHowToPlayBtn && howToPlayScreen){
    closeHowToPlayBtn.addEventListener("click", () => {
      AudioFX.click();
      howToPlayScreen.classList.remove("show");
      howToPlayScreen.style.display = "none";
    });
  }

  if(cardGalleryBtn && cardGalleryScreen){
    cardGalleryBtn.addEventListener("click", () => {
      AudioFX.click();
      renderGallery();
      cardGalleryScreen.classList.add("show");
      cardGalleryScreen.style.display = "flex";
    });
  }
  if(closeGalleryBtn && cardGalleryScreen){
    closeGalleryBtn.addEventListener("click", () => {
      AudioFX.click();
      cardGalleryScreen.classList.remove("show");
      cardGalleryScreen.style.display = "none";
    });
  }

  if(exitBtn){
    exitBtn.addEventListener("click", () => {
      AudioFX.click();
      // attempt to close the tab/app; fall back to returning to title with a message
      window.close();
      setTimeout(() => {
        byId("result").textContent = "You can close this tab to exit.";
      }, 300);
    });
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", bootGame);
} else {
  bootGame();
}
