package com.spartons.antonis.ui.home

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Star
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
import com.spartons.antonis.ServiceLocator
import com.spartons.antonis.data.Category
import com.spartons.antonis.data.Provider
import com.spartons.antonis.location.currentLatLng
import com.spartons.antonis.ui.notifications.NotificationBell
import com.spartons.antonis.ui.LoadingBox
import com.spartons.antonis.ui.MessageBox
import com.spartons.antonis.ui.money
import com.spartons.antonis.ui.titleCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeState(
    val categories: List<Category> = emptyList(),
    val selected: String? = null,
    val providers: List<Provider> = emptyList(),
    val loadingProviders: Boolean = false,
    val lat: Double? = null,
    val lng: Double? = null,
    val error: String? = null,
)

class HomeViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(HomeState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching { repo.categories() }
                .onSuccess { _state.value = _state.value.copy(categories = it) }
                .onFailure { _state.value = _state.value.copy(error = it.message) }
        }
    }

    fun fetchLocation(context: Context) {
        viewModelScope.launch {
            currentLatLng(context)?.let { setLocation(it.first, it.second) }
        }
    }

    private fun setLocation(lat: Double, lng: Double) {
        _state.value = _state.value.copy(lat = lat, lng = lng)
        val current = _state.value.selected
        if (current != null) loadNearby(current)
        else _state.value.categories.firstOrNull()?.let { select(it.key) }
    }

    fun select(key: String) {
        _state.value = _state.value.copy(selected = key)
        loadNearby(key)
    }

    private fun loadNearby(key: String) {
        val s = _state.value
        val lat = s.lat ?: return
        val lng = s.lng ?: return
        _state.value = s.copy(loadingProviders = true, error = null)
        viewModelScope.launch {
            runCatching { repo.nearby(key, lat, lng) }
                .onSuccess { _state.value = _state.value.copy(loadingProviders = false, providers = it) }
                .onFailure { _state.value = _state.value.copy(loadingProviders = false, error = it.message) }
        }
    }

    fun logout(after: () -> Unit) {
        viewModelScope.launch { repo.logout(); after() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onProvider: (Long) -> Unit,
    onBookings: () -> Unit,
    onNotifications: () -> Unit,
    onLoggedOut: () -> Unit,
    vm: HomeViewModel = viewModel(),
) {
    val s by vm.state.collectAsState()
    val context = LocalContext.current

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) vm.fetchLocation(context)
    }

    LaunchedEffect(Unit) {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) vm.fetchLocation(context) else permLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Find a service") },
                actions = {
                    NotificationBell(onClick = onNotifications)
                    IconButton(onClick = onBookings) { Icon(Icons.AutoMirrored.Filled.List, "My bookings") }
                    IconButton(onClick = { vm.logout(onLoggedOut) }) { Icon(Icons.Default.Logout, "Log out") }
                },
            )
        },
    ) { pad ->
        Column(Modifier.padding(pad).fillMaxSize()) {
            LazyRow(
                Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(s.categories) { c ->
                    FilterChip(selected = s.selected == c.key, onClick = { vm.select(c.key) }, label = { Text(c.name) })
                }
            }

            when {
                s.lat == null -> MessageBox("Enable location to find nearby providers")
                s.loadingProviders -> LoadingBox()
                s.providers.isEmpty() -> MessageBox(s.error ?: "No providers nearby. Try another service.")
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(s.providers) { p -> ProviderCard(p) { onProvider(p.id) } }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProviderCard(p: Provider, onClick: () -> Unit) {
    ElevatedCard(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(p.displayName, style = MaterialTheme.typography.titleMedium)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Text(" ${p.ratingAvg} (${p.ratingCount})", style = MaterialTheme.typography.bodySmall)
                    p.distanceKm?.let { Text("  •  ${String.format("%.1f", it)} km", style = MaterialTheme.typography.bodySmall) }
                }
                Text(money(p.basePrice), style = MaterialTheme.typography.bodyMedium)
            }
            AssistChip(onClick = onClick, label = { Text(titleCase(p.availability)) })
        }
    }
}
