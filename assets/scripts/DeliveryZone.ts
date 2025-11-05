import { _decorator, Component, Node, Collider, ITriggerEvent } from 'cc';
import { MeatDeliverySystem } from './MeatDeliverySystem';
const { ccclass, property } = _decorator;

@ccclass('DeliveryZone')
export class DeliveryZone extends Component {
    @property
    autoDelivery: boolean = true;
    
    @property
    deliveryRate: number = 1;
    
    @property(Node)
    meatDeliverySystem: Node = null;
    
    private _playerInZone: boolean = false;
    private _playerNode: Node = null;
    private _deliveryTimer: number = 0;
    
    onLoad() {
        console.log("✅ DeliveryZone脚本已加载");
        
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.isTrigger = true;
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
        }
    }
    
    update(deltaTime: number) {
        if (this._playerInZone && this.autoDelivery) {
            console.log("222");
            this.continuousDelivery(deltaTime);
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        console.log("🎯 触发进入:", event.otherCollider.node.name);
        
        if (event.otherCollider.node.name === 'Player') {
            console.log("🌟 玩家进入交付区域!");
            this._playerInZone = true;
            this._playerNode = event.otherCollider.node;
            this._deliveryTimer = 0;
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        console.log("🚪 触发离开:", event.otherCollider.node.name);
        
        if (event.otherCollider.node.name === 'Player') {
            console.log("玩家离开交付区域");
            this._playerInZone = false;
            this._playerNode = null;
            this._deliveryTimer = 0;
        }
    }
    
    continuousDelivery(deltaTime: number) {
        if (!this._playerNode || !this.meatDeliverySystem) return;
        
        // 🆕 使用类型断言
        const playerController = this._playerNode.getComponent('PlayerController') as any;
        const deliverySystem = this.meatDeliverySystem.getComponent('MeatDeliverySystem') as any;
        
        if (!playerController || !deliverySystem) return;
        
        // 🆕 现在可以直接调用方法，有类型提示
        if (!playerController.hasMeat()) {
            this._deliveryTimer = 0;
            return;
        }
        
        this._deliveryTimer += deltaTime;
        const interval = 1.0 / this.deliveryRate;
        
        if (this._deliveryTimer >= interval) {
            console.log("111");
            this.tryDeliverMeat();
            this._deliveryTimer = 0;
        }
    }
    
    tryDeliverMeat() {
        if (!this._playerNode || !this.meatDeliverySystem) {
            console.error("❌ 无法交付：缺少玩家或交付系统");
            return;
        }
        
        // 🆕 使用类型断言
        const playerController = this._playerNode.getComponent('PlayerController') as any;
        const deliverySystem = this.meatDeliverySystem.getComponent('MeatDeliverySystem') as MeatDeliverySystem;
        
        if (!playerController || !deliverySystem) {
            console.error("❌ 无法交付：缺少组件");
            return;
        }
        
        // 🆕 现在有类型提示，可以调用方法
        if (!playerController.hasMeat()) {
            console.log("⚠️ 玩家没有肉块可交付");
            return;
        }
        
        console.log("📦 尝试交付肉块...");
        
        // 🆕 调用方法（现在有类型提示）
        const meatNode = playerController.deliverOneMeat();
        if (!meatNode) {
            console.error("❌ 无法获取肉块节点");
            return;
        }
        
        console.log("✅ 获取到肉块节点:", meatNode.name);
        
        // 🆕 调用交付系统方法
        deliverySystem.deliverMeat(meatNode, () => {
            console.log("🎉 肉块交付流程完成!");
        });
    }
}