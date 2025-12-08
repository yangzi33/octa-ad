import { _decorator, Component, Node, Collider, ITriggerEvent, Vec3, tween } from 'cc';
import { PlayerController } from './PlayerController';
import { CookedMeatDeliverySystem } from './CookedMeatDeliverySystem';
const { ccclass, property } = _decorator;

@ccclass('ObtainCookedZone')
export class ObtainCookedZone extends Component {
    @property
    obtainRate: number = 1;
    
    @property(Node)
    cookedMeatDeliverySystem: Node = null;    // 使用 CookedMeatDeliverySystem 管理熟肉
    
    private _playerInZone: boolean = false;
    private _playerNode: Node = null;
    private _obtainTimer: number = 0;
    
    onLoad() {
        console.log("✅ ObtainCookedZone 脚本已加载");
        
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
            console.log("🌟 玩家进入熟肉获取区域!");
            this._playerInZone = true;
            this._playerNode = event.otherCollider.node;
            this._obtainTimer = 0;
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        if (event.otherCollider.node.name === 'Player') {
            console.log("玩家离开熟肉获取区域");
            this._playerInZone = false;
            this._playerNode = null;
            this._obtainTimer = 0;
        }
    }
    
    continuousObtain(deltaTime: number) {
        if (!this._playerNode || !this.cookedMeatDeliverySystem) return;
        
        const playerController = this._playerNode.getComponent(PlayerController);
        if (!playerController) {
            console.warn("❌ ObtainCookedZone: 未找到 PlayerController 组件");
            return;
        }
        
        const cookedSystem = this.cookedMeatDeliverySystem.getComponent(CookedMeatDeliverySystem);
        if (!cookedSystem) {
            console.warn("❌ ObtainCookedZone: 未找到 CookedMeatDeliverySystem 组件");
            return;
        }
        
        this._obtainTimer += deltaTime;
        const interval = 1.0 / this.obtainRate;
        
        if (this._obtainTimer < interval) {
            return;
        }
        
        // 达到获取间隔
        this._obtainTimer = 0;
        
        if (!cookedSystem.hasCookedMeat()) {
            return;
        }
        
        const cookedMeat = cookedSystem.takeCookedMeat();
        if (cookedMeat) {
            this.flyCookedMeatToPlayerBack(cookedMeat, playerController);
            console.log("🍖 ObtainCookedZone: 玩家获得熟肉!");
        }
    }
    
    // 熟肉从当前位置飞到玩家背上，并作为熟肉加入玩家
    flyCookedMeatToPlayerBack(cookedMeat: Node, playerController: PlayerController) {
        if (!this._playerNode || !cookedMeat) return;
        
        // 确保在场景中
        cookedMeat.parent = this.node.scene;
        
        const startPos = cookedMeat.worldPosition.clone();
        const targetPos = this._playerNode.worldPosition.clone();
        
        console.log("✈️ ObtainCookedZone: 熟肉飞向玩家");
        
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
                console.log("✅ ObtainCookedZone: 熟肉到达玩家");
                playerController.obtainCookedMeat(cookedMeat);
            })
            .start();
    }
    
    // 计算飞行路径（与 ObtainZone 相同风格）
    calculateFlightPath(start: Vec3, end: Vec3, ratio: number): Vec3 {
        const current = new Vec3();
        Vec3.lerp(current, start, end, ratio);
        
        const arcHeight = 2.0;
        const height = Math.sin(ratio * Math.PI) * arcHeight;
        current.y += height;
        
        return current;
    }
}


