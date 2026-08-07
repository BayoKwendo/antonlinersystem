package com.spartons.antoniasdriver.ui.jobs

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat

/**
 * Remembers a trigger that guarantees the runtime permissions the foreground
 * location service needs BEFORE it runs [onGranted].
 *
 * This is the critical gate: on a fresh install the location service bails via
 * stopSelf() when fine-location permission is missing, so tracking silently never
 * starts. We therefore never begin a job transition that starts tracking until
 * the driver has granted location access.
 *
 * Behaviour of the returned trigger:
 *  - if ACCESS_FINE_LOCATION is already granted, [onGranted] runs immediately;
 *  - otherwise it launches the system prompt for FINE + COARSE location (and, on
 *    Android 13+, POST_NOTIFICATIONS so the foreground-service notification shows)
 *    and calls [onGranted] only once FINE location comes back granted, else
 *    [onDenied].
 *
 * [rememberLauncherForActivityResult] keeps the latest [onGranted]/[onDenied]
 * via an internal updated-state, so passing fresh lambdas each recomposition is
 * safe.
 */
@Composable
fun rememberLocationPermissionRequest(
    onGranted: () -> Unit,
    onDenied: () -> Unit = {},
): () -> Unit {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        if (result[Manifest.permission.ACCESS_FINE_LOCATION] == true) onGranted() else onDenied()
    }
    return {
        val fineGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (fineGranted) {
            onGranted()
        } else {
            val perms = buildList {
                add(Manifest.permission.ACCESS_FINE_LOCATION)
                add(Manifest.permission.ACCESS_COARSE_LOCATION)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    add(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
            launcher.launch(perms.toTypedArray())
        }
    }
}
