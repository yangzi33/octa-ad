import { _decorator, Component, Node, Button, Color, Sprite, Label, RichText } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TestButtonController')
export class TestButtonController extends Component {
    @property(Node)
    targetCanvas: Node = null; // 引用另一个UI Canvas节点
    
    @property(Color)
    onColor: Color = new Color(255, 255, 255, 255); // 开启时的颜色

    @property(Color)
    transitionColor: Color = new Color(255, 255, 255, 128); // 开启时的颜色
    
    @property(Color)
    offColor: Color = new Color(255, 255, 255, 0); // 关闭时的颜色
    
    private _isOn: number = 0; 
    private _button: Button = null; // 按钮组件
    
    onLoad() {
        console.log("✅ TestButtonController 加载完成");
        
        // 获取按钮组件
        this._button = this.getComponent(Button);
        if (!this._button) {
            console.error("❌ TestButtonController 需要Button组件!");
            return;
        }
        
        // 注册点击事件
        this._button.node.on('click', this.onButtonClick, this);
        
        // 初始化状态
        this.updateCanvasState();
    }
    
    onButtonClick() {
        console.log("🖱️ 按钮被点击");
        
        // 切换状态
        if (this._isOn == 0) {
            this._isOn = 1;
        }
        else if (this._isOn == 1) {
            this._isOn = 2;
        }
        else {
            this._isOn = 0;
        }
        
        // 更新Canvas状态
        this.updateCanvasState();
        
        // 播放点击反馈
        this.playClickEffect();
    }
    
    // 🆕 更新Canvas的开关状态 - 修正版本
    updateCanvasState() {
        if (!this.targetCanvas) {
            console.warn("⚠️ 未设置targetCanvas引用");
            return;
        }
        
        // const targetColor = this._isOn ? this.onColor : this.offColor;
        var targetColor: Color;
        if (this._isOn == 1) {
            targetColor = this.onColor
        }
        else if (this._isOn == 2) {
            targetColor = this.transitionColor;
        }
        else {
            targetColor = this.offColor;
        }
        
        // 🆕 方法1: 尝试设置Canvas背景颜色（如果有Background组件）
        this.setBackgroundColor(targetColor);
        
        // 🆕 方法2: 设置所有子节点的颜色
        this.setChildrenColor(targetColor);
        
        console.log(`🎨 Canvas状态: ${this._isOn ? '开启' : '关闭'}, 颜色:`, targetColor);
        
        // 触发状态变化事件
        this.node.emit('canvasStateChanged', this._isOn, targetColor);
    }
    
    // 🆕 设置背景颜色（如果有Background组件）
    setBackgroundColor(color: Color) {
        // 这里需要根据你实际的背景组件来设置
        // 例如：Sprite, Label, RichText等
        const sprite = this.targetCanvas.getComponent(Sprite);
        if (sprite) {
            sprite.color = color;
        }
        
        const label = this.targetCanvas.getComponent(Label);
        if (label) {
            label.color = color;
        }
        
        // 添加其他可能的渲染组件...
    }
    
    // 🆕 设置所有子节点的颜色
    setChildrenColor(color: Color) {
        this.targetCanvas.children.forEach(child => {
            // 设置Sprite颜色
            const sprite = child.getComponent(Sprite);
            if (sprite) {
                sprite.color = color;
            }
            
            // 设置Label颜色
            const label = child.getComponent(Label);
            if (label) {
                label.color = color;
            }
            
            // 设置RichText颜色
            const richText = child.getComponent(RichText);
            if (richText) {
                richText.color = color;
            }
        });
    }
    
    // 🆕 播放点击效果
    playClickEffect() {
        // 简单的缩放动画
        this.node.setScale(0.95, 0.95, 1);
        this.scheduleOnce(() => {
            this.node.setScale(1, 1, 1);
        }, 0.1);
    }
    
    // 🆕 手动设置状态
    setCanvasState(isOn: number) {
        this._isOn = isOn;
        this.updateCanvasState();
    }
    
    // 🆕 切换状态
    toggleCanvasState() {
        this.setCanvasState(this._isOn);
    }
    
    // 🆕 获取当前状态
    getCanvasState(): number {
        return this._isOn;
    }
    
    // 🆕 设置目标Canvas
    setTargetCanvas(canvasNode: Node) {
        this.targetCanvas = canvasNode;
        this.updateCanvasState();
    }
    
    // 🆕 设置颜色
    setColors(onColor: Color, offColor: Color) {
        this.onColor = onColor;
        this.offColor = offColor;
        this.updateCanvasState();
    }
    
    // 🆕 调试方法
    debugInfo() {
        console.log("=== TestButtonController 调试信息 ===");
        console.log("目标Canvas:", this.targetCanvas ? this.targetCanvas.name : "未设置");
        console.log("当前状态:", this._isOn ? "开启" : "关闭");
        console.log("开启颜色:", this.onColor);
        console.log("关闭颜色:", this.offColor);
        console.log("================================");
    }
    
    onDestroy() {
        // 清理事件监听
        if (this._button) {
            this._button.node.off('click', this.onButtonClick, this);
        }
    }
}