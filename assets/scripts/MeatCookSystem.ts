import { _decorator, Component, Node, Vec3, tween, v3, Prefab, instantiate, Collider, ITriggerEvent } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MeatCookSystem')
export class MeatCookSystem extends Component {
    @property(Node)
    cookNode: Node = null; // 烹饪节点，用于放置切片肉
    
    @property(Node)
    cookedTableNode: Node = null; // 熟肉桌子节点
    
    @property
    transferRate: number = 1.0; // 每秒转移的肉块数量 (n)
    
    @property
    cookTime: number = 3.0; // 每块肉的烹饪时间 (m秒)
    
    @property(Prefab)
    cookedMeatPrefab: Prefab = null; // 熟肉预制体
    
    @property
    cookedMeatHeight: number = 0.5; // 每个熟肉块的高度
    
    @property
    flightHeight: number = 2.0; // 抛物线飞行高度
    
    private _slicedMeatsOnCook: Node[] = []; // 在烹饪节点上的切片肉
    private _cookedMeats: Node[] = []; // 在熟肉桌子上的熟肉
    private _cookedMeatCount: number = 0;
    private _isPlayerInZone: boolean = false;
    private _transferTimer: number = 0;
    private _playerController: any = null;
    private _currentTransferIndex: number = 0; // 当前正在转移的肉块索引

    start() {
        // 添加碰撞检测
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
        }
    }
    
    update(deltaTime: number) {
        if (this._isPlayerInZone && this._playerController) {
            this._transferTimer += deltaTime;
            
            // 每秒转移指定数量的肉块
            if (this._transferTimer >= 1.0 / this.transferRate) {
                this.transferOneSlicedMeat();
                this._transferTimer = 0;
            }
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        // 检测玩家进入烹饪区域
        if (otherNode.name.includes('Player')) {
            console.log("👨‍🍳 玩家进入烹饪区域");
            this._isPlayerInZone = true;
            this._transferTimer = 0;
            this._currentTransferIndex = 0;
            
            // 获取玩家控制器
            this._playerController = otherNode.getComponent('PlayerController');
            
            if (this._playerController) {
                console.log(`🍳 开始以每秒 ${this.transferRate} 块的速度转移切片肉`);
            } else {
                console.error("❌ 找不到PlayerController组件");
            }
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        if (otherNode.name.includes('Player')) {
            console.log("👨‍🍳 玩家离开烹饪区域");
            this._isPlayerInZone = false;
            this._transferTimer = 0;
            this._currentTransferIndex = 0;
            this._playerController = null;
        }
    }
    
    // 转移一块切片肉到烹饪节点
    transferOneSlicedMeat() {
        if (!this._playerController) {
            console.error("❌ 找不到PlayerController组件");
            return;
        }
        
        // 检查玩家是否有切片肉
        const slicedMeatCount = this._playerController.getSlicedMeatCount();
        if (slicedMeatCount === 0) {
            console.log("⚠️ 玩家没有切片肉可以转移");
            return;
        }
        
        // 从玩家身上获取一块切片肉
        const slicedMeat = this._playerController.takeSlicedMeat();
        if (!slicedMeat) {
            console.log("❌ 无法获取切片肉");
            return;
        }
        
        console.log(`🍳 转移第 ${this._currentTransferIndex + 1} 块切片肉到烹饪节点`);
        
        // 将切片肉移动到烹饪节点
        this.moveSlicedMeatToCook(slicedMeat, this._currentTransferIndex, () => {
            // 开始烹饪计时
            this.startCooking(slicedMeat);
        });
        
        this._currentTransferIndex++;
    }
    
    // 将切片肉移动到烹饪节点
    moveSlicedMeatToCook(slicedMeat: Node, index: number, onComplete?: Function) {
        if (!this.cookNode) {
            if (onComplete) onComplete();
            return;
        }
        
        // 计算堆叠位置
        const stackPosition = this.calculateCookStackPosition(index);
        
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
        
        // 生成熟肉并飞到熟肉桌子
        this.createAndFlyCookedMeat();
        
        // 更新剩余切片肉的位置
        this.updateSlicedMeatPositions();
    }
    
    // 创建熟肉并飞到熟肉桌子
    createAndFlyCookedMeat() {
        if (!this.cookedMeatPrefab || !this.cookedTableNode) {
            console.error("❌ 创建熟肉失败：缺少必要组件");
            return;
        }
        
        // 创建熟肉实例
        const cookedMeat = instantiate(this.cookedMeatPrefab);
        cookedMeat.parent = this.node.scene;
        
        // 设置熟肉在烹饪节点的位置
        if (this.cookNode) {
            cookedMeat.setWorldPosition(this.cookNode.worldPosition);
        } else {
            cookedMeat.setWorldPosition(this.node.worldPosition);
        }
        
        console.log("🍖 熟肉已创建，开始飞向熟肉桌子");
        
        // 飞向熟肉桌子
        this.flyCookedMeatToTable(cookedMeat);
    }
    
    // 熟肉飞向熟肉桌子
    flyCookedMeatToTable(cookedMeat: Node) {
        if (!this.cookedTableNode) return;
        
        // 计算在熟肉桌子上的堆叠位置
        const stackPosition = this.calculateCookedMeatStackPosition(this._cookedMeatCount);
        const targetWorldPos = this.convertLocalToWorld(this.cookedTableNode, stackPosition);
        
        const startPos = cookedMeat.worldPosition.clone();
        
        // 抛物线飞到熟肉桌子
        tween(cookedMeat)
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
                console.log("✅ 熟肉到达熟肉桌子");
                
                // 设置父节点为熟肉桌子
                cookedMeat.parent = this.cookedTableNode;
                cookedMeat.setPosition(stackPosition);
                
                this._cookedMeats.push(cookedMeat);
                this._cookedMeatCount++;
                
                console.log(`🍖 熟肉堆叠完成，总数: ${this._cookedMeatCount}`);
            })
            .start();
    }
    
    // 计算烹饪节点上的堆叠位置
    calculateCookStackPosition(index: number): Vec3 {
        return new Vec3(0, index * 0.3, 0); // 每个肉块高度偏移0.3
    }
    
    // 计算熟肉在桌子上的堆叠位置
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
        
        const height = Math.sin(ratio * Math.PI) * this.flightHeight;
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
    
    // 获取熟肉
    takeCookedMeat(): Node | null {
        if (this._cookedMeatCount === 0) {
            console.log("⚠️ 没有熟肉可获取");
            return null;
        }
        
        const cookedMeat = this._cookedMeats.pop();
        this._cookedMeatCount--;
        
        if (cookedMeat) {
            // 从桌子节点中移除
            cookedMeat.parent = null;
            
            // 更新剩余熟肉的位置
            this.updateCookedMeatPositions();
            
            console.log(`📤 拿走熟肉，剩余: ${this._cookedMeatCount}`);
        }
        
        return cookedMeat;
    }
    
    // 更新熟肉位置
    updateCookedMeatPositions() {
        this._cookedMeats.forEach((meat, index) => {
            const targetPos = this.calculateCookedMeatStackPosition(index);
            meat.setPosition(targetPos);
        });
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
    
    // 重置烹饪系统（调试用）
    resetCookSystem() {
        this.clearCookingMeats();
        this.clearCookedMeats();
        this._isPlayerInZone = false;
        this._transferTimer = 0;
        this._currentTransferIndex = 0;
        console.log("🔄 烹饪系统已重置");
    }
}