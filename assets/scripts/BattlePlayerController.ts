import { _decorator, Component, Node, Animation, Collider, ICollisionEvent } from 'cc';
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

    private _currentHealth: number = 100;
    private _attackDamage: number = 50; // 1阶攻击力
    private _isDead: boolean = false;
    private _isAttacking: boolean = false;
    private _currentTarget: Node = null;

    onLoad() {
        this._currentHealth = this.maxHealth;
        
        // 根据阶级设置攻击力
        if (this.playerTier === 2) {
            this._attackDamage = 100;
        }

        // 设置碰撞器
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onCollisionEnter', this.onCollisionEnter, this);
        }
    }

    start() {
        this.playAnimation(this.idleAnim);
    }

    update(deltaTime: number) {
        // 战斗逻辑更新
    }

    // 玩家攻击方法
    attack(target?: Node) {
        if (this._isDead || this._isAttacking) return;

        this._isAttacking = true;
        this._currentTarget = target || this._currentTarget;

        this.playAnimation(this.attackAnim);

        // 在动画播放到攻击帧时造成伤害
        setTimeout(() => {
            this.onAttackHit();
        }, 300); // 假设在动画播放到30%时造成伤害
    }

    onAttackHit() {
        if (!this._currentTarget || this._isDead) return;

        const mobController = this._currentTarget.getComponent('MobController') as MobController;
        if (mobController && !mobController.isDead()) {
            console.log(`⚔️ 玩家攻击怪物，造成 ${this._attackDamage} 点伤害`);
            mobController.takeDamage(this._attackDamage);
        }

        this._isAttacking = false;
        
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

    setTarget(target: Node) {
        this._currentTarget = target;
    }

    // 碰撞检测
    onCollisionEnter(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        
        // 检测是否碰撞到怪物
        if (otherNode.getComponent('MobController')) {
            this._currentTarget = otherNode;
        }
    }

    getHealth(): number {
        return this._currentHealth;
    }

    getAttackDamage(): number {
        return this._attackDamage;
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
        this._attackDamage = 100;
        console.log("🌟 玩家升级到2阶，攻击力提升至100");
    }
}