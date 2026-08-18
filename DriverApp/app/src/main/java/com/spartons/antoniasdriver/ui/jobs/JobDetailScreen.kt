package com.spartons.antoniasdriver.ui.jobs

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Sell
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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
import com.spartons.antoniasdriver.data.DocumentUpload
import com.spartons.antoniasdriver.data.Job
import com.spartons.antoniasdriver.data.JobDocument
import com.spartons.antoniasdriver.ui.LoadingBox
import com.spartons.antoniasdriver.ui.MessageBox
import com.spartons.antoniasdriver.ui.components.DocumentUploadRow
import com.spartons.antoniasdriver.ui.components.IconCircle
import com.spartons.antoniasdriver.ui.components.JobStatus
import com.spartons.antoniasdriver.ui.components.ProgressStepper
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.StatusChip
import com.spartons.antoniasdriver.ui.components.jobProgressIndex
import com.spartons.antoniasdriver.ui.dial
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.openMap
import com.spartons.antoniasdriver.ui.prettyDate
import com.spartons.antoniasdriver.ui.prettyTime
import com.spartons.antoniasdriver.ui.sms
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.BrandBlueLight
import com.spartons.antoniasdriver.ui.theme.DangerRed
import com.spartons.antoniasdriver.ui.theme.HairlineGrey
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.SuccessGreenLight
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import com.spartons.antoniasdriver.ui.theme.WarningAmberLight
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val SUPPORT_PHONE = "+254700100200"

// Completion deliverables a provider must upload before a job can be marked complete.
// These kinds mirror the backend's completion gate in services/jobs.ts.
private const val KIND_REPORT = "report"
private const val KIND_ETIMS = "etims_invoice"
private val DELIVERABLE_MIME = arrayOf("application/pdf", "image/png", "image/jpeg")
private const val MAX_DELIVERABLE_BYTES = 5 * 1024 * 1024

/** Read a picked deliverable off the Uri into an uploadable document (null if unreadable/oversize/unsupported). */
private fun readDeliverable(context: Context, kind: String, uri: Uri): DocumentUpload? {
    val cr = context.contentResolver
    val mime = cr.getType(uri)?.lowercase() ?: return null
    if (mime !in DELIVERABLE_MIME) return null
    val name = runCatching {
        cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        }
    }.getOrNull() ?: uri.lastPathSegment ?: "document"
    val bytes = runCatching { cr.openInputStream(uri)?.use { it.readBytes() } }.getOrNull() ?: return null
    if (bytes.size > MAX_DELIVERABLE_BYTES) return null
    return DocumentUpload(kind, name, mime, bytes)
}

data class JobDetailState(
    val loading: Boolean = true,
    val job: Job? = null,
    val working: Boolean = false,
    val error: String? = null,
    val promptDone: Boolean = false,
    val documents: List<JobDocument> = emptyList(),
    val uploading: String? = null,        // kind currently uploading, or null
)

class JobDetailViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(JobDetailState())
    val state = _state.asStateFlow()

    fun load(id: Long) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.myJob(id) }
                .onSuccess { job ->
                    val docs = runCatching { repo.jobDocuments(id) }.getOrDefault(emptyList())
                    _state.value = _state.value.copy(
                        loading = false, job = job, documents = docs,
                        error = if (job == null) "Could not load this job." else null,
                    )
                }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

    /** Upload a completion deliverable (report / etims_invoice), then refresh the job's document set. */
    fun uploadDeliverable(id: Long, kind: String, doc: DocumentUpload) {
        _state.value = _state.value.copy(uploading = kind, error = null)
        viewModelScope.launch {
            runCatching { repo.uploadJobDeliverable(id, kind, doc) }
                .onSuccess { added ->
                    val docs = runCatching { repo.jobDocuments(id) }.getOrDefault(_state.value.documents + added)
                    _state.value = _state.value.copy(uploading = null, documents = docs)
                }
                .onFailure { _state.value = _state.value.copy(uploading = null, error = it.message ?: "Upload failed") }
        }
    }

    /** Record that the customer has been contacted (Contact Speed KPI); reloads the job. */
    fun markContacted(id: Long) = advance(id) { repo.markContacted(id) }

    fun headedToSite(context: Context, id: Long) = advance(id) {
        repo.jobStatus(id, JobStatus.EN_ROUTE); startTracking(context, id)
    }

    fun arrived(context: Context, id: Long) = advance(id) {
        repo.jobStatus(id, JobStatus.ARRIVED); stopTracking(context, id)
    }

    /** Complete the job — chains arrived → in_progress → completed as needed. */
    fun completeJob(context: Context, id: Long) = advance(id) {
        if (_state.value.job?.status == JobStatus.ARRIVED) repo.jobStatus(id, JobStatus.IN_PROGRESS)
        repo.jobStatus(id, JobStatus.COMPLETED)
        stopTracking(context, id)
    }

    private fun advance(id: Long, block: suspend () -> Unit) {
        _state.value = _state.value.copy(working = true, error = null)
        viewModelScope.launch {
            runCatching { block() }
                .onSuccess { load(id) }
                .onFailure { _state.value = _state.value.copy(working = false, error = it.message) }
        }
    }

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
    var menuOpen by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val notify: (String) -> Unit = { msg -> scope.launch { snackbar.showSnackbar(msg) } }
    LaunchedEffect(bookingId) { vm.load(bookingId) }
    LaunchedEffect(s.promptDone) { if (s.promptDone) onPromptPayment(bookingId) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Navy, titleContentColor = Color.White,
                    navigationIconContentColor = Color.White, actionIconContentColor = Color.White,
                ),
                title = { Text("Job Details", fontWeight = FontWeight.SemiBold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    IconButton(onClick = { menuOpen = true }) { Icon(Icons.Filled.MoreVert, "More") }
                    DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                        DropdownMenuItem(text = { Text("Contact Support") }, onClick = { menuOpen = false; dial(context, SUPPORT_PHONE) })
                    }
                },
            )
        },
    ) { pad ->
        val b = s.job
        when {
            s.loading -> LoadingBox(Modifier.padding(pad))
            b == null -> MessageBox(s.error ?: "Could not load this job.", Modifier.padding(pad))
            b.status == JobStatus.PENDING_PAYMENT -> AwaitingPaymentBody(Modifier.padding(pad), b, s.working, s.error, context, vm)
            else -> ProgressBody(Modifier.padding(pad), b, s.working, s.error, context, vm, notify)
        }
    }
}

// ---------------------------------------------------------------------------
// Awaiting-payment mode
// ---------------------------------------------------------------------------
@Composable
private fun AwaitingPaymentBody(modifier: Modifier, b: Job, working: Boolean, error: String?, context: Context, vm: JobDetailViewModel) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        HeaderCard(b, showServiceDate = false)
        Spacer(Modifier.height(14.dp))
        CustomerDetailsCard(b, context)
        Spacer(Modifier.height(14.dp))
        ContactedCard(b, working, vm)
        Spacer(Modifier.height(14.dp))
        AgreedDateCard(b)
        Spacer(Modifier.height(14.dp))
        FeeSummaryCard(b)
        Spacer(Modifier.height(16.dp))
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall); Spacer(Modifier.height(8.dp)) }
        Button(
            onClick = { vm.promptPayment(b.id) },
            enabled = !working,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
        ) { Text(if (working) "Requesting..." else "Prompt Payment", fontWeight = FontWeight.SemiBold) }
        Text(
            "This generates the proforma invoices and asks the customer to pay to confirm the booking.",
            style = MaterialTheme.typography.labelSmall, color = MutedGrey, modifier = Modifier.padding(top = 8.dp),
        )
        Spacer(Modifier.height(24.dp))
    }
}

/** Provider records that they've called/contacted the customer (Contact Speed KPI). */
@Composable
private fun ContactedCard(b: Job, working: Boolean, vm: JobDetailViewModel) {
    val done = !b.contactedAt.isNullOrBlank()
    Column {
        Button(
            onClick = { if (!done) vm.markContacted(b.id) },
            enabled = !working && !done,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = if (done) SuccessGreen else BrandBlue),
        ) { Text(if (done) "✓ Customer contacted" else "Mark customer contacted", fontWeight = FontWeight.SemiBold) }
        Text(
            if (done) "Recorded — this counts toward your Customer Contact Speed rating."
            else "Call the customer, then tap once contacted. Contacting quickly improves your rating.",
            style = MaterialTheme.typography.labelSmall, color = MutedGrey, modifier = Modifier.padding(top = 6.dp),
        )
    }
}

