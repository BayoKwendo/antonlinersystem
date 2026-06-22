package com.spartons.antonis

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.spartons.antonis.tracking.ActiveTracking
import com.spartons.antonis.tracking.trackBooking
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Foreground service that keeps the driver-tracking WebSocket alive so the
 * customer keeps seeing the driver move while the app is backgrounded or the
 * screen is off. It owns the connection (not the UI) and publishes the latest
 * position to [ActiveTracking], which the track screen observes.
 *
 * Designed to stay alive for the duration of a trip:
 *   - START_STICKY so the system restarts it after a low-memory kill
 *   - onTaskRemoved reschedules a restart if the app is swiped from recents
 *   - a partial wake lock keeps the socket pumping while the screen is off
 *   - [BootReceiver] resumes it after a reboot (best-effort)
 *   - [TrackingState] persists which booking to watch across all of the above
 */
class DriverTrackService : Service() {

    companion object {
        private const val CHANNEL_ID = "driver_track_channel"
        private const val NOTIFICATION_ID = 2001
        private const val EXTRA_BOOKING = "bookingId"
        private const val TAG = "DriverTrackService"

        /** Start watching [bookingId] in the background. */
        fun start(context: Context, bookingId: Long) {
            TrackingState.setBooking(context, bookingId)
            val intent = Intent(context, DriverTrackService::class.java)
                .putExtra(EXTRA_BOOKING, bookingId)
            androidx.core.content.ContextCompat.startForegroundService(context, intent)
        }

        /** Stop watching and clear the persisted booking. */
        fun stop(context: Context) {
            TrackingState.clear(context)
            context.stopService(Intent(context, DriverTrackService::class.java))
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var job: Job? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // After a system restart the intent is null, so fall back to the persisted booking.
        val bookingId = intent?.getLongExtra(EXTRA_BOOKING, TrackingState.NONE)
            ?.takeIf { it > 0 }
            ?: TrackingState.booking(this).takeIf { it > 0 }
        if (bookingId == null) {
            stopSelf()
            return START_NOT_STICKY
        }
        try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                buildNotification(bookingId),
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC else 0,
            )
        } catch (e: Exception) {
            Log.w(TAG, "startForeground failed: $e")
            stopSelf()
            return START_NOT_STICKY
        }
        acquireWakeLock()
        startTracking(bookingId)
        return START_STICKY
    }

    private fun startTracking(bookingId: Long) {
        if (job?.isActive == true && ActiveTracking.bookingId == bookingId) return
        job?.cancel()
        // Watching a different booking → drop the stale position.
        if (ActiveTracking.bookingId != bookingId) ActiveTracking.location.value = null
        ActiveTracking.bookingId = bookingId
        job = scope.launch {
            trackBooking(bookingId, ServiceLocator.session.cachedAccess).collect {
                ActiveTracking.location.value = it
            }
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AntonLiner::DriverTracking").apply {
            setReferenceCounted(false)
            acquire()
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    private fun buildNotification(bookingId: Long): Notification {
        val openApp = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText("Tracking your driver for booking #$bookingId.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(openApp)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Driver tracking", NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Keeps showing your driver's live location while you wait." }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (TrackingState.booking(this) > 0) {
            val restart = PendingIntent.getForegroundService(
                this, 1, Intent(applicationContext, DriverTrackService::class.java),
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE,
            )
            val am = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 1000, restart)
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        job?.cancel()
        ActiveTracking.bookingId = null
        releaseWakeLock()
        scope.cancel()
        super.onDestroy()
    }
}
