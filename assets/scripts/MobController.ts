import { _decorator, Component, Node, Vec3, Animation } from 'cc';
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

    private _currentHealth: number = 100;
    private _player: Node = null;
    private _battlePlayerController: BattlePlayerController = null;
    private _isDead: boolean = false;
    private _isAttacking: boolean = false;
    private _attackCooldown: number = 0;
    private _spawnPosition: Vec3 = new Vec3();
    private _isReturningToSpawn: boolean = false;
    private _mobZone: MobZone = null;

    setMobZone(mobZone: MobZone) {
        this._mobZone = mobZone;
    }

    onLoad() {
        this._currentHealth = this.maxHealth;
        this._spawnPosition = this.node.position.clone();
    }

    start() {
        this.playAnimation(this.idleAnim);
    }

    update(deltaTime: number) {
        if (this._isDead) return;

        // 攻击冷却
        if (this._attackCooldown > 0) {
            this._attackCooldown -= deltaTime;
        }

        // 如果有玩家目标且玩家在区域内，追逐玩家
        if (this._player && this.isPlayerInZone() && !this._isAttacking) {
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
        if (!this._player || this._isAttacking) return;

        const playerPos = this._player.position;
        const mobPos = this.node.position;
        const distance = Vec3.distance(playerPos, mobPos);

        // 如果在攻击范围内，攻击玩家
        if (distance <= this.attackRange) {
            this.attackPlayer();
            return;
        }

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

    attackPlayer() {
        if (this._isAttacking || this._attackCooldown > 0) return;

        this._isAttacking = true;
        this.playAnimation(this.attackAnim);
        console.log("👹 怪物开始攻击玩家");

        // 在动画播放到攻击帧时调用 onAttackHit
        setTimeout(() => {
            this.onAttackHit();
        }, 500);
    }

    onAttackHit() {
        if (!this._battlePlayerController || this._isDead) return;

        console.log(`👹 怪物攻击玩家，造成 ${this.attackDamage} 点伤害`);
        this._battlePlayerController.takeDamage(this.attackDamage);
        
        this._isAttacking = false;
        this._attackCooldown = 1.0; // 1秒攻击冷却
        
        // 攻击后回到空闲状态
        setTimeout(() => {
            if (!this._isDead) {
                this.playAnimation(this.idleAnim);
            }
        }, 200);
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

        // 通知MobZone重生
        if (this._mobZone) {
            this._mobZone.onMobDied(this.node);
        }

        // 延迟隐藏
        setTimeout(() => {
            this.node.active = false;
        }, 2000);
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
        this._isAttacking = false;
        this._attackCooldown = 0;
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