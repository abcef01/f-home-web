package app.home.bunny;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 读"今天每个 App 用了多久"。
 * 需要用户手动开「使用情况访问」权限，代码里只能检查、不能代开。
 */
@CapacitorPlugin(name = "Usage")
public class UsageStatsPlugin extends Plugin {

    private boolean hasAccess() {
        try {
            AppOpsManager ops = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
            int mode = ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), getContext().getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("打不开设置：" + e.getMessage());
        }
    }

    /* 现在正在用的 App */
    @PluginMethod
    public void current(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasAccess());

        if (!hasAccess()) {
            call.resolve(ret);
            return;
        }

        try {
            long now = System.currentTimeMillis();
            UsageStatsManager usm = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
            UsageEvents events = usm.queryEvents(now - 10 * 60 * 1000L, now);

            String lastPkg = null;
            long lastAt = 0;
            UsageEvents.Event e = new UsageEvents.Event();
            while (events != null && events.hasNextEvent()) {
                events.getNextEvent(e);
                if (e.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    lastPkg = e.getPackageName();
                    lastAt = e.getTimeStamp();
                }
            }

            if (lastPkg != null) {
                String label = lastPkg;
                try {
                    PackageManager pm = getContext().getPackageManager();
                    label = pm.getApplicationLabel(pm.getApplicationInfo(lastPkg, 0)).toString();
                } catch (Exception ignored) {
                }
                ret.put("pkg", lastPkg);
                ret.put("label", label);
                ret.put("at", lastAt);
            }

            call.resolve(ret);
        } catch (Exception err) {
            call.reject("读取失败：" + err.getMessage());
        }
    }

    @PluginMethod
    public void today(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasAccess());

        JSArray list = new JSArray();
        if (!hasAccess()) {
            ret.put("apps", list);
            call.resolve(ret);
            return;
        }

        try {
            Calendar start = Calendar.getInstance();
            start.set(Calendar.HOUR_OF_DAY, 0);
            start.set(Calendar.MINUTE, 0);
            start.set(Calendar.SECOND, 0);
            start.set(Calendar.MILLISECOND, 0);
            long from = start.getTimeInMillis();
            long now = System.currentTimeMillis();

            UsageStatsManager usm = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
            List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, from, now);

            /* 同一天会返回多个桶，取每个包的最大值，避免重复累加 */
            Map<String, Long> agg = new HashMap<>();
            if (stats != null) {
                for (UsageStats s : stats) {
                    long ms = s.getTotalTimeInForeground();
                    if (ms <= 0) continue;
                    String pkg = s.getPackageName();
                    Long old = agg.get(pkg);
                    if (old == null || ms > old) agg.put(pkg, ms);
                }
            }

            PackageManager pm = getContext().getPackageManager();
            String self = getContext().getPackageName();

            for (Map.Entry<String, Long> e : agg.entrySet()) {
                String pkg = e.getKey();
                if (pkg.equals(self)) continue;
                if (pkg.startsWith("com.android.systemui")) continue;

                String label = pkg;
                try {
                    ApplicationInfo info = pm.getApplicationInfo(pkg, 0);
                    label = pm.getApplicationLabel(info).toString();
                } catch (Exception ignored) {
                }

                JSObject item = new JSObject();
                item.put("pkg", pkg);
                item.put("label", label);
                item.put("ms", e.getValue());
                list.put(item);
            }

            ret.put("apps", list);
            ret.put("total", list.length());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("读取失败：" + e.getMessage());
        }
    }
}
