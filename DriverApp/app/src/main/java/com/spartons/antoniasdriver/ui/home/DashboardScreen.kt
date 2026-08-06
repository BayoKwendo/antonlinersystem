package com.spartons.antoniasdriver.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AssignmentTurnedIn
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.EarningsTotals
import com.spartons.antoniasdriver.data.ProviderDashboard
import com.spartons.antoniasdriver.data.ProviderMetrics
import com.spartons.antoniasdriver.data.ProviderReadiness
import com.spartons.antoniasdriver.data.ProviderService
import com.spartons.antoniasdriver.ui.components.IconCircle
import com.spartons.antoniasdriver.ui.components.InfoRow
import com.spartons.antoniasdriver.ui.components.MetricTile
import com.spartons.antoniasdriver.ui.components.MiniHeading
import com.spartons.antoniasdriver.ui.components.Pill
import com.spartons.antoniasdriver.ui.components.ReadinessRow
import com.spartons.antoniasdriver.ui.components.SectionHeader
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.initials
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.SuccessGreenLight
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardState(
    val loading: Boolean = true,
    val dashboard: ProviderDashboard? = null,
    val accepting: Boolean = false,
    val error: String? = null,
)

class DashboardViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(DashboardState())
    val state = _state.asStateFlow()

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.dashboard() }
                .onSuccess { _state.value = _state.value.copy(loading = false, dashboard = it, accepting = it.acceptingRequests) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

    /** "Accepting New Requests" toggle — availability only; live tracking is decoupled. */
    fun setAccepting(accepting: Boolean) {
        _state.value = _state.value.copy(accepting = accepting)
        viewModelScope.launch {
            runCatching { repo.setOnline(accepting) }
                .onFailure { _state.value = _state.value.copy(accepting = !accepting, error = it.message) }
        }
    }

    fun registerPush() = com.spartons.antoniasdriver.messaging.Fcm.register(viewModelScope)
}

@Composable
fun DashboardScreen(
    onSeeAllServices: () -> Unit = {},
    onSeeEarnings: () -> Unit = {},
    vm: DashboardViewModel = viewModel(),
) {
    val s by vm.state.collectAsState()
    LaunchedEffect(Unit) { vm.load(); vm.registerPush() }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        val d = s.dashboard
        GreetingHeader(d, s.accepting)
        Spacer(Modifier.height(16.dp))

        when {
            s.loading && d == null -> Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            d == null -> SmartCard { Text(s.error ?: "Could not load your dashboard.", color = MutedGrey) }
            else -> {
                MetricsRow(d.metrics)
                Spacer(Modifier.height(16.dp))
                MyServicesCard(d.services, onSeeAll = onSeeAllServices)
                Spacer(Modifier.height(16.dp))
                AcceptingCard(accepting = s.accepting, onToggle = vm::setAccepting)
                Spacer(Modifier.height(16.dp))
                EarningsSnapshotCard(d.earnings, onSeeEarnings)
                Spacer(Modifier.height(16.dp))
                ReadinessCard(d.readiness)
                Spacer(Modifier.height(16.dp))
                PerformanceCard(d.metrics)
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun GreetingHeader(d: ProviderDashboard?, accepting: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(48.dp).clip(CircleShape).background(Navy),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                initials(d?.businessName ?: d?.name),
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Good day", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
            Text(
                d?.name ?: "Service Provider",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = InkBlack,
            )
            d?.businessName?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MutedGrey) }
        }
        Pill(if (accepting) "Available" else "Paused", if (accepting) SuccessGreen else WarningAmber)
    }
}

@Composable
private fun MetricsRow(m: ProviderMetrics?) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        MetricTile(Icons.Filled.WorkspacePremium, (m?.servicesRegistered ?: 0).toString(), "Services", BrandBlue)
        MetricTile(Icons.Filled.Inbox, (m?.activeRequests ?: 0).toString(), "Active", WarningAmber)
    }
    Spacer(Modifier.height(12.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        MetricTile(Icons.Filled.AssignmentTurnedIn, (m?.completedJobs ?: 0).toString(), "Completed", SuccessGreen)
        MetricTile(Icons.Filled.Star, ratingText(m?.averageRating), "Avg Rating", Navy)
    }
}

