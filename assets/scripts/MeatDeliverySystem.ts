import { _decorator, Component, Node, Vec3, tween, v3, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MeatDeliverySystem')
export class MeatDeliverySystem extends Component {
    @property(Node)
    meatStartNode: Node = null; // 第一个节点（肉块飞向的位置）
    
    @property(Node)
    meatEndNode: Node = null; // 第二个节点（肉块滚向的位置）
    
    @property
    deliveryTime: number = 1.0; // 从node1到node2的时间（秒）
    
    @property
    flightHeight: number = 3.0; // 飞行高度
    
    @property(Prefab) // 🆕 改为 Prefab 类型
    slicedMeatPrefab: Prefab = null; // 切好的肉块预制体
    
    private _slicedMeats: Node[] = []; // 在node2叠放的切好的肉块
    private _slicedMeatCount: number = 0;
    
    // 🆕 交付肉块（从玩家背上飞过来）
// 修改 MeatDeliverySystem.ts 中的 deliverMeat 方法
    deliverMeat(meatNode: Node, onComplete?: Function) {
        if (!this.meatStartNode || !meatNode) {
            console.error("❌ 交付失败：缺少node1或肉块节点");
            return;
        }
        
        console.log("🚀 肉块开始交付飞行");
        console.log("肉块起始位置:", meatNode.worldPosition);
        console.log("Node1目标位置:", this.meatStartNode.worldPosition);
        
        // 🆕 确保肉块在场景中（不在任何父节点下）
        if (meatNode.parent) {
            meatNode.parent = null;
        }
        
        // 🆕 临时设置到场景根节点
        meatNode.parent = this.node.scene;
        
        // 🆕 保存起始位置和目标位置
        const startPos = meatNode.worldPosition.clone();
        const targetPos = this.meatStartNode.worldPosition.clone();
        
        console.log("📏 飞行路径:", {
            起始: startPos,
            目标: targetPos,
            高度: this.flightHeight
        });
        
        // 🆕 第一步：飞到node1位置（带抛物线）
        tween(meatNode)
            .to(0.8, { 
                // 使用世界坐标
                position: targetPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    // 🆕 计算抛物线位置
                    const currentPos = this.calculateParabolaPosition(startPos, targetPos, ratio);
                    target.setWorldPosition(currentPos);
                    
                    // 🆕 添加旋转效果
                    target.setRotationFromEuler(0, ratio * 360, 0);
                }
            })
            .call(() => {
                console.log("✅ 肉块到达node1，当前位置:", meatNode.worldPosition);
                // 🆕 第二步：滚动到node2
                this.rollToNode2(meatNode, onComplete);
            })
            .start();
    }
    
    // 🆕 计算抛物线位置
    calculateParabolaPosition(start: Vec3, end: Vec3, ratio: number): Vec3 {
        const current = new Vec3();
        Vec3.lerp(current, start, end, ratio);
        
        // 添加抛物线高度
        const height = Math.sin(ratio * Math.PI) * this.flightHeight;
        current.y += height;
        
        return current;
    }
    
    // 🆕 滚动到node2
    rollToNode2(meatNode: Node, onComplete?: Function) {
        if (!this.meatEndNode) return;
        
        console.log("🎲 肉块滚动到node2");
        
        tween(meatNode)
            .to(this.deliveryTime, {
                position: this.meatEndNode.worldPosition,
                eulerAngles: v3(360, 360, 360) // 旋转效果
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    // 可以添加更多滚动效果
                }
            })
            .call(() => {
                console.log("✅ 肉块到达node2");
                
                // 销毁原始肉块
                meatNode.destroy();
                
                // 在node2创建切好的肉块
                this.createSlicedMeat();
                
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
    }
    
    // 🆕 在node2创建切好的肉块
    createSlicedMeat() {
        if (!this.slicedMeatPrefab || !this.meatEndNode) return;
        
        // 🆕 使用 instantiate 创建预制体实例
        const slicedMeat = instantiate(this.slicedMeatPrefab);
        slicedMeat.parent = this.meatEndNode;
        
        // 计算叠放位置
        const stackPosition = this.calculateSlicedMeatStackPosition(this._slicedMeatCount);
        slicedMeat.setPosition(stackPosition);
        
        this._slicedMeats.push(slicedMeat);
        this._slicedMeatCount++;
        
        console.log(`🔪 切好的肉块创建，总数: ${this._slicedMeatCount}`);
    }
    
    // 🆕 计算切好肉块的叠放位置
    calculateSlicedMeatStackPosition(index: number): Vec3 {
        return new Vec3(0, index * 0.3, 0); // 垂直叠放
    }
    
    // 🆕 获取切好的肉块（被玩家拿走）
    takeSlicedMeat(): Node | null {
        if (this._slicedMeatCount === 0) return null;
        
        const slicedMeat = this._slicedMeats.pop();
        this._slicedMeatCount--;
        
        // 更新剩余肉块的位置
        this.updateSlicedMeatPositions();
        
        console.log(`📤 拿走切好的肉块，剩余: ${this._slicedMeatCount}`);
        
        return slicedMeat;
    }
    
    // 🆕 更新切好肉块的位置
    updateSlicedMeatPositions() {
        this._slicedMeats.forEach((meat, index) => {
            const targetPos = this.calculateSlicedMeatStackPosition(index);
            meat.setPosition(targetPos);
        });
    }
    
    // 🆕 获取切好肉块数量
    getSlicedMeatCount(): number {
        return this._slicedMeatCount;
    }
    
    // 🆕 检查是否有切好的肉块
    hasSlicedMeat(): boolean {
        return this._slicedMeatCount > 0;
    }
}