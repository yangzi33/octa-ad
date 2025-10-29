import { _decorator, Component, Node, Vec3, Collider, ICollisionEvent, Vec2 } from 'cc';
import { Joystick } from './Joystick';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property
    moveSpeed: number = 5;
    
    @property(Node)
    joystick: Node = null;
    
    @property
    meatStackOffset: Vec3 = new Vec3(0, 0.5, 0); // 每块肉的叠放偏移
    
    private _joystickComp: Joystick = null;
    private _collectedMeats: Node[] = []; // 收集的肉块列表
    private _meatCount: number = 0; // 🆕 肉块计数
    
    // 🆕 交付区域相关
    private _deliveryZone: Node = null;
    private _isInDeliveryZone: boolean = false;

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
            this.updateMeatPositions();
        }
        
        // 🆕 检查是否在交付区域内并自动交付
        this.checkAutoDelivery(deltaTime);
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
    checkAutoDelivery(deltaTime: number) {
        if (this._isInDeliveryZone && this._meatCount > 0) {
            // 可以在这里添加交付逻辑，比如每2秒交付一块肉
            // 这里我们简化为立即交付所有肉
            this.deliverAllMeat();
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
    deliverOneMeat() {
        if (this._meatCount === 0) return;
        
        // 移除最后一块肉
        const lastMeat = this._collectedMeats.pop();
        if (lastMeat && lastMeat.isValid) {
            lastMeat.destroy();
        }
        
        this._meatCount = this._collectedMeats.length;
        
        // 更新剩余肉块的位置
        this.updateMeatPositions();
        
        console.log(`交付1块肉，剩余 ${this._meatCount} 块`);
        this.onMeatDelivered();
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
        
        // 将肉块设置为玩家的子节点
        meat.parent = this.node;
        
        // 禁用肉块的物理组件（如果有）
        const collider = meat.getComponent(Collider);
        if (collider) {
            collider.enabled = false;
        }
        
        // 计算肉块的叠放位置
        const stackPosition = this.calculateMeatStackPosition(this._collectedMeats.length);
        meat.setPosition(stackPosition);
        
        // 添加到收集列表并更新计数
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
}