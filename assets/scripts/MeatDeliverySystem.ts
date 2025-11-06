import { _decorator, Component, Node, Vec3, tween, v3, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MeatDeliverySystem')
export class MeatDeliverySystem extends Component {
    @property(Node)
    meatStartNode: Node = null;
    
    @property(Node)
    meatEndNode: Node = null;
    
    @property(Node)
    disassembleNode: Node = null;
    
    @property(Node)
    tableNode: Node = null;
    
    @property
    deliveryTime: number = 1.0;
    
    @property
    flightHeight: number = 3.0;
    
    @property
    disassembleDelay: number = 0.5;
    
    @property
    sliceMeatHeight: number = 0.5; // 每个切好肉块的高度
    
    @property
    baseHeight: number = 0.0; // 🆕 基础高度，用于调整堆叠起始位置
    
    @property(Prefab)
    slicedMeatPrefab: Prefab = null;
    
    private _slicedMeats: Node[] = []; // 在tableNode叠放的切好的肉块
    private _slicedMeatCount: number = 0;
    
    onLoad() {
        // 🆕 初始化时重置计数
        this._slicedMeatCount = 0;
        this._slicedMeats = [];
    }
    
    // 交付肉块（从玩家背上飞过来）
    deliverMeat(meatNode: Node, onComplete?: Function) {
        if (!this.meatStartNode || !meatNode) {
            console.error("❌ 交付失败：缺少meatStartNode或肉块节点");
            return;
        }
        
        console.log("🚀 肉块开始交付飞行");
        
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
    
    // 滚动到meatEndNode
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
                
                // 第三步：从meatEndNode飞到DisassembleNode
                this.flyToDisassembleNode(meatNode, onComplete);
            })
            .start();
    }
    
    // 飞到分解节点
    flyToDisassembleNode(meatNode: Node, onComplete?: Function) {
        if (!this.disassembleNode) {
            console.error("❌ 缺少disassembleNode");
            return;
        }
        
        console.log("✈️ 肉块飞向DisassembleNode");
        
        const startPos = meatNode.worldPosition.clone();
        const targetPos = this.disassembleNode.worldPosition.clone();
        
        tween(meatNode)
            .to(0.6, {
                position: targetPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = this.calculateParabolaPosition(startPos, targetPos, ratio);
                    target.setWorldPosition(currentPos);
                    target.setRotationFromEuler(0, ratio * 180, 0);
                }
            })
            .call(() => {
                console.log("✅ 肉块到达DisassembleNode");
                
                // 延迟后分解肉块
                this.scheduleOnce(() => {
                    this.disassembleMeat(meatNode, onComplete);
                }, this.disassembleDelay);
            })
            .start();
    }
    
    // 分解肉块
    disassembleMeat(meatNode: Node, onComplete?: Function) {
        console.log("🔪 开始分解肉块");
        
        // 销毁原始肉块
        meatNode.destroy();
        
        // 创建切好的肉块并飞到桌子
        this.createAndFlySlicedMeatToTable(() => {
            if (onComplete) {
                onComplete();
            }
        });
    }
    
    // 创建切好的肉块并飞到桌子
    createAndFlySlicedMeatToTable(onComplete?: Function) {
        if (!this.slicedMeatPrefab || !this.disassembleNode || !this.tableNode) {
            console.error("❌ 创建切好的肉块失败：缺少必要节点或预制体");
            if (onComplete) onComplete();
            return;
        }
        
        // 创建切好的肉块实例
        const slicedMeat = instantiate(this.slicedMeatPrefab);
        slicedMeat.parent = this.node.scene;
        slicedMeat.setWorldPosition(this.disassembleNode.worldPosition);
        
        console.log("🔪 切好的肉块已创建，开始飞向桌子");
        
        // 🆕 使用数组长度作为索引，而不是_slicedMeatCount
        const stackIndex = this._slicedMeats.length;
        const stackPosition = this.calculateSlicedMeatStackPosition(stackIndex);
        
        console.log(`📊 堆叠索引: ${stackIndex}, 堆叠位置:`, stackPosition);
        
        // 将本地堆叠位置转换为世界坐标
        const targetWorldPos = this.convertLocalToWorld(this.tableNode, stackPosition);
        
        const startPos = slicedMeat.worldPosition.clone();
        
        // 抛物线飞到桌子
        tween(slicedMeat)
            .to(0.8, {
                position: targetWorldPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = this.calculateParabolaPosition(startPos, targetWorldPos, ratio);
                    target.setWorldPosition(currentPos);
                    target.setRotationFromEuler(0, ratio * 360, 0);
                }
            })
            .call(() => {
                console.log("✅ 切好的肉块到达桌子");
                
                // 设置父节点为桌子
                slicedMeat.parent = this.tableNode;
                slicedMeat.setPosition(stackPosition);
                
                this._slicedMeats.push(slicedMeat);
                this._slicedMeatCount = this._slicedMeats.length; // 🆕 保持同步
                
                console.log(`🔪 切好的肉块堆叠完成，总数: ${this._slicedMeatCount}`);
                
                // 🆕 立即验证堆叠位置
                this.validateStackPositions();
                
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
    }
    
    // 计算切好肉块在桌子上的堆叠位置（垂直堆叠）
    calculateSlicedMeatStackPosition(index: number): Vec3 {
        // 🆕 使用基础高度 + 索引 * 肉块高度
        return new Vec3(0, this.baseHeight + index * this.sliceMeatHeight, 0);
    }
    
    // 将本地坐标转换为世界坐标
    convertLocalToWorld(node: Node, localPos: Vec3): Vec3 {
        const worldPos = new Vec3();
        // 使用矩阵变换将本地坐标转换为世界坐标
        Vec3.transformMat4(worldPos, localPos, node.worldMatrix);
        return worldPos;
    }
    
    // 获取切好的肉块（被玩家拿走）
    takeSlicedMeat(): Node | null {
        if (this._slicedMeatCount === 0) {
            console.log("⚠️ 没有切好的肉块可获取");
            return null;
        }
        
        const slicedMeat = this._slicedMeats.pop();
        this._slicedMeatCount = this._slicedMeats.length; // 🆕 保持同步
        
        if (slicedMeat) {
            // 从tableNode中移除
            slicedMeat.parent = null;
            
            // 更新剩余肉块的位置
            this.updateSlicedMeatPositions();
            
            console.log(`📤 拿走切好的肉块，剩余: ${this._slicedMeatCount}`);
        }
        
        return slicedMeat;
    }
    
    // 更新切好肉块的位置
    updateSlicedMeatPositions() {
        // 🆕 重新计算所有肉块的位置，确保堆叠正确
        this._slicedMeats.forEach((meat, index) => {
            const targetPos = this.calculateSlicedMeatStackPosition(index);
            meat.setPosition(targetPos);
        });
        
        // 🆕 验证堆叠位置是否正确
        this.validateStackPositions();
    }
    
    // 🆕 验证堆叠位置是否正确
    validateStackPositions() {
        console.log("=== 验证堆叠位置 ===");
        console.log(`肉块总数: ${this._slicedMeatCount}, 数组长度: ${this._slicedMeats.length}`);
        
        this._slicedMeats.forEach((meat, index) => {
            const expectedPos = this.calculateSlicedMeatStackPosition(index);
            const actualPos = meat.position;
            const isConsistent = Math.abs(expectedPos.y - actualPos.y) < 0.01;
            
            console.log(`肉块 ${index}: 
                期望位置=(${expectedPos.x}, ${expectedPos.y}, ${expectedPos.z}), 
                实际位置=(${actualPos.x}, ${actualPos.y}, ${actualPos.z}), 
                是否一致=${isConsistent}`);
                
            if (!isConsistent) {
                console.warn(`❌ 位置不一致! 正在修正...`);
                meat.setPosition(expectedPos);
            }
        });
        console.log("===================");
    }
    
    // 抛物线位置计算
    calculateParabolaPosition(start: Vec3, end: Vec3, ratio: number): Vec3 {
        const current = new Vec3();
        Vec3.lerp(current, start, end, ratio);
        
        const height = Math.sin(ratio * Math.PI) * this.flightHeight;
        current.y += height;
        
        return current;
    }
    
    // 获取切好肉块数量
    getSlicedMeatCount(): number {
        return this._slicedMeatCount;
    }
    
    // 检查是否有切好的肉块
    hasSlicedMeat(): boolean {
        return this._slicedMeatCount > 0;
    }
    
    // 调试方法：显示堆叠状态
    debugSlicedMeatStack() {
        console.log("=== 切好肉块堆叠状态 ===");
        console.log("总数:", this._slicedMeatCount);
        this._slicedMeats.forEach((meat, index) => {
            console.log(`肉块 ${index}:`, meat.position);
        });
        console.log("=======================");
    }
    
    // 清空所有切好的肉块（调试用）
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
    
    // 重置系统（调试用）
    resetSystem() {
        this.clearSlicedMeats();
        console.log("🔄 系统已重置");
    }
}