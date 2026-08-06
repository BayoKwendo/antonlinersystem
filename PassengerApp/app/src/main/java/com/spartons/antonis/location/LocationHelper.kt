package com.spartons.antonis.location

import android.annotation.SuppressLint
import android.content.Context
import androidx.activity.result.IntentSenderRequest
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * One-shot current location. Requests a fresh fix (works even when there's no
 * cached last-known location) and falls back to the last-known point. Returns
 * null if location can't be obtained. Caller must hold a location permission
 * and have device location turned on (see [checkLocationEnabled]).
 */
@SuppressLint("MissingPermission")
suspend fun currentLatLng(context: Context): Pair<Double, Double>? =
    suspendCancellableCoroutine { cont ->
        val client = LocationServices.getFusedLocationProviderClient(context)
        val cts = CancellationTokenSource()
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
            .addOnSuccessListener { fresh ->
                if (fresh != null) {
                    cont.resume(fresh.latitude to fresh.longitude)
                } else {
                    // No fresh fix (e.g. just enabled) — fall back to last-known.
                    client.lastLocation
                        .addOnSuccessListener { last -> cont.resume(last?.let { it.latitude to it.longitude }) }
                        .addOnFailureListener { cont.resume(null) }
                }
            }
            .addOnFailureListener { cont.resume(null) }
        cont.invokeOnCancellation { cts.cancel() }
    }

/**
 * Checks whether device location (GPS) is on for a high-accuracy request.
 *  - [onEnabled]           already on → go ahead and fetch.
 *  - [onResolutionRequired] off but fixable in-app → launch the returned
 *                          [IntentSenderRequest] to show the one-tap system
 *                          "Turn on location" dialog.
 *  - [onUnavailable]       can't be resolved here (rare) → fall back / inform.
 */
fun checkLocationEnabled(
    context: Context,
    onEnabled: () -> Unit,
    onResolutionRequired: (IntentSenderRequest) -> Unit,
    onUnavailable: () -> Unit,
) {
    val request = LocationSettingsRequest.Builder()
        .addLocationRequest(LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000L).build())
        .setAlwaysShow(true)
        .build()
    LocationServices.getSettingsClient(context)
        .checkLocationSettings(request)
        .addOnSuccessListener { onEnabled() }
        .addOnFailureListener { e ->
            if (e is ResolvableApiException) {
                onResolutionRequired(IntentSenderRequest.Builder(e.resolution).build())
            } else {
                onUnavailable()
            }
        }
}