// ---------------------------------------------------------------------------
// Progress mode (confirmed and beyond)
// ---------------------------------------------------------------------------
@Composable
private fun ProgressBody(modifier: Modifier, b: Job, working: Boolean, error: String?, context: Context, vm: JobDetailViewModel, notify: (String) -> Unit) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        HeaderCard(b, showServiceDate = true)
        Spacer(Modifier.height(14.dp))

        // Live-tracking window is en_route only: mirror the foreground-service
        // notification with an in-app indicator + a stop control.
        if (b.status == JobStatus.EN_ROUTE) {
            LiveSharingBanner(enabled = !working) { vm.arrived(context, b.id) }
            Spacer(Modifier.height(14.dp))
        }

        WhiteCard {
            MiniLabel("JOB PROGRESS")
            Spacer(Modifier.height(16.dp))
            ProgressStepper(jobProgressIndex(b.status))
        }
        Spacer(Modifier.height(14.dp))

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall); Spacer(Modifier.height(8.dp)) }

        StageCard(b, working, context, vm, notify)
        Spacer(Modifier.height(14.dp))

        JobSummaryCard(b)
        Spacer(Modifier.height(14.dp))

        ContactSupportCard(context)
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun StageCard(b: Job, working: Boolean, context: Context, vm: JobDetailViewModel, notify: (String) -> Unit) {
    var showUpdate by remember { mutableStateOf(false) }
    val s = b.status
    val onSite = s == JobStatus.ARRIVED || s == JobStatus.IN_PROGRESS
    val stage1Done = s in setOf(JobStatus.ARRIVED, JobStatus.IN_PROGRESS, JobStatus.COMPLETED, JobStatus.CONFIRMED)
    val stage3Done = s in setOf(JobStatus.COMPLETED, JobStatus.CONFIRMED)

    // Completion is gated on the required deliverables (report + eTIMS invoice) being
    // uploaded — mirrors the backend rule so the button can't even be tapped early.
    val st by vm.state.collectAsState()
    val hasReport = st.documents.any { it.kind == KIND_REPORT }
    val hasEtims = st.documents.any { it.kind == KIND_ETIMS }
    val uploading = st.uploading
    var pendingKind by remember { mutableStateOf<String?>(null) }
    val pickScope = rememberCoroutineScope()
    val deliverablePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        val kind = pendingKind
        pendingKind = null
        if (kind != null && uri != null) pickScope.launch {
            val doc = withContext(Dispatchers.IO) { readDeliverable(context, kind, uri) }
            if (doc == null) notify("Couldn't read that file. Upload a PDF, PNG or JPG under 5 MB.")
            else vm.uploadDeliverable(b.id, kind, doc)
        }
    }

    // Gate the trip start on runtime location permission — without it the
    // foreground service self-stops and tracking silently never starts.
    val startTrip = rememberLocationPermissionRequest(
        onGranted = { vm.headedToSite(context, b.id) },
        onDenied = { notify("Location permission is needed to start the trip and share your live location with the customer.") },
    )

    WhiteCard {
        // Stage 1 — Arrival on Site
        StageBlock(
            index = "1",
            icon = Icons.Filled.Place,
            title = if (s == JobStatus.BOOKED) "Head to Site" else "Arrival on Site",
            accent = BrandBlue,
            done = stage1Done,
            desc = "Once you arrive at the customer's location, let us know.",
            detail = { DetailBox("Site Location", b.address ?: "Shared", BrandBlueLight) { MapLink(b, context) } },
            action = {
                when {
                    s == JobStatus.BOOKED -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        StageButton("Start Trip", BrandBlue, !working) { startTrip() }
                        Text(
                            "Share your live location with the customer",
                            style = MaterialTheme.typography.labelSmall,
                            color = MutedGrey,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    s == JobStatus.EN_ROUTE -> StageButton("I've Arrived", BrandBlue, !working) { vm.arrived(context, b.id) }
                    else -> DoneTag()
                }
            },
            note = "This will notify the customer and Smart Drill that you are on site.",
            noteBg = BrandBlueLight, noteTint = BrandBlue,
        )
        StageDivider()
        // Stage 2 — Job in Progress
        StageBlock(
            index = "2",
            icon = Icons.Filled.Assignment,
            title = "Job in Progress",
            accent = WarningAmber,
            done = stage3Done,
            desc = "Carry out the ${ServiceCatalog.label(b.category, b.serviceName).lowercase()} as agreed with the customer.",
            detail = { DetailBox("Time on Site", "-- : --", WarningAmberLight) {} },
            action = {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    OutlinedButton(
                        onClick = { showUpdate = true },
                        enabled = onSite,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerRed),
                        border = BorderStroke(1.dp, if (onSite) DangerRed else HairlineGrey),
                    ) { Text("Add Update") }
                    Text("Add notes (optional)", style = MaterialTheme.typography.labelSmall, color = MutedGrey, modifier = Modifier.padding(top = 4.dp))
                }
            },
            note = "You can add updates or notes during the job.",
            noteBg = WarningAmberLight, noteTint = WarningAmber,
        )
        StageDivider()
        // Stage 3 — Job Completed
        StageBlock(
            index = "3",
            icon = Icons.Filled.CheckCircle,
            title = "Job Completed",
            accent = SuccessGreen,
            done = stage3Done,
            desc = "Once the work is complete, submit the job for review.",
            detail = { DetailBox("Deliverables", deliverableFor(b.category), SuccessGreenLight) {} },
            action = {
                if (stage3Done) DoneTag()
                else Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    // Required completion deliverables — only uploadable once on site.
                    if (onSite) {
                        DocumentUploadRow(
                            title = "Completion Report",
                            icon = Icons.Filled.Description,
                            selectedName = when {
                                hasReport -> "Uploaded"
                                uploading == KIND_REPORT -> "Uploading…"
                                else -> null
                            },
                            onPick = { pendingKind = KIND_REPORT; deliverablePicker.launch(DELIVERABLE_MIME) },
                        )
                        Spacer(Modifier.height(8.dp))
                        DocumentUploadRow(
                            title = "eTIMS Invoice",
                            icon = Icons.Filled.Sell,
                            selectedName = when {
                                hasEtims -> "Uploaded"
                                uploading == KIND_ETIMS -> "Uploading…"
                                else -> null
                            },
                            onPick = { pendingKind = KIND_ETIMS; deliverablePicker.launch(DELIVERABLE_MIME) },
                        )
                        Spacer(Modifier.height(12.dp))
                    }
                    StageButton("Job Completed", SuccessGreen, onSite && !working && hasReport && hasEtims) { vm.completeJob(context, b.id) }
                    if (onSite && !(hasReport && hasEtims)) {
                        Text(
                            "Upload the completion report and eTIMS invoice to finish.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MutedGrey,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                }
            },
            note = "Smart Drill will review and confirm with the customer.",
            noteBg = SuccessGreenLight, noteTint = SuccessGreen,
        )
    }

    if (showUpdate) {
        var note by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showUpdate = false },
            title = { Text("Add progress update") },
            text = {
                OutlinedTextField(value = note, onValueChange = { note = it }, label = { Text("What's the latest?") }, modifier = Modifier.fillMaxWidth())
            },
            // No notes endpoint on the backend yet — captured locally for now.
            confirmButton = { TextButton(onClick = { showUpdate = false }) { Text("Done") } },
            dismissButton = { TextButton(onClick = { showUpdate = false }) { Text("Cancel") } },
        )
    }
}

