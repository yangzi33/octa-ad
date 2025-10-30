import { _decorator, Component, Node, Collider, ITriggerEvent } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('DeliveryZone')
export class DeliveryZone extends Component {
    @property
    autoDelivery: boolean = true; // 是否自动交付
    
    @property
    deliveryRate: number = 1; // 交付速率（每秒交付数量）
    
    private _playerInZone: boolean = false;
    private _playerNode: Node = null;
    
    onLoad() {
        console.log("✅ DeliveryZone脚本已加载");
        
        // 设置碰撞器为触发器
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.isTrigger = true;
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
            console.log("✅ 碰撞器事件已注册");
        } else {
            console.error("❌ DeliveryZone缺少碰撞器组件!");
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        console.log("🎯 触发进入:", event.otherCollider.node.name);
        
        // 检测玩家进入
        if (event.otherCollider.node.name === 'Player') {
            console.log("🌟 玩家进入交付区域!");
            this._playerInZone = true;
            this._playerNode = event.otherCollider.node;
            
            // 🆕 自动触发交付
            if (this.autoDelivery) {
                this.triggerDelivery();
            }
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        console.log("🚪 触发离开:", event.otherCollider.node.name);
        
        if (event.otherCollider.node.name === 'Player') {
            console.log("玩家离开交付区域");
            this._playerInZone = false;
            this._playerNode = null;
        }
    }
    
    update(deltaTime: number) {
        // 🆕 持续交付逻辑（如果玩家在区域内）
        if (this._playerInZone && this.autoDelivery) {
            this.continuousDelivery(deltaTime);
        }
    }
    
    // 🆕 持续交付
    continuousDelivery(deltaTime: number) {
        // 这里可以添加计时器逻辑，比如每秒交付一块肉
        // 暂时先不实现，用即时交付
    }
    
    // 🎯 手动触发交付
    triggerDelivery() {
        console.log("🎯 triggerDelivery方法被调用!");
        
        if (this._playerInZone && this._playerNode) {
            const playerController = this._playerNode.getComponent('PlayerController') as PlayerController;
            if (playerController) {
                console.log("✅ 找到PlayerController，开始交付");
                playerController.deliverAllMeat();
            } else {
                console.error("❌ 玩家没有PlayerController组件!");
            }
        } else {
            console.log("⚠️ 没有玩家在交付区域内");
        }
    }
    
    onDestroy() {
        // 清理事件监听
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.off('onTriggerEnter', this.onTriggerEnter, this);
            collider.off('onTriggerExit', this.onTriggerExit, this);
        }
    }
}