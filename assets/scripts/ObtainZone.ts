import { _decorator, Component, Node, Collider, ITriggerEvent, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ObtainZone')
export class ObtainZone extends Component {
    @property
    obtainRate: number = 1;
    
    @property(Node)
    meatDeliverySystem: Node = null;
    
    @property(Prefab)
    cookedMeatPrefab: Prefab = null;
    
    private _playerInZone: boolean = false;
    private _playerNode: Node = null;
    private _obtainTimer: number = 0;
    
    onLoad() {
        console.log("✅ ObtainZone脚本已加载");
        
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.isTrigger = true;
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
        }
    }
    
    update(deltaTime: number) {
        if (this._playerInZone) {
            this.continuousObtain(deltaTime);
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        if (event.otherCollider.node.name === 'Player') {
            console.log("🌟 玩家进入获取区域!");
            this._playerInZone = true;
            this._playerNode = event.otherCollider.node;
            this._obtainTimer = 0;
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        if (event.otherCollider.node.name === 'Player') {
            console.log("玩家离开获取区域");
            this._playerInZone = false;
            this._playerNode = null;
            this._obtainTimer = 0;
        }
    }
    
    continuousObtain(deltaTime: number) {
        if (!this._playerNode || !this.meatDeliverySystem || !this.cookedMeatPrefab) return;
        
        // 🆕 使用类型断言
        const playerController = this._playerNode.getComponent('PlayerController') as any;
        const deliverySystem = this.meatDeliverySystem.getComponent('MeatDeliverySystem') as any;
        
        if (!playerController || !deliverySystem) return;
        
        // 🆕 检查交付系统是否有切好的肉块
        if (!deliverySystem.hasSlicedMeat()) {
            this._obtainTimer = 0;
            return;
        }
        
        this._obtainTimer += deltaTime;
        const interval = 1.0 / this.obtainRate;
        
        if (this._obtainTimer >= interval) {
            // 🆕 从交付系统获取切好的肉块
            const slicedMeat = deliverySystem.takeSlicedMeat();
            if (slicedMeat) {
                // 🆕 创建煮好的肉块给玩家
                const cookedMeat = instantiate(this.cookedMeatPrefab);
                playerController.obtainCookedMeat(cookedMeat);
                
                // 销毁切好的肉块
                slicedMeat.destroy();
                
                console.log("🍖 玩家获得煮好的肉块!");
            }
            
            this._obtainTimer = 0;
        }
    }
}