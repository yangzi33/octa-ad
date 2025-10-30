import { _decorator, Component, Node, Collider, ITriggerEvent, Prefab, instantiate, Vec3, tween } from 'cc';
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
        
        const playerController = this._playerNode.getComponent('PlayerController') as any;
        const deliverySystem = this.meatDeliverySystem.getComponent('MeatDeliverySystem') as any;
        
        if (!playerController || !deliverySystem) return;
        
        // 检查交付系统是否有切好的肉块
        if (!deliverySystem.hasSlicedMeat()) {
            this._obtainTimer = 0;
            return;
        }
        
        this._obtainTimer += deltaTime;
        const interval = 1.0 / this.obtainRate;
        
        if (this._obtainTimer >= interval) {
            // 从交付系统获取切好的肉块
            const slicedMeat = deliverySystem.takeSlicedMeat();
            if (slicedMeat) {
                // 🆕 创建煮好的肉块
                const cookedMeat = instantiate(this.cookedMeatPrefab);
                
                // 🆕 播放飞到玩家背上的动画
                this.flyToPlayerBack(cookedMeat, playerController);
                
                console.log("🍖 玩家获得煮好的肉块!");
            }
            
            this._obtainTimer = 0;
        }
    }
    
    // 🆕 煮好的肉块飞到玩家背上
    flyToPlayerBack(cookedMeat: Node, playerController: any) {
        if (!this._playerNode || !cookedMeat) return;
        
        // 设置初始位置在获取区域
        cookedMeat.setWorldPosition(this.node.worldPosition);
        cookedMeat.parent = this.node.scene;
        
        const startPos = cookedMeat.worldPosition.clone();
        const targetPos = this._playerNode.worldPosition.clone();
        
        console.log("✈️ 煮好的肉块飞向玩家");
        
        tween(cookedMeat)
            .to(0.6, {
                position: targetPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = this.calculateFlightPath(startPos, targetPos, ratio);
                    target.setWorldPosition(currentPos);
                }
            })
            .call(() => {
                console.log("✅ 煮好的肉块到达玩家");
                
                // 🆕 交给玩家控制器处理堆叠
                playerController.obtainCookedMeat(cookedMeat);
            })
            .start();
    }
    
    // 🆕 计算飞行路径
    calculateFlightPath(start: Vec3, end: Vec3, ratio: number): Vec3 {
        const current = new Vec3();
        Vec3.lerp(current, start, end, ratio);
        
        // 添加轻微的弧线
        const arcHeight = 2.0;
        const height = Math.sin(ratio * Math.PI) * arcHeight;
        current.y += height;
        
        return current;
    }
}