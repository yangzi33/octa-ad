import { _decorator, Component, Node, Collider, ITriggerEvent } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('DeliveryZone')
export class DeliveryZone extends Component {
    @property
    autoDelivery: boolean = true; // 是否自动交付
    
    @property
    deliveryRate: number = 1; // 交付速率（每秒交付数量）
    
    @property
    deliveryInterval: number = 1.0; // 🆕 交付间隔（秒）
    
    private _playerInZone: boolean = false;
    private _playerNode: Node = null;
    private _deliveryTimer: number = 0; // 🆕 交付计时器
    
    onLoad() {
        console.log("✅ DeliveryZone脚本已加载");
        
        // 设置碰撞器为触发器
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.isTrigger = true;
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
            collider.on('onTriggerExit', this.onTriggerExit, this);
            console.log("✅ 碰撞器事件已注册");
        } else {
            console.error("❌ DeliveryZone缺少碰撞器组件!");
        }
    }
    
    update(deltaTime: number) {
        // 🆕 持续交付逻辑
        if (this._playerInZone && this.autoDelivery) {
            this.continuousDelivery(deltaTime);
        }
    }
    
    onTriggerEnter(event: ITriggerEvent) {
        console.log("🎯 触发进入:", event.otherCollider.node.name);
        
        // 检测玩家进入
        if (event.otherCollider.node.name === 'Player') {
            console.log("🌟 玩家进入交付区域!");
            this._playerInZone = true;
            this._playerNode = event.otherCollider.node;
            this._deliveryTimer = 0; // 🆕 重置计时器
            
            // 🆕 可选：立即交付第一块肉
            // this.deliverSingleMeat();
        }
    }
    
    onTriggerExit(event: ITriggerEvent) {
        console.log("🚪 触发离开:", event.otherCollider.node.name);
        
        if (event.otherCollider.node.name === 'Player') {
            console.log("玩家离开交付区域");
            this._playerInZone = false;
            this._playerNode = null;
            this._deliveryTimer = 0; // 🆕 重置计时器
        }
    }
    
    // 🆕 实现持续交付逻辑
    continuousDelivery(deltaTime: number) {
        if (!this._playerNode) return;
        
        const playerController = this._playerNode.getComponent('PlayerController') as PlayerController;
        if (!playerController) {
            console.error("❌ 玩家没有PlayerController组件!");
            return;
        }
        
        // 🆕 检查玩家是否有肉
        if (!playerController.hasMeat()) {
            console.log("⚠️ 玩家没有肉块可交付");
            this._deliveryTimer = 0; // 重置计时器
            return;
        }
        
        // 🆕 更新计时器
        this._deliveryTimer += deltaTime;
        
        // 🆕 根据交付速率计算是否应该交付
        const interval = 1.0 / this.deliveryRate;
        
        if (this._deliveryTimer >= interval) {
            this.deliverSingleMeat();
            this._deliveryTimer = 0; // 重置计时器
            
            // 🆕 检查是否还有肉块
            if (!playerController.hasMeat()) {
                console.log("✅ 玩家所有肉块已交付完成");
            }
        }
    }
    
    // 🆕 交付单块肉
    deliverSingleMeat() {
        if (!this._playerNode) return;
        
        const playerController = this._playerNode.getComponent('PlayerController') as PlayerController;
        if (playerController && playerController.hasMeat()) {
            console.log("📦 交付单块肉");
            playerController.deliverOneMeat();
            
            // 🆕 可以在这里添加交付效果
            this.onMeatDelivered();
        }
    }
    
    // 🆕 交付效果（可以扩展）
    onMeatDelivered() {
        console.log("✨ 肉块交付成功!");
        // 可以在这里添加：
        // - 播放音效
        // - 显示粒子效果
        // - 更新UI分数
        // - 触发游戏事件
    }
    
    // 🎯 手动触发交付（保留原有功能）
    triggerDelivery() {
        console.log("🎯 triggerDelivery方法被调用!");
        
        if (this._playerInZone && this._playerNode) {
            const playerController = this._playerNode.getComponent('PlayerController') as PlayerController;
            if (playerController) {
                if (playerController.hasMeat()) {
                    console.log("✅ 手动交付单块肉");
                    this.deliverSingleMeat();
                } else {
                    console.log("⚠️ 玩家没有肉块可交付");
                }
            } else {
                console.error("❌ 玩家没有PlayerController组件!");
            }
        } else {
            console.log("⚠️ 没有玩家在交付区域内");
        }
    }
    
    // 🆕 设置交付速率
    setDeliveryRate(rate: number) {
        this.deliveryRate = Math.max(0.1, rate); // 最低0.1块/秒
        console.log(`🎯 交付速率设置为: ${this.deliveryRate}块/秒`);
    }
    
    // 🆕 获取当前交付状态
    getDeliveryStatus() {
        return {
            playerInZone: this._playerInZone,
            deliveryRate: this.deliveryRate,
            timer: this._deliveryTimer
        };
    }
    
    onDestroy() {
        // 清理事件监听
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.off('onTriggerEnter', this.onTriggerEnter, this);
            collider.off('onTriggerExit', this.onTriggerExit, this);
        }
    }
}