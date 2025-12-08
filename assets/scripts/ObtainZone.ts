import { _decorator, Component, Node, Collider, ITriggerEvent, Prefab, instantiate, Vec3, tween } from 'cc';
import { PlayerController } from './PlayerController';
import { CookedMeatDeliverySystem } from './CookedMeatDeliverySystem';
import { MeatDeliverySystem } from './MeatDeliverySystem';
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
            this._playerInZone = true;
            this._playerNode = event.otherCollider.node;
            this._obtainTimer = 0;
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        if (event.otherCollider.node.name === 'Player') {
            this._playerInZone = false;
            this._playerNode = null;
            this._obtainTimer = 0;
        }
    }
    
    continuousObtain(deltaTime: number) {
        if (!this._playerNode) return;
        
        const playerController = this._playerNode.getComponent(PlayerController);
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
            const cookedSystem = this.cookedMeatDeliverySystem.getComponent(CookedMeatDeliverySystem);
            if (!cookedSystem) {
                console.warn("ObtainZone: CookedMeatDeliverySystem component not found");
                return;
            }
            
            if (!cookedSystem.hasCookedMeat()) {
                return;
            }

            const cookedFromSystem = cookedSystem.takeCookedMeat();
            if (cookedFromSystem) {
                this.flyCookedMeatToPlayerBack(cookedFromSystem, playerController);
            }
            
            return;
        }
        
        // 兼容：旧的切片肉获取逻辑（如果没有配置熟肉系统）
        if (this.meatDeliverySystem && this.slicedMeatPrefab) {
            const deliverySystem = this.meatDeliverySystem.getComponent(MeatDeliverySystem);
            if (!deliverySystem) {
                console.warn("ObtainZone: MeatDeliverySystem component not found");
                return;
            }
            
            if (!deliverySystem.hasSlicedMeat()) {
                return;
            }
            
            const slicedFromTable = deliverySystem.takeSlicedMeat();
            if (slicedFromTable) {
                const slicedMeat = instantiate(this.slicedMeatPrefab);
                this.flyToPlayerBack(slicedMeat, playerController);
            }
        }
    }
    
    // 🆕 切片肉飞到玩家背上（保持原有逻辑）
    flyToPlayerBack(slicedMeat: Node, playerController: PlayerController) {
        if (!this._playerNode || !slicedMeat) return;
        
        // 设置初始位置在获取区域
        slicedMeat.setWorldPosition(this.node.worldPosition);
        slicedMeat.parent = this.node.scene;
        
        const startPos = slicedMeat.worldPosition.clone();
        const targetPos = this._playerNode.worldPosition.clone();
        
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
                playerController.obtainSlicedMeat(slicedMeat);
            })
            .start();
    }
    
    // 🆕 熟肉从当前位置飞到玩家背上，并作为熟肉加入玩家
    flyCookedMeatToPlayerBack(cookedMeat: Node, playerController: PlayerController) {
        if (!this._playerNode || !cookedMeat) return;
        
        // 获取世界位置（在改变parent之前）
        const startPos = cookedMeat.worldPosition.clone();
        const targetPos = this._playerNode.worldPosition.clone();
        
        // 确保在场景中（从原位置分离）
        cookedMeat.parent = this.node.scene;
        
        // 立即设置世界位置，确保从原位置开始飞行
        cookedMeat.setWorldPosition(startPos);
        
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