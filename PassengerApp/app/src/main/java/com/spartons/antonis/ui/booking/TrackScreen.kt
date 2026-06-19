package com.spartons.antonis.ui.booking

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.spartons.antonis.ServiceLocator
import com.spartons.antonis.data.Booking
import com.spartons.antonis.tracking.trackBooking
import com.spartons.antonis.ui.LoadingBox
import com.spartons.antonis.ui.money
import com.spartons.antonis.ui.titleCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class TrackViewModel(private val bookingId: Long) : ViewModel() {
    private val repo = ServiceLocator.repo
    data class S(
        val booking: Booking? = null,
        val live: LatLng? = null,
        val loading: Boolean = true,
        val message: String? = null,
    )
    private val _s = MutableStateFlow(S())
    val s = _s.asStateFlow()

    init {
        reload()
        viewModelScope.launch {
            trackBooking(bookingId, ServiceLocator.session.cachedAccess).collect {
                _s.value = _s.value.copy(live = it)
            }
        }
    }

    fun reload() {
        viewModelScope.launch {
            runCatching { repo.booking(bookingId) }
                .onSuccess { _s.value = _s.value.copy(loading = false, booking = it) }
                .onFailure { _s.value = _s.value.copy(loading = false, message = it.message) }
        }
    }

    fun pay(phone: String) {
        viewModelScope.launch {
            runCatching { repo.pay(bookingId, phone) }
                .onSuccess { _s.value = _s.value.copy(message = "M-Pesa prompt sent to $phone") }
                .onFailure { _s.value = _s.value.copy(message = it.message) }
        }
    }

    fun review(rating: Int, comment: String) {
        viewModelScope.launch {
            runCatching { repo.review(bookingId, rating, comment) }
                .onSuccess { _s.value = _s.value.copy(message = "Thanks for your review!"); reload() }
                .onFailure { _s.value = _s.value.copy(message = it.message) }
        }
    }

    fun clearMessage() { _s.value = _s.value.copy(message = null) }
}

@Suppress("UNCHECKED_CAST")
private fun trackVmFactory(bookingId: Long) = object : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T = TrackViewModel(bookingId) as T
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackScreen(bookingId: Long, onBack: () -> Unit) {
    val vm: TrackViewModel = viewModel(factory = trackVmFactory(bookingId))
    val s by vm.s.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    var showPay by remember { mutableStateOf(false) }
    var showRate by remember { mutableStateOf(false) }

    LaunchedEffect(s.message) { s.message?.let { snackbar.showSnackbar(it); vm.clearMessage() } }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Track booking #$bookingId") }, navigationIcon = { TextButton(onClick = onBack) { Text("Back") } }) },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { pad ->
        val b = s.booking
        if (s.loading || b == null) {
            Box(Modifier.padding(pad)) { LoadingBox() }
            return@Scaffold
        }

        val initial = s.live
            ?: b.providerLat?.toDoubleOrNull()?.let { lat -> b.providerLng?.toDoubleOrNull()?.let { lng -> LatLng(lat, lng) } }
        val camera = rememberCameraPositionState {
            if (initial != null) position = CameraPosition.fromLatLngZoom(initial, 14f)
        }
        LaunchedEffect(s.live) { s.live?.let { camera.position = CameraPosition.fromLatLngZoom(it, 15f) } }

        Column(Modifier.padding(pad).fillMaxSize().verticalScroll(rememberScrollState())) {
            Box(Modifier.fillMaxWidth().height(260.dp)) {
                if (initial != null) {
                    GoogleMap(modifier = Modifier.matchParentSize(), cameraPositionState = camera) {
                        val pos = s.live ?: initial
                        Marker(state = MarkerState(position = pos), title = b.providerName ?: "Provider")
                    }
                } else {
                    Box(Modifier.matchParentSize(), contentAlignment = Alignment.Center) {
                        Text("Waiting for the provider's location…")
                    }
                }
            }

            Column(Modifier.padding(16.dp)) {
                AssistChip(onClick = {}, label = { Text(titleCase(b.status)) })
                Spacer(Modifier.height(8.dp))
                Text(b.providerName ?: "Provider", style = MaterialTheme.typography.titleLarge)
                b.providerPhone?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }

                Spacer(Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Paid ${money(b.amountPaid)}"); Text("Total ${money(b.totalAmount)}")
                }

                val balance = (b.totalAmount.toDoubleOrNull() ?: 0.0) - (b.amountPaid.toDoubleOrNull() ?: 0.0)
                Spacer(Modifier.height(16.dp))
                if (b.status != "completed" && b.status != "cancelled" && balance > 0) {
                    Button(onClick = { showPay = true }, modifier = Modifier.fillMaxWidth()) {
                        Text(if (b.status == "pending_payment") "Pay deposit" else "Pay balance (${money(balance.toString())})")
                    }
                }
                if (b.status == "completed") {
                    OutlinedButton(onClick = { showRate = true }, modifier = Modifier.fillMaxWidth()) { Text("Rate this provider") }
                }

                Spacer(Modifier.height(20.dp))
                Text("Progress", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                b.events?.forEach { e ->
                    Row(Modifier.padding(vertical = 4.dp)) {
                        Text("•  ", color = MaterialTheme.colorScheme.primary)
                        Column {
                            Text(titleCase(e.status))
                            e.createdAt?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                        }
                    }
                }
            }
        }
    }

    if (showPay) PayDialog(onDismiss = { showPay = false }, onPay = { vm.pay(it); showPay = false })
    if (showRate) RateDialog(onDismiss = { showRate = false }, onRate = { r, c -> vm.review(r, c); showRate = false })
}

@Composable
private fun PayDialog(onDismiss: () -> Unit, onPay: (String) -> Unit) {
    var phone by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("M-Pesa payment") },
        text = {
            OutlinedTextField(
                value = phone, onValueChange = { phone = it }, label = { Text("M-Pesa phone (2547…)") },
                singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            )
        },
        confirmButton = { TextButton(onClick = { onPay(phone) }, enabled = phone.length >= 10) { Text("Send prompt") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun RateDialog(onDismiss: () -> Unit, onRate: (Int, String) -> Unit) {
    var rating by remember { mutableStateOf(5) }
    var comment by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rate provider") },
        text = {
            Column {
                Row {
                    (1..5).forEach { i ->
                        IconButton(onClick = { rating = i }) {
                            Icon(
                                if (i <= rating) Icons.Default.Star else Icons.Outlined.StarBorder,
                                contentDescription = "$i",
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }
                OutlinedTextField(value = comment, onValueChange = { comment = it }, label = { Text("Comment (optional)") })
            }
        },
        confirmButton = { TextButton(onClick = { onRate(rating, comment) }) { Text("Submit") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
