package com.spartons.antoniasdriver.ui.earnings

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.spartons.antoniasdriver.data.Payout
import com.spartons.antoniasdriver.ui.components.MiniHeading
import com.spartons.antoniasdriver.ui.components.Pill
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.timeAgo
import com.spartons.antoniasdriver.ui.titleCase
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class EarningsState(
    val loading: Boolean = true,
    val totals: EarningsTotals? = null,
    val payouts: List<Payout> = emptyList(),
    val error: String? = null,
)

class EarningsViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(EarningsState())
    val state = _state.asStateFlow()

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.earnings() }
                .onSuccess { _state.value = EarningsState(loading = false, totals = it.totals, payouts = it.payouts) }
                .onFailure { _state.value = EarningsState(loading = false, error = it.message) }
        }
    }
}

@Composable
fun EarningsScreen(vm: EarningsViewModel = viewModel()) {
    val s by vm.state.collectAsState()
    LaunchedEffect(Unit) { vm.load() }

    if (s.loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Text("Earnings", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface) }
        item { HeroEarnings(s.totals) }
        item { MiniHeading("PAYOUTS", modifier = Modifier.padding(top = 4.dp)) }
        if (s.payouts.isEmpty()) {
            item { Text(s.error ?: "No payouts yet.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else {
            items(s.payouts) { p -> PayoutRow(p) }
        }
    }
}

@Composable
private fun HeroEarnings(e: EarningsTotals?) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Navy).padding(20.dp),
    ) {
        Text("This month", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.7f))
        Text(money(e?.thisMonth), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            HeroStat("Lifetime", money(e?.lifetime))
            HeroStat("Pending", money(e?.pending))
        }
    }
}

@Composable
private fun HeroStat(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.7f))
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Color.White)
    }
}

@Composable
private fun PayoutRow(p: Payout) {
    SmartCard(padding = 14) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    listOfNotNull(p.service, p.kind?.let { titleCase(it) }).joinToString(" · ").ifBlank { "Payout" },
                    style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface,
                )
                Row {
                    p.requestNo?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    p.date?.let { Text("  ·  ${timeAgo(it)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(money(p.amount), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                val paid = (p.status ?: "").equals("paid", ignoreCase = true) || (p.status ?: "").equals("released", ignoreCase = true)
                Spacer(Modifier.height(2.dp))
                Pill(
                    (p.status ?: "pending").replaceFirstChar { it.uppercase() },
                    if (paid) SuccessGreen else WarningAmber,
                )
            }
        }
    }
}
