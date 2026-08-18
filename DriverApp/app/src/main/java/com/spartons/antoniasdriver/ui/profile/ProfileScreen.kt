package com.spartons.antoniasdriver.ui.profile

import android.content.Context
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
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.DriverLocationService
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.ProviderDashboard
import com.spartons.antoniasdriver.data.ProviderService
import com.spartons.antoniasdriver.ui.components.IconCircle
import com.spartons.antoniasdriver.ui.components.MiniHeading
import com.spartons.antoniasdriver.ui.components.Pill
import com.spartons.antoniasdriver.ui.components.ReadinessRow
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.initials
import com.spartons.antoniasdriver.ui.titleCase
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.DangerRed
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ProfileViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _dashboard = MutableStateFlow<ProviderDashboard?>(null)
    val dashboard = _dashboard.asStateFlow()

    fun load() {
        viewModelScope.launch { runCatching { repo.dashboard() }.onSuccess { _dashboard.value = it } }
    }

    fun logout(context: Context, after: () -> Unit) {
        viewModelScope.launch {
            DriverLocationService.stop(context)
            ServiceLocator.activeBookingId = null
            repo.logout()
            after()
        }
    }
}

@Composable
fun ProfileScreen(onLoggedOut: () -> Unit, vm: ProfileViewModel = viewModel()) {
    val d by vm.dashboard.collectAsState()
    val context = LocalContext.current
    LaunchedEffect(Unit) { vm.load() }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        IdentityCard(d)
        Spacer(Modifier.height(16.dp))

        SmartCard {
            MiniHeading("MY SERVICES")
            Spacer(Modifier.height(8.dp))
            val services = d?.services.orEmpty()
            if (services.isEmpty()) {
                Text("No services registered.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                services.forEachIndexed { i, svc ->
                    if (i > 0) Spacer(Modifier.height(10.dp))
                    ServiceIdRow(svc)
                }
            }
        }
        Spacer(Modifier.height(16.dp))

        SmartCard {
            MiniHeading("VERIFICATION")
            Spacer(Modifier.height(8.dp))
            val r = d?.readiness
            ReadinessRow("Profile complete", r?.profileComplete == true)
            ReadinessRow("Statutory documents verified", r?.documentsVerified == true)
            ReadinessRow("Bank details verified", r?.bankVerified == true)
            ReadinessRow("Accepting new requests", r?.acceptingRequests == true)
        }
        Spacer(Modifier.height(16.dp))

        SmartCard {
            MiniHeading("CONTACT")
            Spacer(Modifier.height(8.dp))
            ContactRow(Icons.Filled.Phone, d?.phone ?: "—")
            Spacer(Modifier.height(8.dp))
            ContactRow(Icons.Filled.VerifiedUser, "Status · ${titleCase(d?.verificationStatus ?: "pending")}")
        }
        Spacer(Modifier.height(24.dp))

        OutlinedButton(
            onClick = { vm.logout(context, onLoggedOut) },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerRed),
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, null); Spacer(Modifier.width(8.dp)); Text("Log out")
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun IdentityCard(d: ProviderDashboard?) {
    SmartCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(56.dp).clip(CircleShape).background(Navy),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    initials(d?.businessName ?: d?.name),
                    color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(d?.businessName ?: d?.name ?: "Service Provider", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                d?.name?.takeIf { it != d.businessName }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                val accepting = d?.acceptingRequests == true
                Spacer(Modifier.height(6.dp))
                Pill(if (accepting) "Accepting Requests" else "Paused", if (accepting) SuccessGreen else WarningAmber)
            }
        }
    }
}

@Composable
private fun ServiceIdRow(svc: ProviderService) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconCircle(ServiceCatalog.icon(svc.key), tint = BrandBlue, diameter = 38)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(ServiceCatalog.label(svc.key, svc.name), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
            Text(svc.code ?: "Awaiting verification", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Pill(if (svc.active) "Active" else "Pending", if (svc.active) SuccessGreen else WarningAmber)
    }
}

@Composable
private fun ContactRow(icon: ImageVector, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Text(value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
    }
}
