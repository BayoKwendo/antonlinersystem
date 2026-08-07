package com.spartons.antoniasdriver.messaging

import com.google.firebase.messaging.FirebaseMessaging
import com.spartons.antoniasdriver.ServiceLocator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** Notification channel for incoming job / status push messages. */
const val FCM_CHANNEL_ID = "driver_push"

/** Intent extra carrying a booking id to deep-link into a job (e.g. "start your trip"). */
const val EXTRA_DEEPLINK_JOB_ID = "deeplink_job_id"

object Fcm {
    /**
     * Fetch the current FCM registration token and register it with the backend
     * so the server can target this device. No-op when the driver is not logged
     * in (there is no user to attach the token to yet). Failures are swallowed —
     * push registration is best-effort.
     */
    fun register(scope: CoroutineScope) {
        if (ServiceLocator.session.cachedAccess == null) return
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            token?.takeIf { it.isNotBlank() }?.let { value ->
                scope.launch { runCatching { ServiceLocator.repo.registerDevice(value) } }
            }
        }
    }
}
