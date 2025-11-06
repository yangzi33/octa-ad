import { _decorator, Component, Node, Vec3, Animation, Collider, ICollisionEvent, Prefab, instantiate } from 'cc';
import { BattlePlayerController } from './BattlePlayerController';
import { MobZone } from './MobZone';
const { ccclass, property } = _decorator;

@ccclass('MobController')
export class MobController extends Component {
    @property
    maxHealth: number = 100;

    @property
    moveSpeed: number = 3;

    @property(Animation)
    animComponent: Animation = null;

    @property
    idleAnim: string = "idle";

    @property
    walkAnim: string = "walk";

    @property
    dieAnim: string = "die";

    // 🆕 肉预制体属性
    @property(Prefab)
    meatPrefab: Prefab = null;

    // 🆕 其他怪物预制体数组（用于随机生成）
    @property([Prefab])
    otherMobPrefabs: Prefab[] = [];

    private _currentHealth: number = 100;
    private _player: Node = null;
    private _battlePlayerController: BattlePlayerController = null;
    private _isDead: boolean = false;
    private _spawnPosition: Vec3 = new Vec3();
    private _isReturningToSpawn: boolean = false;
    private _mobZone: MobZone = null;

    setMobZone(mobZone: MobZone) {
        this._mobZone = mobZone;
    }

    onLoad() {
        this._currentHealth = this.maxHealth;
        this._spawnPosition = this.node.position.clone();
        
        // 🆕 确保怪物有碰撞器
        let collider = this.getComponent(Collider);
        if (!collider) {
            collider = this.addComponent(Collider);
            console.log("🔧 为怪物添加碰撞器");
        }
    }

    start() {
        this.playAnimation(this.idleAnim);
    }

    update(deltaTime: number) {
        if (this._isDead) return;

        // 如果有玩家目标且玩家在区域内，追逐玩家
        if (this._player && this.isPlayerInZone()) {
            this.chasePlayer(deltaTime);
        } 
        // 否则返回生成点
        else if (!this._player || !this.isPlayerInZone()) {
            this.idleOrReturnToSpawn(deltaTime);
        }
    }

    onPlayerEnteredZone(player: Node) {
        if (this._isDead) return;
        
        console.log(`👹 怪物收到玩家进入通知`);
        if (!this._player) {
            this._player = player;
            this._battlePlayerController = player.getComponent(BattlePlayerController);
            this._isReturningToSpawn = false;
            console.log("🎯 怪物开始追踪玩家");
        }
    }

    onPlayerLeftZone(player: Node) {
        console.log(`👹 怪物收到玩家离开通知`);
        if (this._player === player) {
            this._player = null;
            this._battlePlayerController = null;
            this._isReturningToSpawn = true;
            console.log("🚫 玩家离开区域，怪物停止追踪");
        }
    }

    isPlayerInZone(): boolean {
        if (!this._player || !this._mobZone) return false;
        return this._mobZone.isPositionInPlane(this._player.position);
    }

    idleOrReturnToSpawn(deltaTime: number) {
        const currentPos = this.node.position;
        const distanceToSpawn = Vec3.distance(currentPos, this._spawnPosition);
        
        if (distanceToSpawn > 0.5) {
            this.returnToSpawn(deltaTime);
        } else {
            this.playAnimation(this.idleAnim);
            this._isReturningToSpawn = false;
        }
    }

    returnToSpawn(deltaTime: number) {
        const currentPos = this.node.position;
        const direction = new Vec3();
        Vec3.subtract(direction, this._spawnPosition, currentPos);
        direction.normalize();

        const moveDistance = this.moveSpeed * deltaTime;
        const newPos = new Vec3(
            currentPos.x + direction.x * moveDistance,
            currentPos.y,
            currentPos.z + direction.z * moveDistance
        );

        // 确保不会离开平面区域
        if (this._mobZone && !this._mobZone.isPositionInPlane(newPos)) {
            this.node.setPosition(this._spawnPosition);
        } else {
            this.node.setPosition(newPos);
        }

        // 面向移动方向
        const lookAtPos = new Vec3(newPos.x, currentPos.y, newPos.z);
        this.node.lookAt(lookAtPos);

        this.playAnimation(this.walkAnim);
        this._isReturningToSpawn = true;
    }

    chasePlayer(deltaTime: number) {
        if (!this._player) return;

        const playerPos = this._player.position;
        const mobPos = this.node.position;

        // 移动向玩家
        const direction = new Vec3();
        Vec3.subtract(direction, playerPos, mobPos);
        direction.normalize();

        const moveDistance = this.moveSpeed * deltaTime;
        const newPos = new Vec3(
            mobPos.x + direction.x * moveDistance,
            mobPos.y,
            mobPos.z + direction.z * moveDistance
        );

        // 确保不会离开平面区域
        if (this._mobZone && !this._mobZone.isPositionInPlane(newPos)) {
            this.playAnimation(this.idleAnim);
            return;
        }

        this.node.setPosition(newPos);

        // 面向玩家
        this.node.lookAt(playerPos);

        this.playAnimation(this.walkAnim);
    }

