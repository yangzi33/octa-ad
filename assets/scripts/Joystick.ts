import { _decorator, Component, Node, Input, EventTouch, Vec2, Vec3, UITransform, input } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends Component {
    @property(Node)
    bg: Node = null; // 摇杆背景节点
    
    @property(Node)
    btn: Node = null; // 摇杆按钮节点
    
    @property
    maxR: number = 100; // 摇杆最大移动半径
    
    @property
    autoHide: boolean = false; // 是否自动隐藏（根据需求设置）
    
    @property
    touchArea: Node = null; // 可选：指定触摸区域

    private _dir: Vec2 = new Vec2(0, 0); // 摇杆方向向量
    private _bgOriginalPos: Vec3 = new Vec3(); // 背景初始位置
    private _isActive: boolean = false; // 🆕 摇杆激活状态
    private _touchId: number = -1; // 🆕 当前触摸ID

    start() {
        // 保存背景初始位置
        this._bgOriginalPos = this.bg.position.clone();
        
        // 🆕 初始隐藏（如果启用自动隐藏）
        if (this.autoHide) {
            this.setVisible(false);
        }
        
        // 🆕 注册触摸事件
        this.registerTouchEvents();
    }
    
    // 🆕 注册触摸事件
    registerTouchEvents() {
        const targetNode = this.touchArea || this.node;
        
        targetNode.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        targetNode.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        targetNode.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        targetNode.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        
        console.log("🎯 摇杆事件注册完成");
    }
    
    onTouchStart(event: EventTouch) {
        // 🆕 防止多指操作
        if (this._isActive) return;
        
        this._touchId = event.getID();
        this._isActive = true;
        
        // 🆕 显示摇杆（如果隐藏）
        if (this.autoHide) {
            this.setVisible(true);
        }
        
        // 🆕 在触摸位置显示摇杆
        this.showAtTouchPosition(event);
        
        this.updateJoystick(event);
        
        event.propagationStopped = true; // 🆕 阻止事件冒泡
    }
    
    onTouchMove(event: EventTouch) {
        // 🆕 只处理当前激活的触摸
        if (!this._isActive || event.getID() !== this._touchId) return;
        
        this.updateJoystick(event);
        event.propagationStopped = true;
    }
    
    onTouchEnd(event: EventTouch) {
        // 🆕 只处理当前激活的触摸
        if (!this._isActive || event.getID() !== this._touchId) return;
        
        this.resetJoystick();
        event.propagationStopped = true;
    }
    
    // 🆕 在触摸位置显示摇杆
    showAtTouchPosition(event: EventTouch) {
        if (!this.bg || !this.bg.parent) return;
        
        try {
            // 🆕 使用 getUILocation 获取正确的UI坐标
            const uiLocation = event.getUILocation();
            const canvas = this.bg.parent;
            const canvasUITransform = canvas.getComponent(UITransform);
            
            if (!canvasUITransform) {
                console.error("❌ Canvas没有UITransform组件");
                return;
            }
            
            // 🆕 转换为Canvas本地坐标
            const worldPos = new Vec3(uiLocation.x, uiLocation.y, 0);
            const localPos = canvasUITransform.convertToNodeSpaceAR(worldPos);
            
            // 🆕 设置摇杆背景位置
            this.bg.setPosition(localPos);
            this.btn.setPosition(Vec3.ZERO);
            
            console.log("📍 摇杆显示在位置:", localPos);
        } catch (error) {
            console.error("❌ 显示摇杆位置错误:", error);
            // 🆕 备用方案：使用固定位置
            this.bg.setPosition(this._bgOriginalPos);
            this.btn.setPosition(Vec3.ZERO);
        }
    }
    
    updateJoystick(event: EventTouch) {
        if (!this._isActive || !this.bg || !this.bg.parent) return;

        try {
            // 🆕 使用 getUILocation 获取正确的UI坐标
            const uiLocation = event.getUILocation();
            const canvas = this.bg.parent;
            const canvasUITransform = canvas.getComponent(UITransform);
            
            if (!canvasUITransform) return;

            // 🆕 转换为Canvas本地坐标
            const touchWorldPos = new Vec3(uiLocation.x, uiLocation.y, 0);
            const canvasPos = canvasUITransform.convertToNodeSpaceAR(touchWorldPos);
            
            const bgPos = this.bg.position;
            
            // 🆕 计算相对于背景中心的偏移
            const offsetX = canvasPos.x - bgPos.x;
            const offsetY = canvasPos.y - bgPos.y;
            
            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            
            // 🆕 添加最小移动阈值，避免抖动
            if (distance > 5) {
                const limitedDistance = Math.min(distance, this.maxR);
                const scale = limitedDistance / distance;
                
                const newX = offsetX * scale;
                const newY = offsetY * scale;
                
                this.btn.setPosition(newX, newY, 0);
                this._dir = new Vec2(offsetX / distance, offsetY / distance);
                
                // console.log("🎮 摇杆方向:", this._dir, "距离:", limitedDistance.toFixed(1));
            }
        } catch (error) {
            console.error("❌ 摇杆更新错误:", error);
        }
    }
    
    // 🆕 重置摇杆
    resetJoystick() {
        this.btn.setPosition(Vec3.ZERO);
        this._dir = Vec2.ZERO;
        this._isActive = false;
        this._touchId = -1;
        
        // 🆕 隐藏摇杆（如果启用自动隐藏）
        if (this.autoHide) {
            this.setVisible(false);
        }
        
        console.log("🔄 摇杆重置");
    }
    
    // 🆕 设置可见性
    setVisible(visible: boolean) {
        if (this.bg) this.bg.active = visible;
        if (this.btn) this.btn.active = visible;
    }
    
    // 🆕 强制显示摇杆（在指定位置）
    showJoystickAt(position: Vec2) {
        if (!this.bg) return;
        
        this.bg.setPosition(position.x, position.y, 0);
        this.btn.setPosition(Vec3.ZERO);
        this.setVisible(true);
        this._isActive = true;
    }
    
    // 🆕 强制隐藏摇杆
    forceHide() {
        this.resetJoystick();
    }
    
    // 🆕 检查摇杆是否激活
    isActive(): boolean {
        return this._isActive;
    }
    
    // 获取摇杆方向（归一化向量）
    get dir(): Vec2 {
        return this._isActive ? this._dir : Vec2.ZERO;
    }
    
    onDestroy() {
        // 🆕 清理事件监听
        const targetNode = this.touchArea || this.node;
        targetNode.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        targetNode.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        targetNode.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        targetNode.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}