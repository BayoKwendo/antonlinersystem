package com.spartons.antoniasdriver.ui.home

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AssignmentTurnedIn
import androidx.compose.material.icons.filled.BusinessCenter
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.PersonAddAlt1
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.EarningsTotals
import com.spartons.antoniasdriver.data.ProviderDashboard
import com.spartons.antoniasdriver.data.ProviderKpi
import com.spartons.antoniasdriver.data.ProviderMetrics
import com.spartons.antoniasdriver.data.ProviderReadiness
import com.spartons.antoniasdriver.data.ProviderService
import com.spartons.antoniasdriver.ui.components.IconCircle
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.HairlineGrey
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.InkOnTint
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.MutedOnTint
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.SuccessGreenLight
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private val Purple = Color(0xFF7C4DFF)

data class DashboardState(
    val loading: Boolean = true,
    val dashboard: ProviderDashboard? = null,
    val kpi: ProviderKpi? = null,
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
                .onSuccess { d ->
                    val kpi = runCatching { repo.providerKpi() }.getOrNull()
                    _state.value = _state.value.copy(loading = false, dashboard = d, accepting = d.acceptingRequests, kpi = kpi)
                }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

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
        GreetingRow(d, s.accepting)
        Spacer(Modifier.height(16.dp))

        when {
            s.loading && d == null -> Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            d == null -> Card { Text(s.error ?: "Could not load your dashboard.", color = MutedGrey) }
            else -> {
                MetricsRow(d.metrics)
                Spacer(Modifier.height(20.dp))
                MyServices(d.services, onSeeAll = onSeeAllServices)
                Spacer(Modifier.height(16.dp))
                AcceptingCard(accepting = s.accepting, onToggle = vm::setAccepting)
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    EarningsCard(d.earnings, onSeeEarnings, Modifier.weight(1f))
                    ReadinessCard(d.readiness, Modifier.weight(1f))
                }
                Spacer(Modifier.height(16.dp))
                PerformanceCard(d.metrics)
                s.kpi?.let {
                    Spacer(Modifier.height(16.dp))
                    KpiCard(it)
                }
                if ((d.metrics?.activeRequests ?: 0) == 0) {
                    Spacer(Modifier.height(16.dp))
                    CaughtUpCard()
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

// ---------------------------------------------------------------------------
@Composable
private fun Card(content: @Composable () -> Unit) {
    Surface(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) { Box(Modifier.padding(16.dp)) { content() } }
}

@Composable
private fun GreetingRow(d: ProviderDashboard?, accepting: Boolean) {
    Row(verticalAlignment = Alignment.Top) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${greeting()}, ", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = InkBlack)
                Text(firstName(d?.name), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = BrandBlue)
                Text("  👋", style = MaterialTheme.typography.titleLarge)
            }
            Text(d?.businessName ?: d?.name ?: "Service Provider", style = MaterialTheme.typography.bodyLarge, color = InkBlack)
        }
        AvailabilityBadge(accepting)
    }
}

@Composable
private fun AvailabilityBadge(accepting: Boolean) {
    val tint = if (accepting) SuccessGreen else MutedGrey
    Column(
        Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (accepting) SuccessGreenLight else HairlineGrey.copy(alpha = 0.5f))
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(tint))
            Spacer(Modifier.width(6.dp))
            Text(if (accepting) "Available" else "Paused", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = tint)
        }
        Text(if (accepting) "for New Requests" else "Not accepting", style = MaterialTheme.typography.labelSmall, color = tint)
    }
}

@Composable
private fun MetricsRow(m: ProviderMetrics?) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        MetricCell(Icons.Filled.BusinessCenter, (m?.servicesRegistered ?: 0).toString(), "Services Registered", BrandBlue, Modifier.weight(1f))
        MetricCell(Icons.Filled.Description, (m?.activeRequests ?: 0).toString(), "Active Requests", Purple, Modifier.weight(1f))
        MetricCell(Icons.Filled.CheckCircle, (m?.completedJobs ?: 0).toString(), "Completed Jobs", SuccessGreen, Modifier.weight(1f))
        MetricCell(Icons.Filled.Star, ratingText(m?.averageRating), "Average Rating", WarningAmber, Modifier.weight(1f))
    }
}

