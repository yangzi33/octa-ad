import { _decorator, Component, Node, Vec3, math } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SimpleFollow')
export class SimpleFollow extends Component {
    @property(Node)
    target: Node = null;
    
    @property
    height: number = 2; // 摄像机高度
    
    @property
    distance: number = 5; // 摄像机距离
    
    @property
    smoothSpeed: number = 5.0;
    
    lateUpdate(deltaTime: number) {
        if (!this.target) return;
        
        const targetPos = this.target.position;
        
        // 🆕 直接在玩家正后方
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
        
        // 🆕 注视玩家（稍微向上看）
        const lookAtPoint = new Vec3(
            targetPos.x,
            targetPos.y + 0.5, // 注视点比玩家中心稍高
            targetPos.z
        );
        this.node.lookAt(lookAtPoint);
    }
    
    snapToTarget() {
        if (!this.target) return;
        
        const targetPos = this.target.position;
        const desiredPosition = new Vec3(
            targetPos.x,
            targetPos.y + this.height,
            targetPos.z - this.distance
        );
        
        this.node.setPosition(desiredPosition);
        
        const lookAtPoint = new Vec3(
            targetPos.x,
            targetPos.y + 0.5,
            targetPos.z
        );
        this.node.lookAt(lookAtPoint);
    }
}