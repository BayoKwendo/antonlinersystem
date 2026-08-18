package com.spartons.antoniasdriver.ui.jobs

import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.Job
import com.spartons.antoniasdriver.ui.components.CountdownTimer
import com.spartons.antoniasdriver.ui.components.JobStatus
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.parseIsoToMillis
import com.spartons.antoniasdriver.ui.prettyDate
import com.spartons.antoniasdriver.ui.prettyTime
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class JobsState(
    val loading: Boolean = true,
    val jobs: List<Job> = emptyList(),
    val error: String? = null,
)

class JobsViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(JobsState())
    val state = _state.asStateFlow()

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.myJobs() }
                .onSuccess { _state.value = JobsState(loading = false, jobs = it) }
                .onFailure { _state.value = JobsState(loading = false, error = it.message) }
        }
    }

    /** "Start Trip": advance to en_route and begin live tracking. */
    fun headedToSite(context: Context, id: Long) {
        viewModelScope.launch {
            runCatching { repo.jobStatus(id, JobStatus.EN_ROUTE) }
                .onSuccess { startTracking(context, id); load() }
                .onFailure { _state.value = _state.value.copy(error = it.message) }
        }
    }
}

@Composable
fun JobsScreen(onOpenJob: (Long) -> Unit, vm: JobsViewModel = viewModel()) {
    val s by vm.state.collectAsState()
    val context = LocalContext.current
    var tab by remember { mutableIntStateOf(0) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val notify: (String) -> Unit = { msg -> scope.launch { snackbar.showSnackbar(msg) } }
    LaunchedEffect(Unit) { vm.load() }

    val upcoming = remember(s.jobs) { s.jobs.filter { it.status in JobStatus.UPCOMING } }
    val completed = remember(s.jobs) { s.jobs.filter { it.status in JobStatus.DONE } }
    val filtered = when (tab) { 1 -> upcoming; 2 -> completed; else -> s.jobs }
    val tabs = listOf("All (${s.jobs.size})", "Upcoming (${upcoming.size})", "Completed (${completed.size})")

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Text(
                "My Jobs",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(start = 16.dp, top = 12.dp, bottom = 4.dp),
            )
            ScrollableTabRow(selectedTabIndex = tab, edgePadding = 16.dp) {
                tabs.forEachIndexed { i, title ->
                    Tab(selected = tab == i, onClick = { tab = i }, text = { Text(title) })
                }
            }
            when {
                s.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                filtered.isEmpty() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                    Text(s.error ?: "No jobs here yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(filtered) { job ->
                        JobCard(
                            job,
                            onClick = { onOpenJob(job.id) },
                            onStartTrip = { vm.headedToSite(context, job.id) },
                            onPermissionDenied = { notify("Location permission is needed to start the trip and share your live location with the customer.") },
                        )
                    }
                }
            }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
    }
}

@Composable
private fun JobCard(job: Job, onClick: () -> Unit, onStartTrip: () -> Unit, onPermissionDenied: () -> Unit) {
    val (label, color) = cardLabel(job.status)
    // Gate the trip start on runtime location permission so the foreground
    // service can actually start (it self-stops without fine location).
    val startTrip = rememberLocationPermissionRequest(onGranted = onStartTrip, onDenied = onPermissionDenied)
    Surface(
        Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(Modifier.padding(14.dp)) {
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = color)
                Spacer(Modifier.height(3.dp))
                Text(job.customerName ?: "Customer", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text(ServiceCatalog.label(job.category, job.serviceName), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                prettyDate(job.scheduledAt)?.let { d ->
                    Spacer(Modifier.height(6.dp))
                    IconLine(Icons.Filled.CalendarMonth, d + (prettyTime(job.scheduledAt)?.let { " · $it" } ?: ""))
                }
                job.address?.let { IconLine(Icons.Filled.LocationOn, it) }
            }
            Spacer(Modifier.width(10.dp))
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val target = parseIsoToMillis(job.scheduledAt)
                when {
                    job.status in JobStatus.DONE -> {
                        Text("Completed", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = SuccessGreen)
                        prettyDate(job.scheduledAt)?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                    target != null && job.status in JobStatus.COUNTDOWN -> CountdownTimer(target, compact = true)
                    else -> {}
                }
                if (job.status == JobStatus.BOOKED) {
                    Button(
                        onClick = startTrip,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = WarningAmber),
                    ) {
                        Icon(Icons.Filled.DirectionsCar, null, modifier = Modifier.height(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Start Trip", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun IconLine(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.height(15.dp))
        Spacer(Modifier.width(4.dp))
        Text(text, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun cardLabel(status: String): Pair<String, Color> = when {
    status in JobStatus.DONE -> "Completed" to SuccessGreen
    status == JobStatus.ARRIVED || status == JobStatus.IN_PROGRESS -> "In Progress" to WarningAmber
    status == JobStatus.PENDING_PAYMENT -> "Awaiting Payment" to WarningAmber
    else -> "Upcoming" to BrandBlue
}