@Composable
private fun MetricCell(icon: ImageVector, value: String, label: String, tint: Color, modifier: Modifier) {
    Surface(
        modifier,
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) {
        Column(Modifier.padding(horizontal = 8.dp, vertical = 10.dp)) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(20.dp))
            Spacer(Modifier.height(6.dp))
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = InkBlack)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey, maxLines = 2)
        }
    }
}

@Composable
private fun MyServices(services: List<ProviderService>, onSeeAll: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text("My Services", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = InkBlack)
        Text("View All  ›", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = BrandBlue, modifier = Modifier.clickable(onClick = onSeeAll))
    }
    Spacer(Modifier.height(12.dp))
    if (services.isEmpty()) {
        Card { Text("No services registered yet.", color = MutedGrey) }
    } else {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(horizontal = 0.dp)) {
            items(services) { svc -> ServiceCard(svc) }
        }
    }
}

@Composable
private fun ServiceCard(svc: ProviderService) {
    Surface(
        Modifier.width(158.dp),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) {
        Column(Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            IconCircle(ServiceCatalog.icon(svc.key), tint = MaterialTheme.colorScheme.primary, diameter = 52)
            Spacer(Modifier.height(10.dp))
            Text(
                ServiceCatalog.label(svc.key, svc.name),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                textAlign = TextAlign.Center,
                maxLines = 2,
            )
            Spacer(Modifier.height(8.dp))
            Box(
                Modifier.clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = 10.dp, vertical = 3.dp),
            ) {
                Text(svc.code ?: "Pending", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = BrandBlue)
            }
            Spacer(Modifier.height(8.dp))
            val active = svc.active
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(7.dp).clip(CircleShape).background(if (active) SuccessGreen else MutedGrey))
                Spacer(Modifier.width(5.dp))
                Text(if (active) "Active" else "Pending", style = MaterialTheme.typography.labelSmall, color = if (active) SuccessGreen else MutedGrey)
            }
        }
    }
}

@Composable
private fun AcceptingCard(accepting: Boolean, onToggle: (Boolean) -> Unit) {
    Card {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)).background(SuccessGreenLight),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.PersonAddAlt1, null, tint = SuccessGreen, modifier = Modifier.size(24.dp)) }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Accepting New Requests", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkBlack)
                Text("When turned on, you will receive new service requests", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
            }
            Spacer(Modifier.width(8.dp))
            Switch(
                checked = accepting,
                onCheckedChange = onToggle,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = SuccessGreen,
                ),
            )
        }
    }
}

@Composable
private fun EarningsCard(e: EarningsTotals?, onSeeEarnings: () -> Unit, modifier: Modifier) {
    Surface(
        modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.AccountBalanceWallet, null, tint = SuccessGreen, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Earnings Snapshot", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkBlack)
            }
            Spacer(Modifier.height(12.dp))
            EarningLine("This Month", money(e?.thisMonth), SuccessGreen)
            Spacer(Modifier.height(8.dp)); HorizontalDivider(color = HairlineGrey); Spacer(Modifier.height(8.dp))
            EarningLine("Lifetime Earnings", money(e?.lifetime), SuccessGreen)
            Spacer(Modifier.height(8.dp)); HorizontalDivider(color = HairlineGrey); Spacer(Modifier.height(8.dp))
            EarningLine("Pending Payments", money(e?.pending), WarningAmber)
            Spacer(Modifier.height(12.dp))
            Text(
                "View Earnings  ›",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = SuccessGreen,
                modifier = Modifier.align(Alignment.End).clickable(onClick = onSeeEarnings),
            )
        }
    }
}

@Composable
private fun EarningLine(label: String, value: String, valueColor: Color) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey)
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = valueColor)
    }
}

@Composable
private fun ReadinessCard(r: ProviderReadiness?, modifier: Modifier) {
    Surface(
        modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Shield, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Provider Readiness", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkBlack, modifier = Modifier.weight(1f))
                Icon(Icons.Outlined.Info, null, tint = MutedGrey, modifier = Modifier.size(15.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text("${r?.percent ?: 0}%", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = SuccessGreen)
            Text(if (r?.ready == true) "Ready to Receive Jobs" else "Complete verification", style = MaterialTheme.typography.bodySmall, color = InkBlack)
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { (r?.percent ?: 0) / 100f },
                modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(50)),
                color = SuccessGreen,
            )
            Spacer(Modifier.height(12.dp))
            CheckRow("Profile Complete", r?.profileComplete == true)
            CheckRow("Statutory Documents Verified", r?.documentsVerified == true)
            CheckRow("Accreditation Valid", r?.documentsVerified == true)
            CheckRow("Bank Details Verified", r?.bankVerified == true)
            CheckRow("Accepting New Requests", r?.acceptingRequests == true)
        }
    }
}

