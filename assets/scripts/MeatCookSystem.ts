import { _decorator, Component, Node, Vec3, tween, v3, Prefab, instantiate, Collider, ITriggerEvent } from 'cc';
import { PlayerController } from './PlayerController';
import { CookedMeatDeliverySystem } from './CookedMeatDeliverySystem';
const { ccclass, property } = _decorator;

@ccclass('MeatCookSystem')
export class MeatCookSystem extends Component {
    @property(Node)
    cookNode: Node = null; // 烹饪节点，用于放置切片肉
    
    @property(Node)
    cookedTableNode: Node = null; // 熟肉桌子节点
    
    @property(Node)
    cookedMeatDeliverySystem: Node = null; // 🆕 熟肉交付系统，用于管理熟肉
    
    @property(Node)
    slicedMeatStartNode: Node = null; // 切片肉飞行起始位置节点
    
    @property
    transferRate: number = 1.0; // 每秒转移的切片肉数量 (n)
    
    @property
    cookTime: number = 3.0; // 每块肉的烹饪时间 (m秒)
    
    @property(Prefab)
    cookedMeatPrefab: Prefab = null; // 熟肉预制体
    
    @property
    cookedMeatHeight: number = 0.5; // 每个熟肉块的高度
    
    @property
    flightHeight: number = 3.0; // 抛物线飞行高度
    
    private _slicedMeatsOnCook: Node[] = []; // 在烹饪节点上的切片肉
    private _cookedMeats: Node[] = []; // 在熟肉桌子上的熟肉（仅用于视觉堆叠）
    private _cookedMeatCount: number = 0;
    private _isPlayerInZone: boolean = false;
    private _transferTimer: number = 0;
    private _playerController: PlayerController = null;
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
            // 处理切片肉转移到烹饪节点
            this._transferTimer += deltaTime;
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
            this._isPlayerInZone = true;
            this._transferTimer = 0;
            this._currentTransferIndex = 0;
            
            // 获取玩家控制器
            this._playerController = otherNode.getComponent(PlayerController);
            
