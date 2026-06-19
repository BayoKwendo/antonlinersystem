package com.spartons.antonis.ui.booking

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antonis.ServiceLocator
import com.spartons.antonis.data.Booking
import com.spartons.antonis.ui.LoadingBox
import com.spartons.antonis.ui.MessageBox
import com.spartons.antonis.ui.money
import com.spartons.antonis.ui.titleCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BookingsViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    data class S(val loading: Boolean = true, val items: List<Booking> = emptyList(), val error: String? = null)
    private val _s = MutableStateFlow(S())
    val s = _s.asStateFlow()
    init { reload() }
    fun reload() {
        _s.value = _s.value.copy(loading = true)
        viewModelScope.launch {
            runCatching { repo.bookings() }
                .onSuccess { _s.value = S(loading = false, items = it) }
                .onFailure { _s.value = S(loading = false, error = it.message) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingsScreen(onBooking: (Long) -> Unit, onBack: () -> Unit, vm: BookingsViewModel = viewModel()) {
    val s by vm.s.collectAsState()
    Scaffold(topBar = { TopAppBar(title = { Text("My bookings") }, navigationIcon = { TextButton(onClick = onBack) { Text("Back") } }) }) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            when {
                s.loading -> LoadingBox()
                s.items.isEmpty() -> MessageBox(s.error ?: "No bookings yet")
                else -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(s.items) { b ->
                        ElevatedCard(onClick = { onBooking(b.id) }, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(b.providerName ?: "Provider", style = MaterialTheme.typography.titleMedium)
                                    Text("${money(b.amountPaid)} / ${money(b.totalAmount)}", style = MaterialTheme.typography.bodySmall)
                                }
                                AssistChip(onClick = { onBooking(b.id) }, label = { Text(titleCase(b.status)) })
                            }
                        }
                    }
                }
            }
        }
    }
}
