import { _decorator, Component, Node, Vec3, tween, v3, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MeatDeliverySystem')
export class MeatDeliverySystem extends Component {
    @property(Node)
    meatStartNode: Node = null; // 🆕 新的节点名称
    
    @property(Node)
    meatEndNode: Node = null; // 🆕 新的节点名称
    
    @property
    deliveryTime: number = 1.0;
    
    @property
    flightHeight: number = 3.0;
    
    @property(Prefab)
    slicedMeatPrefab: Prefab = null;
    
    private _slicedMeats: Node[] = []; // 在meatEndNode叠放的切好的肉块
    private _slicedMeatCount: number = 0;
    
    // 🆕 交付肉块（从玩家背上飞过来）
    deliverMeat(meatNode: Node, onComplete?: Function) {
        if (!this.meatStartNode || !meatNode) {
            console.error("❌ 交付失败：缺少meatStartNode或肉块节点");
            return;
        }
        
        console.log("🚀 肉块开始交付飞行");
        console.log("肉块起始位置:", meatNode.worldPosition);
        console.log("目标位置:", this.meatStartNode.worldPosition);
        
        // 确保肉块在场景中
        if (meatNode.parent) {
            meatNode.parent = null;
        }
        
        meatNode.parent = this.node.scene;
        
        const startPos = meatNode.worldPosition.clone();
        const targetPos = this.meatStartNode.worldPosition.clone();
        
        // 第一步：飞到meatStartNode位置
        tween(meatNode)
            .to(0.8, { 
                position: targetPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = this.calculateParabolaPosition(startPos, targetPos, ratio);
                    target.setWorldPosition(currentPos);
                    target.setRotationFromEuler(0, ratio * 360, 0);
                }
            })
            .call(() => {
                console.log("✅ 肉块到达meatStartNode");
                // 第二步：滚动到meatEndNode
                this.rollToEndNode(meatNode, onComplete);
            })
            .start();
    }
    
    // 🆕 滚动到meatEndNode
    rollToEndNode(meatNode: Node, onComplete?: Function) {
        if (!this.meatEndNode) return;
        
        console.log("🎲 肉块滚动到meatEndNode");
        
        const startPos = meatNode.worldPosition.clone();
        const targetPos = this.meatEndNode.worldPosition.clone();
        
        tween(meatNode)
            .to(this.deliveryTime, {
                position: targetPos,
                eulerAngles: v3(360, 360, 360)
            })
            .call(() => {
                console.log("✅ 肉块到达meatEndNode");
                
                // 🆕 销毁原始肉块
                meatNode.destroy();
                
                // 🆕 在meatEndNode创建切好的肉块并堆叠
                this.createAndStackSlicedMeat();
                
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
    }
    
    // 🆕 创建并堆叠切好的肉块
    createAndStackSlicedMeat() {
        if (!this.slicedMeatPrefab || !this.meatEndNode) return;
        
        // 创建切好的肉块实例
        const slicedMeat = instantiate(this.slicedMeatPrefab);
        slicedMeat.parent = this.meatEndNode;
        
        // 🆕 计算堆叠位置（在meatEndNode本地坐标系内）
        const stackPosition = this.calculateSlicedMeatStackPosition(this._slicedMeatCount);
        slicedMeat.setPosition(stackPosition);
        
        this._slicedMeats.push(slicedMeat);
        this._slicedMeatCount++;
        
        console.log(`🔪 切好的肉块创建并堆叠，总数: ${this._slicedMeatCount}`);
        
        // 🆕 调试：显示所有堆叠肉块的位置
        this.debugSlicedMeatStack();
    }
    
    // 🆕 计算切好肉块的堆叠位置
    calculateSlicedMeatStackPosition(index: number): Vec3 {
        // 在meatEndNode的本地坐标系内垂直堆叠
        return new Vec3(0, index * 0.5, 0); // 每个肉块高度偏移0.5
    }
    
    // 🆕 获取切好的肉块（被玩家拿走）
    takeSlicedMeat(): Node | null {
        if (this._slicedMeatCount === 0) {
            console.log("⚠️ 没有切好的肉块可获取");
            return null;
        }
        
        const slicedMeat = this._slicedMeats.pop();
        this._slicedMeatCount--;
        
        if (slicedMeat) {
            // 🆕 从meatEndNode中移除
            slicedMeat.parent = null;
            
            // 更新剩余肉块的位置
            this.updateSlicedMeatPositions();
            
            console.log(`📤 拿走切好的肉块，剩余: ${this._slicedMeatCount}`);
        }
        
        return slicedMeat;
    }
    
    // 🆕 更新切好肉块的位置
    updateSlicedMeatPositions() {
        this._slicedMeats.forEach((meat, index) => {
            const targetPos = this.calculateSlicedMeatStackPosition(index);
            meat.setPosition(targetPos);
        });
    }
    
    // 🆕 抛物线位置计算
    calculateParabolaPosition(start: Vec3, end: Vec3, ratio: number): Vec3 {
        const current = new Vec3();
        Vec3.lerp(current, start, end, ratio);
        
        const height = Math.sin(ratio * Math.PI) * this.flightHeight;
        current.y += height;
        
        return current;
    }
    
    // 🆕 获取切好肉块数量
    getSlicedMeatCount(): number {
        return this._slicedMeatCount;
    }
    
    // 🆕 检查是否有切好的肉块
    hasSlicedMeat(): boolean {
        return this._slicedMeatCount > 0;
    }
    
    // 🆕 调试方法：显示堆叠状态
    debugSlicedMeatStack() {
        console.log("=== 切好肉块堆叠状态 ===");
        console.log("总数:", this._slicedMeatCount);
        this._slicedMeats.forEach((meat, index) => {
            console.log(`肉块 ${index}:`, meat.position);
        });
        console.log("=======================");
    }
    
    // 🆕 清空所有切好的肉块（调试用）
    clearSlicedMeats() {
        this._slicedMeats.forEach(meat => {
            if (meat && meat.isValid) {
                meat.destroy();
            }
        });
        this._slicedMeats = [];
        this._slicedMeatCount = 0;
        console.log("🧹 清空所有切好的肉块");
    }
}