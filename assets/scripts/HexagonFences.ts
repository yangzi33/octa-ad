import { _decorator, Component, Prefab, instantiate, Node, Vec3, Quat } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('HexagonFenceSpawner')
@executeInEditMode()
export class HexagonFenceSpawner extends Component {

    @property(Prefab)
    fencePrefab: Prefab = null;

    @property
    radius: number = 5;

    @property
    segmentsPerEdge: number = 4;

    @property
    spawnOnce: boolean = false;  // set true in Inspector to spawn

    update() {
        if (this.spawnOnce && this.fencePrefab) {
            this.spawnOnce = false; // reset so it doesn't run again

            const parent = this.node;
            parent.removeAllChildren();

            for (let i = 0; i < 6; i++) {
                const angle1 = (i * 60) * Math.PI / 180;
                const angle2 = ((i + 1) * 60) * Math.PI / 180;

                const p1 = new Vec3(this.radius * Math.cos(angle1), 0, this.radius * Math.sin(angle1));
                const p2 = new Vec3(this.radius * Math.cos(angle2), 0, this.radius * Math.sin(angle2));

                for (let j = 0; j < this.segmentsPerEdge; j++) {
                    const t = j / this.segmentsPerEdge;
                    const pos = new Vec3(
                        p1.x + (p2.x - p1.x) * t,
                        0,
                        p1.z + (p2.z - p1.z) * t
                    );

                    const fence = instantiate(this.fencePrefab);
                    fence.setPosition(pos);

                    // orient toward edge
                    const dir = new Vec3(p2.x - p1.x, 0, p2.z - p1.z).normalize();
                    const rot = new Quat();
                    Quat.fromViewUp(rot, dir, Vec3.UP);

                    // optional correction if prefab faces X instead of Z
                    const correction = new Quat();
                    Quat.rotateY(correction, rot, -Math.PI / 2);
                    fence.setRotation(correction);

                    parent.addChild(fence);
                }
            }

            console.log("✅ Hexagon fence spawned in scene.");
        }
    }
}
