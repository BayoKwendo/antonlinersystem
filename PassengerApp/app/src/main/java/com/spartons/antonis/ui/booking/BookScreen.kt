package com.spartons.antonis.ui.booking

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antonis.ServiceLocator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BookViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    data class S(val address: String = "", val loading: Boolean = false, val error: String? = null, val bookingId: Long? = null)
    private val _s = MutableStateFlow(S())
    val s = _s.asStateFlow()

    fun setAddress(v: String) { _s.value = _s.value.copy(address = v) }

    fun book(providerId: Long) {
        _s.value = _s.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.createBooking(providerId, _s.value.address.ifBlank { null }, null, null) }
                .onSuccess { _s.value = _s.value.copy(loading = false, bookingId = it.id) }
                .onFailure { _s.value = _s.value.copy(loading = false, error = it.message) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookScreen(providerId: Long, onBooked: (Long) -> Unit, onBack: () -> Unit, vm: BookViewModel = viewModel()) {
    val s by vm.s.collectAsState()
    LaunchedEffect(s.bookingId) { s.bookingId?.let(onBooked) }

    Scaffold(topBar = { TopAppBar(title = { Text("Confirm booking") }, navigationIcon = { TextButton(onClick = onBack) { Text("Back") } }) }) { pad ->
        Column(Modifier.padding(pad).padding(20.dp).fillMaxSize()) {
            Text("You're booking this provider. A deposit (40% of the price) confirms the job; you'll pay it by M-Pesa on the next screen.", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = s.address, onValueChange = vm::setAddress,
                label = { Text("Site address / directions (optional)") },
                modifier = Modifier.fillMaxWidth(), minLines = 2,
            )
            Spacer(Modifier.height(20.dp))
            Button(onClick = { vm.book(providerId) }, enabled = !s.loading, modifier = Modifier.fillMaxWidth()) {
                Text(if (s.loading) "Creating..." else "Confirm booking")
            }
            s.error?.let { Spacer(Modifier.height(12.dp)); Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }
}
