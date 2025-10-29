import { _decorator, Component, Node, Vec3, Collider, ITriggerEvent } from 'cc';
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
    
    setup(spawner: MeatSpawner) {
        this._spawner = spawner;
    }
    
    onLoad() {
        // 在onLoad中获取碰撞器，确保组件已初始化
        this._collider = this.getComponent(Collider);
    }
    
    start() {
        // 确保碰撞器存在并设置触发器事件
        if (this._collider) {
            this._collider.on('onTriggerEnter', this.onTriggerEnter, this);
            console.log("肉块碰撞器已设置");
        } else {
            console.error("肉块缺少碰撞器组件!");
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        console.log("肉块触发碰撞:", event.otherCollider.node.name);
        
        // 检测玩家进入吸附范围
        if (event.otherCollider.node.name.includes('Player')) {
            console.log("玩家碰到肉块!");
            this.startAttraction(event.otherCollider.node);
        }
    }
    
    startAttraction(player: Node) {
        // 防止重复触发
        if (this._isAttracted) return;
        
        this._isAttracted = true;
        this._targetPlayer = player;
        
        // 关闭碰撞器，防止重复触发
        if (this._collider) {
            this._collider.enabled = false;
        }
        
        // 通知玩家开始收集肉块
        const playerController = player.getComponent(PlayerController);
        if (playerController) {
            playerController.startCollectingMeat(this.node);
        } else {
            console.error("玩家缺少PlayerController组件!");
        }
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
        
        // 如果距离很近，直接完成收集
        if (direction.length() < 0.3) {
            this.completeCollection();
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
    
    completeCollection() {
        console.log("肉块收集完成");
        
        if (this._spawner) {
            this._spawner.removeMeat(this.node);
        }
        
        this.node.destroy();
    }
    
    onDestroy() {
        // 清理事件监听
        if (this._collider) {
            this._collider.off('onTriggerEnter', this.onTriggerEnter, this);
        }
    }
}