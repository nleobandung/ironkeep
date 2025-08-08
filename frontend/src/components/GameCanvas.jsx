// src/components/GameCanvas.jsx
import React, { useRef, useEffect, useState } from "react";
import { waypoints } from './Waypoints.jsx';
import { placementSelectData } from './PlacementData.jsx';
import { findArrowIndex } from './ArrowAngles.jsx';
import { Coin, Heart, Skull } from './Icons';
import Progress from "./Progress.jsx"

// CANVAS MUST BE 768X512 FOR MAP SIZE
const MAP_WIDTH = 24; // 24 tiles wide
const MAP_HEIGHT = 16; // 16 tiles tall
const PLACEMENT_TILE_NUM = 73; // I didn't decide this, Tiled did ask the devs, look at PlacementSelect.jsx for context
const TILE_SIZE = 32;
const ENEMY_MAX_HEALTH = 50;
const TOWER_DAMAGE = 10 ;
const USER_MAX_HEALTH = 10;
const USER_START_COINS = 100;
const TOWER_COST = 50;
const ENEMY_BOUNTY = 10;
const REF_HZ = 180;

export default function GameCanvas({ username }) {

  const canvasRef = useRef(null);
  const [gameOver, setGameOver] = useState(false);
  const [userHealth, setUserHealth] = useState(USER_MAX_HEALTH);
  const [userCoins, setUserCoins] = useState(USER_START_COINS);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const [frameRateRatio, setFrameRateRatio] = useState(1);
  const frameRateRatioRef = useRef(1); // VERY IMPORTANT VARIABLE. SETS SPEED DEPENDING ON REFRESH RATE
  const [wave, setWave] = useState(0);
  const waveRef = useRef(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const wasmHealth = {
    scale_health: (wave) => {console.warn("WASM not loaded, fallback"); return 60 + Math.max(0, 10 * (wave - 5));},
  };

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  const imageLoaded = useRef(false); // ref to see if background img loaded.

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    fetch("/release.wasm")
      .then((res) => res.arrayBuffer())
      .then((bytes) => WebAssembly.instantiate(bytes))
      .then((result) => {
        wasmHealth.scale_health = result.instance.exports.scale_health;
        console.log("WASM + Assembly module loaded successfully! Wave 7: ", wasmHealth.scale_health(7));
      })
      .catch((err) => console.error("Failed to load WASM + Assembly:", err));
  }, []);

  // === FRAMERATE CHECKER === // 
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    const checkFPS = () => {
      const now = performance.now();
      frameCount++;

      if (now - lastTime >= 1000) {
        const fps = frameCount;
        const ratio = REF_HZ / fps;
        setFrameRateRatio(ratio);
        frameRateRatioRef.current = ratio;
        frameCount = 0;
        lastTime = now;
      }
      requestAnimationFrame(checkFPS);
    };

    requestAnimationFrame(checkFPS);
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d"); // ctx == "context"

    // This is GameMap resolution (24x16 map of 32x32 tiles)
    canvas.width = 768;
    canvas.height = 512;

    // ctx.fillStyle = "white";
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    const arrowImages = [];
    const enemies = [];
    let currTile = undefined;
    const towers = [];
    let numEnemies = 2;
    const placementSelectData2D = [];
    const placementTiles = [];
    const deathSplats = [];


    const image = new Image();
    image.onload = () => {
      imageLoaded.current = true;
      const waitForStart = setInterval(() => {
        if (startedRef.current) {
          clearInterval(waitForStart);
          animate();
        }
      }, 100);
    };
    image.src = 'assets/GameMap.png';

    // asset guy named them backwards imo, so pushing 0 deg to 90 degrees order.
    for (let i = 13; i >= 2; i--) {
      const img = new Image();
      img.src = `assets/Arrow/${i}.png`;
      arrowImages.push(img);
    }
    
    const slimeImage = new Image();
    slimeImage.src = 'assets/Slime/D_Walk.png';
    const slimeDeathImage = new Image();
    slimeDeathImage.src = 'assets/Slime/D_Death.png';
    const archerTowerImage = new Image();
    archerTowerImage.src = 'assets/ArcherTower/Idle/3.png';
    const archerIdleImage = new Image();
    archerIdleImage.src = 'assets/ArcherTower/Units/2/S_Idle.png'; // 4 frame idle

    const archerAttackImage = new Image(); 
    archerAttackImage.src = 'assets/ArcherTower/Units/2/S_Attack.png'; 
    // BEGIN ARCHER ANIMATION ROTATION
    // 6 frame attack animation
    const archerAttackDownImage = new Image();
    archerAttackDownImage.src = 'assets/ArcherTower/Units/2/D_Attack.png';
    const archerAttackUpImage = new Image();
    archerAttackUpImage.src = 'assets/ArcherTower/Units/2/U_Attack.png';
    const archerAttackSideImage = new Image();
    archerAttackSideImage.src = 'assets/ArcherTower/Units/2/S_Attack.png';

    const slimeDamageSound = new Audio('/assets/Sounds/Slime damage.mp3');
    slimeDamageSound.volume = 0.3;
    const slimeDeathSound = new Audio('/assets/Sounds/Slime death.mp3');
    slimeDeathSound.volume = 0.3;
    const userDamageSound = new Audio('/assets/Sounds/User damage.ogg');
    userDamageSound.volume = 0.3;
    const gameOverSound = new Audio('/assets/Sounds/Game Over.ogg');
    gameOverSound.volume = 0.5;
    const buildingSound = new Audio('/assets/Sounds/building.ogg');
    buildingSound.volume = 0.5;


    // Converts placementSelectData to 2D array
    for (let i = 0; i < placementSelectData.length; i += MAP_WIDTH) {
      placementSelectData2D.push(placementSelectData.slice(i, i + MAP_WIDTH)); // slices every x tiles into a list.
    }

    class PlacementSelect {
      constructor({ position= { x:0, y:0 } } ) {
        this.position = position;
        this.size = TILE_SIZE;
        this.color = 'rgba(255, 255, 255, 0.2)';
        this.occupied = false; // prevents multiple towers ontop of each other
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.size, this.size)
      }

      update(mouse) {
        this.draw();

        if (mouse.x > this.position.x && mouse.x < this.position.x + this.size &&
          mouse.y > this.position.y && mouse.y < this.position.y + this.size
        ) {
          this.color = 'rgba(255, 255, 255, 0.5)'; // highlight
        } else {
          this.color = 'rgba(255, 255, 255, 0.2)'; // default
        }
      }
    }

    class Sprite {
      constructor( { image, frames = { max: 1, hold: 30}, scale = 1.5 } ) {
        this.image = image;
        this.rotation = 0;
        this.frames = {
          max: frames.max,
          current: 0,
          elapsed: 0,
          hold: frames.hold
        };
        this.scale = scale; // draw at 1.5x size
        this.flipHorizontal = false;
      }

      draw(position) {
        if (!this.image) return; // Wait until image is loaded
        ctx.imageSmoothingEnabled = false; // disables smoothing so scaled pixels remain sharp
        const cropWidth = this.image.width / this.frames.max;
        const cropHeight = this.image.height; // animations go horizontally, same height as stagnant
        const crop = {
          position: {
            x: cropWidth * this.frames.current,
            y: 0
          },
          width: cropWidth,
          height: cropHeight
        };

        const width = cropWidth * this.scale;
        const height = cropHeight * this.scale;

        ctx.save();
        if (this.flipHorizontal) { // Incase we need to mirror an asset.
          ctx.translate(position.x, position.y);
          ctx.scale(-1, 1);
          ctx.rotate(this.rotation || 0); // incase this.rotation property doesnt exist, default to 0
          ctx.translate(-position.x, -position.y);
          ctx.translate(position.x, position.y); // redo normal pivot
        } else {
          ctx.translate(position.x, position.y);
          ctx.rotate(this.rotation || 0);
        }

        ctx.drawImage(
          this.image,
          crop.position.x, crop.position.y,
          crop.width, crop.height,
          -width / 2, -height / 2,
          width, height
        );
        ctx.restore();

        // advance next frame
        this.frames.elapsed++;
        const scaledHold = Math.max(1, Math.floor(this.frames.hold / frameRateRatioRef.current));
        if (this.frames.elapsed % scaledHold === 0) { // frame hold
          this.frames.current++;
          if(this.frames.current >= this.frames.max) this.frames.current = 0;
        }
        
      }
    }

    class Enemy extends Sprite {
      constructor({ position = { x: 0, y: 0 } }) {
        super({
          image: slimeImage, 
          frames: { max: 6, hold: 30 }
        });
        this.position = position;
        this.width = 50;
        this.height = 50;
        this.waypointIdx = 0;
        // center image drawn, default is hooked to top left corner
        this.center = {
          x: this.position.x + this.width / 2,
          y: this.position.y + this.height / 2
        };
        this.radius = 25;
        this.maxHealth = wasmHealth.scale_health(waveRef.current);
        this.health = this.maxHealth;
        this.velocity = {
          x: 0,
          y: 0
        }
      }

      draw() {
        super.draw(this.center);

        const healthRatio = this.health / this.maxHealth;
        const barWidth = this.width;
        const barX = this.position.x;
        const barY = this.position.y - 10;

        // health
        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth , 7)
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth  * healthRatio , 7)

      }

      update() {
        this.draw();

        const waypoint = waypoints[this.waypointIdx]; // use waypoints algorithm to determine enemy pathing
        const yDistance = waypoint.y - this.center.y;
        const xDistance = waypoint.x - this.center.x;
        const angle = Math.atan2(yDistance, xDistance);
        // Angle determines velocity.
        const speedAmp = 0.6 * frameRateRatioRef.current; // speed amplifier, default 1
        this.velocity.x = Math.cos(angle) * speedAmp;
        this.velocity.y = Math.sin(angle) * speedAmp;
        this.position.x += this.velocity.x 
        this.position.y += this.velocity.y 
        this.center = {
          x: this.position.x + this.width / 2,
          y: this.position.y + this.height / 2
        }

        // Use Math.round for easier debug
        // Since can speed up enemies, must clamp position to waypoint within amplitude adjustment
        if (
          Math.abs(Math.round(this.center.x) - Math.round(waypoint.x)) < Math.abs(this.velocity.x)  &&
          Math.abs(Math.round(this.center.y) - Math.round(waypoint.y)) < Math.abs(this.velocity.y) &&
          this.waypointIdx < waypoints.length - 1) 
          {
          this.waypointIdx++;
        }
      }
    }

    class Tower extends Sprite {
      constructor( { position = { x:0, y:0 } } ) {
        super( { 
          image: archerTowerImage,
          frames: { max: 4, hold: 40 } ,
          scale: 1
        } );
        this.position = position;
        this.width = TILE_SIZE * 2;
        this.height = TILE_SIZE * 2;
        this.center = {
          x: this.position.x + this.width/2,
          y: this.position.y + this.height/2
        };
        this.projectiles = [];
        this.radius = 150;
        this.target; // decide later in range detection
        this.frameCount = 0;
        this._prevAttackFrame = 0;

        // small pixel adjustment: shift everything 2px left and 2px up
        this.drawOffset = { x: -4, y: -10 };
        this.archerOffsetY = this.drawOffset.y - 16; // Will want to shift the archer position dynamically if add tower upgrade!

        this.idleSprite = new Sprite({
           image: archerIdleImage,
           frames: { max: 4, hold: 40 },
           scale: 1 
        });

        this.attackSprite = new Sprite({
           image: archerAttackSideImage,
           frames: { max: 6, hold: 23 }, 
           scale: 1 
        });

        this.attackAngle = 0;
        this.archerDirection = 'side';
        this.archerFlipped = false;

      }

      draw() {
        if (this.image) {
          // “bottom-left” of the footprint is at:
          const bx = this.position.x + this.drawOffset.x;
          const by = this.position.y + this.height + this.drawOffset.y;

          // sprite’s crop‐width & crop‐height (in world) are:
          const cropW = this.image.width / this.frames.max;
          const cropH = this.image.height;
          const drawW = cropW * this.scale;
          const drawH = cropH * this.scale;

          // must shift “bottom-left” into sprite center:
          const px = bx + drawW / 2;
          const py = by - drawH / 2;

          // draw tower sprite so its bottom-left lands on (bx,by):
          this.rotation = 0;
          super.draw({ x: px, y: py });
        }

        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(58, 58, 58, 0.2)';
        ctx.fill();

        const archerPos = { 
           x: this.center.x, 
           y: this.center.y + this.archerOffsetY 
         };
        // idle if no target in range
        if (!this.target) {
          this.idleSprite.rotation = 0;
          this.idleSprite.draw(archerPos);
        // if target in range, attack!!!
        } else {
          //console.log(this.target);
          if (this.archerDirection === 'down') {
            this.attackSprite.image = archerAttackDownImage;
          } else if (this.archerDirection === 'up') {
            this.attackSprite.image = archerAttackUpImage;
          } else if (this.archerDirection === 'left'){
            this.attackSprite.image = archerAttackSideImage;
            this.attackSprite.flipHorizontal = false;
          } else if (this.archerDirection === 'right'){
            this.attackSprite.image = archerAttackSideImage;
            this.attackSprite.flipHorizontal = true;
          }

          this.attackSprite.rotation = 0;
          this.attackSprite.draw(archerPos);
        }
      }

      update() {
        // Spawn arrow in timing with the attack animation!
        const prevFrame = this.attackSprite.frames.current; // remember what attackSprite.frame was last time
        this.draw(); // draw everything and advance attackSprite.frames.current;
        const currFrame = this.attackSprite.frames.current;
        if (this.target && prevFrame !== 5 && currFrame === 5) {
           // Spawn exactly once at the start of the 6th frame:

           // MUST DETERMINE ANGLE HERE, BEFORE LAUNCHING PROJECTILE
          const dx = this.target.center.x - this.center.x;
          const dy = this.target.center.y - (this.center.y + this.archerOffsetY);
          const angle = Math.atan2(dy, dx); // radians

          this.attackAngle = angle;

          // Determine animation direction
          const deg = angle * (180 / Math.PI); // convert to degrees

          if (deg >= 45 && deg <= 135) {
            this.archerDirection = 'down';
            this.archerFlipped = false;
          } else if (deg >= 135 || deg <= -135) {
            this.archerDirection = 'left';
            this.archerFlipped = false;
          } else if (deg >= -135 && deg <= -45) {
            this.archerDirection = 'up';
            this.archerFlipped = false;
          } else {
            this.archerDirection = 'right';
            this.archerFlipped = true;
          }


          this.projectiles.push(
            new Projectile({
              position: { x: this.center.x, y: this.center.y + this.archerOffsetY },
              enemy: this.target
            })
          );
        }

      }
    }

    class Projectile extends Sprite {
      constructor( { position = { x:0, y:0 }, enemy }) {
        super({ image: null, frames: { max: 1 }, scale: 1});
        this.position = position;
        this.velocity = {
          x: 0,
          y: 0
        };
        this.enemy = enemy;
        this.radius = 5;
        this.angle = 0;
      }

      // draw() now pertains to Sprite class we inherit

      update() {
        
        this.angle = Math.atan2(this.enemy.center.y - this.position.y, 
        this.enemy.center.x - this.position.x); // grab angle to travel towards enemy
        //console.log(this.angle);
        const speedAmp = 1.8 * frameRateRatioRef.current; // speed amplifier to make faster than enemy
        //console.log(frameRateRatioRef.current);
        this.velocity.x = Math.cos(this.angle) * speedAmp; 
        this.velocity.y = Math.sin(this.angle) * speedAmp;
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Find which of the 12 “0°→90° bins” this.angle falls into, and how much to rotate:
        const { index, rotation } = findArrowIndex(this.angle);
        this.image = arrowImages[index];
        this.rotation = rotation;
        //console.log(this.angle);
        super.draw(this.position);
      }
    }


 
    placementSelectData2D.forEach((row, y) => {
      row.forEach((num, x) => {
        if (num === PLACEMENT_TILE_NUM) {
          // add tower placement tile
          placementTiles.push(new PlacementSelect({
            position: {
              x: x * TILE_SIZE,
              y: y * TILE_SIZE
            }
          }))
        }
      })
    });

    // wave spawn functionality
    function spawnWave(enemyCount) {
      waveRef.current += 1;
      setWave(waveRef.current);
      console.log(waveRef.current);
      const currentWave = waveRef.current ?? 1; // fallback if undefined
      fetch(`/api/gameProgress/updateProgress/${username}/${currentWave}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update progress');
        return res.json();
      })
      .then(data => {
        console.log("Wave progress uploaded:", data);
      })
      .catch(err => {
        console.error("Progress update error:", err);
      });

      for (let i = 1; i < enemyCount+1; i++) {
        const xOffset = i * 75;
        enemies.push(new Enemy({
          position: {x : waypoints[0].x - xOffset, y: waypoints[0].y}
        }));
      }
    }
    
    
    // ===========  ANIMATION =========== //

    function animate() {
      const animationId = requestAnimationFrame(animate);

      ctx.drawImage(image, 0 , 0); // draws game canvas 
      // loop from back, since later splicing can cause rendering bug
      for (let i = enemies.length - 1; i >=0; i--) {
        const enemy = enemies[i];
        enemy.update();
        if (enemy.position.x > canvas.width) {
          // DON'T CLAMP DAMAGE TAKEN. If we clamp, may keep triggering game over on every enemy exit (Likely not wanted)
          setUserHealth((prev) => {
            const newHealth = prev - 1;
            userDamageSound.currentTime = 0;
            userDamageSound.play();
            if (newHealth <= 0) {
              setGameOver(true);
              gameOverSound.currentTime = 0;
              gameOverSound.play();
              cancelAnimationFrame(animationId);
            }
            return newHealth;
          });
          enemies.splice(i, 1); //splice after taking damage
        }
      }

      // render slime death animations
      for (let i = deathSplats.length - 1; i >= 0; i--) {
        const splat = deathSplats[i];

        splat.draw();

        if (splat.frames.current >= splat.frames.max - 1) {
          deathSplats.splice(i, 1); // clean up finished death anim
        }
      }

      // track total amt enemies
      if (enemies.length === 0) {
        spawnWave(numEnemies);
        numEnemies += 2;
      }

      placementTiles.forEach(tile => {
        tile.update(mouse);
      })

      towers.forEach(tower => {
        tower.update();
        tower.target = null;
        const possibleTargets = enemies.filter(enemy => {
          const xOffset = enemy.center.x  - tower.center.x;
          const yOffset = enemy.center.y  - tower.center.y
          const dist = Math.hypot(xOffset, yOffset);
          return (dist < enemy.radius + tower.radius);
        })
        tower.target = possibleTargets[0]; // very common to set targeting to front most enemy in range.
        // console.log(possibleTargets);
      });

      // WE SPLIT THESE UP SO THE PROJECTILES DRAW ONTOP OF THE TOWER, ALWAYS.
      towers.forEach(tower => {
        for (let i = tower.projectiles.length - 1; i >= 0; i--) {
          const projectile = tower.projectiles[i];
          projectile.update()

          // collision detection between enemy and projectile
          const xOffset = projectile.enemy.center.x  - projectile.position.x;
          const yOffset = projectile.enemy.center.y  - projectile.position.y
          const dist = Math.hypot(xOffset, yOffset);
          // when projectile hits enemy:
          if (dist < projectile.enemy.radius + projectile.radius) { 
            projectile.enemy.health -= TOWER_DAMAGE;
            if (projectile.enemy.health == 0) {
              slimeDeathSound.currentTime = 0;  
              slimeDeathSound.play();
            } else if ( projectile.enemy.health > 0){
              slimeDamageSound.currentTime = 0;  // rewind if playing rapidly
              slimeDamageSound.play();
            } // else play no sound
            
            if (projectile.enemy.health <= 0) {
              const enemyIdx = enemies.findIndex((enemy) => {
                return projectile.enemy === enemy;
              })


              // clamp index find if not found
              if (enemyIdx > -1) {
                deathSplats.push(
                  new Sprite({
                    image: slimeDeathImage,
                    frames: { max: 6, hold: 20 },
                    scale: 1.5
                  })
                );

                // Assign enemy center to splat (must do after push to access last element)
                deathSplats[deathSplats.length - 1].draw = (function(originalDraw) {
                  const center = { ...projectile.enemy.center };
                  return function(_) {
                    originalDraw.call(this, center);
                  };
                })(deathSplats[deathSplats.length - 1].draw);

                enemies.splice(enemyIdx, 1); // splice enemy on death
                setUserCoins(prevCoins => prevCoins + ENEMY_BOUNTY);
              }   
            }

            tower.projectiles.splice(i, 1) // splice projectile on collide.
          }
        }
      });

      
    }


    const mouse = {
      x: undefined,
      y: undefined
    };
    // THIS FUNCTION RECALCULATES WINDOW X/Y TO CANVAS WIDTH/HEIGHT
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();

      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      mouse.x = (rawX * (canvas.width  / rect.width));
      mouse.y = (rawY * (canvas.height / rect.height));

      currTile = null;
      for (let i = 0; i < placementTiles.length; i++) {
        const tile = placementTiles[i];
        if (mouse.x > tile.position.x && mouse.x < tile.position.x + tile.size &&
          mouse.y > tile.position.y && mouse.y < tile.position.y + tile.size) 
          {
            currTile = tile;
            break;
          }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    canvas.addEventListener('click', (event) => {
      if (currTile && !currTile.occupied) {
        setUserCoins(prevCoins => {
          if (prevCoins >= TOWER_COST) {
            towers.push(
              new Tower({
                position: {
                  x: currTile.position.x,
                  y: currTile.position.y
                }
              })
            );
            buildingSound.currentTime = 0;
            buildingSound.play();
            currTile.occupied = true;
            // Canvas API works by placing whatever is drawn most recently is whats on top. Must sort by y pos to get correct draw order.
            towers.sort((a,b) => {
              return a.position.y - b.position.y 
            })
            return prevCoins - TOWER_COST;
          }
          return prevCoins; // don't change if not enough coins
        });
      }
    });

  }, []); 

  // GameCanvas html styling
  return (
    // center canvas-wrapper in window
    <div
      style={{
        width: "100vw",
        background: "#222",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "32px", // optional spacing above canvas
        paddingBottom: "32px", // optional spacing below
      }}
    >
      {!isOnline && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#ffcccc",
          color: "#700",
          padding: "10px 20px",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          zIndex: 1000,
          fontWeight: "bold"
        }}>
          You're offline — some features may be limited.
        </div>
      )}
      <div
        className="canvas-wrapper"
        style={{
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          className="game-canvas"
          // style={{
          //   width: "100%",
          //   height: "100%",
          //   imageRendering: "pixelated",
          //   display: "block",
          // }}
        />

        
        <div className="health-overlay">
          {/* Coin SVG from SVGREPO */}
          <Coin />
          <span className="coin-text">{userCoins}</span>

          {/* Heart SVG from HEROICONS.COM */}
          <Heart />
          <span className="health-text">{userHealth}</span>
        </div>

        <div className="wave-overlay">
          {/*Skull SVG Icon */}
          <Skull />
          <span className="wave-text">Wave: {wave}</span>
        </div>

        {/* Game-over overlay (shown only when gameOver is true) */}
        {gameOver && (
          <div className="game-over-overlay"
          role="alertdialog"
          aria-labelledby="game-over-title"
          aria-describedby="game-over-desc">
            <div style={{ textAlign: 'center' }}>
              <span id="game-over-title" className="game-over-text">Game Over</span>
              <br />
              <button id="game-over-desc" className="restart-button" onClick={() => window.location.reload()}>
                Restart Game
              </button>
              <Progress/>
            </div>
          </div>
        )}

        {/* Start game overlay */}
        {!started && (
          <div className="start-overlay" role="dialog" aria-labelledby="start-button">
            <div className="start-content">
              <button id="start-button" className="start-button" onClick={() => setStarted(true)}>
                Start Game
              </button>
              <div className="tutorial-box">
                <div className="tutorial-item">
                  <span><Coin />: This is your money!</span>
                </div>
                <div className="tutorial-item">
                  <span><Heart />: These are your lives! Don't let it hit 0 <Heart />. If it does, Game Over!</span>
                </div>
                <div className="tutorial-item">
                  <span><Skull />: This is what wave you're on! As this number increases, the harder it gets to kill the enemies in that wave group!</span>
                </div>
                <div className="tutorial-item">
                  <img
                    src="assets/ArcherTower/Idle/3.png"
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "none",
                      objectPosition: "left",
                      imageRendering: "pixelated",
                      marginRight: "8px"
                    }}
                    alt="Archer Tower"
                  />
                  <span>This is your defense tower! Base cost: <strong>50</strong> <Coin /></span>
                </div>
                <div className="tutorial-item">
                  <img
                    src="assets/Slime/D_Walk.png"
                    style={{
                      width: "32px",
                      height: "32px",
                      objectFit: "none",
                      objectPosition: "left",
                      imageRendering: "pixelated",
                      marginRight: "8px"
                    }}
                    alt="Slime"
                  />
                  <span>These are the bad guys! Kill them to clear the wave.</span>
                </div>
              </div>
            </div>
          </div>

        )}
      </div>
    </div>
  );
}
