import { _decorator, Component, Node, Vec3, Collider, ICollisionEvent, Vec2, RigidBody, Quat, instantiate, input, Input, KeyCode, find} from 'cc';
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
    private _rigidBody: RigidBody = null;
    private _collectedMeats: Node[] = [];
    private _meatCount: number = 0;
    
    private _deliveryZone: Node = null;
    private _isInDeliveryZone: boolean = false;
    private _deliveryTimer: number = null;

    private _currentDirection: number = 5;
    private _targetRotation: Quat = new Quat();
    private _targetEulerY: number = 0;

    // 调试相关
    private _debugCounter: number = 0;
    private _isPhysicsWorking: boolean = false;

    onLoad() {
        console.log('🚀 PlayerController onLoad');
        
        this._rigidBody = this.getComponent(RigidBody);
        
        if (!this._rigidBody) {
            console.error('❌ 没有找到 RigidBody 组件！请检查玩家节点是否有 RigidBody 组件');
            return;
        }
        
        console.log('✅ 找到 RigidBody 组件');
        this.setupRigidBody();
    }
    
    start() {
        console.log('🎮 PlayerController start');
        
        if (this.joystick) {
            this._joystickComp = this.joystick.getComponent(Joystick);
            if (this._joystickComp) {
                console.log('✅ 找到 Joystick 组件');
            } else {
                console.error('❌ 没有找到 Joystick 组件！');
            }
        } else {
            console.error('❌ Joystick 节点未设置！');
        }
        
        this._targetEulerY = this.node.eulerAngles.y;
        
        // 测试物理系统
        this.testPhysicsSystem();
    }
    
    setupRigidBody() {
        console.log('🔧 设置刚体属性...');
        
        // 设置推荐的值
        this._rigidBody.mass = 10;
        this._rigidBody.linearDamping = 0.5;  // 降低阻尼以便更容易移动
        this._rigidBody.angularDamping = 5.0;
        this._rigidBody.type = RigidBody.Type.DYNAMIC;
        this._rigidBody.allowSleep = false;
        this._rigidBody.useGravity = true;
        
        console.log('✅ 刚体设置完成');
        this.debugRigidBodySettings();
    }
    
    testPhysicsSystem() {
        console.log('🧪 测试物理系统...');
        
        // 测试1：检查是否有地面碰撞器
        const ground = find('Canvas/Ground');
        if (ground) {
            const groundCollider = ground.getComponent(Collider);
            if (groundCollider) {
                console.log('✅ 找到地面碰撞器');
            } else {
                console.error('❌ 地面没有碰撞器！');
            }
        } else {
            console.error('❌ 没有找到地面节点！');
        }
        
        // 测试2：施加一个测试力
        setTimeout(() => {
            if (this._rigidBody) {
                const testForce = new Vec3(500, 0, 0);
                this._rigidBody.applyForce(testForce);
                console.log('💥 施加测试力:', testForce);
                
                // 检查3秒后是否移动
                setTimeout(() => {
                    const pos = this.node.position;
                    console.log('📍 3秒后位置:', { x: pos.x.toFixed(2), y: pos.y.toFixed(2), z: pos.z.toFixed(2) });
                    
                    if (Math.abs(pos.x) > 0.1) {
                        console.log('✅ 物理系统工作正常！');
                        this._isPhysicsWorking = true;
                    } else {
                        console.error('❌ 物理系统可能有问题！');
                        this._isPhysicsWorking = false;
                    }
                }, 3000);
            }
        }, 1000);
    }
    
    update(deltaTime: number) {
        // 每60帧输出一次调试信息
        this._debugCounter++;
        if (this._debugCounter >= 60) {
            this._debugCounter = 0;
            this.debugMovement();
        }
        
        if (!this._joystickComp || !this._rigidBody || !this._isPhysicsWorking) {
            return;
        }
        
        const dir = this._joystickComp.dir;
        
        if (!dir.equals(Vec2.ZERO)) {
            console.log('🎮 摇杆输入:', { x: dir.x.toFixed(2), y: dir.y.toFixed(2) });
            
            // 使用简单直接的移动方法
            this.applySimpleMovement(dir);
            
            // 更新方向
            this.updateDirection(dir);
            
            // 应用旋转
            this.applyYRotation(deltaTime);
            
            this.stabilizePlayer();
            this.updateMeatPositions();
        } else {
            // 没有输入时减速
            this.applyBraking();
            
            if (this._currentDirection !== 5) {
                this._currentDirection = 5;
            }
        }
        
        // 检查自动交付
        this.checkAutoDelivery(deltaTime);
    }
    
    // 最简单的移动方法
    applySimpleMovement(joystickDir: Vec2) {
        const moveDir = new Vec3(joystickDir.x, 0, -joystickDir.y);
        
        // 方法1：直接设置速度（最直接）
        const targetVelocity = new Vec3(
            moveDir.x * this.moveSpeed,
            0,  // Y轴速度设为0，防止浮空
            moveDir.z * this.moveSpeed
        );
        
        console.log('🎯 设置目标速度:', {
            x: targetVelocity.x.toFixed(2),
            z: targetVelocity.z.toFixed(2)
        });
        
        this._rigidBody.setLinearVelocity(targetVelocity);
    }
    
    // 方法2：使用冲量
    applyMovementWithImpulse(joystickDir: Vec2) {
        const moveDir = new Vec3(joystickDir.x, 0, -joystickDir.y);
        const impulse = new Vec3(
            moveDir.x * this.moveSpeed * 2,
            0,
            moveDir.z * this.moveSpeed * 2
        );
        
        console.log('💥 施加冲量:', {
            x: impulse.x.toFixed(2),
            z: impulse.z.toFixed(2)
        });
        
        this._rigidBody.applyImpulse(impulse);
    }
    
    // 方法3：使用力
    applyMovementWithForce(joystickDir: Vec2) {
        const moveDir = new Vec3(joystickDir.x, 0, -joystickDir.y);
        const force = new Vec3(
            moveDir.x * this.moveSpeed * 100,
            0,
            moveDir.z * this.moveSpeed * 100
        );
        
        console.log('🔧 施加力:', {
            x: force.x.toFixed(2),
            z: force.z.toFixed(2)
        });
        
        this._rigidBody.applyForce(force);
    }
    
    applyBraking() {
        const currentVelocity = new Vec3();
        this._rigidBody.getLinearVelocity(currentVelocity);
        
        // 直接停止水平移动
        if (Math.abs(currentVelocity.x) > 0.1 || Math.abs(currentVelocity.z) > 0.1) {
            currentVelocity.x = 0;
            currentVelocity.z = 0;
            this._rigidBody.setLinearVelocity(currentVelocity);
        }
    }
    
    debugMovement() {
        if (!this._rigidBody) return;
        
        const currentVelocity = new Vec3();
        this._rigidBody.getLinearVelocity(currentVelocity);
        const position = this.node.position;
        
        console.log('📊 移动状态:', {
            position: { x: position.x.toFixed(2), y: position.y.toFixed(2), z: position.z.toFixed(2) },
            velocity: { x: currentVelocity.x.toFixed(2), y: currentVelocity.y.toFixed(2), z: currentVelocity.z.toFixed(2) },
            physicsWorking: this._isPhysicsWorking
        });
    }
    
    debugRigidBodySettings() {
        if (!this._rigidBody) return;
        
        console.log('🔍 RigidBody 设置:');
        console.log('  - 质量:', this._rigidBody.mass);
        console.log('  - 线性阻尼:', this._rigidBody.linearDamping);
        console.log('  - 角速度阻尼:', this._rigidBody.angularDamping);
        console.log('  - 类型:', this._rigidBody.type === RigidBody.Type.DYNAMIC ? 'DYNAMIC' : 'OTHER');
        console.log('  - 允许睡眠:', this._rigidBody.allowSleep);
        console.log('  - 使用重力:', this._rigidBody.useGravity);
    }
    
    stabilizeRotation() {
        const currentEuler = this.node.eulerAngles;
        
        if (Math.abs(currentEuler.x) > 1 || Math.abs(currentEuler.z) > 1) {
            this.node.setRotationFromEuler(0, currentEuler.y, 0);
        }
        
        this._rigidBody.setAngularVelocity(Vec3.ZERO);
    }
    
    // 在浏览器控制台中运行这些方法进行测试
    testMoveRight() {
        if (this._rigidBody) {
            this._rigidBody.setLinearVelocity(new Vec3(5, 0, 0));
            console.log('➡️ 测试向右移动');
        }
    }
    
    testMoveForward() {
        if (this._rigidBody) {
            this._rigidBody.setLinearVelocity(new Vec3(0, 0, -5));
            console.log('⬆️ 测试向前移动');
        }
    }
    
    resetPlayer() {
        this.node.setPosition(0, 1, 0);
        this._rigidBody.setLinearVelocity(Vec3.ZERO);
        this._rigidBody.setAngularVelocity(Vec3.ZERO);
        console.log('🔄 玩家已重置');
    }

    // 原有的方向控制和肉块相关方法保持不变...
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
    
    stabilizePlayer() {
        // 手动保持Y轴位置稳定
        const currentPos = this.node.position;
        if (Math.abs(currentPos.y) > 0.1) {
            // 如果位置有偏差，直接重置位置
            this.node.setPosition(currentPos.x, 0, currentPos.z);
            
            // 🆕 同时重置Y轴速度（正确获取和设置速度）
            const currentVelocity = new Vec3();
            this._rigidBody.getLinearVelocity(currentVelocity);
            this._rigidBody.setLinearVelocity(new Vec3(currentVelocity.x, 0, currentVelocity.z));
        }
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
    
    onTriggerEnter(event: ICollisionEvent) {
        if (event.otherCollider.node.name === 'DeliveryZone') {
            this._deliveryZone = event.otherCollider.node;
            this._isInDeliveryZone = true;
            console.log("进入交付区域");
        }
    }
    
    onTriggerExit(event: ICollisionEvent) {
        if (event.otherCollider.node.name === 'DeliveryZone') {
            this._isInDeliveryZone = false;
            this._deliveryZone = null;
            console.log("离开交付区域");
        }
    }
    
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
        this.updateMeatPositions();
        
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
        
        const meatComp = meat.getComponent(Meat);
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
        return new Vec3(
            0,
            this.meatStackOffset.y * (index + 1),
            -0.5
        );
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

    private _cookedMeats: Node[] = [];
    private _cookedMeatCount: number = 0;

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