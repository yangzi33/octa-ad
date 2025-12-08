import { _decorator, Component, Node, Vec3, Collider, ITriggerEvent, RigidBody, ICollisionEvent } from 'cc';
import { MeatSpawner } from './MeatSpawner';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('Meat')
export class Meat extends Component {
    @property
    attractDistance: number = 2; // 吸附距离
    
    @property
    attractSpeed: number = 5; // 吸附速度
    
    private _spawner: MeatSpawner = null;
    private _isAttracted: boolean = false;
    private _targetPlayer: Node = null;
    private _collider: Collider = null;
    private _rigidBody: RigidBody = null;
    
    setup(spawner: MeatSpawner) {
        this._spawner = spawner;
    }
    
    onLoad() {
        // 🆕 获取碰撞器和刚体组件
        this._collider = this.node.getComponent(Collider);
        this._rigidBody = this.node.getComponent(RigidBody);
        
        // 🆕 重要：肉块必须是触发器，这样玩家才能穿过它
        if (this._collider) {
            this._collider.isTrigger = true;
            
            // 🆕 注册触发器事件
            this._collider.on('onTriggerEnter', this.onTriggerEnter, this);
        }
        
        // 🆕 如果有刚体，确保设置合适的属性
        if (this._rigidBody) {
            this._rigidBody.type = RigidBody.Type.DYNAMIC;
            this._rigidBody.mass = 0.1; // 很小的质量
            this._rigidBody.linearDamping = 0.5;
            this._rigidBody.angularDamping = 0.5;
        }
    }
    
    start() {
        // console.log("🥩 肉块初始化完成", {
        //     碰撞器: this._collider ? this._collider.constructor.name : '无',
        //     isTrigger: this._collider ? this._collider.isTrigger : '无',
        //     刚体: this._rigidBody ? '存在' : '无'
        // });
    }
    
    // 🆕 使用触发器进入事件
    onTriggerEnter(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        if (otherNode.name === 'Player') {
            // console.log("🔵 触发器检测到玩家!");
            this.startAttraction(otherNode);
        }
    }
    
    startAttraction(player: Node) {
        // 防止重复触发
        if (this._isAttracted) return;
        
        this._isAttracted = true;
        this._targetPlayer = player;
        
        // 🆕 关闭碰撞器，防止重复触发
        if (this._collider) {
            this._collider.enabled = false;
        }
        
        // 🆕 关闭刚体，防止物理干扰
        if (this._rigidBody) {
            this._rigidBody.enabled = false;
        }
        
        // console.log("🥩 开始吸附到玩家");
    }
    
    update(deltaTime: number) {
        if (this._isAttracted && this._targetPlayer) {
            this.moveToPlayer(deltaTime);
        }
    }
    
    moveToPlayer(deltaTime: number) {
        if (!this._targetPlayer) return;
        
        const targetPos = this._targetPlayer.position;
        const currentPos = this.node.position;
        
        // 计算移动方向
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, currentPos);
        const distance = direction.length();
        
        // 🆕 如果距离很近，调用PlayerController的收集方法
        if (distance < 0.5) {
            this.transferToPlayer();
            return;
        }
        
        // 标准化方向并移动
        direction.normalize();
        const newPos = new Vec3(
            currentPos.x + direction.x * this.attractSpeed * deltaTime,
            currentPos.y + direction.y * this.attractSpeed * deltaTime,
            currentPos.z + direction.z * this.attractSpeed * deltaTime
        );
        
        this.node.setPosition(newPos);
    }
    
    // 🆕 将肉块转移给PlayerController处理
    transferToPlayer() {
        // console.log("🥩 肉块接近玩家，准备转移给PlayerController");
        
        // 🆕 获取PlayerController并调用收集方法
        const playerController = this._targetPlayer.getComponent(PlayerController);
        if (playerController) {
            // 🆕 停止吸附
            this._isAttracted = false;
            
            // 🆕 调用PlayerController的收集方法
            playerController.collectMeatDirectly(this.node);
            
            // 🆕 从spawner中移除
            if (this._spawner) {
                this._spawner.removeMeat(this.node);
            }
            
            // console.log("🥩 肉块已转移给PlayerController");
        } else {
            console.error("玩家缺少PlayerController组件!");
        }
    }
    
    onDestroy() {
        // 清理事件监听
        if (this._collider) {
            this._collider.off('onTriggerEnter', this.onTriggerEnter, this);
        }
    }
}