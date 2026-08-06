package com.spartons.antoniasdriver.ui.requests

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.Job
import com.spartons.antoniasdriver.ui.components.IconCircle
import com.spartons.antoniasdriver.ui.components.Pill
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.requirementsText
import com.spartons.antoniasdriver.ui.timeAgo
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RequestsState(
    val loading: Boolean = true,
    val jobs: List<Job> = emptyList(),
    val error: String? = null,
)

class RequestsViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(RequestsState())
    val state = _state.asStateFlow()

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.availableJobs() }
                .onSuccess { _state.value = RequestsState(loading = false, jobs = it) }
                .onFailure { _state.value = RequestsState(loading = false, error = it.message) }
        }
    }
}

@Composable
fun RequestsScreen(onOpenRequest: (Long) -> Unit, vm: RequestsViewModel = viewModel()) {
    val s by vm.state.collectAsState()
    LaunchedEffect(Unit) { vm.load() }

    when {
        s.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        s.jobs.isEmpty() -> EmptyRequests(s.error)
        else -> LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Column {
                    Text("Available Requests", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = InkBlack)
                    Text("Broadcast to every verified provider — first to accept secures the job.", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
                }
            }
            items(s.jobs) { job -> RequestCard(job) { onOpenRequest(job.id) } }
        }
    }
}

@Composable
private fun EmptyRequests(error: String?) {
    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            IconCircle(Icons.Filled.Inbox, tint = BrandBlue, diameter = 64)
            Spacer(Modifier.height(12.dp))
            Text(
                "You're all caught up",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = InkBlack,
            )
            Text(
                error ?: "No new requests right now. We'll notify you the moment one lands.",
                style = MaterialTheme.typography.bodyMedium,
                color = MutedGrey,
            )
        }
    }
}

@Composable
fun RequestCard(job: Job, onClick: () -> Unit) {
    SmartCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconCircle(ServiceCatalog.icon(job.category), tint = BrandBlue, diameter = 44)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    ServiceCatalog.label(job.category, job.serviceName),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = InkBlack,
                )
                job.requestNo?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MutedGrey) }
            }
            Pill("New Request", BrandBlue)
        }
        val where = job.address ?: job.customerName
        if (where != null) {
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.LocationOn, null, tint = MutedGrey, modifier = Modifier.height(16.dp))
                Spacer(Modifier.width(4.dp))
                Text(where, style = MaterialTheme.typography.bodySmall, color = MutedGrey)
            }
        }
        requirementsText(job.details)?.let {
            Spacer(Modifier.height(6.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = InkBlack, maxLines = 2)
        }
        Spacer(Modifier.height(10.dp))
        HorizontalDivider()
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("You earn", style = MaterialTheme.typography.labelSmall, color = MutedGrey)
                Text(money(job.earningsAmount.toString()), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = SuccessGreen)
            }
            Text(timeAgo(job.createdAt), style = MaterialTheme.typography.labelSmall, color = MutedGrey)
        }
    }
}
