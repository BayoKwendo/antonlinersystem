package com.spartons.antoniasdriver.ui.auth

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.DocumentUpload
import com.spartons.antoniasdriver.ui.components.DocumentUploadRow
import com.spartons.antoniasdriver.ui.components.MiniHeading
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.ServiceCheckbox
import com.spartons.antoniasdriver.ui.components.SmartCard
import com.spartons.antoniasdriver.ui.components.PhoneField
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.InkBlack
import com.spartons.antoniasdriver.ui.theme.MutedGrey
import com.spartons.antoniasdriver.ui.theme.Navy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** One statutory document required at sign-up ([field] is the backend document kind). */
data class DocSpec(val field: String, val title: String, val icon: ImageVector)

/** The six statutory documents a borehole service provider must submit (per the journey). */
val REQUIRED_DOCUMENTS = listOf(
    DocSpec("certificate_of_incorporation", "Certificate of Incorporation", Icons.Filled.Business),
    DocSpec("cr12", "CR12", Icons.Filled.Description),
    DocSpec("kra_pin_certificate", "KRA PIN Certificate", Icons.Filled.Badge),
    DocSpec("director_id", "Director National ID (or Passport)", Icons.Filled.Person),
    DocSpec("regulator_accreditation", "Regulator Accreditation Certificate(s)", Icons.Filled.WorkspacePremium),
    DocSpec("bank_details", "Bank Details (Proof of Banking)", Icons.Filled.AccountBalance),
)

data class SignUpState(
    val fullName: String = "",
    val businessName: String = "",
    val phone: String = "",
    val email: String = "",
    val kraPin: String = "",
    val password: String = "",
    val confirm: String = "",
    val services: Set<String> = emptySet(),
    val documents: Map<String, DocumentUpload> = emptyMap(),
    val acceptedTerms: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null,
    val done: Boolean = false,
)

class SignUpViewModel : ViewModel() {
    private val repo = ServiceLocator.repo
    private val _state = MutableStateFlow(SignUpState())
    val state = _state.asStateFlow()

    fun setFullName(v: String) { _state.value = _state.value.copy(fullName = v) }
    fun setBusinessName(v: String) { _state.value = _state.value.copy(businessName = v) }
    fun setPhone(v: String) { _state.value = _state.value.copy(phone = v) }
    fun setEmail(v: String) { _state.value = _state.value.copy(email = v) }
    fun setKraPin(v: String) { _state.value = _state.value.copy(kraPin = v.uppercase()) }
    fun setPassword(v: String) { _state.value = _state.value.copy(password = v) }
    fun setConfirm(v: String) { _state.value = _state.value.copy(confirm = v) }
    fun setAcceptedTerms(v: Boolean) { _state.value = _state.value.copy(acceptedTerms = v) }

    fun toggleService(code: String) {
        val s = _state.value
        val next = s.services.toMutableSet().apply { if (!add(code)) remove(code) }
        _state.value = s.copy(services = next)
    }

    fun setDocument(field: String, upload: DocumentUpload) {
        _state.value = _state.value.copy(documents = _state.value.documents + (field to upload))
    }

    fun register() {
        val s = _state.value
        val err = validate(s)
        if (err != null) { _state.value = s.copy(error = err); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching {
                repo.signup(
                    fullName = s.fullName.trim(),
                    businessName = s.businessName.trim(),
                    phone = s.phone.trim(),
                    email = s.email.trim(),
                    kraPin = s.kraPin.trim(),
                    password = s.password,
                    bankDetails = null,
                    services = s.services.toList(),
                    documents = REQUIRED_DOCUMENTS.mapNotNull { s.documents[it.field] },
                )
            }
                .onSuccess { _state.value = _state.value.copy(loading = false, done = true) }
                .onFailure { _state.value = _state.value.copy(loading = false, error = it.message ?: "Sign-up failed") }
        }
    }

