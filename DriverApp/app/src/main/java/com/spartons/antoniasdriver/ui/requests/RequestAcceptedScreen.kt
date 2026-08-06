package com.spartons.antoniasdriver.ui.requests

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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.Job
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.HairlineGrey
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.SuccessGreenLight
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

/** "Request Successfully Accepted!" confirmation shown right after accepting. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestAcceptedScreen(
    bookingId: Long,
    onViewJob: (Long) -> Unit,
    onDone: () -> Unit,
    vm: BookingLoaderViewModel = viewModel(),
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
                title = { Text("Request Accepted", fontWeight = FontWeight.SemiBold) },
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
                    Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(36.dp))
                }
            }
            Spacer(Modifier.height(18.dp))
            Text("Request Successfully Accepted!", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = InkBlack, textAlign = TextAlign.Center)
            Spacer(Modifier.height(6.dp))
            Text("You have been matched with this customer.", style = MaterialTheme.typography.bodyMedium, color = MutedGrey, textAlign = TextAlign.Center)
            Spacer(Modifier.height(20.dp))

            // Matched card
            Card {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    job?.requestNo?.let {
                        Column {
                            Text("Request ID", style = MaterialTheme.typography.labelSmall, color = MutedGrey)
                            Text(it, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = InkBlack)
                        }
                    }
                    Box(Modifier.clip(RoundedCornerShape(50)).background(SuccessGreenLight).padding(horizontal = 12.dp, vertical = 4.dp)) {
                        Text("Matched", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = SuccessGreen)
                    }
                }
                Spacer(Modifier.height(12.dp))
                InfoLine(Icons.Filled.Person, "Customer", job?.customerName ?: "—")
                Spacer(Modifier.height(8.dp))
                InfoLine(Icons.Filled.LocationOn, "Location", job?.address ?: "Shared on map")
            }
            Spacer(Modifier.height(16.dp))

            // What's Next
            Card {
                Text("What's Next?", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = InkBlack)
                Spacer(Modifier.height(12.dp))
                NextStep(done = true, index = 1, text = "You accepted the request", last = false)
                NextStep(done = false, index = 2, text = "Contact the customer to discuss details and confirm the service", last = false)
                NextStep(done = false, index = 3, text = "Prompt payment to start the confirmation process", last = true)
            }
            Spacer(Modifier.height(20.dp))

            Button(
                onClick = { onViewJob(bookingId) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
            ) { Text("View Customer Details", fontWeight = FontWeight.SemiBold) }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun Card(content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    Surface(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, HairlineGrey),
    ) { Column(Modifier.padding(16.dp), content = content) }
}

@Composable
private fun InfoLine(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = BrandBlue, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MutedGrey)
            Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = InkBlack)
        }
    }
}

@Composable
private fun NextStep(done: Boolean, index: Int, text: String, last: Boolean) {
    Row {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                Modifier.size(26.dp).clip(CircleShape).background(if (done) SuccessGreen else BrandBlue),
                contentAlignment = Alignment.Center,
            ) {
                if (done) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                else Text("$index", color = Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            }
            if (!last) Box(Modifier.width(2.dp).height(28.dp).background(HairlineGrey))
        }
        Spacer(Modifier.width(12.dp))
        Text(
            text,
            style = MaterialTheme.typography.bodyMedium,
            color = InkBlack,
            modifier = Modifier.padding(top = 3.dp, bottom = if (last) 0.dp else 12.dp),
        )
    }
}
