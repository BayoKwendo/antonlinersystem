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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
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
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.prettyDate
import com.spartons.antoniasdriver.ui.prettyTime
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BookingLoaderViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _job = MutableStateFlow<Job?>(null)
    val job = _job.asStateFlow()

    fun load(id: Long) {
        viewModelScope.launch { runCatching { repo.myJob(id) }.onSuccess { _job.value = it } }
    }
}

/** "Matched" confirmation shown right after accepting and proposing availability. */
@Composable
fun RequestAcceptedScreen(
    bookingId: Long,
    onViewJob: (Long) -> Unit,
    onDone: () -> Unit,
    vm: BookingLoaderViewModel = viewModel(),
) {
    LaunchedEffect(bookingId) { vm.load(bookingId) }
    val job by vm.job.collectAsState()

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))
        Box(
            Modifier.size(96.dp).clip(CircleShape).background(SuccessGreen.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                Modifier.size(64.dp).clip(CircleShape).background(SuccessGreen),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(36.dp)) }
        }
        Spacer(Modifier.height(20.dp))
        Text("You're Matched!", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = InkBlack)
        Text(
            "Your availability has been sent to the customer. You'll be notified once they pay to confirm the booking.",
            style = MaterialTheme.typography.bodyMedium,
            color = MutedGrey,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp, start = 8.dp, end = 8.dp),
        )
        Spacer(Modifier.height(24.dp))

        job?.let { b ->
            SmartCard {
                MiniHeading("BOOKING")
                Spacer(Modifier.height(8.dp))
                InfoRow("Service", ServiceCatalog.label(b.category, b.serviceName))
                b.requestNo?.let { InfoRow("Reference", it) }
                b.customerName?.let { InfoRow("Customer", it) }
                prettyDate(b.scheduledAt)?.let { d ->
                    InfoRow("Proposed date", d + (prettyTime(b.scheduledAt)?.let { t -> " · $t" } ?: ""))
                }
            }
            Spacer(Modifier.height(16.dp))
        }

        SmartCard {
            MiniHeading("WHAT'S NEXT")
            Spacer(Modifier.height(8.dp))
            StepLine("1", "Customer reviews your proposed date and pays SmartDrill.")
            StepLine("2", "Once paid, the job is confirmed and a countdown begins.")
            StepLine("3", "Prompt payment, head to site, and deliver the service.")
        }
        Spacer(Modifier.height(24.dp))

        Button(onClick = { onViewJob(bookingId) }, modifier = Modifier.fillMaxWidth()) {
            Text("View Job Details")
        }
        Spacer(Modifier.height(10.dp))
        OutlinedButton(onClick = onDone, modifier = Modifier.fillMaxWidth()) { Text("Back to Home") }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun StepLine(n: String, text: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.Start) {
        Box(
            Modifier.size(22.dp).clip(CircleShape).background(SuccessGreen),
            contentAlignment = Alignment.Center,
        ) { Text(n, color = Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold) }
        Spacer(Modifier.width(10.dp))
        Text(text, style = MaterialTheme.typography.bodySmall, color = InkBlack)
    }
}
