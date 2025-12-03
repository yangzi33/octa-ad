import { _decorator, Component, Node, Collider, ITriggerEvent, Prefab, instantiate, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ObtainZone')
export class ObtainZone extends Component {
    @property
    obtainRate: number = 1;
    
    @property(Node)
    meatDeliverySystem: Node = null;              // 切片肉交付系统（旧）
    
    @property(Node)
    cookedMeatDeliverySystem: Node = null;        // 🆕 熟肉交付系统（只管理已有的熟肉节点）
    
    @property(Prefab)
    slicedMeatPrefab: Prefab = null;              // 切片肉预制体（旧）
    
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
        if (!this._playerNode) return;
        
        const playerController = this._playerNode.getComponent('PlayerController') as any;
        if (!playerController) return;
        
        this._obtainTimer += deltaTime;
        const interval = 1.0 / this.obtainRate;
        
        if (this._obtainTimer < interval) {
            return;
        }
        
        // 达到获取间隔，尝试获取肉块
        this._obtainTimer = 0;
        
        // 优先处理熟肉获取（新逻辑）
        if (this.cookedMeatDeliverySystem) {
            const cookedSystem = this.cookedMeatDeliverySystem.getComponent('CookedMeatDeliverySystem') as any;
            if (!cookedSystem) {
                console.warn("❌ ObtainZone: 未找到 CookedMeatDeliverySystem 组件");
                return;
            }
            
            if (!cookedSystem.hasCookedMeat()) {
                return;
            }

            const cookedFromSystem = cookedSystem.takeCookedMeat();
            if (cookedFromSystem) {
                // 直接使用系统中已有的熟肉节点，从当前位置飞到玩家背上
                this.flyCookedMeatToPlayerBack(cookedFromSystem, playerController);
                console.log("🍖 玩家获得熟肉!");
            }
            
            return;
        }
        
        // 兼容：旧的切片肉获取逻辑（如果没有配置熟肉系统）
        if (this.meatDeliverySystem && this.slicedMeatPrefab) {
            const deliverySystem = this.meatDeliverySystem.getComponent('MeatDeliverySystem') as any;
            if (!deliverySystem) {
                console.warn("❌ ObtainZone: 未找到 MeatDeliverySystem 组件");
                return;
            }
            
            if (!deliverySystem.hasSlicedMeat()) {
                return;
            }
            
            const slicedFromTable = deliverySystem.takeSlicedMeat();
            if (slicedFromTable) {
                const slicedMeat = instantiate(this.slicedMeatPrefab);
                this.flyToPlayerBack(slicedMeat, playerController);
                console.log("🔪 玩家获得切片肉!");
            }
        }
    }
    
    // 🆕 切片肉飞到玩家背上（保持原有逻辑）
    flyToPlayerBack(slicedMeat: Node, playerController: any) {
        if (!this._playerNode || !slicedMeat) return;
        
        // 设置初始位置在获取区域
        slicedMeat.setWorldPosition(this.node.worldPosition);
        slicedMeat.parent = this.node.scene;
        
        const startPos = slicedMeat.worldPosition.clone();
        const targetPos = this._playerNode.worldPosition.clone();
        
        console.log("✈️ 煮好的肉块飞向玩家");
        
        tween(slicedMeat)
            .to(0.6, {
                position: targetPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = this.calculateFlightPath(startPos, targetPos, ratio);
                    target.setWorldPosition(currentPos);
                }
            })
            .call(() => {
                console.log("✅ 切片肉到达玩家");
                
                // 🆕 交给玩家控制器处理堆叠（切片肉）
                playerController.obtainSlicedMeat(slicedMeat);
            })
            .start();
    }
    
    // 🆕 熟肉从当前位置飞到玩家背上，并作为熟肉加入玩家
    flyCookedMeatToPlayerBack(cookedMeat: Node, playerController: any) {
        if (!this._playerNode || !cookedMeat) return;
        
        // 确保在场景中
        cookedMeat.parent = this.node.scene;
        
        const startPos = cookedMeat.worldPosition.clone();
        const targetPos = this._playerNode.worldPosition.clone();
        
        console.log("✈️ 熟肉飞向玩家");
        
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
                console.log("✅ 熟肉到达玩家");
                
                // 交给玩家控制器处理堆叠（熟肉）
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