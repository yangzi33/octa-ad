import { _decorator, Component, Node, Collider, ITriggerEvent, Vec3, tween } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('FinalZone')
export class FinalZone extends Component {
    @property
    obtainRate: number = 1;
    
    @property(Node)
    targetNode: Node = null;
    
    @property
    waitTime: number = 2.0;
    
    @property
    flightHeight: number = 2.0;

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
            
            // 立即尝试获取一次
            this.tryObtainCookedMeat();
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
        if (!this._playerInZone || !this._playerNode || !this.targetNode) {
            return;
        }
        
        const playerController = this._playerNode.getComponent(PlayerController);
        if (!playerController) {
            console.error("FinalZone: PlayerController component not found");
            return;
        }
        
        // 检查玩家是否有煮好的肉块
        const hasCookedMeat = playerController.hasCookedMeat ? playerController.hasCookedMeat() : false;
        
        if (!hasCookedMeat) {
            this._obtainTimer = 0;
            return;
        }
        
        this._obtainTimer += deltaTime;
        const interval = 1.0 / this.obtainRate;
        
        if (this._obtainTimer >= interval) {
            this.tryObtainCookedMeat();
            this._obtainTimer = 0;
        }
    }
    
    // 从玩家身上获取煮好的肉块
    tryObtainCookedMeat() {
        if (!this._playerNode || !this.targetNode) {
            console.error("FinalZone: Cannot obtain - missing player or target node");
            return;
        }
        
        const playerController = this._playerNode.getComponent(PlayerController);
        if (!playerController) {
            console.error("FinalZone: Cannot obtain - missing PlayerController component");
            return;
        }
        
        // 检查玩家是否有煮好的肉块
        if (!playerController.hasCookedMeat || !playerController.hasCookedMeat()) {
            return;
        }
        
        // 从玩家身上移除煮好的肉块
        const cookedMeat = playerController.deliverOneCookedMeat();
        if (!cookedMeat) {
            console.error("FinalZone: Failed to remove meat from player");
            return;
        }
        
        // 飞到目标节点
        this.flyToTargetAndWait(cookedMeat);
    }
    
    flyToTargetAndWait(cookedMeat: Node) {
        if (!cookedMeat || !cookedMeat.isValid || !this.targetNode) {
            console.error("FinalZone: Flight failed - meat or target node invalid");
            return;
        }
        
        // 确保肉块在场景中
        if (cookedMeat.parent) {
            cookedMeat.parent = null;
        }
        cookedMeat.parent = this.node.scene;
        
        const startPos = cookedMeat.worldPosition.clone();
        const targetPos = this.targetNode.worldPosition.clone();
        
        // 飞到目标节点
        tween(cookedMeat)
            .to(0.8, { 
                position: targetPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    try {
                        const currentPos = this.calculateFlightPath(startPos, targetPos, ratio);
                        target.setWorldPosition(currentPos);
                        target.setRotationFromEuler(0, ratio * 360, 0);
                    } catch (error) {
                        console.error("FinalZone: Flight update error:", error);
                    }
                }
            })
            .call(() => {
                // 等待指定时间
                this.scheduleOnce(() => {
                    this.destroyAndAction(cookedMeat);
                }, this.waitTime);
            })
            .start();
    }
    
    destroyAndAction(cookedMeat: Node) {
        if (!cookedMeat || !cookedMeat.isValid) {
            console.error("FinalZone: Destroy failed - meat invalid");
            return;
        }
        
        // 销毁肉块
        cookedMeat.destroy();
        
        // 执行动作
        this.executeFinalAction();
    }
    
    executeFinalAction() {
        // 触发事件
        this.node.emit('onFinalAction');
        
        // 播放简单效果
        this.playSimpleEffect();
    }
    
    playSimpleEffect() {
        if (this.targetNode) {
            const originalScale = this.targetNode.scale.clone();
            
            tween(this.targetNode)
                .to(0.1, { scale: new Vec3(1.2, 1.2, 1.2) })
                .to(0.1, { scale: originalScale })
                .start();
        }
    }
    
    calculateFlightPath(start: Vec3, end: Vec3, ratio: number): Vec3 {
        const current = new Vec3();
        Vec3.lerp(current, start, end, ratio);
        
        const height = Math.sin(ratio * Math.PI) * this.flightHeight;
        current.y += height;
        
        return current;
    }
    
    // 手动测试方法
    debugTestFlight() {
        if (!this.targetNode) {
            console.error("FinalZone: No target node");
            return;
        }
        
        // 创建一个测试肉块
        const testMeat = new Node('TestCookedMeat');
        testMeat.setWorldPosition(this.node.worldPosition);
        this.node.scene.addChild(testMeat);
        
        this.flyToTargetAndWait(testMeat);
    }
    
    // 强制获取煮好肉块
    forceObtainCookedMeat() {
        this.tryObtainCookedMeat();
    }
    
    onDestroy() {
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.off('onTriggerEnter', this.onTriggerEnter, this);
            collider.off('onTriggerExit', this.onTriggerExit, this);
        }
    }
}