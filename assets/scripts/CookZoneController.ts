import { _decorator, Component, Node, Vec3, tween, v3, Prefab, instantiate, Collider, ITriggerEvent } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CookZoneController')
export class CookZoneController extends Component {
    @property(Node)
    cookNode: Node = null; // 烹饪节点，用于放置切片肉
    
    @property(Node)
    cookedMeatSpawnNode: Node = null; // 熟肉生成节点
    
    @property
    cookTime: number = 3.0; // 烹饪时间
    
    @property
    cookInterval: number = 1.0; // 烹饪间隔时间
    
    @property(Prefab)
    cookedMeatPrefab: Prefab = null; // 烹饪好的肉预制体
    
    @property
    cookedMeatHeight: number = 0.5; // 每个熟肉块的高度
    
    private _slicedMeatsOnCook: Node[] = []; // 在烹饪节点上的切片肉
    private _cookedMeats: Node[] = []; // 在熟肉生成节点上的熟肉
    private _cookedMeatCount: number = 0;
    private _isCooking: boolean = false;
    private _cookingTimer: number = 0;

    start() {
        // 添加碰撞检测
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
        }
    }
    
    update(deltaTime: number) {
        if (this._isCooking) {
            this._cookingTimer += deltaTime;
            
            if (this._cookingTimer >= this.cookInterval) {
                this.processCooking();
                this._cookingTimer = 0;
            }
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        // 检测玩家进入烹饪区域
        if (otherNode.name.includes('Player')) {
            console.log("👨‍🍳 玩家进入烹饪区域");
            this._isCooking = true;
            this._cookingTimer = 0;
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        if (otherNode.name.includes('Player')) {
            console.log("👨‍🍳 玩家离开烹饪区域");
            this._isCooking = false;
            this._cookingTimer = 0;
        }
    }
    
    // 🆕 添加切片肉到烹饪系统
    addSlicedMeat(slicedMeat: Node) {
        if (!this.cookNode) {
            console.error("❌ 缺少烹饪节点");
            return;
        }
        
        console.log("🔪 添加切片肉到烹饪系统");
        
        // 将切片肉移动到烹饪节点
        this.moveSlicedMeatToCook(slicedMeat, () => {
            // 开始烹饪计时
            this.startCooking(slicedMeat);
        });
    }
    
    // 将切片肉移动到烹饪节点
    moveSlicedMeatToCook(slicedMeat: Node, onComplete?: Function) {
        // 计算堆叠位置
        const stackIndex = this._slicedMeatsOnCook.length;
        const stackPosition = this.calculateCookStackPosition(stackIndex);
        
        // 将本地堆叠位置转换为世界坐标
        const targetWorldPos = this.convertLocalToWorld(this.cookNode, stackPosition);
        
        const startPos = slicedMeat.worldPosition.clone();
        
        // 抛物线飞到烹饪节点
        tween(slicedMeat)
            .to(0.5, {
                position: targetWorldPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = this.calculateParabolaPosition(startPos, targetWorldPos, ratio);
                    target.setWorldPosition(currentPos);
                }
            })
            .call(() => {
                // 设置父节点为烹饪节点
                slicedMeat.parent = this.cookNode;
                slicedMeat.setPosition(stackPosition);
                
                this._slicedMeatsOnCook.push(slicedMeat);
                
                console.log(`✅ 切片肉到达烹饪节点，当前数量: ${this._slicedMeatsOnCook.length}`);
                
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
    }
    
    // 处理烹饪逻辑
    processCooking() {
        // 检查是否有切片肉可以烹饪
        if (this._slicedMeatsOnCook.length === 0) {
            console.log("⚠️ 没有切片肉可以烹饪");
            return;
        }
        
        // 获取第一个切片肉进行烹饪
        const slicedMeat = this._slicedMeatsOnCook[0];
        if (!slicedMeat || !slicedMeat.isValid) {
            return;
        }
        
        console.log("🍳 开始烹饪切片肉");
        
        // 开始烹饪计时
        this.startCooking(slicedMeat);
    }
    
    // 开始烹饪
    startCooking(slicedMeat: Node) {
        console.log(`⏲️ 开始烹饪，需要 ${this.cookTime} 秒`);
        
        // 烹饪计时
        this.scheduleOnce(() => {
            console.log("🔥 烹饪完成");
            this.finishCooking(slicedMeat);
        }, this.cookTime);
    }
    
    // 完成烹饪
    finishCooking(slicedMeat: Node) {
        // 从烹饪节点列表中移除
        const index = this._slicedMeatsOnCook.indexOf(slicedMeat);
        if (index !== -1) {
            this._slicedMeatsOnCook.splice(index, 1);
        }
        
        // 销毁切片肉
        if (slicedMeat && slicedMeat.isValid) {
            slicedMeat.destroy();
        }
        
        // 生成熟肉
        this.createCookedMeat();
        
        // 更新剩余切片肉的位置
        this.updateSlicedMeatPositions();
    }
    
    // 创建熟肉
    createCookedMeat() {
        if (!this.cookedMeatPrefab) {
            console.error("❌ 熟肉预制体未设置");
            return;
        }
        
        // 创建熟肉实例
        const cookedMeat = instantiate(this.cookedMeatPrefab);
        
        // 设置熟肉在熟肉生成节点的位置
        if (this.cookedMeatSpawnNode) {
            cookedMeat.parent = this.cookedMeatSpawnNode;
            const stackPosition = this.calculateCookedMeatStackPosition(this._cookedMeatCount);
            cookedMeat.setPosition(stackPosition);
        } else {
            cookedMeat.parent = this.node.scene;
            cookedMeat.setWorldPosition(this.node.worldPosition);
        }
        
        this._cookedMeats.push(cookedMeat);
        this._cookedMeatCount++;
        
        console.log(`🍖 熟肉创建完成，总数: ${this._cookedMeatCount}`);
    }
    
    // 获取熟肉
    takeCookedMeat(): Node | null {
        if (this._cookedMeatCount === 0) {
            console.log("⚠️ 没有熟肉可获取");
            return null;
        }
        
        const cookedMeat = this._cookedMeats.pop();
        this._cookedMeatCount--;
        
        if (cookedMeat) {
            // 从父节点中移除
            cookedMeat.parent = null;
            
            // 更新剩余熟肉的位置
            this.updateCookedMeatPositions();
            
            console.log(`📤 拿走熟肉，剩余: ${this._cookedMeatCount}`);
        }
        
        return cookedMeat;
    }
    
    // 计算烹饪节点上的堆叠位置
    calculateCookStackPosition(index: number): Vec3 {
        return new Vec3(0, index * 0.3, 0); // 每个肉块高度偏移0.3
    }
    
    // 计算熟肉在生成节点上的堆叠位置
    calculateCookedMeatStackPosition(index: number): Vec3 {
        return new Vec3(0, index * this.cookedMeatHeight, 0);
    }
    
    // 更新切片肉位置
    updateSlicedMeatPositions() {
        this._slicedMeatsOnCook.forEach((meat, index) => {
            const targetPos = this.calculateCookStackPosition(index);
            meat.setPosition(targetPos);
        });
    }
    
    // 更新熟肉位置
    updateCookedMeatPositions() {
        this._cookedMeats.forEach((meat, index) => {
            const targetPos = this.calculateCookedMeatStackPosition(index);
            meat.setPosition(targetPos);
        });
    }
    
    // 将本地坐标转换为世界坐标
    convertLocalToWorld(node: Node, localPos: Vec3): Vec3 {
        const worldPos = new Vec3();
        Vec3.transformMat4(worldPos, localPos, node.worldMatrix);
        return worldPos;
    }
    
    // 抛物线位置计算
    calculateParabolaPosition(start: Vec3, end: Vec3, ratio: number): Vec3 {
        const current = new Vec3();
        Vec3.lerp(current, start, end, ratio);
        
        const height = Math.sin(ratio * Math.PI) * 2.0; // 飞行高度
        current.y += height;
        
        return current;
    }
    
    // 获取烹饪中的切片肉数量
    getCookingMeatCount(): number {
        return this._slicedMeatsOnCook.length;
    }
    
    // 获取熟肉数量
    getCookedMeatCount(): number {
        return this._cookedMeatCount;
    }
    
    // 检查是否有熟肉
    hasCookedMeat(): boolean {
        return this._cookedMeatCount > 0;
    }
    
    // 清空所有烹饪中的肉块（调试用）
    clearCookingMeats() {
        this._slicedMeatsOnCook.forEach(meat => {
            if (meat && meat.isValid) {
                meat.destroy();
            }
        });
        this._slicedMeatsOnCook = [];
        console.log("🧹 清空所有烹饪中的肉块");
    }
    
    // 清空所有熟肉（调试用）
    clearCookedMeats() {
        this._cookedMeats.forEach(meat => {
            if (meat && meat.isValid) {
                meat.destroy();
            }
        });
        this._cookedMeats = [];
        this._cookedMeatCount = 0;
        console.log("🧹 清空所有熟肉");
    }
    
    // 重置烹饪区域（调试用）
    resetCookZone() {
        this.clearCookingMeats();
        this.clearCookedMeats();
        this._isCooking = false;
        this._cookingTimer = 0;
        console.log("🔄 烹饪区域已重置");
    }
}