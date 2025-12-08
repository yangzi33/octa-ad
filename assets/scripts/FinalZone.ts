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
    
    @property
    stackHeight: number = 0.5; // 每个熟肉块在目标节点上的堆叠高度

    private _playerInZone: boolean = false;
    private _playerNode: Node = null;
    private _obtainTimer: number = 0;
    private _stackedMeats: Node[] = []; // 堆叠在目标节点上的熟肉列表
    
    onLoad() {
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.isTrigger = true;
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
        }
        
        // 初始化堆叠列表
        this._stackedMeats = [];
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
        
        // 过滤掉无效或已销毁的肉块，确保计数准确
        this._stackedMeats = this._stackedMeats.filter(meat => {
            return meat && meat.isValid && meat.parent === this.targetNode;
        });
        
        // 计算堆叠位置（基于当前堆叠数量）
        const stackIndex = this._stackedMeats.length;
        const stackPosition = this.calculateStackPosition(stackIndex);
        
        // 将本地堆叠位置转换为世界坐标
        const targetWorldPos = this.convertLocalToWorld(this.targetNode, stackPosition);
        
        // 确保肉块在场景中（从玩家身上分离）
        if (cookedMeat.parent) {
            cookedMeat.parent = null;
        }
        cookedMeat.parent = this.node.scene;
        
        const startPos = cookedMeat.worldPosition.clone();
        
        // 飞到目标节点
        tween(cookedMeat)
            .to(0.8, { 
                position: targetWorldPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    try {
                        const currentPos = this.calculateFlightPath(startPos, targetWorldPos, ratio);
                        target.setWorldPosition(currentPos);
                        target.setRotationFromEuler(0, ratio * 360, 0);
                    } catch (error) {
                        console.error("FinalZone: Flight update error:", error);
                    }
                }
            })
            .call(() => {
                // 保存原始世界缩放（在改变parent之前，确保保持预制体的原始大小）
                const originalWorldScale = cookedMeat.worldScale.clone();
                
                // 设置父节点为目标节点并设置本地位置（堆叠）
                cookedMeat.parent = this.targetNode;
                cookedMeat.setPosition(stackPosition);
                cookedMeat.setRotationFromEuler(0, 0, 0);
                
                // 恢复原始世界缩放（确保保持预制体的原始大小，不受父节点缩放影响）
                cookedMeat.setWorldScale(originalWorldScale);
                
                // 添加到堆叠列表
                this._stackedMeats.push(cookedMeat);
                
                // 执行动作（不销毁肉块）
                this.executeFinalAction();
            })
            .start();
    }
    
    // 计算堆叠位置
    calculateStackPosition(index: number): Vec3 {
        return new Vec3(0, index * this.stackHeight, 0);
    }
    
    // 将本地坐标转换为世界坐标
    convertLocalToWorld(node: Node, localPos: Vec3): Vec3 {
        const worldPos = new Vec3();
        Vec3.transformMat4(worldPos, localPos, node.worldMatrix);
        return worldPos;
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
    
    // 获取当前堆叠的熟肉数量
    getStackedMeatCount(): number {
        // 过滤掉无效或已销毁的肉块
        this._stackedMeats = this._stackedMeats.filter(meat => {
            return meat && meat.isValid && meat.parent === this.targetNode;
        });
        return this._stackedMeats.length;
    }
    
    // 清空所有堆叠的熟肉（调试用）
    clearStackedMeats() {
        this._stackedMeats.forEach(meat => {
            if (meat && meat.isValid) {
                meat.destroy();
            }
        });
        this._stackedMeats = [];
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