/**
 * In-app mirror of the location foreground-service notification: shows while the
 * driver is en_route and live-streaming, with a Stop control that ends the trip
 * (marks arrived, which stops publishing).
 */
@Composable
private fun LiveSharingBanner(enabled: Boolean, onStop: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(BrandBlueLight).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(34.dp).clip(CircleShape).background(BrandBlue.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Filled.LocationOn, null, tint = BrandBlue, modifier = Modifier.size(18.dp)) }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Sharing your live location", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkBlack)
            Text("The customer can see you on the way.", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
        }
        OutlinedButton(
            onClick = onStop,
            enabled = enabled,
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(1.dp, if (enabled) DangerRed else HairlineGrey),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerRed),
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
        ) { Text("Stop", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold) }
    }
}

@Composable
private fun StageBlock(
    index: String,
    icon: ImageVector,
    title: String,
    accent: Color,
    done: Boolean,
    desc: String,
    detail: @Composable () -> Unit,
    action: @Composable () -> Unit,
    note: String,
    noteBg: Color,
    noteTint: Color,
) {
    Column {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                Modifier.size(38.dp).clip(CircleShape).background((if (done) SuccessGreen else accent).copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) { Icon(if (done) Icons.Filled.CheckCircle else icon, null, tint = if (done) SuccessGreen else accent, modifier = Modifier.size(20.dp)) }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("$index. $title", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = if (done) SuccessGreen else accent)
                Text(desc, style = MaterialTheme.typography.bodySmall, color = MutedGrey)
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { detail() }
            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) { action() }
        }
        Spacer(Modifier.height(8.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(noteBg).padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.Info, null, tint = noteTint, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
            Text(note, style = MaterialTheme.typography.labelSmall, color = InkBlack)
        }
    }
}