@Composable
private fun CheckRow(label: String, done: Boolean) {
    Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(
            if (done) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
            null,
            tint = if (done) SuccessGreen else MutedGrey,
            modifier = Modifier.size(16.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = if (done) InkBlack else MutedGrey)
    }
}

@Composable
private fun PerformanceCard(m: ProviderMetrics?) {
    Surface(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) {
        Column {
            Row(
                Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Performance Overview", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkOnTint)
            }
            Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PerfStat(Icons.Filled.Star, ratingText(m?.averageRating), "Customer Rating", WarningAmber, Modifier.weight(1f))
                PerfStat(Icons.Filled.BusinessCenter, (m?.completedJobs ?: 0).toString(), "Jobs Completed", SuccessGreen, Modifier.weight(1f))
                PerfStat(Icons.Filled.TrackChanges, "—", "Completion Rate", Purple, Modifier.weight(1f))
                PerfStat(Icons.Filled.ThumbUp, "—", "Customer Satisfaction", WarningAmber, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun PerfStat(icon: ImageVector, value: String, label: String, tint: Color, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.height(4.dp))
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = InkBlack)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey, textAlign = TextAlign.Center, maxLines = 2)
    }
}

/** The provider's automatic KPI rating, with the factors that make it up (transparent). */
@Composable
private fun KpiCard(kpi: ProviderKpi) {
    val sm = kpi.summary
    if (sm == null || sm.jobs == 0) return
    Surface(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) {
        Column {
            Row(
                Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Star, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("My Performance Rating", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkOnTint)
                Spacer(Modifier.weight(1f))
                Text("${sm.kpiAvg ?: "—"} / 100", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
            Column(Modifier.padding(14.dp)) {
                Text(
                    "Based on ${sm.jobs} rated ${if (sm.jobs == 1) "job" else "jobs"} — quicker acceptance, contact, on-time arrival and completion raise your score.",
                    style = MaterialTheme.typography.labelSmall, color = MutedGrey,
                )
                Spacer(Modifier.height(10.dp))
                KpiBar("Job acceptance speed", sm.acceptance, kpi.weights.acceptance)
                KpiBar("Customer contact speed", sm.contact, kpi.weights.contact)
                KpiBar("Arrival on time", sm.arrival, kpi.weights.arrival)
                KpiBar("Job completion time", sm.completion, kpi.weights.completion)
                KpiBar("Customer feedback", sm.feedback, kpi.weights.feedback)
            }
        }
    }
}

@Composable
private fun KpiBar(label: String, pct: String?, weight: Int) {
    val value = ((pct?.toFloatOrNull() ?: 0f) / 100f).coerceIn(0f, 1f)
    Column(Modifier.padding(vertical = 5.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("$label ($weight%)", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
            Text("${pct ?: "—"}%", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = InkBlack)
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { value },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(50)),
            color = BrandBlue,
            trackColor = HairlineGrey,
        )
    }
}

@Composable
private fun CaughtUpCard() {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.primaryContainer).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(72.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface),
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Filled.AssignmentTurnedIn, null, tint = BrandBlue, modifier = Modifier.size(40.dp)) }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text("You're all caught up!", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = InkOnTint)
            Spacer(Modifier.height(4.dp))
            Text(
                "There are currently no customer requests assigned to you. We'll notify you immediately when a new request matching your approved services becomes available.",
                style = MaterialTheme.typography.bodySmall,
                color = MutedOnTint,
            )
        }
    }
}

// ---------------------------------------------------------------------------
private fun firstName(name: String?): String =
    name?.trim()?.split(Regex("\\s+"))?.firstOrNull()?.takeIf { it.isNotBlank() } ?: "there"

private fun greeting(): String {
    val h = runCatching { java.time.LocalTime.now().hour }.getOrDefault(9)
    return when {
        h < 12 -> "Good Morning"
        h < 17 -> "Good Afternoon"
        else -> "Good Evening"
    }
}

private fun ratingText(v: Double?): String =
    if (v == null || v <= 0.0) "—" else if (v % 1.0 == 0.0) v.toInt().toString() else "%.1f".format(v)
