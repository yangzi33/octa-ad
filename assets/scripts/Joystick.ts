import { _decorator, Component, Node, Input, EventTouch, Vec2, Vec3, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends Component {
    @property(Node)
    bg: Node = null; // 摇杆背景节点
    @property(Node)
    btn: Node = null; // 摇杆按钮节点
    
    @property
    maxR: number = 100; // 摇杆最大移动半径
    
    private _dir: Vec2 = new Vec2(0, 0); // 摇杆方向向量
    private _bgOriginalPos: Vec3 = new Vec3(); // 背景初始位置
    
    start() {
        // 保存背景初始位置
        this._bgOriginalPos = this.bg.position.clone();
        
        // 注册触摸事件
        this.node.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
    
    onTouchStart(event: EventTouch) {
        this.updateJoystick(event);
    }
    
    onTouchMove(event: EventTouch) {
        this.updateJoystick(event);
    }
    
    onTouchEnd() {
        // 触摸结束，重置摇杆位置和方向
        this.btn.setPosition(Vec3.ZERO);
        this._dir = Vec2.ZERO;
    }
    
    updateJoystick(event: EventTouch) {
        // 获取触摸点在Bg节点坐标系下的位置
        const uiTransform = this.bg.getComponent(UITransform);
        const touchPos = new Vec3(event.getLocationX(), event.getLocationY());
        const localPos = uiTransform.convertToNodeSpaceAR(touchPos);
        
        // 限制摇杆在最大半径内移动
        const length = Math.min(localPos.length(), this.maxR);
        const dir = localPos.normalize();
        const newPos = dir.multiplyScalar(length);
        
        this.btn.setPosition(newPos);
        this._dir = new Vec2(dir.x, dir.y); // 更新方向向量
    }
    
    // 获取摇杆方向（归一化向量）
    get dir(): Vec2 {
        return this._dir;
    }
}