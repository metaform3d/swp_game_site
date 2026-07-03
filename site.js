/// <reference path="./phaser.d.ts" />
// @ts-check

/**
 * @param {any} condition 
 * @param {string} [message] 
 * @asserts condition
 */
function assert(condition, message = "assertion failed") {
    if (!condition) {
        throw new Error(message)
    }
}

/**
 * @template T
 * @param {T | null | undefined} object
 * @returns {T}
 */
function ensure(object, message = "onject invalid") {
    if (object === null || object === undefined) {
        throw new Error(message)
    }
    return object
}

class Random {
    /**
     * @returns {number}
     */
    static unit() {
        return Math.random()
    } 

    /**
     * @returns {number}
     */
    static centered() {
        return this.unit() * 2 - 1
    }

    /**
     * @param {number} lo
     * @param {number} hi
     * @returns {number}
     */
    static range(lo, hi) {
        return this.unit() * (hi - lo) + lo
    }

    /**
     * @param {number} lo
     * @param {number} hi
     * @returns {number}
     */
    static only(lo, hi) {
        return Math.trunc(this.unit() * (hi - lo + 1)) + lo
    }

    /**
     * @param {number} value
     * @param {number} range
     * @returns {number}
     */
    static spread(value, range) {
        return this.range(value - range, value + range)
    }

    /**
     * @param {number} trueFrac
     * @returns {boolean}
     */
    static boolean(trueFrac = 0.5) {
        return this.unit() < trueFrac
    }

    /**
     * @template T
     * @param {T[]} list
     * @returns {T}
     */
    static uniformElt(list) {
        return list[this.only(0, list.length - 1)]
    }

    /**
     * @template T
     * @param {T[]} list
     * @returns {T}
     */
    static biasedElt(list) {
        let a = Random.unit()
        let idx = Math.trunc(a * a * list.length)
        return list[idx]
    }
}

const Egg = {
    REST: 0,
    LOCK: 1,
    GRAB: 2,
    FALL: 3,
    NONE: 4,

    dropSpeed: 35
}
class EggControl {
    /**
     * @param {number} index
     */
    static eggX(index) {
        return index * 160 + 80
    }

    /**
     * @param {Phaser.Scene} world
     */
    constructor(world) {
        this.baseY = config.scale.height - 12
        this.sprite = []
        this.mode = []
        for (let i = 0; i < 8 ;i++) {
            this.sprite.push(world.add.sprite(EggControl.eggX(i), this.baseY, "egg"))
            this.mode.push(Egg.REST)
        }
    }

    /**
     * @returns {number | null}
     */
    select() {
        for (let i = 0; i < 6; i++) {
            let k = Random.only(0, 7)
            if (this.sprite[k].visible && this.mode[k] == Egg.REST) {
                this.mode[k] = Egg.LOCK
                return k
            }
        }
        return null
    }

    /**
     * @param {number} index
     * @param {number} y
     */
    raise(index, y) {
        this.mode[index] = Egg.GRAB
        this.sprite[index].y = y
    }

    /**
     * @param {number} index
     */
    release(index) {
        this.mode[index] = Egg.FALL
    }

    /**
     * @param {number} index
     */
    stolen(index) {
        this.mode[index] = Egg.NONE
        this.sprite[index].visible = false
    }

    /**
     * @returns {number}
     */
    aliveCount() {
        let n = 0
        for (let i = 0; i < this.mode.length; i++) {
            if (this.mode[i] != Egg.NONE) {
                n += 1
            }
        }
        return n
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        for (let i = 0; i < this.mode.length; i++) {
            if (this.mode[i] == Egg.FALL) {
                this.sprite[i].y += Egg.dropSpeed * delta
                if (this.sprite[i].y > this.baseY) {
                    this.sprite[i].y = this.baseY
                    this.mode[i] = Egg.REST
                }
            }
        }
    }
}

