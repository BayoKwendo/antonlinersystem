package com.spartons.antoniasdriver.ui.requests

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.Job
import com.spartons.antoniasdriver.ui.LoadingBox
import com.spartons.antoniasdriver.ui.MessageBox
import com.spartons.antoniasdriver.ui.components.IconCircle
import com.spartons.antoniasdriver.ui.components.InfoRow
import com.spartons.antoniasdriver.ui.components.MiniHeading
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.dial
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.openMap
import com.spartons.antoniasdriver.ui.requirementsText
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.DangerRed
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.SuccessGreenLight
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

data class RequestDetailState(
    val loading: Boolean = true,
    val job: Job? = null,
    val working: Boolean = false,
    val error: String? = null,
    val acceptedId: Long? = null,
    val declined: Boolean = false,
)

class RequestDetailViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(RequestDetailState())
    val state = _state.asStateFlow()

    fun load(id: Long) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.availableJob(id) }
                .onSuccess { job ->
                    _state.value = _state.value.copy(loading = false, job = job, error = if (job == null) "This request is no longer available." else null)
                }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

    fun accept(id: Long, scheduledAt: String, note: String?) {
        _state.value = _state.value.copy(working = true, error = null)
        viewModelScope.launch {
            runCatching { repo.acceptJob(id, scheduledAt, note) }
                .onSuccess { _state.value = _state.value.copy(working = false, acceptedId = id) }
                .onFailure { _state.value = _state.value.copy(working = false, error = it.message) }
        }
    }

    fun decline(id: Long) {
        _state.value = _state.value.copy(working = true, error = null)
        viewModelScope.launch {
            runCatching { repo.declineJob(id) }
                .onSuccess { _state.value = _state.value.copy(working = false, declined = true) }
                .onFailure { _state.value = _state.value.copy(working = false, error = it.message) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestDetailScreen(
    requestId: Long,
    onBack: () -> Unit,
    onAccepted: (Long) -> Unit,
    vm: RequestDetailViewModel = viewModel(),
) {
    val s by vm.state.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(requestId) { vm.load(requestId) }
    LaunchedEffect(s.acceptedId) { s.acceptedId?.let(onAccepted) }
    LaunchedEffect(s.declined) { if (s.declined) onBack() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Request Details") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                },
            )
        },
    ) { pad ->
        val job = s.job
        when {
            s.loading -> LoadingBox(Modifier.padding(pad))
            job == null -> MessageBox(s.error ?: "Could not load this request.", Modifier.padding(pad))
            else -> RequestDetailBody(
                modifier = Modifier.padding(pad),
                job = job,
                working = s.working,
                error = s.error,
                onCall = { job.customerPhone?.let { dial(context, it) } },
                onMap = {
                    val lat = job.lat?.toDoubleOrNull(); val lng = job.lng?.toDoubleOrNull()
                    if (lat != null && lng != null) openMap(context, lat, lng, job.address)
                },
                onDecline = { vm.decline(requestId) },
                onAccept = { scheduledAt, note -> vm.accept(requestId, scheduledAt, note) },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RequestDetailBody(
    modifier: Modifier,
    job: Job,
    working: Boolean,
    error: String?,
    onCall: () -> Unit,
    onMap: () -> Unit,
    onDecline: () -> Unit,
    onAccept: (scheduledAt: String, note: String?) -> Unit,
) {
    var dateMillis by remember { mutableStateOf<Long?>(null) }
    var timeHour by remember { mutableStateOf<Int?>(null) }
    var timeMinute by remember { mutableStateOf<Int?>(null) }
    var note by remember { mutableStateOf("") }
    var showDate by remember { mutableStateOf(false) }
    var showTime by remember { mutableStateOf(false) }

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        // Service header
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconCircle(ServiceCatalog.icon(job.category), tint = BrandBlue, diameter = 52)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(ServiceCatalog.label(job.category, job.serviceName), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = InkBlack)
                job.requestNo?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = MutedGrey) }
            }
        }
        Spacer(Modifier.height(16.dp))

        // Customer
        SmartCard {
            MiniHeading("CUSTOMER")
            Spacer(Modifier.height(8.dp))
            Text(job.customerName ?: "Customer", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = InkBlack)
            if (job.customerPhone != null) {
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = onCall, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.Call, null); Spacer(Modifier.width(8.dp)); Text("Call Customer")
                }
            } else {
                Spacer(Modifier.height(4.dp))
                Text("Contact details are revealed once you accept.", style = MaterialTheme.typography.labelSmall, color = MutedGrey)
            }
        }
        Spacer(Modifier.height(12.dp))

        // Location
        SmartCard {
            MiniHeading("LOCATION")
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.LocationOn, null, tint = BrandBlue)
                Spacer(Modifier.width(8.dp))
                Text(job.address ?: "Location shared on map", style = MaterialTheme.typography.bodyMedium, color = InkBlack, modifier = Modifier.weight(1f))
                if (job.lat?.toDoubleOrNull() != null && job.lng?.toDoubleOrNull() != null) {
                    TextButton(onClick = onMap) { Text("View Map") }
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        // Requirements
        requirementsText(job.details)?.let {
            SmartCard {
                MiniHeading("CUSTOMER REQUIREMENTS")
                Spacer(Modifier.height(8.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = InkBlack)
            }
            Spacer(Modifier.height(12.dp))
        }

        // Rate card
        SmartCard {
            MiniHeading("RATE CARD")
            Spacer(Modifier.height(8.dp))
            InfoRow("Customer pays", money(job.feeAmount))
            InfoRow("SmartDrill commission (10%)", "- ${money(job.commissionAmount.toString())}", valueColor = MutedGrey)
            Spacer(Modifier.height(8.dp))
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SuccessGreenLight).padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("You earn", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = InkBlack)
                Text(money(job.earningsAmount.toString()), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = SuccessGreen)
            }
        }
        Spacer(Modifier.height(12.dp))

        // Propose availability
        SmartCard {
            MiniHeading("PROPOSE YOUR AVAILABILITY")
            Text(
                "Tell the customer the earliest date you can deliver this service.",
                style = MaterialTheme.typography.bodySmall,
                color = MutedGrey,
                modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
            )
            OutlinedButton(onClick = { showDate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.CalendarMonth, null); Spacer(Modifier.width(8.dp))
                Text(dateMillis?.let { formatDate(it) } ?: "Select earliest available date")
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = { showTime = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.Schedule, null); Spacer(Modifier.width(8.dp))
                Text(timeHour?.let { formatTime(it, timeMinute ?: 0) } ?: "Select preferred time (optional)")
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text("Note to customer (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Spacer(Modifier.height(16.dp))

        error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(8.dp))
        }

        // Actions
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = onDecline,
                enabled = !working,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerRed),
            ) { Text("Decline") }
            Button(
                onClick = { dateMillis?.let { onAccept(buildScheduledAt(it, timeHour, timeMinute), note) } },
                enabled = !working && dateMillis != null,
                modifier = Modifier.weight(2f),
            ) {
                Text(if (working) "Submitting..." else "Accept & Propose")
            }
        }
        Spacer(Modifier.height(24.dp))
    }

    if (showDate) {
        val dpState = rememberDatePickerState(initialSelectedDateMillis = dateMillis)
        DatePickerDialog(
            onDismissRequest = { showDate = false },
            confirmButton = {
                TextButton(onClick = { dateMillis = dpState.selectedDateMillis; showDate = false }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showDate = false }) { Text("Cancel") } },
        ) { DatePicker(state = dpState) }
    }

    if (showTime) {
        val tpState = rememberTimePickerState()
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showTime = false },
            confirmButton = {
                TextButton(onClick = {
                    timeHour = tpState.hour; timeMinute = tpState.minute; showTime = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showTime = false }) { Text("Cancel") } },
            text = { TimePicker(state = tpState) },
        )
    }
}

private val DISPLAY_DATE = DateTimeFormatter.ofPattern("dd MMM yyyy")

private fun localDate(millis: Long) = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()
private fun formatDate(millis: Long): String = localDate(millis).format(DISPLAY_DATE)

private fun formatTime(hour: Int, minute: Int): String {
    val h12 = when { hour == 0 -> 12; hour > 12 -> hour - 12; else -> hour }
    val ampm = if (hour < 12) "AM" else "PM"
    return "%d:%02d %s".format(h12, minute, ampm)
}

/** Combine the chosen date + optional time into an ISO local datetime (default 09:00). */
private fun buildScheduledAt(millis: Long, hour: Int?, minute: Int?): String {
    val d = localDate(millis)
    return "%04d-%02d-%02dT%02d:%02d:00".format(d.year, d.monthValue, d.dayOfMonth, hour ?: 9, minute ?: 0)
}