    private fun validate(s: SignUpState): String? = when {
        s.fullName.isBlank() -> "Enter your full name"
        s.businessName.isBlank() -> "Enter your business name"
        s.phone.trim().length < 12 -> "Enter a valid phone number"
        !s.email.trim().matches(Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) -> "Enter a valid email address"
        s.kraPin.isBlank() -> "Enter your KRA PIN"
        s.services.isEmpty() -> "Select at least one service you offer"
        REQUIRED_DOCUMENTS.any { s.documents[it.field] == null } -> "Upload all required statutory documents"
        s.password.length < 6 -> "Password must be at least 6 characters"
        s.password != s.confirm -> "Passwords do not match"
        !s.acceptedTerms -> "Please accept the Terms & Privacy Policy"
        else -> null
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SignUpScreen(
    onRegistered: () -> Unit,
    onBackToLogin: () -> Unit,
    vm: SignUpViewModel = viewModel(),
) {
    val s by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(s.done) { if (s.done) onRegistered() }
    LaunchedEffect(s.error) { s.error?.let { snackbar.showSnackbar(it) } }

    // Single picker reused across the six document rows; the pending field marks
    // which document the returned Uri belongs to.
    var pendingField by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        val field = pendingField
        pendingField = null
        if (field == null || uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val upload = withContext(Dispatchers.IO) { readDocument(context, field, uri) }
            if (upload != null) vm.setDocument(field, upload)
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { pad ->
        Column(
            Modifier
                .padding(pad)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBackToLogin) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            }
            Text("SMART DRILL", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Navy)
            Text(
                "Verified Borehole Service Providers",
                style = MaterialTheme.typography.bodyMedium,
                color = MutedGrey,
            )
            Spacer(Modifier.height(20.dp))

            // --- Basic information ---
            SmartCard {
                MiniHeading("BASIC INFORMATION")
                Spacer(Modifier.height(12.dp))
                LabeledField("Full Name", s.fullName, vm::setFullName)
                Spacer(Modifier.height(12.dp))
                LabeledField("Business Name", s.businessName, vm::setBusinessName)
                Spacer(Modifier.height(12.dp))
                Text("Phone Number", style = MaterialTheme.typography.labelMedium, color = MutedGrey)
                Spacer(Modifier.height(4.dp))
                PhoneField(onPhoneChange = vm::setPhone, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(12.dp))
                LabeledField(
                    "Email Address", s.email, vm::setEmail,
                    keyboardType = KeyboardType.Email,
                )
                Spacer(Modifier.height(12.dp))
                LabeledField("KRA PIN", s.kraPin, vm::setKraPin)
            }
            Spacer(Modifier.height(16.dp))

            // --- Services offered ---
            SmartCard {
                MiniHeading("SERVICES OFFERED")
                Text(
                    "Select every service your company is accredited to deliver.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey,
                    modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    ServiceCatalog.all.forEach { svc ->
                        ServiceCheckbox(
                            service = svc,
                            checked = svc.code in s.services,
                            onToggle = { vm.toggleService(svc.code) },
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))

            // --- Statutory documents ---
            SmartCard {
                MiniHeading("STATUTORY DOCUMENTS")
                Text(
                    "All six documents are required for verification.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey,
                    modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
                )
                REQUIRED_DOCUMENTS.forEachIndexed { i, doc ->
                    if (i > 0) Spacer(Modifier.height(10.dp))
                    DocumentUploadRow(
                        title = doc.title,
                        icon = doc.icon,
                        selectedName = s.documents[doc.field]?.filename,
                        onPick = { pendingField = doc.field; picker.launch("*/*") },
                    )
                }
            }
            Spacer(Modifier.height(16.dp))

            // --- Account security ---
            SmartCard {
                MiniHeading("ACCOUNT SECURITY")
                Spacer(Modifier.height(12.dp))
                var passVisible by remember { mutableStateOf(false) }
                var confirmVisible by remember { mutableStateOf(false) }
                PasswordField("Password", s.password, vm::setPassword, passVisible) { passVisible = !passVisible }
                Spacer(Modifier.height(12.dp))
                PasswordField("Confirm Password", s.confirm, vm::setConfirm, confirmVisible) { confirmVisible = !confirmVisible }
            }
            Spacer(Modifier.height(16.dp))

            // --- Terms ---
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = s.acceptedTerms, onCheckedChange = vm::setAcceptedTerms)
                Text(
                    "I agree to the Terms of Service and Privacy Policy.",
                    style = MaterialTheme.typography.bodySmall,
                    color = InkBlack,
                )
            }
            Spacer(Modifier.height(12.dp))

            Button(
                onClick = vm::register,
                enabled = !s.loading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                Text(if (s.loading) "Creating account..." else "Create Account")
            }
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) {
                Text("Already have an account?  Login", color = BrandBlue)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun LabeledField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MutedGrey)
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun PasswordField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    visible: Boolean,
    onToggleVisible: () -> Unit,
) {
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MutedGrey)
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = onToggleVisible) {
                    Icon(
                        if (visible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = if (visible) "Hide password" else "Show password",
                    )
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Read a picked document's name, mime and bytes off the main thread. */
private fun readDocument(context: Context, field: String, uri: Uri): DocumentUpload? {
    val cr = context.contentResolver
    val name = runCatching {
        cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        }
    }.getOrNull() ?: uri.lastPathSegment ?: "document"
    val mime = cr.getType(uri) ?: "application/octet-stream"
    val bytes = runCatching { cr.openInputStream(uri)?.use { it.readBytes() } }.getOrNull() ?: return null
    return DocumentUpload(field, name, mime, bytes)
}