const Grab = {
    INACTIVE: 0,
    SWOOPING: 1,
    TRACKING: 2,
    LOCKED: 3,
    GRABBED: 4,

    maxGrabbers: 4,
    dt: 0.2,
    baseHealth: 3.5,
    descendSpeed: 40,
    spawnTime: 5,
    lockTime: 20,

    burnTint: [0xFFFFFF, 
    0xFFEEFF, 0xEEFFFF, 0xFFFFEE, 
    0xFF22BB, 0x22BBFF, 0xBBFF22, 0xFFBB22, 0x22FFBB, 0xBB22FF]
}
class Grabber {
    /**
     * @param {Phaser.Scene} world
     * @param {number} index
     */
    constructor(world, index) {
        this.index = index
        this.sprite = world.add.sprite(100 + 50 * index, 100, "grabber")
        this.sprite.setOrigin(0.5, 0.9)
        this.sprite.visible = false
        this.mode = Grab.INACTIVE
        this.health = 0
        let x = new Phaser.Math.Vector2()
        this.curve = new Phaser.Curves.CubicBezier(x, x, x, x)
        this.t = 0
        this.speed = 1
        /** @type {number | null} */
        this.targetEgg = null
    }

    activate() {
        this.mode = Grab.SWOOPING
        this.sprite.visible = true
        this.curve.p0.x = Random.range(0, config.scale.width)
        this.curve.p0.y = -30
        this.curve.p1.x = this.curve.p0.x
        this.curve.p1.y = 30
        this.sprite.x = this.curve.p0.x
        this.sprite.y = this.curve.p0.y
        this.sprite.clearTint()
        this.health = Grab.baseHealth
        this.targetEgg = null
        this.continueSwoop()
    }

    deactivate() {
        console.log("deactivate " + this.index)
        this.mode = Grab.INACTIVE
        this.sprite.visible = false
        if (this.targetEgg != null) {
            eggControl.release(this.targetEgg)
        }
    }

    /**
     * @param {number} hLim
     * @param {number} vLim
     * @returns {Phaser.Math.Vector2}
     */
    randomPoint(hLim, vLim) {
        let x = Random.range(hLim, config.scale.width - hLim)
        let y = config.scale.height * 0.4 + Random.centered() * (200 - vLim)
        return new Phaser.Math.Vector2(x, y)
    }

    continueSwoop() {
        this.curve.p2 = this.randomPoint(80, 50)
        this.curve.p3 = this.randomPoint(50, 20)
        this.t = 0
    }

    trackTargetEgg() {
        this.continueSwoop()
        this.curve.p3.x = EggControl.eggX(ensure(this.targetEgg))
        this.mode = Grab.TRACKING
        console.log("tracking " + this.index)
    }

    nextDestination() {
        let dir = this.curve.p3.clone().subtract(this.curve.p2)
        dir.scale(Random.centered() + 1).add(this.curve.p3)
        this.curve.p0 = this.curve.p3
        this.curve.p1 = dir
        if (this.mode == Grab.TRACKING) {
            this.mode = Grab.LOCKED
        } else if (this.targetEgg != null) {
            this.trackTargetEgg()
        } else {
            this.continueSwoop()
        }
    }

    /**
     * @param {number} delta
     */
    blast(delta) {
        this.sprite.setTint(Random.biasedElt(Grab.burnTint))
        this.health -= delta
        if (this.health <= 0) {
            this.deactivate()
        }
    }

    clearBlast() {
        this.sprite.clearTint()
    }

