import { _decorator, Component, Button, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlatformLinkButton')
export class SimplePlatformLink extends Component {
    @property
    androidUrl: string = "https://play.google.com/store/apps/details?id=com.entropy.global";
    
    @property
    appleUrl: string = "https://apps.apple.com/us/app/project-entropy/id6443792064";
    
    @property
    otherUrl: string = "https://play.google.com/store/apps/details?id=com.entropy.global"; // 其他平台链接

    onLoad() {
        const button = this.getComponent(Button);
        if (button) {
            button.node.on('click', this.onClick, this);
        }
    }
    
    onClick() {
        const url = this.getTargetUrl();
        console.log("📱 平台:", this.getPlatformName());
        console.log("🔗 跳转链接:", url);
        
        // 直接使用 window.open，在大多数平台都有效
        window.open(url, '_blank');
    }
    
    getTargetUrl(): string {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // 检测Android
        if (userAgent.includes('android') || sys.os === sys.OS.ANDROID) {
            return this.androidUrl;
        }
        
        // 检测iOS
        if (userAgent.includes('iphone') || userAgent.includes('ipad') || sys.os === sys.OS.IOS) {
            return this.appleUrl;
        }
        
        // 其他平台
        return this.otherUrl || this.androidUrl;
    }
    
    getPlatformName(): string {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('android') || sys.os === sys.OS.ANDROID) {
            return "Android";
        }
        
        if (userAgent.includes('iphone') || userAgent.includes('ipad') || sys.os === sys.OS.IOS) {
            return "iOS";
        }
        
        if (userAgent.includes('win')) {
            return "Windows";
        }
        
        if (userAgent.includes('mac')) {
            return "macOS";
        }
        
        return "Unknown";
    }
}