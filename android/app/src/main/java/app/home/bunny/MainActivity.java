package app.home.bunny;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        /* 注册自己写的两个原生插件 */
        registerPlugin(UsageStatsPlugin.class);
        registerPlugin(NotifierPlugin.class);

        super.onCreate(savedInstanceState);

        handleOpen(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleOpen(intent);
    }

    /* 从通知点进来时，跳到对应页面 */
    private void handleOpen(Intent intent) {
        if (intent == null || bridge == null) return;
        String url = intent.getStringExtra("openUrl");
        if (url == null || url.isEmpty()) return;
        final String hash = url.replace("#", "");
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript("location.hash = '" + hash + "';", null));
    }
}
