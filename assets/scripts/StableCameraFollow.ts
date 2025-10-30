import { _decorator, Component, Node, Vec3, math } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('StableCameraFollow')
export class StableCameraFollow extends Component {
    @property(Node)
    target: Node = null; // 跟随的目标（玩家）
    
    @property
    height: number = 8; // 摄像机高度
    
    @property
    distance: number = 10; // 摄像机距离（俯视角）
    
    @property
    smoothSpeed: number = 5.0; // 跟随平滑度
    
    @property
    enableBounds: boolean = false; // 是否启用边界限制
    
    @property(Vec3)
    minBounds: Vec3 = new Vec3(-50, 0, -50); // 最小边界
    
    @property(Vec3)
    maxBounds: Vec3 = new Vec3(50, 0, 50); // 最大边界
    
    // 🆕 固定摄像机角度
    @property
    fixedXRotation: number = 45; // 固定X轴旋转（俯角）
    
    private _initialRotation: Vec3 = new Vec3();
    
    onLoad() {
        // 保存初始旋转
        this._initialRotation = this.node.eulerAngles.clone();
        
        // 如果没有设置目标，尝试自动查找玩家
        if (!this.target) {
            this.findPlayerTarget();
        }
        
        // 设置固定旋转
        this.node.setRotationFromEuler(this.fixedXRotation, 0, 0);
        
        // 初始设置摄像机位置
        if (this.target) {
            this.snapToTarget();
        }
    }
    
    findPlayerTarget() {
        const player = this.node.scene.getChildByName('Player');
        if (player) {
            this.target = player;
            console.log("🎯 自动找到玩家目标:", player.name);
        }
    }
    
    lateUpdate(deltaTime: number) {
        if (!this.target) return;
        
        this.followTarget(deltaTime);
    }
    
    followTarget(deltaTime: number) {
        const targetPos = this.target.position;
        
        // 🆕 计算摄像机位置（正上方俯视）
        const desiredPosition = new Vec3(
            targetPos.x, // X轴跟随玩家
            targetPos.y + this.height, // Y轴保持固定高度
            targetPos.z - this.distance // Z轴保持固定距离
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
        
        // 🆕 保持固定旋转，不跟随玩家旋转
        // 摄像机始终保持固定的俯视角度
    }
    
    applyBounds(position: Vec3) {
        position.x = math.clamp(position.x, this.minBounds.x, this.maxBounds.x);
        position.z = math.clamp(position.z, this.minBounds.z, this.maxBounds.z);
    }
    
    // 🎯 立即跳转到目标位置
    snapToTarget() {
        if (!this.target) return;
        
        const targetPos = this.target.position;
        const desiredPosition = new Vec3(
            targetPos.x,
            targetPos.y + this.height,
            targetPos.z - this.distance
        );
        
        if (this.enableBounds) {
            this.applyBounds(desiredPosition);
        }
        
        this.node.setPosition(desiredPosition);
        this.node.setRotationFromEuler(this.fixedXRotation, 0, 0);
    }
    
    // 🎯 更改跟随目标
    setTarget(newTarget: Node) {
        this.target = newTarget;
        if (newTarget) {
            this.snapToTarget();
        }
    }
    
    // 🎯 更改摄像机高度
    setHeight(newHeight: number) {
        this.height = newHeight;
    }
    
    // 🎯 更改摄像机距离
    setDistance(newDistance: number) {
        this.distance = newDistance;
    }
    
    // 🎯 更改固定角度
    setFixedRotation(xRotation: number) {
        this.fixedXRotation = xRotation;
        this.node.setRotationFromEuler(this.fixedXRotation, 0, 0);
    }
}