import { _decorator, Component, Node, Collider, ICollisionEvent, RigidBody, BoxCollider, Animation, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DoorController')
export class DoorController extends Component {
    @property
    doorWidth: number = 2;

    @property
    doorHeight: number = 3;

    @property
    doorThickness: number = 0.2;

    @property
    isOpen: boolean = false; // 门的状态

    @property
    openAnimationName: string = 'door_open'; // 开门动画名称

    @property
    closeAnimationName: string = 'door_close'; // 关门动画名称

    @property
    playerDetectionRange: number = 3; // 玩家检测范围

    @property(Node)
    playerNode: Node = null; // 玩家节点引用

    private _collider: BoxCollider = null;
    private _rigidBody: RigidBody = null;
    private _animation: Animation = null;
    private _isAnimating: boolean = false;

    onLoad() {
        this.initDoor();
    }

    // 初始化门的物理属性
    initDoor() {
        // 获取或添加碰撞器
        this._collider = this.node.getComponent(BoxCollider);
        if (!this._collider) {
            this._collider = this.node.addComponent(BoxCollider);
        }
        
        // 设置碰撞器尺寸
        this._collider.size = new Vec3(this.doorWidth, this.doorHeight, this.doorThickness);
        this._collider.isTrigger = false;

        // 获取或添加刚体
        this._rigidBody = this.node.getComponent(RigidBody);
        if (!this._rigidBody) {
            this._rigidBody = this.node.addComponent(RigidBody);
        }

        // 门默认是静态刚体
        this._rigidBody.mass = 0;

        // 获取动画组件
        this._animation = this.node.getComponent(Animation);

        // 根据初始状态设置碰撞
        this.updateCollisionState();

        // 注册碰撞事件
        this._collider.on('onCollisionEnter', this.onCollisionEnter, this);

        console.log(`🚪 门初始化完成: ${this.node.name}, 初始状态: ${this.isOpen ? '开启' : '关闭'}`);
    }

    start() {
        // 如果没有指定玩家节点，尝试在场景中查找
        if (!this.playerNode) {
            this.playerNode = this.node.scene.getChildByName('Player');
        }
    }

    update(deltaTime: number) {
        // 如果门是开启状态，检测玩家是否靠近
        if (this.isOpen && this.playerNode && !this._isAnimating) {
            this.checkPlayerProximity();
        }
    }

    // 检测玩家是否靠近门
    checkPlayerProximity() {
        const distance = Vec3.distance(this.node.position, this.playerNode.position);
        
        if (distance <= this.playerDetectionRange) {
            // 玩家靠近，关闭门
            this.setDoorState(false);
        }
    }

    // 设置门的状态
    setDoorState(open: boolean) {
        if (this.isOpen === open || this._isAnimating) {
            return; // 状态相同或正在动画中，不执行
        }

        this.isOpen = open;
        this._isAnimating = true;

        if (open) {
            this.playOpenAnimation();
        } else {
            this.playCloseAnimation();
        }

        console.log(`🚪 门 ${this.node.name} ${open ? '开启' : '关闭'}`);
    }

    // 播放开门动画
    playOpenAnimation() {
        // 先禁用碰撞
        this.setCollisionEnabled(false);

        if (this._animation && this.openAnimationName) {
            this._animation.play(this.openAnimationName);
            
            // 动画结束后更新状态
            this.scheduleOnce(() => {
                this._isAnimating = false;
            }, this._animation.getState(this.openAnimationName).duration);
        } else {
            // 如果没有动画，使用tween实现简单效果
            tween(this.node)
                .to(0.5, { eulerAngles: new Vec3(0, 90, 0) })
                .call(() => {
                    this._isAnimating = false;
                })
                .start();
        }
    }

    // 播放关门动画
    playCloseAnimation() {
        if (this._animation && this.closeAnimationName) {
            this._animation.play(this.closeAnimationName);
            
            // 动画结束后启用碰撞
            this.scheduleOnce(() => {
                this.setCollisionEnabled(true);
                this._isAnimating = false;
            }, this._animation.getState(this.closeAnimationName).duration);
        } else {
            // 如果没有动画，使用tween实现简单效果
            tween(this.node)
                .to(0.5, { eulerAngles: new Vec3(0, 0, 0) })
                .call(() => {
                    this.setCollisionEnabled(true);
                    this._isAnimating = false;
                })
                .start();
        }
    }

    // 设置碰撞状态
    setCollisionEnabled(enabled: boolean) {
        if (this._collider) {
            this._collider.enabled = enabled;
        }
        
        if (this._rigidBody) {
            this._rigidBody.enabled = enabled;
        }
    }

    // 更新碰撞状态（根据门的状态）
    updateCollisionState() {
        this.setCollisionEnabled(!this.isOpen);
    }

    // 碰撞事件（用于调试）
    onCollisionEnter(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        if (otherNode.name === 'Player') {
            console.log(`🚪 门 ${this.node.name} 被玩家碰撞，当前状态: ${this.isOpen ? '开启' : '关闭'}`);
        }
    }

    // 🆕 外部调用的开门方法
    openDoor() {
        this.setDoorState(true);
    }

    // 🆕 外部调用的关门方法
    closeDoor() {
        this.setDoorState(false);
    }

    // 🆕 切换门的状态
    toggleDoor() {
        this.setDoorState(!this.isOpen);
    }

    // 🆕 获取门的状态
    getDoorState(): boolean {
        return this.isOpen;
    }

    // 🆕 设置玩家检测范围
    setDetectionRange(range: number) {
        this.playerDetectionRange = range;
    }

    onDestroy() {
        // 清理事件监听
        if (this._collider) {
            this._collider.off('onCollisionEnter', this.onCollisionEnter, this);
        }
    }
}