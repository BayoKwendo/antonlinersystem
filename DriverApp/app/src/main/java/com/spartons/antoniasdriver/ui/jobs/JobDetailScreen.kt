package com.spartons.antoniasdriver.ui.jobs

import android.content.Context
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import com.spartons.antoniasdriver.ui.components.CountdownTimer
import com.spartons.antoniasdriver.ui.components.InfoRow
import com.spartons.antoniasdriver.ui.components.JobStatus
import com.spartons.antoniasdriver.ui.components.MiniHeading
import com.spartons.antoniasdriver.ui.components.ProgressStepper
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.components.StatusChip
import com.spartons.antoniasdriver.ui.components.jobProgressIndex
import com.spartons.antoniasdriver.ui.components.parseIsoToMillis
import com.spartons.antoniasdriver.ui.dial
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.prettyDate
import com.spartons.antoniasdriver.ui.prettyTime
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.BrandBlueLight
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.SuccessGreenLight
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import com.spartons.antoniasdriver.ui.theme.WarningAmberLight
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private const val SUPPORT_PHONE = "+254700100200"

data class JobDetailState(
    val loading: Boolean = true,
    val job: Job? = null,
    val working: Boolean = false,
    val error: String? = null,
    val promptDone: Boolean = false,
)

class JobDetailViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(JobDetailState())
    val state = _state.asStateFlow()

    fun load(id: Long) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.myJob(id) }
                .onSuccess { _state.value = _state.value.copy(loading = false, job = it, error = if (it == null) "Could not load this job." else null) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

    private fun transition(id: Long, to: String, onDone: (Context) -> Unit = {}, context: Context? = null) {
        _state.value = _state.value.copy(working = true, error = null)
        viewModelScope.launch {
            runCatching { repo.jobStatus(id, to) }
                .onSuccess { context?.let(onDone); load(id) }
                .onFailure { _state.value = _state.value.copy(working = false, error = it.message) }
        }
    }

    fun headedToSite(context: Context, id: Long) = transition(id, JobStatus.EN_ROUTE, { startTracking(it, id) }, context)
    fun arrived(context: Context, id: Long) = transition(id, JobStatus.ARRIVED, { stopTracking(it, id) }, context)
    fun startJob(id: Long) = transition(id, JobStatus.IN_PROGRESS)
    fun completeJob(context: Context, id: Long) = transition(id, JobStatus.COMPLETED, { stopTracking(it, id) }, context)

    fun promptPayment(id: Long) {
        _state.value = _state.value.copy(working = true, error = null)
        viewModelScope.launch {
            runCatching { repo.promptPayment(id) }
                .onSuccess { _state.value = _state.value.copy(working = false, promptDone = true) }
                .onFailure { _state.value = _state.value.copy(working = false, error = it.message) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobDetailScreen(
    bookingId: Long,
    onBack: () -> Unit,
    onPromptPayment: (Long) -> Unit,
    vm: JobDetailViewModel = viewModel(),
) {
    val s by vm.state.collectAsState()
    val context = LocalContext.current
    LaunchedEffect(bookingId) { vm.load(bookingId) }
    LaunchedEffect(s.promptDone) { if (s.promptDone) onPromptPayment(bookingId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Job Details") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            )
        },
    ) { pad ->
        val b = s.job
        when {
            s.loading -> LoadingBox(Modifier.padding(pad))
            b == null -> MessageBox(s.error ?: "Could not load this job.", Modifier.padding(pad))
            b.status == JobStatus.PENDING_PAYMENT -> AwaitingPaymentBody(Modifier.padding(pad), b, s.working, s.error, context, vm)
            else -> ProgressBody(Modifier.padding(pad), b, s.working, s.error, context, vm)
        }
    }
}

// ---------------------------------------------------------------------------
// Awaiting-payment mode (pending_payment)
// ---------------------------------------------------------------------------
@Composable
private fun AwaitingPaymentBody(
    modifier: Modifier,
    b: Job,
    working: Boolean,
    error: String?,
    context: Context,
    vm: JobDetailViewModel,
) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Header(b)
        Spacer(Modifier.height(16.dp))
        CustomerCard(b, context)
        Spacer(Modifier.height(12.dp))

        SmartCard {
            MiniHeading("AGREED SERVICE DATE")
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.CalendarMonth, null, tint = BrandBlue)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(prettyDate(b.scheduledAt) ?: "Not set", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, color = InkBlack)
                    prettyTime(b.scheduledAt)?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MutedGrey) }
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        FeeSummary(b)
        Spacer(Modifier.height(16.dp))

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall); Spacer(Modifier.height(8.dp)) }

        Button(onClick = { vm.promptPayment(b.id) }, enabled = !working, modifier = Modifier.fillMaxWidth().height(52.dp)) {
            Text(if (working) "Requesting..." else "Prompt Payment")
        }
        Text(
            "This generates the proforma invoices and asks the customer to pay SmartDrill to confirm the booking.",
            style = MaterialTheme.typography.labelSmall, color = MutedGrey,
            modifier = Modifier.padding(top = 8.dp),
        )
        Spacer(Modifier.height(24.dp))
    }
}

