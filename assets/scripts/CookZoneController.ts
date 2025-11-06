import { _decorator, Component, Node, Vec3, tween, v3, Prefab, instantiate, Collider, ITriggerEvent } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CookZoneController')
export class CookZoneController extends Component {
    @property(Node)
    cookNode: Node = null; // 烹饪节点，用于放置切片肉
    
    @property(Node)
    playerNode: Node = null; // 玩家节点
    
    @property
    cookTime: number = 3.0; // 烹饪时间
    
    @property(Prefab)
    cookedMeatPrefab: Prefab = null; // 烹饪好的肉预制体
    
    @property
    cookInterval: number = 1.0; // 烹饪间隔时间
    
    private _slicedMeatsOnCook: Node[] = []; // 在烹饪节点上的切片肉
    private _isPlayerInZone: boolean = false;
    private _cookingTimer: number = 0;
    private _playerController: any = null;

    start() {
        // 添加碰撞检测
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
        }
        
        // 获取玩家控制器
        if (this.playerNode) {
            this._playerController = this.playerNode.getComponent('PlayerController');
        }
    }
    
    update(deltaTime: number) {
        if (this._isPlayerInZone && this._playerController) {
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
        if (otherNode === this.playerNode) {
            console.log("👨‍🍳 玩家进入烹饪区域");
            this._isPlayerInZone = true;
            this._cookingTimer = 0;
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        
        if (otherNode === this.playerNode) {
            console.log("👨‍🍳 玩家离开烹饪区域");
            this._isPlayerInZone = false;
            this._cookingTimer = 0;
        }
    }
    
    // 处理烹饪逻辑
    processCooking() {
        if (!this._playerController) {
            console.error("❌ 找不到PlayerController组件");
            return;
        }
        
        // 检查玩家是否有切片肉
        const slicedMeatCount = this._playerController.getSlicedMeatCount();
        if (slicedMeatCount === 0) {
            console.log("⚠️ 玩家没有切片肉可以烹饪");
            return;
        }
        
        console.log(`🍳 开始烹饪过程，玩家有 ${slicedMeatCount} 块切片肉`);
        
        // 从玩家身上获取一块切片肉
        const slicedMeat = this._playerController.takeSlicedMeat();
        if (!slicedMeat) {
            console.log("❌ 无法获取切片肉");
            return;
        }
        
        // 将切片肉移动到烹饪节点
        this.moveSlicedMeatToCook(slicedMeat, () => {
            // 开始烹饪计时
            this.startCooking(slicedMeat);
        });
    }
    
    // 将切片肉移动到烹饪节点
    moveSlicedMeatToCook(slicedMeat: Node, onComplete?: Function) {
        if (!this.cookNode) {
            if (onComplete) onComplete();
            return;
        }
        
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
        
        // 生成熟肉并飞向玩家
        this.createCookedMeat();
        
        // 更新剩余切片肉的位置
        this.updateSlicedMeatPositions();
    }
    
    // 创建熟肉并飞向玩家
    createCookedMeat() {
        if (!this.cookedMeatPrefab || !this.playerNode || !this._playerController) {
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
        
        console.log("🍖 熟肉已创建，开始飞向玩家");
        
        // 飞向玩家
        this.flyCookedMeatToPlayer(cookedMeat);
    }
    
    // 熟肉飞向玩家
    flyCookedMeatToPlayer(cookedMeat: Node) {
        if (!this.playerNode || !this._playerController) return;
        
        // 计算在玩家身上的堆叠位置
        const cookedMeatCount = this._playerController.getCookedMeatCount();
        const stackPosition = this._playerController.calculateCookedMeatStackPosition(cookedMeatCount);
        const targetWorldPos = this.convertLocalToWorld(this.playerNode, stackPosition);
        
        const startPos = cookedMeat.worldPosition.clone();
        
        // 抛物线飞到玩家身上
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
                console.log("✅ 熟肉到达玩家身上");
                
                // 添加到玩家身上
                this._playerController.obtainCookedMeat(cookedMeat);
            })
            .start();
    }
    
    // 计算烹饪节点上的堆叠位置
    calculateCookStackPosition(index: number): Vec3 {
        return new Vec3(0, index * 0.3, 0); // 每个肉块高度偏移0.3
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
        
        const height = Math.sin(ratio * Math.PI) * 2.0; // 飞行高度
        current.y += height;
        
        return current;
    }
    
    // 获取烹饪中的切片肉数量
    getCookingMeatCount(): number {
        return this._slicedMeatsOnCook.length;
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
    
    // 重置烹饪区域（调试用）
    resetCookZone() {
        this.clearCookingMeats();
        this._isPlayerInZone = false;
        this._cookingTimer = 0;
        console.log("🔄 烹饪区域已重置");
    }
}