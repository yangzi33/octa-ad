import { _decorator, Component, Camera, editorExtend, Scene } from 'cc';
const { ccclass, property, executeInEditMode, menu } = _decorator;

@ccclass('CameraAlignTool')
@executeInEditMode(true)
@menu('Tools/Camera Align Tool')
export class CameraAlignTool extends Component {

    @property(Camera)
    targetCamera: Camera | null = null;

    @property({
        displayName: "Scene → Camera (View from Camera)",
        visible: true
    })
    get alignSceneToCamera_btn() {
        this.alignSceneToCamera();
        return false;
    }
    set alignSceneToCamera_btn(v) {}

    @property({
        displayName: "Camera → Scene (Move Camera Here)",
        visible: true
    })
    get alignCameraToSceneView_btn() {
        this.alignCameraToSceneView();
        return false;
    }
    set alignCameraToSceneView_btn(v) {}

    alignSceneToCamera() {
        if (!this.targetCamera) return;
        const scene = this.node.scene;
        scene.renderScene!.camera = this.targetCamera;
        console.log("[CameraAlignTool] Scene aligned to Camera ✅");
    }

    alignCameraToSceneView() {
        const editorCamera = editorExtend.EditorCamera;
        if (!this.targetCamera || !editorCamera) return;
        this.targetCamera.node.setWorldPosition(editorCamera.position);
        this.targetCamera.node.setWorldRotation(editorCamera.rotation);
        console.log("[CameraAlignTool] Camera aligned to Scene ✅");
    }
}
