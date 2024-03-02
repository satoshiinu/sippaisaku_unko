//このプログラム直してくれたら助かる　byさとしいぬ

const ctx = document.querySelector("canvas").getContext("2d");
const canvasSize = { width: 320, height: 180 };
const canvasScale = { width: 3, height: 3 };
ctx.canvas.width = canvasSize.width * canvasScale.width;
ctx.canvas.height = canvasSize.height * canvasScale.height;
ctx.scale(canvasScale.width, canvasScale.height);

ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;

const assets = new Object();

let debug = null;

document.addEventListener("keydown", keydown);
document.addEventListener("keyup", keyup);

key = new Object();
function keydown(e) {
    key[e.code] = true;
}
function keyup(e) {
    key[e.code] = false;
}

Math.orgRound = (value, base) => Math.round(value * Math.pow(10, -base)) / Math.pow(10, -base);
Math.orgCeil = (value, base) => Math.ceil(value * Math.pow(10, -base)) / Math.pow(10, -base);
Math.orgFloor = (value, base) => Math.floor(value * Math.pow(10, -base)) / Math.pow(10, -base);


class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    toString() {
        return `x:${this.x.toFixed(3)},y:${this.y.toFixed(3)}`
    }
}
class Vec2Result extends Vec2 {
    constructor(x, y, r) {
        super(...arguments);
        this.result = r;
    }
}

class Cam {
    static x = 0;
    static y = 0;
    static tick() {
        const getCenterX = () => Player.pos.x - this.x - canvasSize.width / 2;
        const getCenterY = () => Player.pos.y - this.y - canvasSize.height / 2;

        while (Math.abs(getCenterX()) > 20) this.x += Math.sign(getCenterX());
        while (Math.abs(getCenterY()) > 20) this.y += Math.sign(getCenterY());

        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
    }
    static getPos(pos) {
        return new Vec2(pos.x - this.x, pos.y - this.y);
    }
}

class AABB {
    constructor(minX, minY, maxX, maxY) {
        this.minX = Math.min(minX, maxX);
        this.minY = Math.min(minY, maxY);
        this.maxX = Math.max(minX, maxX);
        this.maxY = Math.max(minY, maxY);
    }
    getCenter(aabb) {
        return new Vec2((this.minX + this.maxX) / 2, (this.minY + this.maxY) / 2);
    }
    getFacing(aabb2) {
        const px = this.getCenter(aabb2).x - aabb2.getCenter(this).x;
        const py = this.getCenter(aabb2).y - aabb2.getCenter(this).y;

        if (Math.abs(px) >= Math.abs(py))
            return new Vec2(Math.sign(px), 0);
        else
            return new Vec2(0, Math.sign(py));

    }
    collision(x, y) {
        for (const aabb2 of this.getNearTileAABB()) {
            const overlap = this.move(x, y).overlap(aabb2);
            return new Vec2Result(x - overlap.x, y - overlap.y, new Vec2(x !== x - overlap.x, y !== y - overlap.y));
        }
        return new Vec2Result(x, y, new Vec2(0, 0));
    }
    move(x, y) {
        return new AABB(this.minX + x, this.minY + y, this.maxX + x, this.maxY + y);
    }
    overlap(aabb2) {
        const overlapX = Math.max(0, Math.min(this.maxX, aabb2.maxX) - Math.max(this.minX, aabb2.minX));
        const overlapY = Math.max(0, Math.min(this.maxY, aabb2.maxY) - Math.max(this.minY, aabb2.minY));
        const facing = this.getFacing(aabb2);
        console.log(facing)
        if (overlapX * overlapY === 0) return new Vec2(0, 0);
        return new Vec2(overlapX * -facing.x, overlapY * -facing.y);
    }
    getNearTileAABB() {
        const array = new Array();
        const width = Math.ceil(this.maxX / 16) - Math.floor(this.minX / 16);
        const height = Math.ceil(this.maxY / 16) - Math.floor(this.minY / 16);
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const pos = new Vec2(Math.floor(this.minX / 16) + x, Math.floor(this.minY / 16) + y);
                const tileID = Game.getTile(pos.x, pos.y) ?? 0;
                const aabb = Level.TileAABB[tileID];
                if (!!aabb) array.push(aabb.move(pos.x * 16, pos.y * 16));
            }
        }
        return array;
    }
}

class Level {
    Data = null;
    TIleAABB=null;
}

class Draw {
    static tile(dx, dy, id) {
        this.image(assets.tiles, id % 16 * 16, Math.floor(id / 16) * 16, 16, 16, dx, dy);
    }
    static image(img, x, y, w, h, dx, dy) {
        ctx.drawImage(img, x, y, w, h, dx, dy, w, h);
    }
    static reset() {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
}

class Game {
    static drawTiles() {
        for (let x = 0; x < ctx.canvas.width / 16 + 1; x++) {
            for (let y = 0; y < ctx.canvas.height / 16 + 1; y++) {
                const tileID = this.getTile(Math.floor(Cam.x / 16) + x, Math.floor(Cam.y / 16) + y);
                Draw.tile(x * 16 - Cam.x % 16, y * 16 - Cam.y % 16, tileID);
            }
        }
    }
    static async assetLoadJson(path, keyName) {
        const response = await new fetch(path);
        assets[keyName] = await response.json();
    }
    static async assetLoadImage(path, keyName) {
        const promise = new Promise(resolve => {
            assets[keyName] = new Image();
            assets[keyName].onload = resolve;
            assets[keyName].src = path;
        })

        return promise;
    }
    static async loadLevel(path) {
        const module = await import(path);
        Level.Data = module.Data;
    }
    static async loadModuleLevel(path, name) {
        const module = await import(path);
        Level[name] = module[name];
    }
    static getTile(x, y) {
        return Level.Data?.[y]?.[x];
    }
}

class Player {
    static pos = new Vec2(0, 0);
    static speed = new Vec2(0, 0);
    static aabb = null;
    static tick() {
        if (key.KeyD) this.speed.x++;
        if (key.KeyA) this.speed.x--;
        if (key.KeyS) this.speed.y++;
        if (key.KeyW) this.speed.y--;

        this.speed.x *= 0.8;
        this.speed.y *= 0.8;

        this.aabb = new AABB(this.pos.x, this.pos.y - 16, this.pos.x + 16, this.pos.y + 16);

        let fixedSpeed = this.aabb.collision(this.speed.x, this.speed.y);
        this.pos.x += fixedSpeed.x;
        this.pos.y += fixedSpeed.y;
        if (fixedSpeed.result.x) {//collided
            this.speed.x = 0;
        }
        if (fixedSpeed.result.y) {
            this.speed.y = 0;
        }

    }
    static draw() {
        Draw.image(assets.player, 0, 0, 16, 32, Cam.getPos(this.pos).x, Cam.getPos(this.pos).y - 16);
    }
}

setup();
async function setup() {
    await Game.assetLoadImage("/assets/img/tiles.png", "tiles");
    await Game.assetLoadImage("/assets/img/player.png", "player");
    await Game.loadLevel("./assets/level/testLevel.js");
    await Game.loadModuleLevel("./assets/defer.js", "TileAABB");

    main();
}
function main() {
    Draw.reset();
    Player.tick();
    Cam.tick();
    Game.drawTiles();
    Player.draw();

    requestAnimationFrame(main);
}

