import { _decorator, Component, Node, Vec3, Animation, Collider, ITriggerEvent, Prefab, instantiate } from 'cc';
import { BattlePlayerController } from './BattlePlayerController';
import { MobZone } from './MobZone';
const { ccclass, property } = _decorator;

@ccclass('MobController')
export class MobController extends Component {
    @property
    maxHealth: number = 100;

    @property
    attackDamage: number = 5;

    @property
    moveSpeed: number = 3;

    @property
    attackRange: number = 2;

    @property
    attackCooldown: number = 1.0;

    @property(Animation)
    animComponent: Animation = null;

    @property
    idleAnim: string = "idle";

    @property
    walkAnim: string = "walk";

    @property
    attackAnim: string = "attack";

    @property
    dieAnim: string = "die";

    @property(Prefab)
    meatPrefab: Prefab = null;

    @property([Prefab])
    otherMobPrefabs: Prefab[] = [];

    private _currentHealth: number = 100;
    private _player: Node = null;
    private _battlePlayerController: BattlePlayerController = null;
    private _isDead: boolean = false;
    private _isAttacking: boolean = false;
    private _currentCooldown: number = 0;
    private _mobZone: MobZone = null;

    setMobZone(mobZone: MobZone) {
        this._mobZone = mobZone;
    }

    onLoad() {
        this._currentHealth = this.maxHealth;
        
        // 设置碰撞器
        let collider = this.getComponent(Collider);
        if (!collider) {
            collider = this.addComponent(Collider);
        }
        
        collider.isTrigger = true;
        collider.on('onTriggerEnter', this.onTriggerEnter, this);
        collider.on('onTriggerStay', this.onTriggerStay, this);
        collider.on('onTriggerExit', this.onTriggerExit, this);
    }

    start() {
        this.playAnimation(this.idleAnim);
    }

    update(deltaTime: number) {
        if (this._isDead) return;

        // 更新攻击冷却
        if (this._currentCooldown > 0) {
            this._currentCooldown -= deltaTime;
        }

        // 追逐玩家
        if (this._player && this.isPlayerInZone() && !this._isAttacking) {
            this.chasePlayer(deltaTime);
        } 
        
        // 攻击玩家
        if (this._player && !this._isAttacking && this._currentCooldown <= 0) {
            const playerPos = this._player.position;
            const mobPos = this.node.position;
            const distance = Vec3.distance(playerPos, mobPos);
            
            if (distance <= this.attackRange) {
                this.attackPlayer();
            }
        }
    }

    onTriggerEnter(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        const battlePlayerController = otherNode.getComponent(BattlePlayerController);
        if (battlePlayerController && !battlePlayerController.isDead()) {
            this._player = otherNode;
            this._battlePlayerController = battlePlayerController;
        }
    }
    
