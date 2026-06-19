package com.spartons.antoniasdriver.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginState(
    val phone: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val done: Boolean = false,
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

    fun login() {
        val s = _state.value
        if (s.phone.trim().length < 9) { _state.value = s.copy(error = "Enter a valid phone number"); return }
        if (s.password.length < 4) { _state.value = s.copy(error = "Enter your password"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { repo.login(s.phone.trim(), s.password) }
                .onSuccess { _state.value = _state.value.copy(loading = false, done = true) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message ?: "Login failed") }
        }
    }
}

@Composable
fun LoginScreen(onLoggedIn: () -> Unit, vm: LoginViewModel = viewModel()) {
    val s by vm.state.collectAsState()
    LaunchedEffect(s.done) { if (s.done) onLoggedIn() }

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("AntonLiner", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
        Text("Driver", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
        Spacer(Modifier.height(32.dp))

        OutlinedTextField(
            value = s.phone,
            onValueChange = vm::setPhone,
            label = { Text("Phone number") },
            placeholder = { Text("07XX XXX XXX") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth(),
        )
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

        s.error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}
