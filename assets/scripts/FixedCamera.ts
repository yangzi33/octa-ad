import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FixedCamera')
export class FixedCamera extends Component {
    @property(Node)
    target: Node = null;
    
    @property
    height: number = 8;
    
    @property
    distance: number = 10;
    
    @property
    smoothSpeed: number = 5.0;
    
    lateUpdate(deltaTime: number) {
        if (!this.target) return;
        
        const targetPos = this.target.position;
        
        // 🆕 直接计算摄像机位置
        const desiredPosition = new Vec3(
            targetPos.x,
            targetPos.y + this.height,
            targetPos.z - this.distance
        );
        
        // 平滑移动
        const currentPosition = this.node.position;
        const smoothedPosition = new Vec3();
        Vec3.lerp(smoothedPosition, currentPosition, desiredPosition, this.smoothSpeed * deltaTime);
        
        this.node.setPosition(smoothedPosition);
        
        // 🆕 摄像机不旋转，保持固定角度
    }
}