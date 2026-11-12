package app.home.bunny;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 前端用来开关「后台通知」，并把后端地址和令牌交给服务 */
@CapacitorPlugin(name = "Notifier")
public class NotifierPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String base = call.getString("base", "");
        String token = call.getString("token", "");
        if (base == null || base.isEmpty() || token == null || token.isEmpty()) {
            call.reject("缺少后端地址或令牌");
            return;
        }

        requestNotifyPermission();

        SharedPreferences p = getContext().getSharedPreferences("home", Context.MODE_PRIVATE);
        p.edit().putString("base", base).putString("token", token).apply();

        Intent i = new Intent(getContext(), NotifyService.class);
        if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(i);
        else getContext().startService(i);

        JSObject ret = new JSObject();
        ret.put("running", true);
        call.resolve(ret);
    }

    /* Android 13+ 通知要单独申请 */
    private void requestNotifyPermission() {
        if (Build.VERSION.SDK_INT < 33) return;
        try {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        getActivity(),
                        new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                        9101
                );
            }
        } catch (Exception ignored) {
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), NotifyService.class));
        JSObject ret = new JSObject();
        ret.put("running", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void status(PluginCall call) {
        SharedPreferences p = getContext().getSharedPreferences("home", Context.MODE_PRIVATE);
        JSObject ret = new JSObject();
        ret.put("base", p.getString("base", ""));
        ret.put("hasToken", !p.getString("token", "").isEmpty());
        call.resolve(ret);
    }
}
