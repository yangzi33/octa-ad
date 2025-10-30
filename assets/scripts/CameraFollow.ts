import { _decorator, Component, Node, Vec3, math, Quat, Camera } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {

    @property(Node)
    target: Node = null; // 跟随的目标（玩家）
    
    @property(Vec3)
    offset: Vec3 = new Vec3(0, 5, -8); // 摄像机偏移量
    
    @property
    smoothSpeed: number = 5.0; // 跟随平滑度
    
    @property(Vec3)
    lookAtOffset: Vec3 = new Vec3(0, 1, 0); // 注视点偏移
    
    @property({
        type: math.Vec2,
        tooltip: 'X轴旋转角度范围: 0-85度'
    })
    xRotationRange: math.Vec2 = new math.Vec2(0, 85); // X轴旋转角度范围
    
    @property
    xRotation: number = 30; // X轴旋转角度（俯角）
    
    @property
    enableBounds: boolean = false; // 是否启用边界限制
    
    @property(Vec3)
    minBounds: Vec3 = new Vec3(-50, 0, -50); // 最小边界
    
    @property(Vec3)
    maxBounds: Vec3 = new Vec3(50, 0, 50); // 最大边界
    
    private _camera: Camera = null;
    private _currentOffset: Vec3 = new Vec3();
    
    onLoad() {
        this._camera = this.getComponent(Camera);
        this._currentOffset = this.offset.clone();
        
        // 限制初始旋转角度
        this.xRotation = math.clamp(this.xRotation, this.xRotationRange.x, this.xRotationRange.y);
        
        // 如果没有设置目标，尝试自动查找玩家
        if (!this.target) {
            this.findPlayerTarget();
        }
        
        // 初始设置摄像机位置
        if (this.target) {
            this.snapToTarget();
        }
    }
    
    findPlayerTarget() {
        // 尝试通过名称查找玩家
        const player = this.node.scene.getChildByName('Player');
        if (player) {
            this.target = player;
            console.log("🎯 自动找到玩家目标:", player.name);
        } else {
            console.warn("⚠️ 未找到玩家目标，请在属性检查器中手动设置");
        }
    }
    
    lateUpdate(deltaTime: number) {
        if (!this.target) return;
        
        this.followTarget(deltaTime);
    }
    
    followTarget(deltaTime: number) {
        const targetPos = this.target.position;
        
        // 计算期望位置
        const desiredPosition = new Vec3(
            targetPos.x + this._currentOffset.x,
            targetPos.y + this._currentOffset.y,
            targetPos.z + this._currentOffset.z
        );
        
        // 应用边界限制
        if (this.enableBounds) {
            this.applyBounds(desiredPosition);
        }
        
        // 平滑插值
        const currentPosition = this.node.position;
        const smoothedPosition = new Vec3();
        Vec3.lerp(smoothedPosition, currentPosition, desiredPosition, this.smoothSpeed * deltaTime);
        
        this.node.setPosition(smoothedPosition);
        
        // 注视玩家（带偏移）
        this.lookAtTarget();
    }
    
    lookAtTarget() {
        if (!this.target) return;
        
        const targetPos = this.target.position;
        const lookAtPoint = new Vec3(
            targetPos.x + this.lookAtOffset.x,
            targetPos.y + this.lookAtOffset.y,
            targetPos.z + this.lookAtOffset.z
        );
        
        this.node.lookAt(lookAtPoint);
    }
    
    applyBounds(position: Vec3) {
        position.x = math.clamp(position.x, this.minBounds.x, this.maxBounds.x);
        position.z = math.clamp(position.z, this.minBounds.z, this.maxBounds.z);
    }
    
    // 🎯 立即跳转到目标位置（无平滑）
    snapToTarget() {
        if (!this.target) return;
        
        const targetPos = this.target.position;
        const desiredPosition = new Vec3(
            targetPos.x + this.offset.x,
            targetPos.y + this.offset.y,
            targetPos.z + this.offset.z
        );
        
        if (this.enableBounds) {
            this.applyBounds(desiredPosition);
        }
        
        this.node.setPosition(desiredPosition);
        this.lookAtTarget();
        
        // 设置初始旋转
        this.node.setRotationFromEuler(this.xRotation, 0, 0);
    }
    
    // 🎯 更改跟随目标
    setTarget(newTarget: Node) {
        this.target = newTarget;
        if (newTarget) {
            this.snapToTarget();
        }
    }
    
    // 🎯 更改摄像机偏移
    setOffset(newOffset: Vec3) {
        this.offset = newOffset;
        this._currentOffset = newOffset.clone();
    }
    
    // 🎯 更改平滑速度
    setSmoothSpeed(speed: number) {
        this.smoothSpeed = math.clamp(speed, 0.1, 20);
    }
    
    // 🎯 设置X轴旋转角度
    setXRotation(angle: number) {
        this.xRotation = math.clamp(angle, this.xRotationRange.x, this.xRotationRange.y);
        this.node.setRotationFromEuler(this.xRotation, 0, 0);
    }
    
    // 🎯 获取当前目标
    getTarget(): Node {
        return this.target;
    }
    
    // 🎯 检查是否正在跟随目标
    isFollowing(): boolean {
        return this.target !== null;
    }
}