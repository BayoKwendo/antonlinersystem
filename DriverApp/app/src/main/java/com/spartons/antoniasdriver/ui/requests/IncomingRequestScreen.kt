package com.spartons.antoniasdriver.ui.requests

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
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.data.Job
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.dial
import com.spartons.antoniasdriver.ui.money
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen

/**
 * Full-screen alert shown when a new broadcast request push lands. Quick triage:
 * Call (if available), Decline, or Review & Accept (opens the detail screen to
 * propose availability).
 */
@Composable
fun IncomingRequestScreen(
    requestId: Long,
    onReview: (Long) -> Unit,
    onDismiss: () -> Unit,
    vm: RequestDetailViewModel = viewModel(),
) {
    val s by vm.state.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(requestId) { vm.load(requestId) }
    LaunchedEffect(s.declined) { if (s.declined) onDismiss() }

    Box(Modifier.fillMaxSize().background(Navy)) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(24.dp))
            Box(
                Modifier.size(84.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.NotificationsActive, null, tint = Color.White, modifier = Modifier.size(40.dp))
            }
            Spacer(Modifier.height(16.dp))
            Text("New Service Request", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
            Text("Respond quickly — the first to accept secures the job.", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.75f))
            Spacer(Modifier.height(24.dp))

            val job = s.job
            if (s.loading && job == null) {
                CircularProgressIndicator(color = Color.White)
            } else if (job == null) {
                Text(s.error ?: "Could not load this request.", color = Color.White)
            } else {
                IncomingCard(job)
                Spacer(Modifier.height(20.dp))
                HowItWorks()
            }

            Spacer(Modifier.height(24.dp))
            s.job?.customerPhone?.let { phone ->
                OutlinedButton(
                    onClick = { dial(context, phone) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                ) { Icon(Icons.Filled.Call, null); Spacer(Modifier.width(8.dp)); Text("Call Customer") }
                Spacer(Modifier.height(10.dp))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = { vm.decline(requestId) },
                    enabled = !s.working,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                ) { Text("Decline") }
                Button(
                    onClick = { onReview(requestId) },
                    modifier = Modifier.weight(2f),
                    colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                ) { Text("Review & Accept") }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun IncomingCard(job: Job) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White).padding(18.dp),
    ) {
        Text(ServiceCatalog.label(job.category, job.serviceName), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Navy)
        job.requestNo?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        Spacer(Modifier.height(12.dp))
        AlertRow("Customer", job.customerName ?: "—")
        AlertRow("Location", job.address ?: "Shared on map")
        AlertRow("You earn", money(job.earningsAmount.toString()))
    }
}

@Composable
private fun AlertRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun HowItWorks() {
    Column(Modifier.fillMaxWidth()) {
        Text("How it works", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = Color.White)
        Spacer(Modifier.height(8.dp))
        listOf(
            "Accept and propose your earliest available date.",
            "Customer pays SmartDrill to confirm the booking.",
            "Head to site, deliver, and submit for verification.",
        ).forEachIndexed { i, step ->
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape).background(BrandBlue),
                    contentAlignment = Alignment.Center,
                ) { Text("${i + 1}", color = Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold) }
                Spacer(Modifier.width(10.dp))
                Text(step, style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.85f))
            }
        }
    }
}
