import { _decorator, Component, Node, Collider, ITriggerEvent } from 'cc';
import { MeatDeliverySystem } from './MeatDeliverySystem';
import { PlayerController } from './PlayerController';
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
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.isTrigger = true;
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
        }
    }
    
    update(deltaTime: number) {
        if (this._playerInZone && this.autoDelivery) {
            this.continuousDelivery(deltaTime);
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        if (event.otherCollider.node.name === 'Player') {
            this._playerInZone = true;
            this._playerNode = event.otherCollider.node;
            this._deliveryTimer = 0;
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        if (event.otherCollider.node.name === 'Player') {
            this._playerInZone = false;
            this._playerNode = null;
            this._deliveryTimer = 0;
        }
    }
    
    continuousDelivery(deltaTime: number) {
        if (!this._playerNode || !this.meatDeliverySystem) return;
        
        // 🆕 使用类型断言
        const playerController = this._playerNode.getComponent(PlayerController);
        const deliverySystem = this.meatDeliverySystem.getComponent(MeatDeliverySystem);
        
        if (!playerController || !deliverySystem) return;
        
        // 🆕 现在可以直接调用方法，有类型提示
        if (!playerController.hasMeat()) {
            this._deliveryTimer = 0;
            return;
        }
        
        this._deliveryTimer += deltaTime;
        const interval = 1.0 / this.deliveryRate;
        
        if (this._deliveryTimer >= interval) {
            this.tryDeliverMeat();
            this._deliveryTimer = 0;
        }
    }
    
    tryDeliverMeat() {
        if (!this._playerNode || !this.meatDeliverySystem) {
            console.error("DeliveryZone: Cannot deliver - missing player or delivery system");
            return;
        }
        
        const playerController = this._playerNode.getComponent(PlayerController);
        const deliverySystem = this.meatDeliverySystem.getComponent(MeatDeliverySystem);
        
        if (!playerController || !deliverySystem) {
            console.error("DeliveryZone: Cannot deliver - missing components");
            return;
        }
        
        if (!playerController.hasMeat()) {
            return;
        }
        
        const meatNode = playerController.deliverOneMeat();
        if (!meatNode) {
            // console.error("DeliveryZone: Failed to get meat node");
            return;
        }
        
        deliverySystem.deliverMeat(meatNode);
    }
}