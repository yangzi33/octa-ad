import { _decorator, Component, Node, Vec3, Collider, ICollisionEvent, Vec2, RigidBody, ITriggerEvent, Prefab, instantiate, Quat} from 'cc';
import { Joystick } from './Joystick';
import { Meat } from './Meat';
const { ccclass, property } = _decorator;

enum meatType {
    raw,
    sliced,
    cooked,
}
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property
    moveSpeed: number = 5;
    
    @property(Node)
    joystick: Node = null;
    
    // 三个offset位置
    @property
    meatOffset0: Vec3 = new Vec3(0, 0.5, -0.5);
    @property
    meatOffset1: Vec3 = new Vec3(-0.3, 0.5, -0.5);
    @property
    meatOffset2: Vec3 = new Vec3(0.3, 0.5, -0.5);
    
    @property
    rotationSpeed: number = 10;
    @property
    meatPerSec: number = 1.0;
    
    private _joystickComp: Joystick = null;
    
    // 三个数组分别存储不同类型的肉
    private _meats: Node[] = [];           // 生肉
    private _slicedMeats: Node[] = [];     // 切片肉
    private _cookedMeats: Node[] = [];     // 熟肉
    
    private _collider: Collider = null;
    private _rigidBody: RigidBody = null;
    
    private _deliveryZone: Node = null;
    private _isInDeliveryZone: boolean = false;
    private _deliveryTimer: number = null;

    private _currentDirection: number = 5;
    private _targetRotation: Quat = new Quat();
    private _targetEulerY: number = 0;

    private _slicedPickupZone: Node = null;
    private _isInSlicedPickupZone: boolean = false;

    private _cookingZone: Node = null;
    private _isInCookingZone: boolean = false;
    private _cookZoneController: any = null;

    onLoad() {
        this._targetRotation = this.node.rotation.clone();
        this.initExistingCollider();
    }
    
    start() {
        if (this.joystick) {
            this._joystickComp = this.joystick.getComponent('Joystick') as any;
        }
        
        this._targetEulerY = this.node.eulerAngles.y;
    }
    
    // 获取总的肉块数量
    getTotalMeatCount(): number {
        return this._meats.length + this._slicedMeats.length + this._cookedMeats.length;
    }
    
    // 获取指定类型的肉块数量
    getMeatCountByType(type: string): number {
        switch (type) {
            case 'meat': return this._meats.length;
            case 'sliced': return this._slicedMeats.length;
            case 'cooked': return this._cookedMeats.length;
            default: return 0;
        }
    }
    
    // 更新所有肉块的位置
    updateAllMeatPositions() {
        // 更新生肉位置
        this._meats.forEach((meat, index) => {
            if (meat && meat.isValid) {
                const offset = this.getCurrOffset(meatType.raw);
                // 生肉总是从offset0开始
                const targetPos = new Vec3(
                    offset.x,
                    offset.y + index * 0.3, // 堆叠效果
                    offset.z
                );
                meat.setPosition(targetPos);
                // console.log("rawOffset: " + offset);
            }
        });
        
        // 更新切片肉位置
        this._slicedMeats.forEach((meat, index) => {
            if (meat && meat.isValid) {
                const offset = this.getCurrOffset(meatType.sliced);
                const targetPos = new Vec3(
                    offset.x,
                    offset.y + index * 0.3,
                    offset.z
                );
                meat.setPosition(targetPos);
                // console.log("slicedOffset: " + offset);
            }
        });
        
        // 更新熟肉位置
        this._cookedMeats.forEach((meat, index) => {
            if (meat && meat.isValid) {
                const offset = this.getCurrOffset(meatType.cooked);
                const targetPos = new Vec3(
                    offset.x,
                    offset.y + index * 0.3,
                    offset.z
                );
                meat.setPosition(targetPos);
                // console.log("cookedOffset: " + offset);
            }
        });
    }

    getCurrOffset(iMeatType: meatType): Vec3 {
        const complementTypes: meatType[] = [];
        if (iMeatType === meatType.raw) {
            complementTypes.push(meatType.cooked);
            complementTypes.push(meatType.sliced);
        }
        else if (iMeatType === meatType.sliced) {
            complementTypes.push(meatType.raw);
            complementTypes.push(meatType.cooked);
        }
        else if (iMeatType === meatType.cooked) {
            complementTypes.push(meatType.raw);
            complementTypes.push(meatType.sliced);
        }
        let cnt = 0;
        for (let i = 0; i < complementTypes.length; i++) {
            var cType = complementTypes[i];
            if (this.getMeatCountByMeatType(cType) > 0) {
                cnt++;
            }
            // console.log("" + cType.toString() + "count: " + this.getMeatCountByMeatType(cType));
        }
        if (cnt == 0) {
            return this.meatOffset0;
        }
        else if (cnt == 1) {
            return this.meatOffset1;
        }
        else {
            return this.meatOffset2;
        }
    }

    getMeatCountByMeatType(iMeatType: meatType): number {
        if (iMeatType === meatType.raw) {
            return this._meats.length;
        }
        else if (iMeatType == meatType.sliced) {
            return this._slicedMeats.length;
        }
        else if (iMeatType == meatType.cooked) {
            return this._cookedMeats.length;
        }
        else {
            return 0;
        }
    }

    // 收集生肉
    collectMeatDirectly(meat: Node) {
        console.log("PlayerController 开始收集肉块:", meat.name);
        
        // 移除物理组件
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
        this._meats.push(meat);
        
        this.updateAllMeatPositions();
        
        console.log(`成功收集到生肉! 当前数量: ${this._meats.length}`);
    }
    
    // 获取切片肉
    obtainSlicedMeat(slicedMeat: Node) {
        if (!slicedMeat) return;
        
        // 准备切片肉
        const rigidbody = slicedMeat.getComponent(RigidBody);
        if (rigidbody) {
            slicedMeat.removeComponent(RigidBody);
        }
        
        const collider = slicedMeat.getComponent(Collider);
        if (collider) {
            slicedMeat.removeComponent(Collider);
        }
        
        slicedMeat.parent = this.node;
        this._slicedMeats.push(slicedMeat);
        
        this.updateAllMeatPositions();
        
        console.log(`🔪 获得切片肉，总数: ${this._slicedMeats.length}`);
    }
    
    // 获取熟肉
    obtainCookedMeat(cookedMeat: Node) {
        if (!cookedMeat) return;
        
        // 准备熟肉
        const rigidbody = cookedMeat.getComponent(RigidBody);
        if (rigidbody) {
            cookedMeat.removeComponent(RigidBody);
        }
        
        const collider = cookedMeat.getComponent(Collider);
        if (collider) {
            cookedMeat.removeComponent(Collider);
        }
        
        cookedMeat.parent = this.node;
        this._cookedMeats.push(cookedMeat);
        
        this.updateAllMeatPositions();
        
        console.log(`🍖 获得熟肉，总数: ${this._cookedMeats.length}`);
    }
    
    // 交付生肉
    deliverOneMeat(): Node | null {
        if (this._meats.length === 0) return null;
        
        const lastMeat = this._meats.pop();
        if (!lastMeat || !lastMeat.isValid) {
            return null;
        }
        
        lastMeat.parent = null;
        this.updateAllMeatPositions();
        
        console.log(`📦 交付1块生肉，剩余 ${this._meats.length} 块`);
        return lastMeat;
    }
    
    // 交付切片肉
    deliverOneSlicedMeat(): Node | null {
        if (this._slicedMeats.length === 0) return null;
        
        const lastSlicedMeat = this._slicedMeats.pop();
        if (!lastSlicedMeat || !lastSlicedMeat.isValid) {
            return null;
        }
        
        lastSlicedMeat.parent = null;
        this.updateAllMeatPositions();
        
        console.log(`📦 交付1块切片肉，剩余 ${this._slicedMeats.length} 块`);
        return lastSlicedMeat;
    }
    
    // 交付熟肉
    deliverOneCookedMeat(): Node | null {
        if (this._cookedMeats.length === 0) return null;
        
        const lastCookedMeat = this._cookedMeats.pop();
        if (!lastCookedMeat || !lastCookedMeat.isValid) {
            return null;
        }
        
        lastCookedMeat.parent = null;
        this.updateAllMeatPositions();
        
        console.log(`📦 交付1块熟肉，剩余 ${this._cookedMeats.length} 块`);
        return lastCookedMeat;
    }
    
    // 获取切片肉（用于交给烹饪系统）
    takeSlicedMeat(): Node | null {
        if (this._slicedMeats.length === 0) {
            console.log("⚠️ 没有切片肉可获取");
            return null;
        }
        
        const slicedMeat = this._slicedMeats.pop();
        
        if (slicedMeat) {
            slicedMeat.parent = null;
            this.updateAllMeatPositions();
            
            console.log(`📤 拿走切片肉，剩余: ${this._slicedMeats.length}`);
        }
        
        return slicedMeat;
    }
    
    // 检查是否有某种类型的肉
    hasMeat(type?: string): boolean {
        if (!type) {
            return this.getTotalMeatCount() > 0;
        }
        
        return this.getMeatCountByType(type) > 0;
    }
    
    // 获取各种肉的数量信息
    getMeatInfo(): { meat: number, sliced: number, cooked: number, total: number } {
        return {
            meat: this._meats.length,
            sliced: this._slicedMeats.length,
            cooked: this._cookedMeats.length,
            total: this.getTotalMeatCount()
        };
    }

    update(deltaTime: number) {
        if (!this._joystickComp) return;
        
        const dir = this._joystickComp.dir;
        
        if (!dir.equals(Vec2.ZERO)) {
            this.moveWithPhysics(dir, deltaTime);
            this.updateDirection(dir);
            this.applyYRotation(deltaTime);
            this.stabilizePlayer();
            this.updateAllMeatPositions();
        } else {
            if (this._rigidBody) {
                this._rigidBody.setLinearVelocity(Vec3.ZERO);
            }
            
            if (this._currentDirection !== 5) {
                this._currentDirection = 5;
            }
        }
        
        this.preventRotation();
        this.checkAutoDelivery(deltaTime);
        this.checkCookingInteraction(deltaTime);
    }

    getSlicedMeatCount(): number {
        return this._slicedMeats.length;
    }
    
    // 🆕 获取熟肉数量（兼容性方法）
    getCookedMeatCount(): number {
        return this._cookedMeats.length;
    }
    
    // 🆕 获取生肉数量（兼容性方法）
    getMeatCount(): number {
        return this._meats.length;
    }
    
    // 🆕 检查是否有切片肉（兼容性方法）
    hasSlicedMeat(): boolean {
        return this._slicedMeats.length > 0;
    }
    
    // 🆕 检查是否有熟肉（兼容性方法）
    hasCookedMeat(): boolean {
        return this._cookedMeats.length > 0;
    }
    
    // 检查烹饪交互
    checkCookingInteraction(deltaTime: number) {
        if (this._isInCookingZone && this._cookZoneController) {
            // 检查是否有切片肉可以交给烹饪系统
            if (this._slicedMeats.length > 0) {
                const slicedMeat = this.takeSlicedMeat();
                if (slicedMeat) {
                    console.log("🍳 将切片肉交给烹饪系统");
                    this._cookZoneController.addSlicedMeat(slicedMeat);
                }
            }
            
            // 检查烹饪系统是否有熟肉可以获取
            if (this._cookZoneController.hasCookedMeat()) {
                const cookedMeat = this._cookZoneController.takeCookedMeat();
                if (cookedMeat) {
                    console.log("🍖 从烹饪系统获取熟肉");
                    this.obtainCookedMeat(cookedMeat);
                }
            }
        }
    }

    // 自动交付检查
    checkAutoDelivery(deltaTime: number) {
        if (this._isInDeliveryZone && this.getTotalMeatCount() > 0) {
            if (!this._deliveryTimer) {
                this._deliveryTimer = 0;
                console.log("🏪 开始自动交付肉块");
            }
            
            this._deliveryTimer += deltaTime;
            const deliveryInterval = 1.0 / this.meatPerSec;
            
            if (this._deliveryTimer >= deliveryInterval) {
                // 优先交付熟肉，然后是切片肉，最后是生肉
                let deliveredMeat: Node = null;
                if (this._cookedMeats.length > 0) {
                    deliveredMeat = this.deliverOneCookedMeat();
                } else if (this._slicedMeats.length > 0) {
                    deliveredMeat = this.deliverOneSlicedMeat();
                } else if (this._meats.length > 0) {
                    deliveredMeat = this.deliverOneMeat();
                }
                
                this._deliveryTimer = 0;
                
                if (this.getTotalMeatCount() === 0) {
                    this._deliveryTimer = null;
                    console.log("✅ 所有肉块交付完成");
                }
            }
        } else {
            this._deliveryTimer = null;
        }
    }

    initExistingCollider() {
        this._collider = this.node.getComponent(Collider);
        
        if (!this._collider) {
            console.error("❌ 玩家节点上没有碰撞器组件！请在编辑器中添加碰撞器");
            return;
        }
        
        this._collider.isTrigger = false;
        this._rigidBody = this.node.getComponent(RigidBody);
        
        if (!this._rigidBody) {
            console.error("❌ 玩家节点上没有刚体组件！请在编辑器中添加刚体");
            return;
        }
        
        this._rigidBody.type = RigidBody.Type.DYNAMIC;
        this._rigidBody.mass = 10;
        this._rigidBody.linearDamping = 0.8;
        this._rigidBody.angularDamping = 100.0;
        
        this._collider.on('onCollisionEnter', this.onCollisionEnter, this);
        this._collider.on('onCollisionStay', this.onCollisionStay, this);
        this._collider.on('onCollisionExit', this.onCollisionExit, this);
        this._collider.on('onTriggerEnter', this.onTriggerEnter, this);
        this._collider.on('onTriggerStay', this.onTriggerStay, this);
        this._collider.on('onTriggerExit', this.onTriggerExit, this);
    }
    
    moveWithPhysics(dir: Vec2, deltaTime: number) {
        if (!this._rigidBody) return;
        
        const moveVec = new Vec3(dir.x, 0, -dir.y);
        moveVec.normalize();
        
        const targetVelocity = moveVec.multiplyScalar(this.moveSpeed);
        const currentVel = new Vec3();
        this._rigidBody.getLinearVelocity(currentVel);
        
        this._rigidBody.setLinearVelocity(new Vec3(
            targetVelocity.x,
            currentVel.y,
            targetVelocity.z
        ));
    }
    
    preventRotation() {
        if (!this._rigidBody) return;
        this._rigidBody.setAngularVelocity(Vec3.ZERO);
        
        const currentEuler = this.node.eulerAngles;
        if (Math.abs(currentEuler.x) > 0.1 || Math.abs(currentEuler.z) > 0.1) {
            this.node.setRotationFromEuler(0, currentEuler.y, 0);
        }
    }
    
    
    stabilizePlayer() {
        if (this._rigidBody) {
            const currentPos = this.node.position;
            
            if (Math.abs(currentPos.y) > 0.1) {
                this.node.setPosition(currentPos.x, 0, currentPos.z);
                
                const currentVel = new Vec3();
                this._rigidBody.getLinearVelocity(currentVel);
                this._rigidBody.setLinearVelocity(new Vec3(currentVel.x, 0, currentVel.z));
            }
            
            this._rigidBody.setAngularVelocity(Vec3.ZERO);
        }
    }
    
    // 碰撞事件方法
    onCollisionEnter(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        console.log("💥 玩家碰撞到:", otherNode.name);
        
        if (otherNode.name.includes('Wall') || otherNode.name.includes('Obstacle')) {
            console.log("🚧 撞到障碍物");
        }
    }
    
    onCollisionStay(event: ICollisionEvent) {
        // 持续碰撞处理 - 可以在这里添加持续碰撞的逻辑
        const otherNode = event.otherCollider.node;
        // console.log("💥 玩家持续碰撞:", otherNode.name);
    }
    
    onCollisionExit(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        console.log("💥 玩家结束碰撞:", otherNode.name);
    }
    
    // 触发器事件
    onTriggerEnter(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        console.log("🔵 玩家进入触发器:", otherNode.name);
        
        if (otherNode.name === 'DeliveryZone') {
            this._deliveryZone = otherNode;
            this._isInDeliveryZone = true;
            console.log("进入交付区域");
        }
        else if (otherNode.name === 'SlicedPickupZone') {
            this._slicedPickupZone = otherNode;
            this._isInSlicedPickupZone = true;
            console.log("进入切片拾取区域");
        }
        else if (otherNode.name === 'CookingZone') {
            this._cookingZone = otherNode;
            this._isInCookingZone = true;
            this._cookZoneController = otherNode.getComponent('CookZoneController');
            console.log("🍳 进入烹饪区域");
        }
        else if (otherNode.name.includes('Meat')) {
            console.log("🥩 碰到肉块，开始收集");
            this.startCollectingMeat(otherNode);
        }
    }
    
    onTriggerStay(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        // 持续触发逻辑 - 可以在这里添加持续触发器的逻辑
        // console.log("🔵 玩家停留在触发器:", otherNode.name);
    }
    
    onTriggerExit(event: ITriggerEvent) {
        const otherNode = event.otherCollider.node;
        console.log("🔵 玩家离开触发器:", otherNode.name);
        
        if (otherNode.name === 'DeliveryZone') {
            this._isInDeliveryZone = false;
            this._deliveryZone = null;
            this._deliveryTimer = null;
            console.log("离开交付区域");
        }
        else if (otherNode.name === 'SlicedPickupZone') {
            this._isInSlicedPickupZone = false;
            this._slicedPickupZone = null;
            console.log("离开切片拾取区域");
        }
        else if (otherNode.name === 'CookingZone') {
            this._isInCookingZone = false;
            this._cookingZone = null;
            this._cookZoneController = null;
            console.log("🍳 离开烹饪区域");
        }
    }
    
    startCollectingMeat(meat: Node) {
        console.log("开始收集肉块:", meat.name);
        this.collectMeatDirectly(meat);
    }
    
    // 方向控制相关方法
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

    // 其他辅助方法
    deliverAllMeat() {
        const totalCount = this.getTotalMeatCount();
        if (totalCount === 0) return;
        
        console.log(`交付了 ${totalCount} 块肉`);
        
        // 销毁所有肉块
        [...this._meats, ...this._slicedMeats, ...this._cookedMeats].forEach(meat => {
            if (meat && meat.isValid) {
                meat.destroy();
            }
        });
        
        this._meats = [];
        this._slicedMeats = [];
        this._cookedMeats = [];
        
        this.onMeatDelivered();
    }
    
    onMeatDelivered() {
        // 交付效果 - 可以在这里添加交付后的特效或音效
        console.log("✅ 所有肉块已交付");
    }
}