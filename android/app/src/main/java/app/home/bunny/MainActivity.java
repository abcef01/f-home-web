package app.home.bunny;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UsageStatsPlugin.class);
        registerPlugin(NotifierPlugin.class);

        super.onCreate(savedInstanceState);

        hideSystemBars();
        handleOpen(getIntent());
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /* 全屏：隐藏状态栏和导航栏，手指从边缘上滑会临时露出来 */
    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }

    /* 返回键 / 侧滑：先在网页里后退，退到头了再退出应用 */
    @Override
    public void onBackPressed() {
        if (bridge == null) {
            super.onBackPressed();
            return;
        }
        bridge.getWebView().evaluateJavascript(
                "(function(){var h=location.hash||'#home';" +
                        "if(h==='#home'||h==='#'||h===''){return 'root';}" +
                        "history.back();return 'back';})()",
                value -> {
                    if (value != null && value.contains("root")) {
                        moveTaskToBack(true);
                    }
                }
        );
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleOpen(intent);
    }

    private void handleOpen(Intent intent) {
        if (intent == null || bridge == null) return;
        String url = intent.getStringExtra("openUrl");
        if (url == null || url.isEmpty()) return;
        final String hash = url.replace("#", "");
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript("location.hash = '" + hash + "';", null));
    }
}
