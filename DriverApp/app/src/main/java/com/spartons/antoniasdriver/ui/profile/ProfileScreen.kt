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
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Receipt
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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.DriverLocationService
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.ProviderProfile
import com.spartons.antoniasdriver.data.ProviderService
import com.spartons.antoniasdriver.ui.components.IconCircle
import com.spartons.antoniasdriver.ui.components.MiniHeading
import com.spartons.antoniasdriver.ui.components.Pill
import com.spartons.antoniasdriver.ui.components.ReadinessRow
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.initials
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.DangerRed
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.SuccessGreen
import com.spartons.antoniasdriver.ui.theme.WarningAmber
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ProfileViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _profile = MutableStateFlow<ProviderProfile?>(null)
    val profile = _profile.asStateFlow()

    fun load() {
        viewModelScope.launch { runCatching { repo.me() }.onSuccess { _profile.value = it } }
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
    val p by vm.profile.collectAsState()
    val context = LocalContext.current
    LaunchedEffect(Unit) { vm.load() }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        IdentityCard(p)
        Spacer(Modifier.height(16.dp))

        SmartCard {
            MiniHeading("MY SERVICES")
            Spacer(Modifier.height(8.dp))
            val services = p?.services.orEmpty()
            if (services.isEmpty()) {
                Text("No services registered.", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
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
            val r = p?.readiness
            ReadinessRow("Profile complete", r?.profileComplete == true)
            ReadinessRow("Documents verified", r?.documentsVerified == true)
            ReadinessRow("Accreditation valid", r?.accreditationValid == true)
            ReadinessRow("Bank details verified", r?.bankVerified == true)
        }
        Spacer(Modifier.height(16.dp))

        SmartCard {
            MiniHeading("CONTACT")
            Spacer(Modifier.height(8.dp))
            ContactRow(Icons.Filled.Phone, p?.phone ?: "—")
            Spacer(Modifier.height(8.dp))
            ContactRow(Icons.Filled.Email, p?.email ?: "—")
            Spacer(Modifier.height(8.dp))
            ContactRow(Icons.Filled.Receipt, p?.kraPin?.let { "KRA PIN · $it" } ?: "KRA PIN · —")
        }
        Spacer(Modifier.height(24.dp))

        OutlinedButton(
            onClick = { vm.logout(context, onLoggedOut) },
            modifier = Modifier.fillMaxWidth(),
            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = DangerRed),
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, null); Spacer(Modifier.width(8.dp)); Text("Log out")
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun IdentityCard(p: ProviderProfile?) {
    SmartCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(56.dp).clip(CircleShape).background(Navy),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    initials(p?.businessName ?: p?.displayName),
                    color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(p?.businessName ?: p?.displayName ?: "Service Provider", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = InkBlack)
                p?.displayName?.takeIf { it != p.businessName }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MutedGrey)
                }
                val available = p?.availability == "available"
                Spacer(Modifier.height(6.dp))
                Pill(if (available) "Accepting Requests" else "Paused", if (available) SuccessGreen else WarningAmber)
            }
        }
    }
}

@Composable
private fun ServiceIdRow(svc: ProviderService) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconCircle(ServiceCatalog.icon(svc.code), tint = BrandBlue, diameter = 38)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(ServiceCatalog.label(svc.code, svc.name), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = InkBlack)
            svc.providerId?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MutedGrey) }
        }
        val active = (svc.status ?: "active").equals("active", ignoreCase = true)
        Pill(if (active) "Active" else (svc.status ?: "").replaceFirstChar { it.uppercase() }, if (active) SuccessGreen else WarningAmber)
    }
}

@Composable
private fun ContactRow(icon: androidx.compose.ui.graphics.vector.ImageVector, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = MutedGrey, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Text(value, style = MaterialTheme.typography.bodyMedium, color = InkBlack)
    }
}
