package com.spartons.antoniasdriver.messaging

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.spartons.antoniasdriver.MainActivity
import com.spartons.antoniasdriver.R
import com.spartons.antoniasdriver.ServiceLocator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Receives FCM messages for the driver. On a new token it (re)registers with the
 * backend; on a message it posts a heads-up notification that opens the app.
 * Data-only messages are supported by reading "title"/"body" keys.
 */
class DriverMessagingService : FirebaseMessagingService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        if (ServiceLocator.session.cachedAccess == null) return
        scope.launch { runCatching { ServiceLocator.repo.registerDevice(token) } }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val notification = message.notification
        val title = notification?.title ?: message.data["title"] ?: getString(R.string.app_name)
        val body = notification?.body ?: message.data["body"] ?: return
        val bookingId = message.data["booking_id"]?.toLongOrNull()
        showNotification(title, body, bookingId)
    }

    private fun showNotification(title: String, body: String, bookingId: Long?) {
        ensureChannel()

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            // Deep-link straight to the job (Start Trip front-and-centre) when tapped.
            if (bookingId != null) putExtra(EXTRA_DEEPLINK_JOB_ID, bookingId)
        }
        // Distinct request code per booking so a new deep-link doesn't reuse a stale extra.
        val pending = PendingIntent.getActivity(
            this, (bookingId ?: 0L).toInt(), intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val notification = NotificationCompat.Builder(this, FCM_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        if (canPostNotifications()) {
            NotificationManagerCompat.from(this)
                .notify(System.currentTimeMillis().toInt(), notification)
        }
    }

    private fun canPostNotifications(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                FCM_CHANNEL_ID, "Job alerts", NotificationManager.IMPORTANCE_HIGH,
            ).apply { description = "New jobs and booking updates" }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
