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
    rotationSpeed: number = 10;

    @property
    meatPerSec: number = 1.0;
    
    private _joystickComp: Joystick = null;
    private _collectedMeats: Node[] = []; // 收集的肉块列表
    private _meatCount: number = 0; // 🆕 肉块计数
    
    // 🆕 交付区域相关
    private _deliveryZone: Node = null;
    private _isInDeliveryZone: boolean = false;
    private _deliveryTimer: number = null; // 🆕 新增交付计时器

    private _currentDirection: number = 5; // 🆕 当前方向（1-9）
    private _targetRotation: Quat = new Quat(); // 🆕 目标旋转
    private _targetEulerY: number = 0; // 🆕 直接存储Y轴欧拉角


    onLoad() {
        // 🆕 初始化旋转
        this._targetRotation = this.node.rotation.clone();
    }
    
    start() {
        if (this.joystick) {
            this._joystickComp = this.joystick.getComponent('Joystick') as any;
        }
        
        // 🆕 初始化当前Y轴旋转
        this._targetEulerY = this.node.eulerAngles.y;
    }
    
    update(deltaTime: number) {
        if (!this._joystickComp) return;
        
        const dir = this._joystickComp.dir;
        
        if (!dir.equals(Vec2.ZERO)) {
            // 移动逻辑
            const moveVec = new Vec3(dir.x, 0, -dir.y);
            this.node.position = this.node.position.add(moveVec.multiplyScalar(this.moveSpeed * deltaTime));
            
            // 🆕 更新方向
            this.updateDirection(dir);
            
            // 🆕 应用Y轴旋转
            this.applyYRotation(deltaTime);
            
            this.stabilizePlayer();
            this.updateMeatPositions();
            
            console.log(`🎮 方向: ${this._currentDirection}, Y轴角度: ${this._targetEulerY.toFixed(1)}°`);
        } else {
            // 摇杆回中时重置方向为5
            if (this._currentDirection !== 5) {
                this._currentDirection = 5;
            }
        }
    }
    
    // 🆕 根据摇杆方向更新角色朝向
    updateDirection(joystickDir: Vec2) {
        // 🆕 直接计算Y轴旋转角度（弧度）
        // atan2(x, z) 其中x是左右，z是前后（注意Cocos的坐标系）
        const targetAngleRad = Math.atan2(joystickDir.x, -joystickDir.y);
        
        // 🆕 转换为角度（0-360度）
        let targetAngleDeg = targetAngleRad * 180 / Math.PI;
        if (targetAngleDeg < 0) targetAngleDeg += 360;
        
        // 🆕 直接设置目标Y轴角度
        this._targetEulerY = targetAngleDeg;
        
        // 🆕 转换为街霸方向（1-9）
        const newDirection = this.angleToStreetFighterDirection(targetAngleDeg);
        
        if (newDirection !== this._currentDirection) {
            this._currentDirection = newDirection;
        }
    }
    
    // 🆕 将角度转换为街霸方向（1-9）
    angleToStreetFighterDirection(angle: number): number {
        const sector = Math.floor((angle + 22.5) / 45) % 8;
        
        switch (sector) {
            case 0: return 8; // 上
            case 1: return 9; // 右上
            case 2: return 6; // 右
            case 3: return 3; // 右下
            case 4: return 2; // 下
            case 5: return 1; // 左下
            case 6: return 4; // 左
            case 7: return 7; // 左上
            default: return 5;
        }
    }
    
    // 🆕 应用Y轴旋转
    applyYRotation(deltaTime: number) {
        const currentEuler = this.node.eulerAngles;
        const currentY = currentEuler.y;
        
        // 🆕 处理角度环绕（确保平滑旋转）
        let diff = this._targetEulerY - currentY;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        // 🆕 线性插值
        const newY = currentY + diff * this.rotationSpeed * deltaTime;
        
        // 🆕 直接设置欧拉角，只改变Y轴
        this.node.setRotationFromEuler(currentEuler.x, newY, currentEuler.z);
    }
    
    // 🆕 获取当前方向
    getCurrentDirection(): number {
        return this._currentDirection;
    }
    
    // 🆕 获取方向名称
    getDirectionName(direction?: number): string {
        const dir = direction !== undefined ? direction : this._currentDirection;
        
        switch (dir) {
            case 1: return "左下 (↙️)";
            case 2: return "下 (⬇️)";
            case 3: return "右下 (↘️)";
            case 4: return "左 (⬅️)";
            case 5: return "中心 (🛑)";
            case 6: return "右 (➡️)";
            case 7: return "左上 (↖️)";
            case 8: return "上 (⬆️)";
            case 9: return "右上 (↗️)";
            default: return "未知";
        }
    }
    
    // 🆕 调试方法：手动设置方向
    setDirection(direction: number) {
        if (direction >= 1 && direction <= 9) {
            this._currentDirection = direction;
            
            // 🆕 根据方向设置Y轴角度
            let targetAngle = 0;
            switch (direction) {
                case 1: targetAngle = 225; break; // ↙️
                case 2: targetAngle = 180; break; // ⬇️
                case 3: targetAngle = 135; break; // ↘️
                case 4: targetAngle = 270; break; // ⬅️
                case 5: targetAngle = this.node.eulerAngles.y; break; // 🛑 保持
                case 6: targetAngle = 90; break;  // ➡️
                case 7: targetAngle = 315; break; // ↖️
                case 8: targetAngle = 0; break;   // ⬆️
                case 9: targetAngle = 45; break;  // ↗️
            }
            
            this._targetEulerY = targetAngle;
            // 🆕 立即应用旋转
            const currentEuler = this.node.eulerAngles;
            this.node.setRotationFromEuler(currentEuler.x, targetAngle, currentEuler.z);
            
            console.log(`🎯 手动设置方向: ${direction} - ${this.getDirectionName(direction)}`);
        }
    }
    
    stabilizePlayer() {
        const currentPos = this.node.position;
        if (currentPos.y !== 0) {
            this.node.setPosition(currentPos.x, 0, currentPos.z);
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