// ---------------------------------------------------------------------------
// Progress mode (booked and beyond)
// ---------------------------------------------------------------------------
@Composable
private fun ProgressBody(
    modifier: Modifier,
    b: Job,
    working: Boolean,
    error: String?,
    context: Context,
    vm: JobDetailViewModel,
) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Header(b)
        Spacer(Modifier.height(16.dp))

        SmartCard {
            MiniHeading("JOB PROGRESS")
            Spacer(Modifier.height(14.dp))
            ProgressStepper(jobProgressIndex(b.status))
        }
        Spacer(Modifier.height(12.dp))

        val target = parseIsoToMillis(b.scheduledAt)
        if (target != null && b.status in setOf(JobStatus.BOOKED, JobStatus.EN_ROUTE)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(BrandBlueLight).padding(16.dp)) {
                Text("Service starts in", style = MaterialTheme.typography.labelMedium, color = BrandBlue, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                CountdownTimer(target)
            }
            Spacer(Modifier.height(12.dp))
        }

        CustomerCard(b, context)
        Spacer(Modifier.height(12.dp))

        SmartCard {
            MiniHeading("JOB SUMMARY")
            Spacer(Modifier.height(8.dp))
            InfoRow("Service", ServiceCatalog.label(b.category, b.serviceName))
            b.requestNo?.let { InfoRow("Reference", it) }
            prettyDate(b.scheduledAt)?.let { d -> InfoRow("Scheduled", d + (prettyTime(b.scheduledAt)?.let { t -> " · $t" } ?: "")) }
            b.address?.let { InfoRow("Location", it) }
            InfoRow("You earn", money(b.earningsAmount.toString()), valueColor = SuccessGreen, valueWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(16.dp))

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall); Spacer(Modifier.height(8.dp)) }

        StageActions(b, working, context, vm)

        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = { dial(context, SUPPORT_PHONE) }, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Filled.SupportAgent, null); Spacer(Modifier.width(8.dp)); Text("Contact Support")
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun StageActions(b: Job, working: Boolean, context: Context, vm: JobDetailViewModel) {
    when (b.status) {
        JobStatus.BOOKED -> PrimaryAction("Headed to Site", Icons.Filled.DirectionsCar, working) { vm.headedToSite(context, b.id) }
        JobStatus.EN_ROUTE -> PrimaryAction("I've Arrived", Icons.Filled.Place, working) { vm.arrived(context, b.id) }
        JobStatus.ARRIVED -> PrimaryAction("Start the Job", Icons.Filled.DirectionsCar, working) { vm.startJob(b.id) }
        JobStatus.IN_PROGRESS -> Button(
            onClick = { vm.completeJob(context, b.id) }, enabled = !working,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
        ) { Text(if (working) "Submitting..." else "Mark Job Completed") }
        JobStatus.COMPLETED -> NoticeCard(
            "Under review", "SmartDrill Ops is verifying your submission. Payment is released once verified.",
            WarningAmber, WarningAmberLight,
        )
        else -> NoticeCard(
            "Job complete", "This job has been verified and completed. Thank you!",
            SuccessGreen, SuccessGreenLight,
        )
    }
}

@Composable
private fun PrimaryAction(label: String, icon: ImageVector, working: Boolean, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = !working, modifier = Modifier.fillMaxWidth().height(52.dp)) {
        Icon(icon, null); Spacer(Modifier.width(8.dp)); Text(if (working) "Please wait..." else label)
    }
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------
@Composable
private fun Header(b: Job) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(ServiceCatalog.label(b.category, b.serviceName), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = InkBlack)
            b.requestNo?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = MutedGrey) }
        }
        StatusChip(b.status)
    }
}

@Composable
private fun CustomerCard(b: Job, context: Context) {
    SmartCard {
        MiniHeading("CUSTOMER")
        Spacer(Modifier.height(8.dp))
        Text(b.customerName ?: "Customer", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = InkBlack)
        b.address?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MutedGrey) }
        b.customerPhone?.let { phone ->
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = { dial(context, phone) }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.Call, null); Spacer(Modifier.width(6.dp)); Text("Call Customer")
            }
        }
    }
}

@Composable
private fun FeeSummary(b: Job) {
    SmartCard {
        MiniHeading("FEE SUMMARY")
        Spacer(Modifier.height(8.dp))
        InfoRow("Customer pays", money(b.feeAmount))
        InfoRow("SmartDrill commission (10%)", "- ${money(b.commissionAmount.toString())}", valueColor = MutedGrey)
        Spacer(Modifier.height(8.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SuccessGreenLight).padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("You earn", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = InkBlack)
            Text(money(b.earningsAmount.toString()), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = SuccessGreen)
        }
    }
}

@Composable
private fun NoticeCard(title: String, body: String, accent: Color, bg: Color) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(bg).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.CheckCircle, null, tint = accent)
            Spacer(Modifier.width(8.dp))
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = accent)
        }
        Spacer(Modifier.height(6.dp))
        Text(body, style = MaterialTheme.typography.bodySmall, color = InkBlack)
    }
}
