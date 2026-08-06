package com.spartons.antoniasdriver.ui.jobs

import android.content.Context
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.spartons.antoniasdriver.ui.components.CountdownTimer
import com.spartons.antoniasdriver.ui.components.IconCircle
import com.spartons.antoniasdriver.ui.components.JobStatus
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.components.StatusChip
import com.spartons.antoniasdriver.ui.components.parseIsoToMillis
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.BrandBlueLight
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
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

    /** "Headed to Site": advance to en_route and begin live tracking. */
    fun headedToSite(context: Context, id: Long) {
        viewModelScope.launch {
            runCatching { repo.jobStatus(id, JobStatus.EN_ROUTE) }
                .onSuccess { startTracking(context, id); load() }
                .onFailure { _state.value = _state.value.copy(error = it.message) }
        }
    }
}

private val TABS = listOf("All", "Upcoming", "Completed")

@Composable
fun JobsScreen(onOpenJob: (Long) -> Unit, vm: JobsViewModel = viewModel()) {
    val s by vm.state.collectAsState()
    val context = LocalContext.current
    var tab by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) { vm.load() }

    val filtered = remember(s.jobs, tab) {
        when (tab) {
            1 -> s.jobs.filter { it.status in JobStatus.UPCOMING }
            2 -> s.jobs.filter { it.status in JobStatus.DONE }
            else -> s.jobs
        }
    }

    Column(Modifier.fillMaxSize()) {
        ScrollableTabRow(selectedTabIndex = tab, edgePadding = 16.dp) {
            TABS.forEachIndexed { i, title ->
                Tab(selected = tab == i, onClick = { tab = i }, text = { Text(title) })
            }
        }
        when {
            s.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            filtered.isEmpty() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Text(s.error ?: "No jobs here yet.", color = MutedGrey)
            }
            else -> LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(filtered) { job ->
                    JobCard(
                        job = job,
                        onClick = { onOpenJob(job.id) },
                        onHeadedToSite = { vm.headedToSite(context, job.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun JobCard(job: Job, onClick: () -> Unit, onHeadedToSite: () -> Unit) {
    SmartCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconCircle(ServiceCatalog.icon(job.category), tint = BrandBlue, diameter = 44)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(ServiceCatalog.label(job.category, job.serviceName), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = InkBlack)
                job.requestNo?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MutedGrey) }
            }
            StatusChip(job.status)
        }
        val where = job.customerName ?: job.address
        if (where != null) {
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.LocationOn, null, tint = MutedGrey, modifier = Modifier.height(16.dp))
                Spacer(Modifier.width(4.dp))
                Text(
                    buildString { append(where); job.address?.takeIf { it != where }?.let { append(" · $it") } },
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey,
                )
            }
        }

        val target = parseIsoToMillis(job.scheduledAt)
        if (target != null && job.status in JobStatus.COUNTDOWN) {
            Spacer(Modifier.height(12.dp))
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(BrandBlueLight).padding(12.dp),
            ) {
                Text("Service starts in", style = MaterialTheme.typography.labelSmall, color = BrandBlue, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(6.dp))
                CountdownTimer(target, compact = true)
            }
        }

        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("You earn", style = MaterialTheme.typography.labelSmall, color = MutedGrey)
                Text(money(job.earningsAmount.toString()), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = SuccessGreen)
            }
            if (job.status == JobStatus.BOOKED) {
                Button(onClick = onHeadedToSite) {
                    Icon(Icons.Filled.DirectionsCar, null, modifier = Modifier.height(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Headed to Site")
                }
            }
        }
    }
}
