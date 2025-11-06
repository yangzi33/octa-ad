import { _decorator, Component, Node, Prefab, instantiate, Vec3, MeshRenderer, Collider, ITriggerEvent, BoxCollider } from 'cc';
import { MobController } from './MobController';
import { BattlePlayerController } from './BattlePlayerController';
const { ccclass, property } = _decorator;

@ccclass('MobZone')
export class MobZone extends Component {
    @property(Prefab)
    mobPrefab: Prefab = null;

    @property
    mobCount: number = 5;

    @property
    respawnTime: number = 10;

    @property(Node)
    mobContainer: Node = null;

    private _mobs: Node[] = [];
    private _deadMobs: { mob: Node, respawnTimer: number }[] = [];
    private _planeMesh: MeshRenderer = null;
    private _planeWidth: number = 0;
    private _planeLength: number = 0;
    private _playersInZone: Node[] = [];

    onLoad() {
        this.findPlaneMesh();
        this.setupCollider();
        this.setupMobContainer();
        this.spawnMobs();
    }

    setupMobContainer() {
        if (!this.mobContainer) {
            this.mobContainer = new Node('MobContainer');
            this.mobContainer.parent = this.node.scene;
        }
    }

    setupCollider() {
        let collider = this.getComponent(BoxCollider);
        if (!collider) {
            collider = this.addComponent(BoxCollider);
        }
        
        this.updateColliderSize();
        collider.isTrigger = true;
        collider.on('onTriggerEnter', this.onTriggerEnter, this);
        collider.on('onTriggerExit', this.onTriggerExit, this);
    }

    updateColliderSize() {
        const collider = this.getComponent(BoxCollider);
        if (collider) {
            collider.size.set(this._planeWidth, 5, this._planeLength);
        }
    }

    findPlaneMesh() {
        this._planeMesh = this.node.getComponent(MeshRenderer);
        
        if (!this._planeMesh) {
            this._planeMesh = this.node.getComponentInChildren(MeshRenderer);
        }

        if (this._planeMesh) {
            const nodeScale = this._planeMesh.node.scale;
            this._planeWidth = 10 * nodeScale.x;
            this._planeLength = 10 * nodeScale.z;
            
            console.log(`📏 平面尺寸 - 宽度: ${this._planeWidth}, 长度: ${this._planeLength}`);
            this.updateColliderSize();
        } else {
            console.warn("⚠️ 未找到平面网格渲染器，使用默认尺寸");
            this.setDefaultDimensions();
        }
    }

    setDefaultDimensions() {
        this._planeWidth = 20;
        this._planeLength = 20;
        this.updateColliderSize();
    }

    spawnMobs() {
        for (let i = 0; i < this.mobCount; i++) {
            this.spawnSingleMob();
        }
    }

    spawnSingleMob() {
        if (!this.mobPrefab) {
            console.error("❌ MobPrefab 未设置");
            return;
        }

        const mob = instantiate(this.mobPrefab);
        const spawnPos = this.getRandomPositionInPlane();
        mob.setPosition(spawnPos);
        mob.parent = this.mobContainer;

        const mobController = mob.getComponent(MobController);
        if (mobController) {
            mobController.setSpawnPosition(spawnPos);
            mobController.setMobZone(this);
        }

        this._mobs.push(mob);
        console.log(`👹 生成怪物在位置: ${spawnPos.toString()}`);
    }

    getRandomPositionInPlane(): Vec3 {
        const halfWidth = this._planeWidth / 2;
        const halfLength = this._planeLength / 2;
        
        const worldPos = new Vec3(
            this.node.worldPosition.x + (Math.random() - 0.5) * this._planeWidth,
            0.5,
            this.node.worldPosition.z + (Math.random() - 0.5) * this._planeLength
        );
        
        return worldPos;
    }