    onTriggerStay(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        const battlePlayerController = otherNode.getComponent(BattlePlayerController);
        if (battlePlayerController && !battlePlayerController.isDead()) {
            if (!this._player) {
                this._player = otherNode;
                this._battlePlayerController = battlePlayerController;
            }
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        const battlePlayerController = otherNode.getComponent(BattlePlayerController);
        if (battlePlayerController && this._player === otherNode) {
            this._player = null;
            this._battlePlayerController = null;
        }
    }

    onPlayerEnteredZone(player: Node) {
        if (this._isDead) return;
        
        if (!this._player) {
            this._player = player;
            this._battlePlayerController = player.getComponent(BattlePlayerController);
        }
    }

    onPlayerLeftZone(player: Node) {
        if (this._player === player) {
            this._player = null;
            this._battlePlayerController = null;
        }
    }

    isPlayerInZone(): boolean {
        if (!this._player || !this._mobZone) return false;
        return this._mobZone.isPositionInPlane(this._player.position);
    }

    chasePlayer(deltaTime: number) {
        if (!this._player || this._isAttacking) return;

        const playerPos = this._player.position;
        const mobPos = this.node.position;

        const direction = new Vec3();
        Vec3.subtract(direction, playerPos, mobPos);
        direction.normalize();

        const moveDistance = this.moveSpeed * deltaTime;
        const newPos = new Vec3(
            mobPos.x + direction.x * moveDistance,
            mobPos.y,
            mobPos.z + direction.z * moveDistance
        );

        if (this._mobZone && !this._mobZone.isPositionInPlane(newPos)) {
            this.playAnimation(this.idleAnim);
            return;
        }

        this.node.setPosition(newPos);
        this.node.lookAt(playerPos);
        this.playAnimation(this.walkAnim);
    }

    attackPlayer() {
        if (this._isAttacking || this._currentCooldown > 0) return;

        this._isAttacking = true;
        this.playAnimation(this.attackAnim);

        // 使用Cocos的scheduleOnce替代setTimeout
        this.scheduleOnce(() => {
            this.onAttackHit();
        }, 0.5);
    }

    onAttackHit() {
        if (!this._battlePlayerController || this._isDead || this._battlePlayerController.isDead()) {
            this._isAttacking = false;
            this._player = null;
            this._battlePlayerController = null;
            return;
        }

        this._battlePlayerController.takeDamage(this.attackDamage);
        this._isAttacking = false;
        this._currentCooldown = this.attackCooldown;
        
        this.scheduleOnce(() => {
            if (!this._isDead) {
                this.playAnimation(this.idleAnim);
            }
        }, 0.2);
    }

    takeDamage(damage: number) {
        if (this._isDead) return;

        this._currentHealth -= damage;

        if (this._currentHealth <= 0) {
            this.die();
        }
    }

    die() {
        console.log("开始执行死亡逻辑");
        
        if (this._isDead) {
            console.log("怪物已经死亡，跳过");
            return;
        }
        
        this._isDead = true;
        this._player = null;
        this._battlePlayerController = null;
        this._isAttacking = false;
        
        console.log("播放死亡动画");
        this.playAnimation(this.dieAnim);
        
        console.log("生成肉块");
        this.spawnMeat();
        
        console.log("生成新怪物");
        this.spawnRandomMob();
        
        console.log("通知MobZone");
        if (this._mobZone) {
            this._mobZone.onMobDied(this.node);
        }
    
        console.log("计划销毁节点");
        this.scheduleOnce(() => {
            console.log("执行销毁节点");
            if (this.node && this.node.isValid) {
                this.node.destroy();
                console.log("节点已销毁");
            } else {
                console.log("节点无效，无法销毁");
            }
        }, 2.0);
    }

    spawnMeat() {
        if (!this.meatPrefab) {
            console.warn("没有设置肉预制体");
            return;
        }

        const meat = instantiate(this.meatPrefab);
        const meatPosition = this.node.position.clone();
        meatPosition.y += 0.5;
        
        meat.setPosition(meatPosition);
        
        const randomRotationY = Math.random() * 360;
        meat.setRotationFromEuler(0, randomRotationY, 0);
        
        if (this._mobZone && this._mobZone.mobContainer) {
            meat.parent = this._mobZone.mobContainer;
        } else {
            meat.parent = this.node.scene;
        }
    }

    spawnRandomMob() {
        if (!this.otherMobPrefabs || this.otherMobPrefabs.length === 0) {
            console.warn("没有设置其他怪物预制体");
            return;
        }

        const randomIndex = Math.floor(Math.random() * this.otherMobPrefabs.length);
        const randomMobPrefab = this.otherMobPrefabs[randomIndex];
        
        if (!randomMobPrefab) return;

        const newMob = instantiate(randomMobPrefab);
        
        let spawnPos;
        if (this._mobZone) {
            spawnPos = this._mobZone.getRandomPositionInPlane();
        } else {
            spawnPos = this.node.position.clone();
            spawnPos.x += (Math.random() - 0.5) * 5;
            spawnPos.z += (Math.random() - 0.5) * 5;
        }
        
        newMob.setPosition(spawnPos);
        
        const randomRotationY = Math.random() * 360;
        newMob.setRotationFromEuler(0, randomRotationY, 0);
        
        if (this._mobZone && this._mobZone.mobContainer) {
            newMob.parent = this._mobZone.mobContainer;
        } else {
            newMob.parent = this.node.scene;
        }

        const newMobController = newMob.getComponent(MobController);
        if (newMobController && this._mobZone) {
            newMobController.setMobZone(this._mobZone);
        }
        
        if (this._mobZone) {
            this._mobZone.addMob(newMob);
        }
    }

    playAnimation(animName: string) {
        if (!this.animComponent) return;

        if (this.animComponent.getState(animName)) {
            this.animComponent.play(animName);
        }
    }

    reset() {
        this._currentHealth = this.maxHealth;
        this._isDead = false;
        this._isAttacking = false;
        this._currentCooldown = 0;
        this._player = null;
        this._battlePlayerController = null;
        this.node.active = true;
        this.playAnimation(this.idleAnim);
    }

    getHealth(): number {
        return this._currentHealth;
    }

    isDead(): boolean {
        return this._isDead;
    }
}