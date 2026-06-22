package com.spartons.antoniasdriver.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.spartons.antoniasdriver.R
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.ui.components.PhoneField
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginState(
    val phone: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val info: String? = null,
    val done: Boolean = false,
    // Forced new-password step (after a reset / first login with a temp password).
    val mustChange: Boolean = false,
    // Forgot-password modal state.
    val resetLoading: Boolean = false,
    val resetError: String? = null,
    val resetSent: Boolean = false, // first send succeeded → enables "Resend"
    val resetDone: Boolean = false, // signals the modal to close
)

class LoginViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(LoginState())
    val state = _state.asStateFlow()

    // Only allow phone characters (digits and a leading +); blocks letters.
    fun setPhone(v: String) {
        _state.value = _state.value.copy(phone = v.filterIndexed { i, c -> c.isDigit() || (c == '+' && i == 0) })
    }

    fun setPassword(v: String) { _state.value = _state.value.copy(password = v) }
    fun clearInfo() { _state.value = _state.value.copy(info = null) }

    fun login() {
        val s = _state.value
        if (s.phone.trim().length < 9) { _state.value = s.copy(error = "Enter a valid phone number"); return }
        if (s.password.length < 4) { _state.value = s.copy(error = "Enter your password"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.login(s.phone.trim(), s.password) }
                .onSuccess { res ->
                    // First login after a reset → force a new password before entering.
                    if (res.user.mustChangePassword) {
                        _state.value = _state.value.copy(loading = false, mustChange = true)
                    } else {
                        _state.value = _state.value.copy(loading = false, done = true)
                    }
                }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message ?: "Login failed") }
        }
    }

    /** Forgot password: SMS a temporary password (silent — no account enumeration). */
    fun requestReset(rawPhone: String) {
        val phone = rawPhone.trim()
        if (phone.length < 12) { _state.value = _state.value.copy(resetError = "Enter a valid phone number"); return }
        // Silent reset: close the modal immediately with one neutral message and
        // send in the background, so it never gets stuck open on a backend error.
        _state.value = _state.value.copy(
            resetLoading = false, resetError = null, resetDone = true,
            info = "If the number is registered, a temporary password has been sent by SMS.",
        )
        viewModelScope.launch { runCatching { repo.resetPassword(phone) } }
    }

    /** Modal acknowledged the close + reset its transient flags. */
    fun resetModalClosed() {
        _state.value = _state.value.copy(resetDone = false, resetError = null, resetSent = false)
    }

    /**
     * User backed out of the forced password change. Login already persisted the
     * session, so clear it to avoid a half-authenticated state and return to login.
     */
    fun cancelPasswordChange() {
        viewModelScope.launch {
            runCatching { repo.logout() }
            _state.value = _state.value.copy(mustChange = false, password = "", error = null)
        }
    }

    /** Set the new password using the temp password the user just signed in with. */
    fun submitNewPassword(next: String, confirm: String) {
        if (next.length < 6) { _state.value = _state.value.copy(error = "Password must be at least 6 characters"); return }
        if (next != confirm) { _state.value = _state.value.copy(error = "Passwords do not match"); return }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.changePassword(_state.value.password, next) }
                .onSuccess { _state.value = _state.value.copy(loading = false, mustChange = false, done = true) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message ?: "Could not set password") }
        }
    }
}

@Composable
fun LoginScreen(onLoggedIn: () -> Unit, vm: LoginViewModel = viewModel()) {
    val s by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    var showReset by remember { mutableStateOf(false) }

    LaunchedEffect(s.done) { if (s.done) onLoggedIn() }
    LaunchedEffect(s.info) { s.info?.let { snackbar.showSnackbar(it); vm.clearInfo() } }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { pad ->
        Column(
            Modifier.padding(pad).fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(
                painter = painterResource(R.drawable.ic_logo),
                contentDescription = "SmartDrill",
                modifier = Modifier.size(140.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text("SmartDrill", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
            Text("Driver", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
            Spacer(Modifier.height(32.dp))

            PhoneField(onPhoneChange = vm::setPhone, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = s.password,
                onValueChange = vm::setPassword,
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            Button(onClick = vm::login, enabled = !s.loading, modifier = Modifier.fillMaxWidth()) {
                Text(if (s.loading) "Signing in..." else "Sign in")
            }
            TextButton(onClick = { showReset = true }) { Text("Forgot password?") }

            s.error?.let {
                Spacer(Modifier.height(4.dp))
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
        }
    }

    // --- Forgot-password dialog ---
    if (showReset) {
        var resetPhone by remember { mutableStateOf("") }
        // Close only on a successful send.
        LaunchedEffect(s.resetDone) { if (s.resetDone) { showReset = false; vm.resetModalClosed() } }
        AlertDialog(
            onDismissRequest = { if (!s.resetLoading) { showReset = false; vm.resetModalClosed() } },
            title = { Text("Reset password") },
            text = {
                Column {
                    Text(
                        "Enter your phone number. If it's registered we'll SMS you a temporary password to sign in with.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Spacer(Modifier.height(8.dp))
                    PhoneField(onPhoneChange = { resetPhone = it })
                    s.resetError?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { vm.requestReset(resetPhone) }, enabled = !s.resetLoading) {
                    Text(if (s.resetLoading) "Sending..." else if (s.resetSent) "Resend code" else "Send code")
                }
            },
            dismissButton = {
                TextButton(onClick = { showReset = false; vm.resetModalClosed() }, enabled = !s.resetLoading) { Text("Cancel") }
            },
        )
    }

    // --- Forced new-password step (after reset / temp-password login) ---
    if (s.mustChange) {
        var next by remember { mutableStateOf("") }
        var confirm by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { if (!s.loading) vm.cancelPasswordChange() },
            title = { Text("Set a new password") },
            text = {
                Column {
                    Text("Your password was reset. Please choose a new password to continue.", style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = next, onValueChange = { next = it }, label = { Text("New password") },
                        singleLine = true, visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = confirm, onValueChange = { confirm = it }, label = { Text("Re-enter new password") },
                        singleLine = true, visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    s.error?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { vm.submitNewPassword(next, confirm) }, enabled = !s.loading) {
                    Text(if (s.loading) "Saving..." else "Save & continue")
                }
            },
            dismissButton = {
                TextButton(onClick = { vm.cancelPasswordChange() }, enabled = !s.loading) { Text("Cancel") }
            },
        )
    }
}