@Composable
private fun DetailBox(label: String, value: String, bg: Color, extra: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(bg).padding(10.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = InkBlack, maxLines = 1)
        extra()
    }
}

@Composable
private fun MapLink(b: Job, context: Context) {
    if (b.lat?.toDoubleOrNull() != null && b.lng?.toDoubleOrNull() != null) {
        Text(
            "View on Map",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = BrandBlue,
            modifier = Modifier.clickable { openMap(context, b.lat!!.toDouble(), b.lng!!.toDouble(), b.address) },
        )
    }
}

@Composable
private fun StageButton(label: String, color: Color, enabled: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(44.dp),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color),
    ) { Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, maxLines = 1) }
}

@Composable
private fun DoneTag() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Filled.CheckCircle, null, tint = SuccessGreen, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text("Done", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = SuccessGreen)
    }
}

@Composable
private fun StageDivider() {
    HorizontalDivider(Modifier.padding(vertical = 14.dp), color = HairlineGrey)
}

// ---------------------------------------------------------------------------
// Shared cards
// ---------------------------------------------------------------------------
@Composable
private fun WhiteCard(content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    Surface(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) { Column(Modifier.padding(16.dp), content = content) }
}

@Composable
private fun MiniLabel(text: String) {
    Text(text, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MutedGrey)
}

