// PlayerDebug.ts
import { _decorator, Component, Node, Collider, ITriggerEvent, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerDebug')
export class PlayerDebug extends Component {
    private _collider: Collider = null;
    
    onLoad() {
        this._collider = this.getComponent(Collider);
        if (this._collider) {
            console.log("✅ Player碰撞器找到:", this._collider);
            
            this._collider.on('onTriggerEnter', this.onTriggerEnter, this);
            this._collider.on('onTriggerStay', this.onTriggerStay, this);
            this._collider.on('onTriggerExit', this.onTriggerExit, this);
        } else {
            console.error("❌ Player没有碰撞器");
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        console.log("🎯 Player触发进入:", {
            碰撞物体: event.otherCollider.node.name,
            物体位置: event.otherCollider.node.position,
            玩家位置: this.node.position,
            距离: Vec3.distance(this.node.position, event.otherCollider.node.position)
        });
    }
    
    onTriggerStay(event: ITriggerEvent) {
        // 持续触发，用于调试
        if (event.otherCollider.node.name.includes('Meat')) {
            console.log("🔄 Player持续接触肉块");
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        console.log("🚪 Player触发离开:", event.otherCollider.node.name);
    }
    
    update() {
        // 实时显示玩家位置和碰撞器状态
        if (this._collider) {
            console.log("📍 Player位置:", this.node.position, "碰撞器启用:", this._collider.enabled);
        }
    }
}