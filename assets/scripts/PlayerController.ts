import { _decorator, Component, Node, Vec3, input, Input, Vec2 } from 'cc';
import { Joystick } from './Joystick';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property
    moveSpeed: number = 5; // 移动速度
    
    @property(Node)
    joystick: Node = null; // 摇杆节点引用
    
    private _joystickComp: Joystick = null; // Joystick组件实例
    
    start() {
        // 获取摇杆节点的Joystick组件
        if (this.joystick) {
            this._joystickComp = this.joystick.getComponent(Joystick);
        }
    }
    
    update(deltaTime: number) {
        if (!this._joystickComp) return;
        
        // 获取摇杆方向
        const dir = this._joystickComp.dir;
        
        // 如果有输入方向，则移动物体
        if (!dir.equals(Vec2.ZERO)) {
            const moveVec = new Vec3(dir.x, 0, -dir.y); // 将2D方向转换为3D移动向量
            this.node.position = this.node.position.add(moveVec.multiplyScalar(this.moveSpeed * deltaTime));
            
            // 可选：让物体朝向移动方向
            // this.node.lookAt(this.node.position.add(moveVec));
        }
    }
}