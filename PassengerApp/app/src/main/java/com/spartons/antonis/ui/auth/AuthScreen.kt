package com.spartons.antonis.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.spartons.antonis.R
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antonis.ServiceLocator
import com.spartons.antonis.ui.components.PhoneField
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthState(
    val step: Int = 0, // 0 = phone, 1 = code
    val phone: String = "",
    val code: String = "",
    val name: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val info: String? = null,
    val done: Boolean = false,
)

class AuthViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(AuthState())
    val state = _state.asStateFlow()

    // Only allow phone characters (digits and a leading +); blocks letters.
    fun setPhone(v: String) {
        _state.value = _state.value.copy(phone = v.filterIndexed { i, c -> c.isDigit() || (c == '+' && i == 0) })
    }
    fun setCode(v: String) { _state.value = _state.value.copy(code = v.filter { it.isDigit() }) }
    fun setName(v: String) { _state.value = _state.value.copy(name = v) }

    fun requestOtp() {
        val phone = _state.value.phone.trim()
        if (phone.length < 12) { _state.value = _state.value.copy(error = "Enter a valid phone number"); return }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.requestOtp(phone) }
                .onSuccess { _state.value = _state.value.copy(loading = false, step = 1) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

    /** Re-send the verification code while staying on the code step. */
    fun resendOtp() {
        val phone = _state.value.phone.trim()
        if (phone.length < 12) { _state.value = _state.value.copy(error = "Enter a valid phone number"); return }
        _state.value = _state.value.copy(loading = true, error = null, info = null)
        viewModelScope.launch {
            runCatching { repo.requestOtp(phone) }
                .onSuccess { _state.value = _state.value.copy(loading = false, info = "Code re-sent") }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }

    fun verify() {
        val s = _state.value
        if (s.code.length < 4) { _state.value = s.copy(error = "Enter the code sent to you"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.verifyOtp(s.phone.trim(), s.code.trim(), s.name) }
                .onSuccess { _state.value = _state.value.copy(loading = false, done = true) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
        }
    }
}

@Composable
fun AuthScreen(onLoggedIn: () -> Unit, vm: AuthViewModel = viewModel()) {
    val s by vm.state.collectAsState()
    LaunchedEffect(s.done) { if (s.done) onLoggedIn() }

    Column(
        Modifier.fillMaxSize().padding(24.dp),
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
        Text("Smart Drilling", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(32.dp))

        if (s.step == 0) {
            PhoneField(onPhoneChange = vm::setPhone, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(16.dp))
            Button(onClick = vm::requestOtp, enabled = !s.loading, modifier = Modifier.fillMaxWidth()) {
                Text(if (s.loading) "Sending..." else "Send code")
            }
        } else {
            Text("Enter the code sent to ${s.phone}", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = s.code, onValueChange = vm::setCode, label = { Text("Verification code") },
                singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = s.name, onValueChange = vm::setName, label = { Text("Your name (first time only)") },
                singleLine = true, modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            Button(onClick = vm::verify, enabled = !s.loading, modifier = Modifier.fillMaxWidth()) {
                Text(if (s.loading) "Verifying..." else "Verify & continue")
            }
            TextButton(onClick = vm::resendOtp, enabled = !s.loading) { Text("Didn't get it? Resend code") }
        }

        s.error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        s.info?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
        }
    }
}
