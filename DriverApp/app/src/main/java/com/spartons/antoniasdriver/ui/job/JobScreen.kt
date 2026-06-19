package com.spartons.antoniasdriver.ui.job

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.Booking
import com.spartons.antoniasdriver.ui.LoadingBox
import com.spartons.antoniasdriver.ui.MessageBox
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.titleCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** The forward job flow and the action label for advancing out of each state. */
private fun nextStep(status: String): Pair<String, String>? = when (status) {
    "booked" -> "en_route" to "Start — On my way"
    "en_route" -> "arrived" to "I have arrived"
    "arrived" -> "in_progress" to "Start the job"
    "in_progress" -> "completed" to "Complete job"
    else -> null
}

data class JobState(
    val loading: Boolean = true,
    val booking: Booking? = null,
    val updating: Boolean = false,
    val error: String? = null,
)

class JobViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(JobState())
    val state = _state.asStateFlow()

    fun load(id: Long) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.booking(id) }
                .onSuccess { _state.value = _state.value.copy(loading = false, booking = it) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

    fun advance(id: Long, to: String) {
        _state.value = _state.value.copy(updating = true, error = null)
        viewModelScope.launch {
            runCatching { repo.transition(id, to) }
                .onSuccess { _state.value = _state.value.copy(updating = false, booking = it) }
                .onFailure { _state.value = _state.value.copy(updating = false, error = it.message) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobScreen(bookingId: Long, onBack: () -> Unit, vm: JobViewModel = viewModel()) {
    val s by vm.state.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(bookingId) { vm.load(bookingId) }

    // While this job is open, the foreground service publishes the driver's
    // location to this booking's tracking channel.
    DisposableEffect(bookingId) {
        ServiceLocator.activeBookingId = bookingId
        onDispose { if (ServiceLocator.activeBookingId == bookingId) ServiceLocator.activeBookingId = null }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Job #$bookingId") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                },
            )
        },
    ) { pad ->
        val booking = s.booking
        when {
            s.loading -> LoadingBox(Modifier.padding(pad))
            booking == null -> MessageBox(s.error ?: "Could not load this job.", Modifier.padding(pad))
            else -> JobDetail(
                modifier = Modifier.padding(pad),
                booking = booking,
                updating = s.updating,
                error = s.error,
                onCall = { phone -> dial(context, phone) },
                onAdvance = { to -> vm.advance(bookingId, to) },
            )
        }
    }
}

@Composable
private fun JobDetail(
    modifier: Modifier,
    booking: Booking,
    updating: Boolean,
    error: String?,
    onCall: (String) -> Unit,
    onAdvance: (String) -> Unit,
) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        val custLat = booking.lat?.toDoubleOrNull()
        val custLng = booking.lng?.toDoubleOrNull()
        if (custLat != null && custLng != null) {
            val cam = rememberCameraPositionState {
                position = CameraPosition.fromLatLngZoom(LatLng(custLat, custLng), 15f)
            }
            GoogleMap(Modifier.fillMaxWidth().height(180.dp), cameraPositionState = cam) {
                Marker(state = MarkerState(position = LatLng(custLat, custLng)), title = "Customer")
            }
            Spacer(Modifier.height(12.dp))
        }

        AssistChip(onClick = {}, label = { Text(titleCase(booking.status)) })
        Spacer(Modifier.height(8.dp))

        Text(booking.customerName ?: "Customer", style = MaterialTheme.typography.titleLarge)
        booking.category?.let { Text(titleCase(it), style = MaterialTheme.typography.bodyMedium) }
        booking.address?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }

        Spacer(Modifier.height(12.dp))
        Text("Total: ${money(booking.totalAmount)}", style = MaterialTheme.typography.bodyMedium)
        Text("Deposit: ${money(booking.depositAmount)}", style = MaterialTheme.typography.bodyMedium)
        Text("Paid: ${money(booking.amountPaid)}", style = MaterialTheme.typography.bodyMedium)

        Spacer(Modifier.height(16.dp))
        booking.customerPhone?.let { phone ->
            OutlinedButton(onClick = { onCall(phone) }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.Call, null)
                Spacer(Modifier.width(8.dp))
                Text("Call ${booking.customerName ?: "customer"}")
            }
            Spacer(Modifier.height(8.dp))
        }

        nextStep(booking.status)?.let { (to, label) ->
            Button(onClick = { onAdvance(to) }, enabled = !updating, modifier = Modifier.fillMaxWidth()) {
                Text(if (updating) "Updating..." else label)
            }
        } ?: Text(
            "This job is ${titleCase(booking.status)}.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.primary,
        )

        error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private fun dial(context: Context, phone: String) {
    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
}
