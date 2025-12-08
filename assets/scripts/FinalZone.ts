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
        console.log("✅ FinalZone脚本已加载");
        this.debugSetup();
        
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.isTrigger = true;
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
            console.log("✅ FinalZone碰撞器已设置");
        }
    }
    
    debugSetup() {
        console.log("=== FinalZone设置信息 ===");
        console.log("目标节点:", this.targetNode ? this.targetNode.name : "未设置");
        console.log("获取速率:", this.obtainRate);
        console.log("等待时间:", this.waitTime);
        console.log("=========================");
    }
    
    update(deltaTime: number) {
        if (this._playerInZone) {
            this.continuousObtain(deltaTime);
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        console.log("🎯 FinalZone触发进入:", event.otherCollider.node.name);
        
        if (event.otherCollider.node.name === 'Player') {
            console.log("🌟 玩家进入最终区域!");
            this._playerInZone = true;
            this._playerNode = event.otherCollider.node;
            this._obtainTimer = 0;
            
            // 🆕 立即尝试获取一次
            this.tryObtainCookedMeat();
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        console.log("🚪 FinalZone触发离开:", event.otherCollider.node.name);
        
        if (event.otherCollider.node.name === 'Player') {
            console.log("玩家离开最终区域");
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
            console.error("❌ 玩家没有PlayerController组件!");
            return;
        }
        
        // 🆕 检查玩家是否有煮好的肉块
        const hasCookedMeat = playerController.hasCookedMeat ? playerController.hasCookedMeat() : false;
        const cookedMeatCount = playerController.getCookedMeatCount ? playerController.getCookedMeatCount() : 0;
        
        console.log(`🔍 检查玩家煮好肉块: ${hasCookedMeat ? `有 (${cookedMeatCount}块)` : '无'}`);
        
        if (!hasCookedMeat) {
            this._obtainTimer = 0;
            return;
        }
        
        this._obtainTimer += deltaTime;
        const interval = 1.0 / this.obtainRate;
        
        console.log(`⏰ 计时: ${this._obtainTimer.toFixed(2)} / ${interval}`);
        
        if (this._obtainTimer >= interval) {
            this.tryObtainCookedMeat();
            this._obtainTimer = 0;
        }
    }
    
    // 🆕 从玩家身上获取煮好的肉块
    tryObtainCookedMeat() {
        console.log("📦 尝试从玩家获取煮好肉块...");
        
        if (!this._playerNode || !this.targetNode) {
            console.error("❌ 无法获取：缺少玩家或目标节点");
            return;
        }
        
        const playerController = this._playerNode.getComponent(PlayerController);
        if (!playerController) {
            console.error("❌ 无法获取：缺少PlayerController组件");
            return;
        }
        
        // 🆕 检查玩家是否有煮好的肉块
        if (!playerController.hasCookedMeat || !playerController.hasCookedMeat()) {
            console.log("⚠️ 玩家没有煮好的肉块");
            return;
        }
        
        // 🆕 从玩家身上移除煮好的肉块
        const cookedMeat = playerController.deliverOneCookedMeat();
        if (!cookedMeat) {
            console.error("❌ 从玩家身上移除肉块失败");
            return;
        }
        
        console.log("✅ 成功从玩家获取煮好肉块");
        
        // 🆕 飞到目标节点
        this.flyToTargetAndWait(cookedMeat);
    }
    
    flyToTargetAndWait(cookedMeat: Node) {
        if (!cookedMeat || !cookedMeat.isValid || !this.targetNode) {
            console.error("❌ 飞行失败：肉块或目标节点无效");
            return;
        }
        
        console.log("✈️ 煮好肉块开始飞行到目标节点");
        
        // 确保肉块在场景中
        if (cookedMeat.parent) {
            cookedMeat.parent = null;
        }
        cookedMeat.parent = this.node.scene;
        
        const startPos = cookedMeat.worldPosition.clone();
        const targetPos = this.targetNode.worldPosition.clone();
        
        console.log("飞行路径:", { 起始: startPos, 目标: targetPos });
        
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
                        console.error("❌ 飞行更新错误:", error);
                    }
                }
            })
            .call(() => {
                console.log("✅ 煮好肉块到达最终目标，开始等待");
                
                // 等待指定时间
                this.scheduleOnce(() => {
                    console.log("⏰ 等待时间结束，准备销毁");
                    this.destroyAndAction(cookedMeat);
                }, this.waitTime);
            })
            .start();
    }
    
    destroyAndAction(cookedMeat: Node) {
        if (!cookedMeat || !cookedMeat.isValid) {
            console.error("❌ 销毁失败：肉块无效");
            return;
        }
        
        console.log("🎯 开始销毁煮好肉块并执行动作");
        
        // 销毁肉块
        cookedMeat.destroy();
        
        // 执行动作
        this.executeFinalAction();
    }
    
    executeFinalAction() {
        console.log("🎉 执行最终动作! 煮好肉块已交付");
        
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
                .call(() => {
                    console.log("✨ 效果播放完成");
                })
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
    
    // 🆕 手动测试方法
    debugTestFlight() {
        console.log("🧪 手动测试飞行");
        
        if (!this.targetNode) {
            console.error("❌ 没有目标节点");
            return;
        }
        
        // 创建一个测试肉块
        const testMeat = new Node('TestCookedMeat');
        testMeat.setWorldPosition(this.node.worldPosition);
        this.node.scene.addChild(testMeat);
        
        console.log("测试煮好肉块创建，开始飞行测试");
        this.flyToTargetAndWait(testMeat);
    }
    
    // 🆕 强制获取煮好肉块
    forceObtainCookedMeat() {
        console.log("🔧 强制获取煮好肉块");
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