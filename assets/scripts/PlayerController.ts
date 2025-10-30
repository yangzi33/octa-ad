import { _decorator, Component, Node, Vec3, Collider, ICollisionEvent, Vec2, RigidBody, Quat, instantiate } from 'cc';
import { Joystick } from './Joystick';
import { Meat } from './Meat';
const { ccclass, property } = _decorator;


@ccclass('PlayerController')
export class PlayerController extends Component {
    @property
    moveSpeed: number = 5;
    
    @property(Node)
    joystick: Node = null;
    
    @property
    meatStackOffset: Vec3 = new Vec3(0, 0.5, 0); // 每块肉的叠放偏移

    @property
    meatPerSec: number = 1.0;
    
    private _joystickComp: Joystick = null;
    private _collectedMeats: Node[] = []; // 收集的肉块列表
    private _meatCount: number = 0; // 🆕 肉块计数
    
    // 🆕 交付区域相关
    private _deliveryZone: Node = null;
    private _isInDeliveryZone: boolean = false;
    private _deliveryTimer: number = null; // 🆕 新增交付计时器

    start() {
        if (this.joystick) {
            this._joystickComp = this.joystick.getComponent(Joystick);
        }
        
        // 🆕 添加碰撞检测
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
        }
    }
    
    update(deltaTime: number) {
        if (!this._joystickComp) return;
        
        const dir = this._joystickComp.dir;
        
        if (!dir.equals(Vec2.ZERO)) {
            const moveVec = new Vec3(dir.x, 0, -dir.y);
            this.node.position = this.node.position.add(moveVec.multiplyScalar(this.moveSpeed * deltaTime));
            
            // 更新背上肉块的位置
            // this.updateMeatPositions();
            this.updateAllMeatPositions(); // 🆕 替换原来的 updateMeatPositions
        }
        
        // 🆕 检查是否在交付区域内并自动交付
        this.checkAutoDelivery(deltaTime);
    }

    // 在 PlayerController.ts 中添加 stabilizePlayer 方法
    stabilizePlayer() {
        // 保持玩家直立 - 只保留 Y 轴旋转，重置 X 和 Z 轴旋转
        const currentEuler = this.node.eulerAngles;
        const targetEuler = new Vec3(0, currentEuler.y, 0);
        
        if (!currentEuler.equals(targetEuler)) {
            this.node.setRotationFromEuler(targetEuler);
        }
        
        // 保持玩家在地面上（防止掉落或浮空）
        const currentPos = this.node.position;
        if (currentPos.y !== 0) { // 根据你的地面高度调整，0 表示地面高度
            this.node.setPosition(currentPos.x, 0, currentPos.z);
        }
        
        // 🆕 可选：重置物理速度（如果有 Rigidbody）
        const rigidbody = this.getComponent(RigidBody);
        if (rigidbody) {
            rigidbody.setLinearVelocity(Vec3.ZERO);
            rigidbody.setAngularVelocity(Vec3.ZERO);
        }
    }
    
    // 🆕 触发器进入事件
    onTriggerEnter(event: ICollisionEvent) {
        if (event.otherCollider.node.name === 'DeliveryZone') {
            this._deliveryZone = event.otherCollider.node;
            this._isInDeliveryZone = true;
            console.log("进入交付区域");
        }
    }
    
    // 🆕 触发器离开事件
    onTriggerExit(event: ICollisionEvent) {
        if (event.otherCollider.node.name === 'DeliveryZone') {
            this._isInDeliveryZone = false;
            this._deliveryZone = null;
            console.log("离开交付区域");
        }
    }
    
    // 🆕 自动交付检查
    // 在 PlayerController.ts 中修改 checkAutoDelivery 方法
    checkAutoDelivery(deltaTime: number) {
        if (this._isInDeliveryZone && this._meatCount > 0) {
            // 🆕 使用计时器逐个交付
            if (!this._deliveryTimer) {
                this._deliveryTimer = 0;
                console.log("🏪 开始自动交付肉块");
            }
            
            this._deliveryTimer += deltaTime;
            
            // 🆕 每1秒交付一块肉（可以根据需要调整速率）
            const deliveryInterval = this.meatPerSec; // 每秒交付1块
            
            if (this._deliveryTimer >= deliveryInterval) {
                this.deliverOneMeat();
                this._deliveryTimer = 0; // 重置计时器
                
                // 🆕 如果还有肉，继续交付；如果没有了，重置计时器
                if (this._meatCount === 0) {
                    this._deliveryTimer = null;
                    console.log("✅ 所有肉块交付完成");
                }
            }
        } else {
            // 🆕 不在交付区域时重置计时器
            this._deliveryTimer = null;
        }
    }

    // 🆕 交付所有肉
    deliverAllMeat() {
        if (this._meatCount === 0) return;
        
        console.log(`交付了 ${this._meatCount} 块肉`);
        
        // 销毁所有肉块节点
        this._collectedMeats.forEach(meat => {
            if (meat && meat.isValid) {
                meat.destroy();
            }
        });
        
        // 重置计数和列表
        this._collectedMeats = [];
        this._meatCount = 0;
        
        // 🆕 可以在这里触发交付效果（音效、粒子等）
        this.onMeatDelivered();
    }
    
    // 🆕 交付单块肉
    deliverOneMeat(): Node | null {
        if (this._meatCount === 0) return null;
        
        // 🆕 移除最后一块肉但不销毁，返回肉块节点
        const lastMeat = this._collectedMeats.pop();
        if (!lastMeat || !lastMeat.isValid) {
            return null;
        }
        
        this._meatCount = this._collectedMeats.length;
        
        // 🆕 重要：从玩家子节点中移除，但不销毁
        lastMeat.parent = null;
        
        // 更新剩余肉块的位置
        this.updateMeatPositions();
        
        console.log(`📦 交付1块肉，剩余 ${this._meatCount} 块`);
        return lastMeat; // 🆕 返回肉块节点
    }
    
    // 🆕 交付回调（可以扩展效果）
    onMeatDelivered() {
        // 可以在这里添加：
        // - 播放音效
        // - 显示粒子效果
        // - 更新UI分数
        // - 触发游戏事件
    }
    
    // 开始收集肉块
    // 在PlayerController中添加更详细的日志
    startCollectingMeat(meat: Node) {
        console.log("开始收集肉块:", meat.name);
        
        // 🆕 检查肉块结构
        console.log("肉块子节点数量:", meat.children.length);
        console.log("肉块组件:", meat.components);
        
        // 🆕 方法1：直接使用肉块节点本身（如果模型在根节点）
        const collectedMeat = new Node('CollectedMeat_' + this._collectedMeats.length);
        
        // 🆕 复制所有组件（包括模型渲染器）
        meat.components.forEach(component => {
            if (component.constructor.name !== 'RigidBody' && 
                component.constructor.name !== 'Collider' &&
                component.constructor.name !== 'Meat') {
                // 复制模型相关的组件
                const componentCopy = collectedMeat.addComponent(component.constructor as any);
                // 这里需要手动复制属性，但比较复杂
            }
        });
        
        // 🆕 更简单的方法：直接使用原肉块节点，但移除物理组件
        this.collectMeatDirectly(meat);
    }
    
    // 🆕 直接收集方法
    collectMeatDirectly(meat: Node) {
        // 彻底移除物理组件
        const rigidbody = meat.getComponent(RigidBody);
        if (rigidbody) {
            meat.removeComponent(RigidBody);
        }
        
        const collider = meat.getComponent(Collider);
        if (collider) {
            meat.removeComponent(Collider);
        }
        
        // 禁用肉块脚本
        const meatComp = meat.getComponent('Meat');
        if (meatComp) {
            meatComp.enabled = false;
        }
        
        // 设置为玩家子节点
        meat.parent = this.node;
        const stackPosition = this.calculateMeatStackPosition(this._collectedMeats.length);
        meat.setPosition(stackPosition);
        meat.setRotation(Quat.IDENTITY);
        
        this._collectedMeats.push(meat);
        this._meatCount = this._collectedMeats.length;
        
        console.log(`成功收集到肉块! 当前数量: ${this._meatCount}`);
    }
    
    // 计算肉块在背上的叠放位置
    calculateMeatStackPosition(index: number): Vec3 {
        return new Vec3(
            0, // X轴居中
            this.meatStackOffset.y * (index + 1), // Y轴向上叠放
            -0.5 // Z轴稍微在背后
        );
    }
    
    // 更新所有肉块的位置（跟随玩家移动）
    updateMeatPositions() {
        this._collectedMeats.forEach((meat, index) => {
            if (meat && meat.isValid) {
                const targetPos = this.calculateMeatStackPosition(index);
                meat.setPosition(targetPos);
            }
        });
    }
    
    // 🆕 获取肉块数量
    getMeatCount(): number {
        return this._meatCount;
    }
    
    // 🆕 检查是否携带肉块
    hasMeat(): boolean {
        return this._meatCount > 0;
    }

    // 在 PlayerController.ts 中添加
    private _cookedMeats: Node[] = []; // 煮好的肉块
    private _cookedMeatCount: number = 0;

    // 🆕 获取最后一块肉（用于交付）
    getLastMeat(): Node | null {
        if (this._collectedMeats.length === 0) return null;
        return this._collectedMeats[this._collectedMeats.length - 1];
    }

    // 🆕 获得煮好的肉块
    obtainCookedMeat(cookedMeat: Node) {
        if (!cookedMeat) return;
        
        // 🆕 设置父节点
        cookedMeat.parent = this.node;
        
        // 🆕 计算叠放位置（根据肉块类型）
        const stackPosition = this.calculateCookedMeatStackPosition(this._cookedMeatCount);
        cookedMeat.setPosition(stackPosition);
        
        this._cookedMeats.push(cookedMeat);
        this._cookedMeatCount++;
        
        console.log(`🍖 获得煮好的肉块，总数: ${this._cookedMeatCount}`);
    }

    // 🆕 计算煮好肉块的叠放位置
    calculateCookedMeatStackPosition(index: number): Vec3 {
        // 🆕 根据当前背的肉块类型决定位置
        const baseOffset = this._collectedMeats.length > 0 ? -2 : -1;
        return new Vec3(0, baseOffset + (index * 0.5), -0.5);
    }

    // 🆕 更新所有肉块位置（包括煮好的）
    updateAllMeatPositions() {
        // 更新原始肉块
        this.updateMeatPositions();
        
        // 🆕 更新煮好的肉块
        this._cookedMeats.forEach((meat, index) => {
            const targetPos = this.calculateCookedMeatStackPosition(index);
            meat.setPosition(targetPos);
        });
    }
}