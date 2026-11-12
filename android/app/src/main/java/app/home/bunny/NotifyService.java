package app.home.bunny;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Process;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 后台常驻通知服务
 * ------------------------------------------------------------
 * 不走谷歌推送（FCM），自己每隔一段时间问一次服务器：
 * "他有新消息吗？" 有就本地弹通知。
 *
 * 代价：会有一条常驻通知（系统要求前台服务必须显示），耗电略高。
 */
public class NotifyService extends Service {

    public static final String CHANNEL_SERVICE = "home_service";
    public static final String CHANNEL_MSG = "home_msg";

    private static final long INTERVAL_MS = 45_000L;

    private Handler handler;
    private Runnable loop;
    private volatile boolean running = false;

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(1, buildServiceNotification());
        if (!running) {
            running = true;
            schedule();
        }
        return START_STICKY;
    }

    private void schedule() {
        loop = new Runnable() {
            @Override
            public void run() {
                new Thread(() -> {
                    try {
                        pollOnce();
                        reportCurrentApp();
                    } catch (Exception ignored) {
                    }
                }).start();
                if (running) handler.postDelayed(this, INTERVAL_MS);
            }
        };
        handler.postDelayed(loop, 3000);
    }

    private SharedPreferences prefs() {
        return getSharedPreferences("home", Context.MODE_PRIVATE);
    }

    private void pollOnce() {
        String base = prefs().getString("base", "");
        String token = prefs().getString("token", "");
        long since = prefs().getLong("since", 0);
        if (base == null || base.isEmpty() || token == null || token.isEmpty()) return;

        HttpURLConnection conn = null;
        try {
            URL url = new URL(base + "/api/notify/pending?since=" + since);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);
            conn.setRequestProperty("Authorization", "Bearer " + token);

            int code = conn.getResponseCode();
            if (code != 200) return;

            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            br.close();

            JSONObject json = new JSONObject(sb.toString());
            long now = json.optLong("now", System.currentTimeMillis());
            JSONArray items = json.optJSONArray("items");

            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject it = items.getJSONObject(i);
                    showMessage(it.optString("title", "Home"), it.optString("body", ""), it.optString("url", "/#chat"));
                }
            }

            prefs().edit().putLong("since", now).apply();
        } catch (Exception ignored) {
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /* 每分钟告诉服务器：他现在正在用哪个 App */
    private void reportCurrentApp() {
        String base = prefs().getString("base", "");
        String token = prefs().getString("token", "");
        if (base == null || base.isEmpty() || token == null || token.isEmpty()) return;

        try {
            AppOpsManager ops = (AppOpsManager) getSystemService(Context.APP_OPS_SERVICE);
            int mode = ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), getPackageName());
            if (mode != AppOpsManager.MODE_ALLOWED) return;

            long now = System.currentTimeMillis();
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
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
            if (lastPkg == null) return;

            String label = lastPkg;
            try {
                PackageManager pm = getPackageManager();
                label = pm.getApplicationLabel(pm.getApplicationInfo(lastPkg, 0)).toString();
            } catch (Exception ignored) {
            }

            JSONObject body = new JSONObject();
            body.put("label", label);
            body.put("pkg", lastPkg);
            body.put("at", lastAt);

            HttpURLConnection conn = (HttpURLConnection) new URL(base + "/api/device/current").openConnection();
            conn.setConnectTimeout(12000);
            conn.setReadTimeout(12000);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setDoOutput(true);
            conn.getOutputStream().write(body.toString().getBytes("UTF-8"));
            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception ignored) {
        }
    }

    private void showMessage(String title, String body, String url) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra("openUrl", url);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, (int) System.currentTimeMillis(), open, flags);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            b = new Notification.Builder(this, CHANNEL_MSG);
        } else {
            b = new Notification.Builder(this);
        }

        b.setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setStyle(new Notification.BigTextStyle().bigText(body));

        nm.notify((int) (System.currentTimeMillis() % 100000), b.build());
    }

    private Notification buildServiceNotification() {
        Intent open = new Intent(this, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, flags);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            b = new Notification.Builder(this, CHANNEL_SERVICE);
        } else {
            b = new Notification.Builder(this);
        }
        return b.setContentTitle("Home")
                .setContentText("保持连接，他有消息会通知你")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel svc = new NotificationChannel(CHANNEL_SERVICE, "保持连接", NotificationManager.IMPORTANCE_LOW);
        svc.setShowBadge(false);
        nm.createNotificationChannel(svc);

        NotificationChannel msg = new NotificationChannel(CHANNEL_MSG, "他的消息", NotificationManager.IMPORTANCE_HIGH);
        msg.enableVibration(true);
        nm.createNotificationChannel(msg);
    }

    @Override
    public void onDestroy() {
        running = false;
        if (handler != null && loop != null) handler.removeCallbacks(loop);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
