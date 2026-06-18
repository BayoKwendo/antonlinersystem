package com.spartons.antoniasdriver

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Geocoder
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
import com.spartons.antoniasdriver.helper.RetrofitClient
import com.spartons.antoniasdriver.helper.TrackingSocket
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.util.Locale

/**
 * Foreground service that keeps publishing the driver's GPS position while they
 * are "online", even when the app is backgrounded or the screen is off. It is
 * the single source of truth for location pushes:
 *   - WebSocket /ws         (role=driver, driverId) -> live passenger map
 *   - backend /update_location              -> persisted lat/long for "nearby"
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
            val intent = Intent(context, DriverLocationService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }

        /** Stop the foreground location service. */
        fun stop(context: Context) {
            context.stopService(Intent(context, DriverLocationService::class.java))
        }
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var trackingSocket: TrackingSocket? = null
    private var userId: String = ""
    private var requesting = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        userId = getSharedPreferences("Onfon", 0).getString("user_id", "").toString()
        trackingSocket = TrackingSocket(userId)
        trackingSocket?.connect()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                val location = locationResult.lastLocation ?: return
                publishToSocket(location.latitude, location.longitude)
                publishToBackend(location.latitude, location.longitude)
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

    private fun publishToSocket(lat: Double, lng: Double) {
        if (userId.isEmpty()) return
        trackingSocket?.sendLocation(lat, lng)
    }

    private fun publishToBackend(lat: Double, lng: Double) {
        if (userId.isEmpty()) return
        val locality = resolveLocality(lat, lng)
        val params = HashMap<String, String>()
        params["id"] = userId
        params["lat"] = lat.toString()
        params["longitude"] = lng.toString()
        params["location"] = locality
        RetrofitClient.instance!!.api.updateLocation(params)!!.enqueue(object :
            Callback<ResponseBody?> {
            override fun onResponse(call: Call<ResponseBody?>, response: Response<ResponseBody?>) {}
            override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                Log.i("DriverLocationService", "update_location failed: $t")
            }
        })
    }

    /** Reverse-geocode to a locality name; returns "" if unavailable. */
    private fun resolveLocality(lat: Double, lng: Double): String {
        return try {
            val geocoder = Geocoder(this, Locale.getDefault())
            val addresses = geocoder.getFromLocation(lat, lng, 1)
            addresses?.firstOrNull()?.locality ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText("You are online and sharing your location.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Driver location sharing",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "Keeps you visible to customers while you are online."
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        if (requesting) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            requesting = false
        }
        // Closing the socket tells the backend the driver is offline so
        // passengers stop tracking a stale point.
        trackingSocket?.close()
        trackingSocket = null
        super.onDestroy()
    }
}