    /**
     * @param {number} delta
     */
    move(delta) {
        if (this.mode == Grab.LOCKED) {
            this.sprite.y += Grab.descendSpeed * delta
            if (this.sprite.y > config.scale.height - 20) {
                this.mode = Grab.GRABBED
            }
        } else if (this.mode == Grab.GRABBED) {
            const target = ensure(this.targetEgg)
            this.sprite.y -= Grab.descendSpeed * delta
            eggControl.raise(target, this.sprite.y)
            if (this.sprite.y < -5) {
                eggControl.stolen(target)
                this.targetEgg = null
                this.deactivate()
            }
        } else {
            this.t += Grab.dt * delta * this.speed
            let pos = this.curve.getPoint(this.t)
            this.sprite.x = pos.x
            this.sprite.y = pos.y
            if (this.t > 1) {
                this.nextDestination()
            }
        }
    }
}
class GrabberControl {
    /**
     * @param {Phaser.Scene} world
     */
    constructor(world) {
        this.grabbers = []
        for (let i = 0; i < Grab.maxGrabbers; i++) {
            this.grabbers.push(new Grabber(world, i))
        }
        this.width = this.grabbers[0].sprite.width
        this.spawnTime = Grab.spawnTime
        this.lockTime = Grab.lockTime
        this.hitIndex = -1
        this.graphics = world.add.graphics()
    }

    /**
     * @typedef {Object} HitData
     * @property {number} id
     * @property {number} y
     */

    /**
     * @param {number} rayX
     * @returns {HitData | null}
     */
    traceRay(rayX) {
        let hitI = 0
        let hitY = 0
        for (let i = 0; i < this.grabbers.length; i++) {
            let grabber = this.grabbers[i]
            if (grabber.mode != Grab.INACTIVE && Math.abs(grabber.sprite.x - rayX) < 35) {
                let y0 = grabber.sprite.y - 30
                if (y0 > hitY) {
                    hitI = i + 100
                    hitY = y0
                }
            }
        }
        if (hitI) {
            return {
                id: hitI,
                y: hitY
            }
        }
        return null
    }

    /**
     * @param {number} id
     */
    setHitIndex(id) {
        if (this.hitIndex != id && this.hitIndex >= 0) {
            this.grabbers[this.hitIndex].clearBlast()
        }
        this.hitIndex = id
    }

    /**
     * @param {number} id0
     */
    setHit(id0) {
        let id = id0 - 100
        if (id >= 0 && id < this.grabbers.length) {
            this.setHitIndex(id)
        } else {
            this.setHitIndex(-1)
        }
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        var inactiveIndex = -1
        this.graphics.clear()
        this.graphics.lineStyle(2, 0x663366, 1)
        for (let i = 0; i < this.grabbers.length; i++) {
            let grabber = this.grabbers[i]
            grabber.curve.draw(this.graphics)
            if (grabber.mode == Grab.INACTIVE) {
                inactiveIndex = i
            } else if (i == this.hitIndex) {
                grabber.blast(delta)
            } else {
                grabber.move(delta)
            }
        }
        this.spawnTime -= delta
        if (this.spawnTime < 0) {
            this.spawnTime = Random.spread(Grab.spawnTime, 3)
            if (inactiveIndex > -1) {
                console.log("activate " + inactiveIndex)
                this.grabbers[inactiveIndex].activate()
            }
        }
        this.lockTime -= delta
        if (this.lockTime < 0) {
            this.lockTime = Random.spread(Grab.lockTime, 12)
            for (let i = 0; i < 6; i++) {
                let grabber = Random.uniformElt(this.grabbers)
                if (grabber.mode == Grab.SWOOPING && grabber.targetEgg == null) {
                    grabber.targetEgg = eggControl.select()
                    if (grabber.targetEgg != null) {
                        console.log("target egg", grabber.index, grabber.targetEgg)
                        break
                    }
                }
            }
        }
    }
}

class EnemyControl {
    /**
     * @param {Phaser.Scene} world
     */
    constructor(world) {
        this.grabbers = new GrabberControl(world)
    }

    traceRay() {
        let gHit = this.grabbers.traceRay(gunControl.gun.x)
        return gHit
    }

    /**
     * @param {number} id
     */
    setHit(id) {
        this.grabbers.setHit(id)
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        this.grabbers.update(delta)
    }
}

class GameState {
    /**
     * @param {Phaser.Scene} world
     */
    constructor(world) {
        for (let i = 0; i < 8; i++) {
            world.add.image(i * 160, config.scale.height, "bottom").setOrigin(0, 1)
        }
        this.gameOverText = world.add.text(config.scale.width / 2, config.scale.height / 2, "Game Over")
        this.gameOverText.visible = false
        this.gameOverText.setFontSize(48)
    }
}