@Composable
private fun AcceptingCard(accepting: Boolean, onToggle: (Boolean) -> Unit) {
    SmartCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Accepting New Requests", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = InkBlack)
                Text(
                    if (accepting) "You'll receive new broadcast requests." else "You're paused — no new requests.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey,
                )
            }
            Switch(checked = accepting, onCheckedChange = onToggle)
        }
    }
}

@Composable
private fun MyServicesCard(services: List<ProviderService>, onSeeAll: () -> Unit) {
    SmartCard {
        SectionHeader("My Services", action = {
            if (services.size > 3) TextButton(onClick = onSeeAll) { Text("View All") }
        })
        Spacer(Modifier.height(8.dp))
        if (services.isEmpty()) {
            Text("No services registered yet.", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
        } else {
            services.take(4).forEachIndexed { i, svc ->
                if (i > 0) Spacer(Modifier.height(10.dp))
                ServiceRow(svc)
            }
        }
    }
}

@Composable
private fun ServiceRow(svc: ProviderService) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconCircle(icon = ServiceCatalog.icon(svc.key), tint = BrandBlue, diameter = 40)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                ServiceCatalog.label(svc.key, svc.name),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = InkBlack,
            )
            Text(
                svc.code ?: "Awaiting verification",
                style = MaterialTheme.typography.labelSmall,
                color = MutedGrey,
            )
        }
        Pill(
            if (svc.active) "Active" else "Pending",
            if (svc.active) SuccessGreen else WarningAmber,
        )
    }
}

@Composable
private fun EarningsSnapshotCard(e: EarningsTotals?, onSeeEarnings: () -> Unit) {
    SmartCard {
        SectionHeader("Earnings Snapshot", action = {
            TextButton(onClick = onSeeEarnings) { Text("Details") }
        })
        Spacer(Modifier.height(8.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SuccessGreenLight).padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            EarningStat("This Month", money(e?.thisMonth))
            EarningStat("Lifetime", money(e?.lifetime))
            EarningStat("Pending", money(e?.pending))
        }
    }
}

@Composable
private fun EarningStat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.Start) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey)
        Text(value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = SuccessGreen)
    }
}

@Composable
private fun ReadinessCard(r: ProviderReadiness?) {
    SmartCard {
        SectionHeader("Provider Readiness", action = {
            Text("${r?.percent ?: 0}%", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = BrandBlue)
        })
        Spacer(Modifier.height(4.dp))
        Text(
            if (r?.ready == true) "Ready to Receive Jobs" else "Complete verification to receive jobs",
            style = MaterialTheme.typography.bodySmall,
            color = if (r?.ready == true) SuccessGreen else MutedGrey,
        )
        Spacer(Modifier.height(10.dp))
        LinearProgressIndicator(
            progress = { (r?.percent ?: 0) / 100f },
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)),
            color = if (r?.ready == true) SuccessGreen else BrandBlue,
        )
        Spacer(Modifier.height(12.dp))
        ReadinessRow("Profile complete", r?.profileComplete == true)
        ReadinessRow("Statutory documents verified", r?.documentsVerified == true)
        ReadinessRow("Bank details verified", r?.bankVerified == true)
        ReadinessRow("Accepting new requests", r?.acceptingRequests == true)
    }
}

@Composable
private fun PerformanceCard(m: ProviderMetrics?) {
    SmartCard {
        MiniHeading("PERFORMANCE OVERVIEW")
        Spacer(Modifier.height(10.dp))
        InfoRow("Average rating", m?.averageRating?.takeIf { it > 0 }?.let { "${ratingText(it)} / 5" } ?: "—")
        InfoRow("Completed jobs", (m?.completedJobs ?: 0).toString())
        InfoRow("Active requests", (m?.activeRequests ?: 0).toString())
        InfoRow("Services registered", (m?.servicesRegistered ?: 0).toString())
    }
}

private fun ratingText(v: Double?): String =
    if (v == null || v <= 0.0) "—" else if (v % 1.0 == 0.0) v.toInt().toString() else "%.1f".format(v)
