package com.spartons.antoniasdriver

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
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
 * Start it with [start] when the driver goes online and [stop] when they go
 * offline or log out.
 */
class DriverLocationService : Service() {

    companion object {
        private const val CHANNEL_ID = "driver_location_channel"
        private const val NOTIFICATION_ID = 1001
        private const val UPDATE_INTERVAL_MS = 5000L

        /** Start the foreground location service. */
        fun start(context: Context) {
            ContextCompat.startForegroundService(
                context, Intent(context, DriverLocationService::class.java)
            )
        }

        /** Stop the foreground location service. */
        fun stop(context: Context) {
            context.stopService(Intent(context, DriverLocationService::class.java))
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var socket: DriverSocket? = null
    private var requesting = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        socket = DriverSocket(ServiceLocator.session.cachedAccess)
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
        startForeground(NOTIFICATION_ID, buildNotification())
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
                .onFailure { Log.i("DriverLocationService", "update_location failed: $it") }
        }
        // Stream to the active job's customer, if any.
        ServiceLocator.activeBookingId?.let { socket?.publish(it, lat, lng) }
    }

    private fun hasLocationPermission(): Boolean = ContextCompat.checkSelfPermission(
        this, android.Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText("You are online and sharing your location.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Driver location sharing", NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Keeps you visible to customers while you are online." }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        if (requesting) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            requesting = false
        }
        socket?.close()
        socket = null
        scope.cancel()
        super.onDestroy()
    }
}
