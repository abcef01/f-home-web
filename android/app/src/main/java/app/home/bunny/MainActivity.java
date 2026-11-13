package app.home.bunny;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int PAPER = 0xFFF4F0E8;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UsageStatsPlugin.class);
        registerPlugin(NotifierPlugin.class);

        super.onCreate(savedInstanceState);

        tintSystemBars();
        handleOpen(getIntent());
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) tintSystemBars();
    }

    /* 状态栏/导航栏染成纸色，和界面融成一片
       （不再隐藏，隐藏会留一条黑边） */
    private void tintSystemBars() {
        try {
            getWindow().setStatusBarColor(PAPER);
            getWindow().setNavigationBarColor(PAPER);

            if (Build.VERSION.SDK_INT >= 30) {
                WindowInsetsController c = getWindow().getInsetsController();
                if (c != null) {
                    int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    c.setSystemBarsAppearance(light, light);
                }
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                                | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                );
            }
        } catch (Exception ignored) {
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
