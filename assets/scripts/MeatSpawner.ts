import { _decorator, Component, Prefab, Node, Vec3, instantiate } from 'cc';
import { Meat } from "./Meat"
const { ccclass, property } = _decorator;

@ccclass('MeatSpawner')
export class MeatSpawner extends Component {
    @property(Prefab)
    meatPrefab: Prefab = null;
    
    @property
    spawnAreaSize: Vec3 = new Vec3(10, 0, 10);
    
    @property
    maxMeatCount: number = 10;
    
    @property
    spawnInterval: number = 3;
    
    private _meatList: Node[] = [];
    
    start() {
        this.schedule(this.spawnMeat, this.spawnInterval);
        
        // 🆕 初始生成一些肉块
        for (let i = 0; i < 3; i++) {
            this.scheduleOnce(() => this.spawnMeat(), i * 0.5);
        }
    }
    
    spawnMeat() {
        if (this._meatList.length >= this.maxMeatCount) return;
        
        const meat = instantiate(this.meatPrefab);
        const spawnPos = this.getRandomSpawnPosition();
        
        meat.setPosition(spawnPos);
        
        const meatComp = meat.addComponent(Meat);
        meatComp.setup(this);
        
        this.node.addChild(meat);
        this._meatList.push(meat);
    }
    
    getRandomSpawnPosition(): Vec3 {
        const halfX = this.spawnAreaSize.x / 2;
        const halfZ = this.spawnAreaSize.z / 2;
        
        return new Vec3(
            (Math.random() - 0.5) * this.spawnAreaSize.x,
            0.5,
            (Math.random() - 0.5) * this.spawnAreaSize.z
        );
    }
    
    removeMeat(meat: Node) {
        const index = this._meatList.indexOf(meat);
        if (index !== -1) {
            this._meatList.splice(index, 1);
        }
    }
    
    // 🆕 获取当前肉块数量
    getCurrentMeatCount(): number {
        return this._meatList.length;
    }
}