@Composable
private fun HeaderCard(b: Job, showServiceDate: Boolean) {
    WhiteCard {
        Row(verticalAlignment = Alignment.Top) {
            IconCircle(ServiceCatalog.icon(b.category), tint = BrandBlue, diameter = 52)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(ServiceCatalog.label(b.category, b.serviceName), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = InkBlack)
                b.requestNo?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MutedGrey) }
                b.address?.let {
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocationOn, null, tint = BrandBlue, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(it, style = MaterialTheme.typography.bodySmall, color = InkBlack)
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                StatusChip(b.status)
                if (showServiceDate) {
                    prettyDate(b.scheduledAt)?.let { d ->
                        Spacer(Modifier.height(10.dp))
                        Text("Service Date", style = MaterialTheme.typography.labelSmall, color = MutedGrey)
                        Text(d, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkBlack)
                        prettyTime(b.scheduledAt)?.let { t ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.AccessTime, null, tint = MutedGrey, modifier = Modifier.size(13.dp))
                                Spacer(Modifier.width(3.dp))
                                Text(t, style = MaterialTheme.typography.bodySmall, color = InkBlack)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CustomerDetailsCard(b: Job, context: Context) {
    WhiteCard {
        MiniLabel("CUSTOMER DETAILS")
        Spacer(Modifier.height(10.dp))
        Text(b.customerName ?: "Customer", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = InkBlack)
        Spacer(Modifier.height(8.dp))
        b.customerPhone?.let { ContactLine(Icons.Filled.Call, "Phone", it) { dial(context, it) } }
        (b.address)?.let {
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Location", style = MaterialTheme.typography.labelSmall, color = MutedGrey)
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = InkBlack)
                }
                MapLink(b, context)
            }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(
            onClick = { b.customerPhone?.let { sms(context, it) } },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(1.dp, BrandBlue),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandBlue),
        ) { Icon(Icons.AutoMirrored.Filled.Chat, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Chat with Customer") }
    }
}

@Composable
private fun ContactLine(icon: ImageVector, label: String, value: String, onCall: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey)
            Text(value, style = MaterialTheme.typography.bodyMedium, color = InkBlack)
        }
        IconButton(onClick = onCall, modifier = Modifier.size(34.dp)) {
            Box(Modifier.size(34.dp).clip(CircleShape).background(BrandBlueLight), contentAlignment = Alignment.Center) {
                Icon(icon, "Call", tint = BrandBlue, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun AgreedDateCard(b: Job) {
    WhiteCard {
        MiniLabel("AGREED SERVICE DATE & TIME")
        Spacer(Modifier.height(10.dp))
        InlineRow("Service Date", prettyDate(b.scheduledAt) ?: "Not set")
        Spacer(Modifier.height(8.dp))
        InlineRow("Service Time", prettyTime(b.scheduledAt) ?: "Not set")
    }
}

@Composable
private fun InlineRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MutedGrey)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = InkBlack)
    }
}

@Composable
private fun FeeSummaryCard(b: Job) {
    WhiteCard {
        MiniLabel("SERVICE FEE SUMMARY")
        Spacer(Modifier.height(10.dp))
        FeeRow("Service Fee (Rate Card)", ServiceCatalog.label(b.category, b.serviceName), money(b.feeAmount), InkBlack)
        Spacer(Modifier.height(8.dp))
        FeeRow("Your Earnings (After Commission)", null, money(b.earningsAmount.toString()), SuccessGreen)
        Spacer(Modifier.height(8.dp))
        FeeRow("Smart Drill Commission (10%)", null, money(b.commissionAmount.toString()), MutedGrey)
    }
}

@Composable
private fun FeeRow(label: String, sub: String?, amount: String, amountColor: Color) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodyMedium, color = InkBlack, fontWeight = FontWeight.Medium)
            sub?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MutedGrey) }
        }
        Text(amount, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = amountColor)
    }
}

@Composable
private fun JobSummaryCard(b: Job) {
    WhiteCard {
        MiniLabel("JOB SUMMARY")
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            SummaryItem(Icons.Filled.Person, "Customer", b.customerName ?: "—", Modifier.weight(1f))
            SummaryItem(Icons.Filled.LocationOn, "Location", b.address ?: "—", Modifier.weight(1f))
            SummaryItem(Icons.Filled.Sell, "Service Fee", money(b.feeAmount), Modifier.weight(1f))
            SummaryItem(Icons.Filled.AccountBalanceWallet, "Your Earnings", money(b.earningsAmount.toString()), Modifier.weight(1f), SuccessGreen)
        }
    }
}

@Composable
private fun SummaryItem(icon: ImageVector, label: String, value: String, modifier: Modifier, valueColor: Color = InkBlack) {
    Column(modifier) {
        Icon(icon, null, tint = MutedGrey, modifier = Modifier.size(18.dp))
        Spacer(Modifier.height(4.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey, maxLines = 1)
        Text(value, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = valueColor, maxLines = 1)
    }
}

@Composable
private fun ContactSupportCard(context: Context) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(BrandBlueLight).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.SupportAgent, null, tint = Navy, modifier = Modifier.size(26.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Need Help?", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkBlack)
            Text("Contact Smart Drill Support", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
        }
        OutlinedButton(
            onClick = { dial(context, SUPPORT_PHONE) },
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(1.dp, BrandBlue),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandBlue),
        ) { Text("Contact Support") }
    }
}

private fun deliverableFor(category: String?): String = when (category) {
    "geologist" -> "Survey Report"
    "drillers" -> "Drilling Report"
    "test_pump" -> "Test Pumping Report"
    "surveys" -> "Water Analysis Report"
    else -> "Service Report"
}
