import { _decorator, Component, Node, Collider, ICollisionEvent } from 'cc';
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
    
    start() {
        // 设置碰撞器为触发器
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.isTrigger = true;
        }
    }
    
    update(deltaTime: number) {
        // 可以在这里添加交付区域的视觉效果
        // 比如旋转、脉冲等
    }
    
    // 🆕 可选：手动触发交付
    triggerDelivery() {
        if (this._playerInZone && this._playerNode) {
            const playerController = this._playerNode.getComponent(PlayerController);
            if (playerController && playerController.hasMeat()) {
                playerController.deliverAllMeat();
            }
        }
    }
}