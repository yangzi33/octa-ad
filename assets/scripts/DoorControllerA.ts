import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, Animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DoorControllerA')
export class DoorControllerA extends Component {

    @property(Animation) // 在编辑器中将动画组件拖拽至此
    public doorAnimation: Animation | null = null;

    start() {
        // 获取碰撞器并监听碰撞
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        // 若无指定动画，则尝试获取节点上的Animation组件
        if (!this.doorAnimation) {
            this.doorAnimation = this.getComponent(Animation);
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // 碰撞时播放动画
        if (this.doorAnimation) {
            // 播放名为 "doorOpen" 的AnimationClip，请确保其存在
            this.doorAnimation.play('doorOpen');
        }
    }
}