            if (!this._playerController) {
                console.error("MeatCookSystem: PlayerController component not found");
            }
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        if (otherNode.name.includes('Player')) {
            this._isPlayerInZone = false;
            this._transferTimer = 0;
            this._currentTransferIndex = 0;
            this._playerController = null;
        }
    }
    
    // 转移一块切片肉到烹饪节点
    transferOneSlicedMeat() {
        if (!this._playerController) {
            console.error("MeatCookSystem: PlayerController component not found");
            return;
        }
        
        // 检查玩家是否有切片肉
        const slicedMeatCount = this._playerController.getSlicedMeatCount();
        if (slicedMeatCount === 0) {
            return;
        }
        
        // 从玩家身上获取一块切片肉
        const slicedMeat = this._playerController.takeSlicedMeat();
        if (!slicedMeat) {
            return;
        }
        
        // 将切片肉移动到烹饪节点
        this.moveSlicedMeatToCook(slicedMeat, this._currentTransferIndex, () => {
            // 开始烹饪计时
            this.startCooking(slicedMeat);
        });
        
        this._currentTransferIndex++;
    }
    
    // 外部调用：直接添加切片肉到烹饪系统（用于PlayerController手动添加）
    addSlicedMeat(slicedMeat: Node) {
        if (!slicedMeat) {
            console.warn("MeatCookSystem.addSlicedMeat: slicedMeat is null");
            return;
        }
        
        // 将切片肉移动到烹饪节点
        this.moveSlicedMeatToCook(slicedMeat, this._currentTransferIndex, () => {
            // 开始烹饪计时
            this.startCooking(slicedMeat);
        });
        
        this._currentTransferIndex++;
    }
    
    // 将切片肉移动到烹饪节点 - 修复从玩家堆叠位置飞到cookNode
    moveSlicedMeatToCook(slicedMeat: Node, index: number, onComplete?: Function) {
        if (!this.cookNode) {
            if (onComplete) onComplete();
            return;
        }
        
        // 计算堆叠位置
        const stackPosition = this.calculateCookStackPosition(index);
        
        // 将本地堆叠位置转换为世界坐标
        const targetWorldPos = this.convertLocalToWorld(this.cookNode, stackPosition);
        
        // 获取起始位置：从属性节点获取，如果没有则使用切片肉的世界坐标
        let startPos: Vec3;
        if (this.slicedMeatStartNode) {
            startPos = this.slicedMeatStartNode.worldPosition.clone();
        } else {
            // 备用方案：使用切片肉在玩家身上的世界坐标（在改变parent之前）
            startPos = slicedMeat.worldPosition.clone();
        }
        
        // 确保切片肉在场景中（从玩家身上分离）
        slicedMeat.parent = this.node.scene;
        
        // 立即设置世界位置，确保从起始位置开始飞行
        slicedMeat.setWorldPosition(startPos);
        
        // 抛物线飞到烹饪节点
        tween(slicedMeat)
            .to(1.0, {
                position: targetWorldPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = this.calculateParabolaPosition(startPos, targetWorldPos, ratio);
                    target.setWorldPosition(currentPos);
                    target.setRotationFromEuler(0, ratio * 180, ratio * 90);
                }
            })
            .call(() => {
                // 设置父节点为烹饪节点
                slicedMeat.parent = this.cookNode;
                slicedMeat.setPosition(stackPosition);
                slicedMeat.setRotationFromEuler(0, 0, 0);
                
                this._slicedMeatsOnCook.push(slicedMeat);
                
                if (onComplete) {
                    onComplete();
                }
            })
            .start();
    }
    
    // 开始烹饪
    startCooking(slicedMeat: Node) {
        // 烹饪计时
        this.scheduleOnce(() => {
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
            console.error("MeatCookSystem: Failed to create cooked meat - missing required components");
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
        
        // 飞向熟肉桌子
        this.flyCookedMeatToTable(cookedMeat);
    }
    
    // 熟肉飞向熟肉桌子
    flyCookedMeatToTable(cookedMeat: Node) {
        if (!this.cookedTableNode) return;
        
        // 获取当前桌子上实际存在的熟肉数量（从 CookedMeatDeliverySystem 获取准确计数）
        const currentStackCount = this.getCurrentCookedMeatCountOnTable();
        
        // 计算在熟肉桌子上的堆叠位置（使用当前实际数量，而不是总创建数）
        const stackPosition = this.calculateCookedMeatStackPosition(currentStackCount);
        const targetWorldPos = this.convertLocalToWorld(this.cookedTableNode, stackPosition);
        
        const startPos = cookedMeat.worldPosition.clone();
        
        // 抛物线飞到熟肉桌子
        tween(cookedMeat)
            .to(1.0, {
                position: targetWorldPos
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = this.calculateParabolaPosition(startPos, targetWorldPos, ratio);
                    target.setWorldPosition(currentPos);
                    target.setRotationFromEuler(0, ratio * 360, ratio * 180);
                }
            })
            .call(() => {
                // 设置父节点为熟肉桌子（视觉堆叠）
                cookedMeat.parent = this.cookedTableNode;
                cookedMeat.setPosition(stackPosition);
                cookedMeat.setRotationFromEuler(0, 0, 0);
                
                // 添加到本地数组用于视觉管理
                this._cookedMeats.push(cookedMeat);
                this._cookedMeatCount++;
                
                // 添加到 CookedMeatDeliverySystem 以便 ObtainCookedZone 可以获取
                if (this.cookedMeatDeliverySystem) {
                    const deliverySystem = this.cookedMeatDeliverySystem.getComponent(CookedMeatDeliverySystem);
                    if (deliverySystem) {
                        deliverySystem.addCookedMeat(cookedMeat);
                    } else {
                        console.warn("MeatCookSystem: CookedMeatDeliverySystem component not found");
                    }
                } else {
                    console.warn("MeatCookSystem: cookedMeatDeliverySystem not configured");
                }
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
        
        // 🆕 使用明显的抛物线公式
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
    
    // 获取熟肉（保留用于向后兼容，但建议使用 CookedMeatDeliverySystem）
    takeCookedMeat(): Node | null {
        if (this._cookedMeatCount === 0) {
            return null;
        }
        
        const cookedMeat = this._cookedMeats.pop();
        this._cookedMeatCount--;
        
        if (cookedMeat) {
            // 从桌子节点中移除
            cookedMeat.parent = null;
            
            // 更新剩余熟肉的位置
            this.updateCookedMeatPositions();
        }
        
        return cookedMeat;
    }
    
    // 获取当前桌子上实际存在的熟肉数量
    getCurrentCookedMeatCountOnTable(): number {
        // 优先从 CookedMeatDeliverySystem 获取准确计数
        if (this.cookedMeatDeliverySystem) {
            const deliverySystem = this.cookedMeatDeliverySystem.getComponent(CookedMeatDeliverySystem);
            if (deliverySystem) {
                return deliverySystem.getCookedMeatCount();
            }
        }
        
        // 备用方案：过滤本地数组，只计算仍在桌子上的熟肉
        const meatsOnTable = this._cookedMeats.filter(meat => {
            return meat && meat.isValid && meat.parent === this.cookedTableNode;
        });
        return meatsOnTable.length;
    }
    
    // 更新熟肉位置（过滤掉已被取走的熟肉）
    updateCookedMeatPositions() {
        // 过滤掉不再属于 cookedTableNode 的熟肉（已被 ObtainCookedZone 取走）
        this._cookedMeats = this._cookedMeats.filter(meat => {
            return meat && meat.isValid && meat.parent === this.cookedTableNode;
        });
        this._cookedMeatCount = this._cookedMeats.length;
        
        // 更新剩余熟肉的位置
        this._cookedMeats.forEach((meat, index) => {
            if (meat && meat.isValid) {
                const targetPos = this.calculateCookedMeatStackPosition(index);
                meat.setPosition(targetPos);
            }
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
    }
    
    // 重置烹饪系统（调试用）
    resetCookSystem() {
        this.clearCookingMeats();
        this.clearCookedMeats();
        this._isPlayerInZone = false;
        this._transferTimer = 0;
        this._currentTransferIndex = 0;
    }
}