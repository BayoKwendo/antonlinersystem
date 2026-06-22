package com.spartons.antoniasdriver.ui.home

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.spartons.antoniasdriver.DriverLocationService
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.Booking
import com.spartons.antoniasdriver.location.currentLatLng
import com.spartons.antoniasdriver.ui.LoadingBox
import com.spartons.antoniasdriver.ui.MessageBox
import com.spartons.antoniasdriver.ui.notifications.NotificationBell
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.titleCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Job states the driver still needs to act on (hide completed/cancelled). */
private val ACTIVE_STATUSES = setOf("booked", "en_route", "arrived", "in_progress")

data class HomeState(
    val loading: Boolean = true,
    val online: Boolean = false,
    val name: String = "",
    val jobs: List<Booking> = emptyList(),
    val lat: Double? = null,
    val lng: Double? = null,
    val error: String? = null,
)

class HomeViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(HomeState())
    val state = _state.asStateFlow()

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching {
                val profile = repo.me()
                val jobs = repo.bookings().filter { it.status in ACTIVE_STATUSES }
                profile to jobs
            }.onSuccess { (profile, jobs) ->
                _state.value = _state.value.copy(
                    loading = false,
                    online = profile.availability == "available" || profile.availability == "booked",
                    name = profile.displayName ?: "",
                    jobs = jobs,
                )
            }.onFailure {
                _state.value = _state.value.copy(loading = false, error = it.message)
            }
        }
    }

    fun fetchLocation(context: Context) {
        viewModelScope.launch {
            currentLatLng(context)?.let { _state.value = _state.value.copy(lat = it.first, lng = it.second) }
        }
    }

    fun setOnline(context: Context, online: Boolean) {
        _state.value = _state.value.copy(online = online)
        // Going online: ask to be exempt from battery optimization so the tracking
        // service isn't killed in the background (no-op if already exempt).
        if (online) com.spartons.antoniasdriver.requestIgnoreBatteryOptimizations(context)
        viewModelScope.launch {
            runCatching { repo.setOnline(online) }
                .onSuccess {
                    if (online) DriverLocationService.start(context) else DriverLocationService.stop(context)
                }
                .onFailure { _state.value = _state.value.copy(online = !online, error = it.message) }
        }
    }

    /** Register this device's FCM token with the backend (best-effort). */
    fun registerPush() = com.spartons.antoniasdriver.messaging.Fcm.register(viewModelScope)

    fun logout(context: Context, after: () -> Unit) {
        viewModelScope.launch {
            DriverLocationService.stop(context)
            repo.logout()
            after()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onJob: (Long) -> Unit,
    onNotifications: () -> Unit,
    onLoggedOut: () -> Unit,
    vm: HomeViewModel = viewModel(),
) {
    val s by vm.state.collectAsState()
    val context = LocalContext.current

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) vm.fetchLocation(context)
    }
    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

    LaunchedEffect(Unit) {
        vm.load()
        vm.registerPush()
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) vm.fetchLocation(context) else permLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (s.name.isBlank()) "Dashboard" else "Hi, ${s.name}") },
                actions = {
                    NotificationBell(onClick = onNotifications)
                    IconButton(onClick = { vm.logout(context, onLoggedOut) }) {
                        Icon(Icons.Default.Logout, "Log out")
                    }
                },
            )
        },
    ) { pad ->
        Column(Modifier.padding(pad).fillMaxSize()) {
            DriverMap(lat = s.lat, lng = s.lng)

            ListItem(
                headlineContent = { Text(if (s.online) "You are online" else "You are offline") },
                supportingContent = { Text(if (s.online) "Customers can find and book you" else "Go online to receive jobs") },
                trailingContent = {
                    Switch(checked = s.online, onCheckedChange = { vm.setOnline(context, it) })
                },
            )
            HorizontalDivider()

            Text(
                "Active jobs",
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.padding(start = 16.dp, top = 12.dp, bottom = 4.dp),
            )

            when {
                s.loading -> LoadingBox()
                s.jobs.isEmpty() -> MessageBox(s.error ?: "No active jobs right now.")
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(s.jobs) { job -> JobCard(job) { onJob(job.id) } }
                }
            }
        }
    }
}

@Composable
private fun DriverMap(lat: Double?, lng: Double?) {
    val cam = rememberCameraPositionState()
    LaunchedEffect(lat, lng) {
        if (lat != null && lng != null) {
            cam.position = CameraPosition.fromLatLngZoom(LatLng(lat, lng), 15f)
        }
    }
    GoogleMap(
        modifier = Modifier.fillMaxWidth().height(200.dp),
        cameraPositionState = cam,
    ) {
        if (lat != null && lng != null) {
            Marker(state = MarkerState(position = LatLng(lat, lng)), title = "You")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JobCard(job: Booking, onClick: () -> Unit) {
    ElevatedCard(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    job.customerName ?: "Customer",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                AssistChip(onClick = onClick, label = { Text(titleCase(job.status)) })
            }
            job.address?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            job.category?.let { Text(titleCase(it), style = MaterialTheme.typography.bodySmall) }
            Text(money(job.totalAmount), style = MaterialTheme.typography.bodyMedium)
        }
    }
}
