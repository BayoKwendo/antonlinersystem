package com.spartons.antoniasdriver.location

import android.annotation.SuppressLint
import android.content.Context
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** One-shot last-known location. Caller must hold a location permission. */
@SuppressLint("MissingPermission")
suspend fun currentLatLng(context: Context): Pair<Double, Double>? =
    suspendCancellableCoroutine { cont ->
        val client = LocationServices.getFusedLocationProviderClient(context)
        client.lastLocation
            .addOnSuccessListener { loc ->
                cont.resume(if (loc != null) loc.latitude to loc.longitude else null)
            }
            .addOnFailureListener { cont.resume(null) }
    }