class GunControl {
    /**
     * @param {Phaser.Scene} world
     */
    constructor(world) {
        this.graphics = world.add.graphics()
        this.gun = world.add.sprite(200, config.scale.height - 40, "gun")
        this.hitId = 0
        this.hitY = 0
    }

    /**
     * @param {boolean} toLeft
     * @param {number} delta
     */
    moveGun(toLeft, delta) {
        if (toLeft) {
            this.gun.x -= delta * p.speed
            if (this.gun.x < p.limit) {
                this.gun.x = p.limit
            }
        } else {
            this.gun.x += delta * p.speed
            if (this.gun.x > config.scale.width - p.limit) {
                this.gun.x = config.scale.width - p.limit
            }
        }
    }

    /**
     * @param {HitData | null} hit
     */
    setHit(hit) {
        if (hit) {
            if (hit.id != this.hitId) {
                this.hitId = hit.id
                this.hitY = hit.y
                enemyControl.setHit(this.hitId)
            }
        } else {
            enemyControl.setHit(0)
            this.hitId = 0
            this.hitY = 0
        }
    }

    /**
     * @param {boolean} draw
     */
    drawRay(draw) {
        this.graphics.clear()
        if (draw) {
            let color = Random.biasedElt(p.laserColor)
            let thick = Random.boolean(0.2)
            this.graphics.lineStyle(thick ? 3 : 1, color, 1)
            this.graphics.lineBetween(this.gun.x, this.gun.y + 5, this.gun.x, this.hitY)
        }
    }
}

const config = {
    type: Phaser.AUTO,
    title: 'Phaser Game',
    scale: {
        parent: 'game-container',
        width: 1280,
        height: 720
    },
    backgroundColor: '#0F1299',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const p = {
    speed: 500,
    limit: 50,
    laserColor: [0xFFFFFF, 
    0xFFEEFF, 0xEEFFFF, 0xFFFFEE, 
    0xFF22BB, 0x22BBFF, 0xBBFF22, 0xFFBB22, 0x22FFBB, 0xBB22FF]
}
const game = new Phaser.Game(config);
/** @type {GameState} */
var gs;
/** @type {GunControl} */
var gunControl;
/** @type {EnemyControl} */
var enemyControl;
/** @type {EggControl} */
var eggControl;
/** @type {Phaser.Types.Input.Keyboard.CursorKeys} */
var cursorKeys;
/** @type {Phaser.Input.Keyboard.Key} */
var fireKey;

/**
 * @this {Phaser.Scene}
 */
function preload() {
    this.load.image("bottom", "assets/bottom.png")
    this.load.image("egg", "assets/egg.png")
    this.load.image("gun", "assets/gun2.png")
    this.load.image("grabber", "assets/grabber3.png")
}

/**
 * @this {Phaser.Scene}
 */
function create() {
    gs = new GameState(this)
    eggControl = new EggControl(this)
    gunControl = new GunControl(this)
    enemyControl = new EnemyControl(this)
    cursorKeys = ensure(this.input.keyboard).createCursorKeys()
    fireKey = ensure(this.input.keyboard).addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
}

/**
 * @this {Phaser.Scene}
 * @param {number} time
 * @param {number} deltaMS
 */
function update(time, deltaMS) {
    let delta = deltaMS / 1000
    if (eggControl.aliveCount() == 0) {
        gs.gameOverText.visible = true
        return
    }
    if (fireKey.isDown) {
        let hit = enemyControl.traceRay()
        gunControl.setHit(hit)
        gunControl.drawRay(true)
    } else {
        gunControl.setHit(null)
        gunControl.drawRay(false)

        if (cursorKeys.left.isDown) {
            gunControl.moveGun(true, delta)
        } else if (cursorKeys.right.isDown) {
            gunControl.moveGun(false, delta)
        }
    }
    eggControl.update(delta)
    enemyControl.update(delta)
}
