import { _decorator, Component, Node, Animation, Collider, ICollisionEvent, ITriggerEvent } from 'cc';
import { MobController } from './MobController';
const { ccclass, property } = _decorator;

@ccclass('BattlePlayerController')
export class BattlePlayerController extends Component {
    @property
    maxHealth: number = 100;

    @property
    playerTier: number = 1; // 1 或 2

    // 动画组件
    @property(Animation)
    animComponent: Animation = null;

    // 动画名称
    @property
    idleAnim: string = "idle";

    @property
    walkAnim: string = "walk";

    @property
    attackAnim: string = "attack";

    @property
    dieAnim: string = "die";

    // 攻击属性
    @property
    attackDamage: number = 50; // 1阶攻击力

    @property
    attackCooldown: number = 1.0; // 攻击冷却时间

    private _currentHealth: number = 100;
    private _isDead: boolean = false;
    private _isAttacking: boolean = false;
    private _currentCooldown: number = 0;
    private _currentTarget: MobController = null;

    onLoad() {
        this._currentHealth = this.maxHealth;
        
        // 根据阶级设置攻击力
        if (this.playerTier === 2) {
            this.attackDamage = 100;
        }

        // 设置碰撞器
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onCollisionEnter', this.onCollisionEnter, this);
            collider.on('onCollisionStay', this.onCollisionStay, this);
            collider.on('onCollisionExit', this.onCollisionExit, this);
        }
    }

    start() {
        this.playAnimation(this.idleAnim);
    }

    update(deltaTime: number) {
        // 更新攻击冷却
        if (this._currentCooldown > 0) {
            this._currentCooldown -= deltaTime;
        }
        
        // 如果有目标且不在冷却中，自动攻击
        if (this._currentTarget && !this._isAttacking && this._currentCooldown <= 0) {
            this.attack(this._currentTarget);
        }
    }

    // 碰撞进入事件
    onCollisionEnter(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        
        // 检测是否碰撞到怪物
        const mobController = otherNode.getComponent(MobController);
        if (mobController && !mobController.isDead()) {
            console.log("💥 玩家碰撞到怪物");
            this._currentTarget = mobController;
        }
    }
    
    // 碰撞持续事件
    onCollisionStay(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        
        // 持续检测是否碰撞到怪物
        const mobController = otherNode.getComponent(MobController);
        if (mobController && !mobController.isDead()) {
            // 如果当前没有目标，设置目标
            if (!this._currentTarget) {
                this._currentTarget = mobController;
            }
        }
    }
    
    // 碰撞离开事件
    onCollisionExit(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        
        // 检测是否离开怪物
        const mobController = otherNode.getComponent(MobController);
        if (mobController && this._currentTarget === mobController) {
            console.log("🚫 玩家离开怪物");
            this._currentTarget = null;
        }
    }

    // 玩家攻击方法
    attack(target?: MobController) {
        if (this._isDead || this._isAttacking || this._currentCooldown > 0) return;

        this._isAttacking = true;
        this._currentTarget = target || this._currentTarget;

        if (!this._currentTarget || this._currentTarget.isDead()) {
            this._isAttacking = false;
            this._currentTarget = null;
            return;
        }

        this.playAnimation(this.attackAnim);

        // 在动画播放到攻击帧时造成伤害
        setTimeout(() => {
            this.onAttackHit();
        }, 300); // 假设在动画播放到30%时造成伤害
    }

    onAttackHit() {
        if (!this._currentTarget || this._isDead || this._currentTarget.isDead()) {
            this._isAttacking = false;
            this._currentTarget = null;
            return;
        }

        console.log(`⚔️ 玩家攻击怪物，造成 ${this.attackDamage} 点伤害`);
        this._currentTarget.takeDamage(this.attackDamage);
        
        this._isAttacking = false;
        this._currentCooldown = this.attackCooldown;
        
        // 如果怪物死亡，清除目标
        if (this._currentTarget.isDead()) {
            this._currentTarget = null;
        }
        
        // 回到空闲状态
        setTimeout(() => {
            if (!this._isDead) {
                this.playAnimation(this.idleAnim);
            }
        }, 200);
    }

    takeDamage(damage: number) {
        if (this._isDead) return;

        this._currentHealth -= damage;
        console.log(`💔 玩家受到 ${damage} 点伤害，剩余血量: ${this._currentHealth}`);

        if (this._currentHealth <= 0) {
            this.die();
        }
    }

    die() {
        this._isDead = true;
        this.playAnimation(this.dieAnim);
        
        console.log("☠️ 玩家死亡");

        // 游戏结束逻辑
        setTimeout(() => {
            // 重新开始游戏或显示游戏结束界面
            console.log("🎮 游戏结束");
        }, 2000);
    }

    playAnimation(animName: string) {
        if (!this.animComponent) return;

        if (this.animComponent.getState(animName)) {
            this.animComponent.play(animName);
        }
    }

    getHealth(): number {
        return this._currentHealth;
    }

    getAttackDamage(): number {
        return this.attackDamage;
    }

    isDead(): boolean {
        return this._isDead;
    }

    isAttacking(): boolean {
        return this._isAttacking;
    }

    // 升级玩家阶级
    upgradeToTier2() {
        if (this.playerTier === 2) return;

        this.playerTier = 2;
        this.attackDamage = 100;
        console.log("🌟 玩家升级到2阶，攻击力提升至100");
    }
}