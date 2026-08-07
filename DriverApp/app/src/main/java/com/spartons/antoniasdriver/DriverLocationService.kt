package com.spartons.antoniasdriver

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.spartons.antoniasdriver.tracking.DriverSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Foreground service that keeps publishing the driver's GPS position while they
 * are "online", even when the app is backgrounded or the screen is off. It is
 * the single source of truth for location pushes:
 *   - WebSocket /ws  (type=location, bookingId) -> live customer map for the active job
 *   - backend POST /providers/me/location       -> persisted lat/lng for "nearby"
 *
 * Designed to stay alive all through a shift:
 *   - START_STICKY so the system restarts it after a low-memory kill
 *   - onTaskRemoved reschedules a restart if the app is swiped from recents
 *   - a partial wake lock keeps the CPU publishing while the screen is off
 *   - [BootReceiver] resumes it after a reboot
 *   - [TrackingState] persists the on/off intent across all of the above
 *
 * Start it with [start] when the driver goes online and [stop] when they go
 * offline or log out.
 */
class DriverLocationService : Service() {

    companion object {
        private const val CHANNEL_ID = "driver_location_channel"
        private const val NOTIFICATION_ID = 1001
        private const val UPDATE_INTERVAL_MS = 5000L
        private const val TAG = "DriverLocationService"

        /** Start the foreground location service and remember that tracking is wanted. */
        fun start(context: Context) {
            TrackingState.setWanted(context, true)
            ContextCompat.startForegroundService(
                context, Intent(context, DriverLocationService::class.java)
            )
        }

        /** Stop the foreground location service and clear the tracking intent. */
        fun stop(context: Context) {
            TrackingState.setWanted(context, false)
            context.stopService(Intent(context, DriverLocationService::class.java))
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var socket: DriverSocket? = null
    private var requesting = false
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        // Resume publishing to the active booking after a START_STICKY / boot
        // restart (in-memory activeBookingId is lost when the process is killed);
        // without this the socket would degrade to REST-only.
        if (ServiceLocator.activeBookingId == null) {
            ServiceLocator.activeBookingId = TrackingState.activeBooking(this)
        }
        // Read the access token fresh at connect time (via the provider) so a
        // mid-shift refresh doesn't leave reconnects authing with a stale token.
        socket = DriverSocket { ServiceLocator.session.cachedAccess }
        socket?.connect()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                val location = locationResult.lastLocation ?: return
                publish(location.latitude, location.longitude)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // A location-typed foreground service must not start without the permission
        // (Android 14 throws); bail cleanly instead of crashing on a system restart.
        if (!hasLocationPermission()) {
            stopSelf()
            return START_NOT_STICKY
        }
        try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                buildNotification(),
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0,
            )
        } catch (e: Exception) {
            Log.w(TAG, "startForeground failed: $e")
            stopSelf()
            return START_NOT_STICKY
        }
        acquireWakeLock()
        startLocationUpdates()
        // Keep running until explicitly stopped; restart if the system kills us.
        return START_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        if (requesting) return
        if (!hasLocationPermission()) {
            stopSelf()
            return
        }
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateIntervalMillis(UPDATE_INTERVAL_MS)
            .build()
        fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        requesting = true
    }

    private fun publish(lat: Double, lng: Double) {
        // Persist for "nearby" lookups.
        scope.launch {
            runCatching { ServiceLocator.repo.updateLocation(lat, lng) }
                .onFailure { Log.i(TAG, "update_location failed: $it") }
        }
        // Stream to the active job's customer, if any.
        ServiceLocator.activeBookingId?.let { socket?.publish(it, lat, lng) }
    }

    private fun hasLocationPermission(): Boolean = ContextCompat.checkSelfPermission(
        this, android.Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED

    /** Hold a partial wake lock so coordinate pushes keep flowing with the screen off. */
    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DriverApp::LocationTracking").apply {
            setReferenceCounted(false)
            acquire()
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    private fun buildNotification(): Notification {
        val openApp = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText("You are online and sharing your location.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(openApp)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Driver location sharing", NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Keeps you visible to customers while you are online." }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    /**
     * If the driver swipes the app away from recents while still online, some
     * OEMs tear the service down. Schedule a near-immediate restart so tracking
     * survives. Only do this while tracking is still wanted.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        if (TrackingState.isWanted(this)) {
            val restart = PendingIntent.getForegroundService(
                this, 1, Intent(applicationContext, DriverLocationService::class.java),
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE,
            )
            val am = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 1000, restart)
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        if (requesting) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            requesting = false
        }
        releaseWakeLock()
        socket?.close()
        socket = null
        scope.cancel()
        super.onDestroy()
    }
}
