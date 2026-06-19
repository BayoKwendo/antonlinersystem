package com.spartons.antoniasdriver.ui.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.AppNotification
import com.spartons.antoniasdriver.ui.LoadingBox
import com.spartons.antoniasdriver.ui.MessageBox
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class NotificationsViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    data class S(val items: List<AppNotification> = emptyList(), val unread: Int = 0, val loading: Boolean = true)
    private val _s = MutableStateFlow(S())
    val s = _s.asStateFlow()

    init {
        load()
        viewModelScope.launch {
            while (isActive) {
                delay(30_000)
                load(silent = true)
            }
        }
    }

    fun load(silent: Boolean = false) {
        if (!silent) _s.value = _s.value.copy(loading = true)
        viewModelScope.launch {
            runCatching { repo.notifications() }
                .onSuccess { _s.value = S(items = it.items, unread = it.unread, loading = false) }
                .onFailure { _s.value = _s.value.copy(loading = false) }
        }
    }

    fun markRead(id: Long) {
        viewModelScope.launch { runCatching { repo.markNotificationRead(id) }; load(silent = true) }
    }

    fun markAllRead() {
        viewModelScope.launch { runCatching { repo.markAllNotificationsRead() }; load(silent = true) }
    }
}

/** Bell with an unread badge for the top bar. */
@Composable
fun NotificationBell(onClick: () -> Unit, vm: NotificationsViewModel = viewModel()) {
    val s by vm.s.collectAsState()
    BadgedBox(badge = {
        if (s.unread > 0) Badge { Text(if (s.unread > 99) "99+" else s.unread.toString()) }
    }) {
        IconButton(onClick = onClick) { Icon(Icons.Default.Notifications, "Notifications") }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(onBack: () -> Unit, vm: NotificationsViewModel = viewModel()) {
    val s by vm.s.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
                actions = { if (s.unread > 0) TextButton(onClick = vm::markAllRead) { Text("Mark all read") } },
            )
        },
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            when {
                s.loading -> LoadingBox()
                s.items.isEmpty() -> MessageBox("No notifications yet")
                else -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(s.items) { n ->
                        val unread = n.readAt == null
                        Card(onClick = { if (unread) vm.markRead(n.id) }, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(14.dp)) {
                                if (unread) {
                                    Box(
                                        Modifier.padding(top = 6.dp, end = 10.dp).size(8.dp)
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(MaterialTheme.colorScheme.primary),
                                    )
                                } else {
                                    Spacer(Modifier.width(18.dp))
                                }
                                Column {
                                    Text(n.title, style = MaterialTheme.typography.titleSmall)
                                    Text(n.body, style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
                                    n.createdAt?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Color.Gray) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