    isPositionInPlane(position: Vec3): boolean {
        const center = this.node.worldPosition;
        const halfWidth = this._planeWidth / 2;
        const halfLength = this._planeLength / 2;
        
        const localX = position.x - center.x;
        const localZ = position.z - center.z;
        
        return Math.abs(localX) <= halfWidth && 
               Math.abs(localZ) <= halfLength;
    }

    containsPlayer(player: Node): boolean {
        for (let i = 0; i < this._playersInZone.length; i++) {
            if (this._playersInZone[i] === player) {
                return true;
            }
        }
        return false;
    }

    onTriggerEnter(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        console.log("🔵 触发器进入:", otherNode.name);
        
        const battlePlayerController = otherNode.getComponent(BattlePlayerController);
        if (battlePlayerController) {
            if (!this.containsPlayer(otherNode)) {
                this._playersInZone.push(otherNode);
                console.log("🎯 玩家进入MobZone");
                this.notifyMobsPlayerEntered(otherNode);
            }
        }
    }

    onTriggerExit(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        console.log("🔵 触发器离开:", otherNode.name);
        
        const battlePlayerController = otherNode.getComponent(BattlePlayerController);
        if (battlePlayerController) {
            const index = this.findPlayerIndex(otherNode);
            if (index > -1) {
                this._playersInZone.splice(index, 1);
                console.log("🚫 玩家离开MobZone");
                this.notifyMobsPlayerLeft(otherNode);
            }
        }
    }

    findPlayerIndex(player: Node): number {
        for (let i = 0; i < this._playersInZone.length; i++) {
            if (this._playersInZone[i] === player) {
                return i;
            }
        }
        return -1;
    }

    notifyMobsPlayerEntered(player: Node) {
        console.log(`📢 通知 ${this._mobs.length} 个怪物玩家进入`);
        for (let i = 0; i < this._mobs.length; i++) {
            const mob = this._mobs[i];
            const mobController = mob.getComponent(MobController);
            if (mobController && !mobController.isDead()) {
                console.log(`👹 通知怪物 ${i} 玩家进入`);
                mobController.onPlayerEnteredZone(player);
            }
        }
    }

    notifyMobsPlayerLeft(player: Node) {
        console.log(`📢 通知 ${this._mobs.length} 个怪物玩家离开`);
        for (let i = 0; i < this._mobs.length; i++) {
            const mob = this._mobs[i];
            const mobController = mob.getComponent(MobController);
            if (mobController && !mobController.isDead()) {
                console.log(`👹 通知怪物 ${i} 玩家离开`);
                mobController.onPlayerLeftZone(player);
            }
        }
    }

    update(deltaTime: number) {
        for (let i = this._deadMobs.length - 1; i >= 0; i--) {
            const deadMob = this._deadMobs[i];
            deadMob.respawnTimer -= deltaTime;
            
            if (deadMob.respawnTimer <= 0) {
                this.respawnMob(deadMob.mob);
                this._deadMobs.splice(i, 1);
            }
        }
    }

    onMobDied(mob: Node) {
        const index = this.findMobIndex(mob);
        if (index > -1) {
            this._mobs.splice(index, 1);
        }

        this._deadMobs.push({
            mob: mob,
            respawnTimer: this.respawnTime
        });

        console.log(`💀 怪物死亡，${this.respawnTime}秒后重生`);
    }

    findMobIndex(mob: Node): number {
        for (let i = 0; i < this._mobs.length; i++) {
            if (this._mobs[i] === mob) {
                return i;
            }
        }
        return -1;
    }

    respawnMob(mob: Node) {
        const mobController = mob.getComponent(MobController);
        if (mobController) {
            mobController.reset();
        }

        const spawnPos = this.getRandomPositionInPlane();
        mob.setPosition(spawnPos);
        
        if (mobController) {
            mobController.setSpawnPosition(spawnPos);
        }
        
        this._mobs.push(mob);
        console.log("👹 怪物重生");
    }

    getMobs(): Node[] {
        return this._mobs;
    }

    getPlayersInZone(): Node[] {
        return this._playersInZone;
    }
}