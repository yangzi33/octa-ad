import { _decorator, Component, Node, Collider, ICollisionEvent, RigidBody, Vec3, BoxCollider } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WallController')
export class WallController extends Component {
    @property
    wallWidth: number = 5;

    @property
    wallHeight: number = 3;

    @property
    wallThickness: number = 0.5;

    private _collider: BoxCollider = null;
    private _rigidBody: RigidBody = null;

    onLoad() {
        this.initWall();
    }

    // 初始化墙的物理属性
    initWall() {
        // 获取或添加碰撞器
        this._collider = this.node.getComponent(BoxCollider);
        if (!this._collider) {
            this._collider = this.node.addComponent(BoxCollider);
        }
        
        // 设置碰撞器尺寸
        this._collider.size = new Vec3(this.wallWidth, this.wallHeight, this.wallThickness);
        this._collider.isTrigger = false; // 🆕 必须是 false 才能物理碰撞

        // 获取或添加刚体
        this._rigidBody = this.node.getComponent(RigidBody);
        if (!this._rigidBody) {
            this._rigidBody = this.node.addComponent(RigidBody);
        }

        // 🆕 重要：墙必须是静态刚体
        this._rigidBody.mass = 0;

        // 注册碰撞事件（可选，用于调试）
        this._collider.on('onCollisionEnter', this.onCollisionEnter, this);

        console.log(`🧱 墙初始化完成: ${this.node.name}`);
    }

    // 碰撞事件（用于调试）
    onCollisionEnter(event: ICollisionEvent) {
        const otherNode = event.otherCollider.node;
        if (otherNode.name === 'Player') {
            console.log(`🚧 墙 ${this.node.name} 被玩家碰撞`);
        }
    }

    // 🆕 启用/禁用墙的碰撞
    setWallEnabled(enabled: boolean) {
        if (this._collider) {
            this._collider.enabled = enabled;
        }
        console.log(`🧱 墙 ${this.node.name} ${enabled ? '启用' : '禁用'}`);
    }
}