import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CookedMeatDeliverySystem')
export class CookedMeatDeliverySystem extends Component {
    // 简单列表：只管理已有的熟肉节点，不生成、不堆叠
    private _cookedMeats: Node[] = [];
    private _cookedMeatCount: number = 0;
    
    onLoad() {
        this._cookedMeats = [];
        this._cookedMeatCount = 0;
    }
    
    /**
     * 外部调用：将已经存在的熟肉节点加入系统进行管理
     */
    addCookedMeat(meat: Node) {
        if (!meat) {
            console.warn("CookedMeatDeliverySystem.addCookedMeat: meat is null");
            return;
        }
        
        this._cookedMeats.push(meat);
        this._cookedMeatCount = this._cookedMeats.length;
    }
    
    // 玩家从系统中拿走一块熟肉
    takeCookedMeat(): Node | null {
        if (this._cookedMeatCount === 0) {
            return null;
        }
        
        const cookedMeat = this._cookedMeats.pop();
        this._cookedMeatCount = this._cookedMeats.length;
        
        return cookedMeat;
    }
    
    // 是否有熟肉可取
    hasCookedMeat(): boolean {
        return this._cookedMeatCount > 0;
    }
    
    // 获取熟肉数量
    getCookedMeatCount(): number {
        return this._cookedMeatCount;
    }
    
    // 调试：清空所有熟肉
    clearCookedMeats() {
        this._cookedMeats.forEach(meat => {
            if (meat && meat.isValid) {
                meat.destroy();
            }
        });
        this._cookedMeats = [];
        this._cookedMeatCount = 0;
    }
}

