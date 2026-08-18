package com.spartons.antoniasdriver.ui.jobs

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.spartons.antoniasdriver.data.Job
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.BrandBlueLight
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.SuccessGreenLight
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import com.spartons.antoniasdriver.ui.theme.WarningAmberLight
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

/** "Payment Requested!" confirmation shown right after "Prompt Payment". */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentRequestedScreen(
    bookingId: Long,
    onViewJob: (Long) -> Unit,
    onDone: () -> Unit,
    vm: PaymentJobViewModel = viewModel(),
) {
    LaunchedEffect(bookingId) { vm.load(bookingId) }
    val job by vm.job.collectAsState()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Navy, titleContentColor = Color.White, navigationIconContentColor = Color.White,
                ),
                title = { Text("Payment Requested", fontWeight = FontWeight.SemiBold) },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            )
        },
    ) { pad ->
        Column(
            Modifier.padding(pad).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(16.dp))
            Box(
                Modifier.size(96.dp).clip(CircleShape).background(SuccessGreen.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Box(Modifier.size(64.dp).clip(CircleShape).background(SuccessGreen), contentAlignment = Alignment.Center) {
                    Icon(Icons.AutoMirrored.Filled.Send, null, tint = Color.White, modifier = Modifier.size(32.dp))
                }
            }
            Spacer(Modifier.height(18.dp))
            Text("Payment Requested!", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center)
            Spacer(Modifier.height(6.dp))
            Text("Proforma invoices have been generated automatically.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            Spacer(Modifier.height(20.dp))

            // What happens next
            Surface(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = SuccessGreenLight,
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("What happens next?", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = InkBlack)
                    Spacer(Modifier.height(12.dp))
                    NextIcon(Icons.Filled.ReceiptLong, BrandBlue, "The customer will receive an invoice for ${money(job?.feeAmount)}.")
                    Spacer(Modifier.height(12.dp))
                    NextIcon(Icons.Filled.CheckCircle, SuccessGreen, "Once the customer pays, the job will be confirmed.")
                    Spacer(Modifier.height(12.dp))
                    NextIcon(Icons.Filled.Schedule, WarningAmber, "A countdown to the service date will begin.")
                }
            }
            Spacer(Modifier.height(16.dp))

            // Invoice summary
            job?.let { b ->
                Surface(
                    Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Invoice Summary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(Modifier.height(12.dp))
                        InvoiceLine("Proforma invoice from you to Smart Drill (90%)", money(b.earningsAmount.toString()), SuccessGreen)
                        Spacer(Modifier.height(10.dp))
                        InvoiceLine("Proforma invoice from Smart Drill to Customer (100%)", money(b.feeAmount), MaterialTheme.colorScheme.onSurface)
                    }
                }
                Spacer(Modifier.height(20.dp))
            }

            OutlinedButton(
                onClick = { onViewJob(bookingId) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, BrandBlue),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandBlue),
            ) { Text("View Job Details", fontWeight = FontWeight.SemiBold) }
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = onDone,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
            ) { Text("Back to Jobs", fontWeight = FontWeight.SemiBold) }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun NextIcon(icon: ImageVector, tint: Color, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(CircleShape).background(tint.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = InkBlack, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun InvoiceLine(label: String, amount: String, amountColor: Color) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(10.dp))
        Text(amount, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = amountColor)
    }
}
