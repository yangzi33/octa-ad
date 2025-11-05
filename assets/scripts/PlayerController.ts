import { _decorator, Component, Node, Vec3, Collider, ICollisionEvent, Vec2, RigidBody, Quat, instantiate, SphereCollider } from 'cc';
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
    meatStackOffset: Vec3 = new Vec3(0, 0.5, 0);

    @property
    rotationSpeed: number = 10;

    @property
    meatPerSec: number = 1.0;
    
    private _joystickComp: Joystick = null;
    private _collectedMeats: Node[] = [];
    private _meatCount: number = 0;
    
    // 🆕 碰撞组件 - 使用节点上已有的
    private _collider: Collider = null;
    private _rigidBody: RigidBody = null;
    
    private _deliveryZone: Node = null;
    private _isInDeliveryZone: boolean = false;
    private _deliveryTimer: number = null;

    private _currentDirection: number = 5;
    private _targetRotation: Quat = new Quat();
    private _targetEulerY: number = 0;

    private _cookingZone: Node = null;
    private _isInCookingZone: boolean = false;

    private _cookedMeats: Node[] = [];
    private _cookedMeatCount: number = 0;

    onLoad() {
        this._targetRotation = this.node.rotation.clone();
        
        // 🆕 使用节点上已有的碰撞器和刚体
        this.initExistingCollider();
    }
    
    start() {
        if (this.joystick) {
            this._joystickComp = this.joystick.getComponent('Joystick') as any;
        }
        
        this._targetEulerY = this.node.eulerAngles.y;
    }
    
    // 🆕 使用节点上已有的碰撞器
    initExistingCollider() {
        // 获取节点上已有的碰撞器
        this._collider = this.node.getComponent(Collider);
        
        if (!this._collider) {
            console.error("❌ 玩家节点上没有碰撞器组件！请在编辑器中添加碰撞器");
            return;
        }
        
        // 🆕 重要：物理碰撞必须设置为 false
        this._collider.isTrigger = false;
        
        // 获取节点上已有的刚体
        this._rigidBody = this.node.getComponent(RigidBody);
        
        if (!this._rigidBody) {
            console.error("❌ 玩家节点上没有刚体组件！请在编辑器中添加刚体");
            return;
        }
        
        // 🆕 配置刚体属性
        this._rigidBody.type = RigidBody.Type.DYNAMIC;
        this._rigidBody.mass = 10;
        this._rigidBody.linearDamping = 0.8;
        
        // 🆕 重要：增加角速度阻尼防止旋转
        this._rigidBody.angularDamping = 100.0; // 增加角速度阻尼
        
        // 🆕 注册碰撞事件
        this._collider.on('onCollisionEnter', this.onCollisionEnter, this);
        this._collider.on('onCollisionStay', this.onCollisionStay, this);
        this._collider.on('onCollisionExit', this.onCollisionExit, this);
        
        // 🆕 注册触发器事件
        this._collider.on('onTriggerEnter', this.onTriggerEnter, this);
        this._collider.on('onTriggerStay', this.onTriggerStay, this);
        this._collider.on('onTriggerExit', this.onTriggerExit, this);
        
        console.log("🎯 使用节点已有碰撞器完成:", {
            碰撞器类型: this._collider.constructor.name,
            刚体类型: this._rigidBody.type,
            isTrigger: this._collider.isTrigger
        });
    }
    
    update(deltaTime: number) {
        if (!this._joystickComp) return;
        
        const dir = this._joystickComp.dir;
        
        if (!dir.equals(Vec2.ZERO)) {
            // 🆕 使用物理移动
            this.moveWithPhysics(dir, deltaTime);
            
            this.updateDirection(dir);
            this.applyYRotation(deltaTime);
            this.stabilizePlayer();
            this.updateAllMeatPositions();
        } else {
            // 🆕 停止时设置速度为零
            if (this._rigidBody) {
                this._rigidBody.setLinearVelocity(Vec3.ZERO);
            }
            
            if (this._currentDirection !== 5) {
                this._currentDirection = 5;
            }
        }
        
        // 🆕 每帧强制防止旋转
        this.preventRotation();
        
        // 🆕 检查自动交付
        this.checkAutoDelivery(deltaTime);
    }
    
    // 🆕 专门的防旋转方法
    preventRotation() {
        if (!this._rigidBody) return;
        
        // 🆕 强制重置角速度
        this._rigidBody.setAngularVelocity(Vec3.ZERO);
        
        // 🆕 强制保持直立（只保留Y轴旋转）
        const currentEuler = this.node.eulerAngles;
        if (Math.abs(currentEuler.x) > 0.1 || Math.abs(currentEuler.z) > 0.1) {
            this.node.setRotationFromEuler(0, currentEuler.y, 0);
        }
    }
    
    // 🆕 物理移动方法
    moveWithPhysics(dir: Vec2, deltaTime: number) {
        if (!this._rigidBody) return;
        
        // 计算移动方向
        const moveVec = new Vec3(dir.x, 0, -dir.y);
        moveVec.normalize();
        
        // 🆕 使用速度进行物理移动
        const targetVelocity = moveVec.multiplyScalar(this.moveSpeed);
        
        // 🆕 保持Y轴速度不变，只在XZ平面移动
        const currentVel = new Vec3();
        this._rigidBody.getLinearVelocity(currentVel);
        
        this._rigidBody.setLinearVelocity(new Vec3(
            targetVelocity.x,
            currentVel.y, // 保持Y轴速度
            targetVelocity.z
        ));
    }
    
    // 🆕 稳定玩家位置
    stabilizePlayer() {
        if (this._rigidBody) {
            const currentPos = this.node.position;
            
            // 🆕 如果玩家漂浮或下沉，重置Y轴
            if (Math.abs(currentPos.y) > 0.1) {
                this.node.setPosition(currentPos.x, 0, currentPos.z);
                
                // 🆕 重置Y轴速度
                const currentVel = new Vec3();
                this._rigidBody.getLinearVelocity(currentVel);
                this._rigidBody.setLinearVelocity(new Vec3(currentVel.x, 0, currentVel.z));
            }
            
            // 🆕 防止不必要的旋转（双重保险）
            this._rigidBody.setAngularVelocity(Vec3.ZERO);
        }
    }
    
    // 🆕 物理碰撞进入
    onCollisionEnter(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        console.log("💥 玩家碰撞到:", otherNode.name);
        
        if (otherNode.name.includes('Wall') || otherNode.name.includes('Obstacle')) {
            console.log("🚧 撞到障碍物");
        }
    }
    
    onCollisionStay(event: ICollisionEvent) {
        // 持续碰撞处理
    }
    
    onCollisionExit(event: ICollisionEvent) {
        // 碰撞结束处理
    }
    
    // 🆕 触发器进入事件
    onTriggerEnter(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        console.log("🔵 进入触发器:", otherNode.name);
        
        if (otherNode.name === 'DeliveryZone') {
            this._deliveryZone = otherNode;
            this._isInDeliveryZone = true;
            console.log("进入交付区域");
        }
        else if (otherNode.name === 'CookingZone') {
            this._cookingZone = otherNode;
            this._isInCookingZone = true;
            console.log("进入烹饪区域");
        }
        else if (otherNode.name.includes('Meat')) {
            console.log("🥩 碰到肉块，开始收集");
            this.startCollectingMeat(otherNode);
        }
    }
    
    // 🆕 触发器停留事件
    onTriggerStay(event: ICollisionEvent) {
        // 持续触发逻辑
    }
    
    // 🆕 触发器离开事件
    onTriggerExit(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        
        if (otherNode.name === 'DeliveryZone') {
            this._isInDeliveryZone = false;
            this._deliveryZone = null;
            this._deliveryTimer = null;
            console.log("离开交付区域");
        }
        else if (otherNode.name === 'CookingZone') {
            this._isInCookingZone = false;
            this._cookingZone = null;
            console.log("离开烹饪区域");
        }
    }
    
    // 🆕 检查烹饪交互
    checkCookingInteraction(deltaTime: number) {
        if (this._isInCookingZone && this.hasMeat()) {
            // 烹饪逻辑
        }
    }
    

    // 以下保持原有方法不变...
    updateDirection(joystickDir: Vec2) {
        const targetAngleRad = Math.atan2(joystickDir.x, -joystickDir.y);
        let targetAngleDeg = targetAngleRad * 180 / Math.PI;
        if (targetAngleDeg < 0) targetAngleDeg += 360;
        
        this._targetEulerY = targetAngleDeg;
        const newDirection = this.angleToStreetFighterDirection(targetAngleDeg);
        
        if (newDirection !== this._currentDirection) {
            this._currentDirection = newDirection;
        }
    }
    
    angleToStreetFighterDirection(angle: number): number {
        const sector = Math.floor((angle + 22.5) / 45) % 8;
        
        switch (sector) {
            case 0: return 8;
            case 1: return 9;
            case 2: return 6;
            case 3: return 3;
            case 4: return 2;
            case 5: return 1;
            case 6: return 4;
            case 7: return 7;
            default: return 5;
        }
    }
    
    applyYRotation(deltaTime: number) {
        const currentEuler = this.node.eulerAngles;
        const currentY = currentEuler.y;
        
        let diff = this._targetEulerY - currentY;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        const newY = currentY + diff * this.rotationSpeed * deltaTime;
        this.node.setRotationFromEuler(currentEuler.x, newY, currentEuler.z);
    }
    
    getCurrentDirection(): number {
        return this._currentDirection;
    }
    
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
    
    setDirection(direction: number) {
        if (direction >= 1 && direction <= 9) {
            this._currentDirection = direction;
            
            let targetAngle = 0;
            switch (direction) {
                case 1: targetAngle = 225; break;
                case 2: targetAngle = 180; break;
                case 3: targetAngle = 135; break;
                case 4: targetAngle = 270; break;
                case 5: targetAngle = this.node.eulerAngles.y; break;
                case 6: targetAngle = 90; break;
                case 7: targetAngle = 315; break;
                case 8: targetAngle = 0; break;
                case 9: targetAngle = 45; break;
            }
            
            this._targetEulerY = targetAngle;
            const currentEuler = this.node.eulerAngles;
            this.node.setRotationFromEuler(currentEuler.x, targetAngle, currentEuler.z);
            
            console.log(`🎯 手动设置方向: ${direction} - ${this.getDirectionName(direction)}`);
        }
    }
    
    // 自动交付检查（保持不变）
    checkAutoDelivery(deltaTime: number) {
        if (this._isInDeliveryZone && this._meatCount > 0) {
            if (!this._deliveryTimer) {
                this._deliveryTimer = 0;
                console.log("🏪 开始自动交付肉块");
            }
            
            this._deliveryTimer += deltaTime;
            const deliveryInterval = this.meatPerSec;
            
            if (this._deliveryTimer >= deliveryInterval) {
                this.deliverOneMeat();
                this._deliveryTimer = 0;
                
                if (this._meatCount === 0) {
                    this._deliveryTimer = null;
                    console.log("✅ 所有肉块交付完成");
                }
            }
        } else {
            this._deliveryTimer = null;
        }
    }

    deliverAllMeat() {
        if (this._meatCount === 0) return;
        
        console.log(`交付了 ${this._meatCount} 块肉`);
        
        this._collectedMeats.forEach(meat => {
            if (meat && meat.isValid) {
                meat.destroy();
            }
        });
        
        this._collectedMeats = [];
        this._meatCount = 0;
        this.onMeatDelivered();
    }
    
    deliverOneMeat(): Node | null {
        if (this._meatCount === 0) return null;
        
        const lastMeat = this._collectedMeats.pop();
        if (!lastMeat || !lastMeat.isValid) {
            return null;
        }
        
        this._meatCount = this._collectedMeats.length;
        lastMeat.parent = null;
        this.updateAllMeatPositions();
        
        console.log(`📦 交付1块肉，剩余 ${this._meatCount} 块`);
        return lastMeat;
    }
    
    onMeatDelivered() {
        // 交付效果
    }
    
    startCollectingMeat(meat: Node) {
        console.log("开始收集肉块:", meat.name);
        this.collectMeatDirectly(meat);
    }
    
    collectMeatDirectly(meat: Node) {
        const rigidbody = meat.getComponent(RigidBody);
        if (rigidbody) {
            meat.removeComponent(RigidBody);
        }
        
        const collider = meat.getComponent(Collider);
        if (collider) {
            meat.removeComponent(Collider);
        }
        
        const meatComp = meat.getComponent('Meat');
        if (meatComp) {
            meatComp.enabled = false;
        }
        
        meat.parent = this.node;
        const stackPosition = this.calculateMeatStackPosition(this._collectedMeats.length);
        meat.setPosition(stackPosition);
        meat.setRotation(Quat.IDENTITY);
        
        this._collectedMeats.push(meat);
        this._meatCount = this._collectedMeats.length;
        
        console.log(`成功收集到肉块! 当前数量: ${this._meatCount}`);
    }
    
    calculateMeatStackPosition(index: number): Vec3 {
        return new Vec3(0, this.meatStackOffset.y * (index + 1), -0.5);
    }
    
    updateMeatPositions() {
        this._collectedMeats.forEach((meat, index) => {
            if (meat && meat.isValid) {
                const targetPos = this.calculateMeatStackPosition(index);
                meat.setPosition(targetPos);
            }
        });
    }
    
    getMeatCount(): number {
        return this._meatCount;
    }
    
    hasMeat(): boolean {
        return this._meatCount > 0;
    }

    getLastMeat(): Node | null {
        if (this._collectedMeats.length === 0) return null;
        return this._collectedMeats[this._collectedMeats.length - 1];
    }

    obtainCookedMeat(cookedMeat: Node) {
        if (!cookedMeat) return;
        
        cookedMeat.parent = this.node;
        const stackPosition = this.calculateCookedMeatStackPosition(this._cookedMeatCount);
        cookedMeat.setPosition(stackPosition);
        
        this._cookedMeats.push(cookedMeat);
        this._cookedMeatCount++;
        
        console.log(`🍖 获得煮好的肉块，总数: ${this._cookedMeatCount}`);
    }

    calculateCookedMeatStackPosition(index: number): Vec3 {
        const baseOffset = this._collectedMeats.length > 0 ? -2 : -1;
        return new Vec3(0, baseOffset + (index * 0.5), -0.5);
    }

    updateAllMeatPositions() {
        this.updateMeatPositions();
        
        this._cookedMeats.forEach((meat, index) => {
            const targetPos = this.calculateCookedMeatStackPosition(index);
            meat.setPosition(targetPos);
        });
    }

    hasCookedMeat(): boolean {
        return this._cookedMeatCount > 0;
    }

    getCookedMeatCount(): number {
        return this._cookedMeatCount;
    }

    deliverOneCookedMeat(): Node | null {
        if (this._cookedMeatCount === 0) return null;
        
        const lastCookedMeat = this._cookedMeats.pop();
        if (!lastCookedMeat || !lastCookedMeat.isValid) {
            return null;
        }
        
        this._cookedMeatCount = this._cookedMeats.length;
        lastCookedMeat.parent = null;
        this.updateAllMeatPositions();
        
        console.log(`📦 交付1块煮好肉块，剩余 ${this._cookedMeatCount} 块`);
        return lastCookedMeat;
    }
}