    takeDamage(damage: number) {
        if (this._isDead) return;

        this._currentHealth -= damage;
        console.log(`💥 怪物受到 ${damage} 点伤害，剩余血量: ${this._currentHealth}`);

        if (this._currentHealth <= 0) {
            this.die();
        }
    }

    die() {
        this._isDead = true;
        this.playAnimation(this.dieAnim);
        
        console.log("💀 怪物死亡");

        // 🆕 生成肉预制体
        this.spawnMeat();
        
        // 🆕 随机生成另一个怪物
        this.spawnRandomMob();
        
        // 🆕 通知MobZone怪物死亡（用于更新计数等）
        if (this._mobZone) {
            this._mobZone.onMobDied(this.node);
        }

        // 🆕 销毁当前怪物节点
        setTimeout(() => {
            this.node.destroy();
        }, 2000);
    }

    // 🆕 生成肉预制体
    spawnMeat() {
        if (!this.meatPrefab) {
            console.warn("⚠️ 没有设置肉预制体");
            return;
        }

        const meat = instantiate(this.meatPrefab);
        const meatPosition = this.node.position.clone();
        
        // 稍微提高肉的位置，避免陷入地面
        meatPosition.y += 0.5;
        
        meat.setPosition(meatPosition);
        
        // 🆕 给肉一个随机旋转
        const randomRotationY = Math.random() * 360;
        meat.setRotationFromEuler(0, randomRotationY, 0);
        
        // 🆕 将肉放在场景中（与怪物容器相同）
        if (this._mobZone && this._mobZone.mobContainer) {
            meat.parent = this._mobZone.mobContainer;
        } else {
            meat.parent = this.node.scene;
        }
        
        console.log("🥩 生成肉预制体");
    }

    // 🆕 随机生成另一个怪物
    spawnRandomMob() {
        if (!this.otherMobPrefabs || this.otherMobPrefabs.length === 0) {
            console.warn("⚠️ 没有设置其他怪物预制体");
            return;
        }

        // 从其他怪物预制体中随机选择一个
        const randomIndex = Math.floor(Math.random() * this.otherMobPrefabs.length);
        const randomMobPrefab = this.otherMobPrefabs[randomIndex];
        
        if (!randomMobPrefab) {
            console.warn("⚠️ 随机选择的怪物预制体无效");
            return;
        }

        const newMob = instantiate(randomMobPrefab);
        const spawnPos = this.node.position.clone();
        
        // 稍微偏移位置，避免重叠
        spawnPos.x += (Math.random() - 0.5) * 2;
        spawnPos.z += (Math.random() - 0.5) * 2;
        
        newMob.setPosition(spawnPos);
        
        // 🆕 给新怪物一个随机旋转
        const randomRotationY = Math.random() * 360;
        newMob.setRotationFromEuler(0, randomRotationY, 0);
        
        // 🆕 将新怪物放在怪物容器中
        if (this._mobZone && this._mobZone.mobContainer) {
            newMob.parent = this._mobZone.mobContainer;
        } else {
            newMob.parent = this.node.scene;
        }

        // 🆕 设置新怪物的MobZone引用
        const newMobController = newMob.getComponent(MobController);
        if (newMobController && this._mobZone) {
            newMobController.setMobZone(this._mobZone);
            newMobController.setSpawnPosition(spawnPos);
        }
        
        // 🆕 通知MobZone添加新怪物到列表
        if (this._mobZone) {
            this._mobZone.addMob(newMob);
        }
        
        console.log(`👹 随机生成新怪物: ${randomIndex}`);
    }

    playAnimation(animName: string) {
        if (!this.animComponent) {
            console.warn("⚠️ 怪物没有动画组件");
            return;
        }

        if (this.animComponent.getState(animName)) {
            this.animComponent.play(animName);
        } else {
            console.warn(`⚠️ 怪物没有找到动画: ${animName}`);
        }
    }

    reset() {
        this._currentHealth = this.maxHealth;
        this._isDead = false;
        this._player = null;
        this._battlePlayerController = null;
        this._isReturningToSpawn = false;
        this.node.active = true;
        this.playAnimation(this.idleAnim);
    }

    setSpawnPosition(position: Vec3) {
        this._spawnPosition = position.clone();
    }

    getHealth(): number {
        return this._currentHealth;
    }

    isDead(): boolean {
        return this._isDead;
    }
}