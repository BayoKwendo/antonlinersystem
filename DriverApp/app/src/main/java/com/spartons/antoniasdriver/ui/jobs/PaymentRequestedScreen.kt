package com.spartons.antoniasdriver.ui.jobs

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.Job
import com.spartons.antoniasdriver.ui.components.InfoRow
import com.spartons.antoniasdriver.ui.components.MiniHeading
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PaymentJobViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _job = MutableStateFlow<Job?>(null)
    val job = _job.asStateFlow()

    fun load(id: Long) {
        viewModelScope.launch { runCatching { repo.myJob(id) }.onSuccess { _job.value = it } }
    }
}

/** Confirmation shown right after "Prompt Payment": proformas generated, awaiting payment. */
@Composable
fun PaymentRequestedScreen(
    bookingId: Long,
    onViewJob: (Long) -> Unit,
    onDone: () -> Unit,
    vm: PaymentJobViewModel = viewModel(),
) {
    LaunchedEffect(bookingId) { vm.load(bookingId) }
    val job by vm.job.collectAsState()

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))
        Box(
            Modifier.size(96.dp).clip(CircleShape).background(WarningAmber.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                Modifier.size(64.dp).clip(CircleShape).background(WarningAmber),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.HourglassTop, null, tint = Color.White, modifier = Modifier.size(34.dp)) }
        }
        Spacer(Modifier.height(20.dp))
        Text("Payment Requested", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = InkBlack)
        Text(
            "Proforma invoices have been generated. The customer has been asked to pay SmartDrill to confirm the booking.",
            style = MaterialTheme.typography.bodyMedium,
            color = MutedGrey,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp, start = 8.dp, end = 8.dp),
        )
        Spacer(Modifier.height(24.dp))

        job?.let { b ->
            SmartCard {
                MiniHeading("INVOICE SUMMARY")
                Spacer(Modifier.height(8.dp))
                InfoRow("Customer invoice (100%)", money(b.feeAmount))
                InfoRow("Your proforma to SmartDrill (90%)", money(b.earningsAmount.toString()), valueColor = SuccessGreen, valueWeight = FontWeight.Bold)
                InfoRow("SmartDrill commission (10%)", money(b.commissionAmount.toString()), valueColor = MutedGrey)
            }
            Spacer(Modifier.height(24.dp))
        }

        Button(onClick = { onViewJob(bookingId) }, modifier = Modifier.fillMaxWidth()) { Text("View Job Details") }
        Spacer(Modifier.height(10.dp))
        OutlinedButton(onClick = onDone, modifier = Modifier.fillMaxWidth()) { Text("Back to Jobs") }
        Spacer(Modifier.height(24.dp))
    }
}
