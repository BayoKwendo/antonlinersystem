package com.spartons.antoniasdriver.ui.auth

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonOutline
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spartons.antoniasdriver.R
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.data.DocumentUpload
import com.spartons.antoniasdriver.ui.components.DocumentUploadRow
import com.spartons.antoniasdriver.ui.components.PhoneField
import com.spartons.antoniasdriver.ui.components.ServiceCatalog
import com.spartons.antoniasdriver.ui.components.ServiceDef
import com.spartons.antoniasdriver.ui.theme.BrandBlue
import com.spartons.antoniasdriver.ui.theme.Navy
import com.spartons.antoniasdriver.ui.theme.NavyDark
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
    DocSpec("director_id", "Director National ID (or Passport)", Icons.Filled.PersonOutline),
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
    fun setPhone(v: String) { _state.value = _state.value.copy(phone = v.filter { it.isDigit() }.take(12)) }
    fun setEmail(v: String) { _state.value = _state.value.copy(email = v.trim()) }
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

    /** System-driven rejection of a picked file (bad format / too large / read error). */
    fun rejectDocument(message: String) { _state.value = _state.value.copy(error = message) }

    fun clearError() { _state.value = _state.value.copy(error = null) }

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
        s.phone.filter { it.isDigit() }.length < 9 -> "Enter a valid phone number"
        !s.email.matches(Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) -> "Enter a valid email address"
        s.kraPin.isBlank() -> "Enter your KRA PIN"
        s.services.isEmpty() -> "Select at least one service you offer"
        REQUIRED_DOCUMENTS.any { s.documents[it.field] == null } -> "Upload all required statutory documents"
        s.password.length < 6 -> "Password must be at least 6 characters"
        s.password != s.confirm -> "Passwords do not match"
        !s.acceptedTerms -> "Please accept the Terms & Privacy Policy"
        else -> null
    }
}

@Composable
fun SignUpScreen(
    onRegistered: () -> Unit,
    onBackToLogin: () -> Unit,
    vm: SignUpViewModel = viewModel(),
) {
    val s by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(s.error) { s.error?.let { snackbar.showSnackbar(it); vm.clearError() } }

    // On a successful sign-up, confirm with a dialog and only navigate onward
    // once the user acknowledges it (instead of jumping away immediately).
    if (s.done) {
        SignUpSuccessDialog(onContinue = onRegistered)
    }

    // Single picker reused across the six document rows; the pending field marks
    // which document the returned Uri belongs to. The picker is restricted to the
    // accepted document types, and the returned file is validated (format + 5 MB)
    // before it is accepted — invalid picks are rejected by the system, not kept.
    var pendingField by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        val field = pendingField
        pendingField = null
        // A null uri means the user simply backed out of the file picker (nothing
        // was selected) — that is not a cancellation of an accepted upload.
        if (field == null || uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            when (val result = withContext(Dispatchers.IO) { readDocumentValidated(context, field, uri) }) {
                is DocPick.Ok -> vm.setDocument(field, result.doc)
                is DocPick.Error -> vm.rejectDocument(result.message)
            }
        }
    }

    var passVisible by remember { mutableStateOf(false) }
    var confirmVisible by remember { mutableStateOf(false) }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { _ ->
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding(),
        ) {
            HeroHeader(onBack = onBackToLogin)

            Column(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Spacer(Modifier.height(4.dp))
                Text(
                    "Create Your Service Provider Account",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "Join Smart Drill and connect with customers who need your expertise.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }

            Column(Modifier.fillMaxWidth().padding(20.dp)) {
                // --- Basic information ---
                SectionTitle("Basic Information")
                Spacer(Modifier.height(12.dp))
                IconField(Icons.Filled.Person, "Full Name", "Enter your full name", s.fullName, vm::setFullName)
                Spacer(Modifier.height(12.dp))
                IconField(Icons.Filled.Business, "Business Name", "Enter your business name", s.businessName, vm::setBusinessName)
                Spacer(Modifier.height(12.dp))
                PhoneField(onPhoneChange = vm::setPhone, label = "Phone Number", modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(12.dp))
                IconField(Icons.Filled.MailOutline, "Email Address", "Enter your email address", s.email, vm::setEmail, keyboardType = KeyboardType.Email)
                Spacer(Modifier.height(12.dp))
                IconField(Icons.Outlined.Shield, "KRA PIN", "Enter your KRA PIN", s.kraPin, vm::setKraPin)
                Spacer(Modifier.height(24.dp))

                // --- Services offered ---
                SectionTitle("Services Offered", "Select one or more services you provide")
                Spacer(Modifier.height(12.dp))
                ServiceGrid(selected = s.services, onToggle = vm::toggleService)
                Spacer(Modifier.height(24.dp))

                // --- Statutory documents ---
                SectionTitle("Statutory Documents", "Upload clear copies of the following documents")
                Spacer(Modifier.height(12.dp))
                REQUIRED_DOCUMENTS.forEachIndexed { i, doc ->
                    if (i > 0) Spacer(Modifier.height(10.dp))
                    DocumentUploadRow(
                        title = doc.title,
                        icon = doc.icon,
                        selectedName = s.documents[doc.field]?.filename,
                        onPick = { pendingField = doc.field; picker.launch(ALLOWED_DOC_MIME_TYPES) },
                    )
                }
                Spacer(Modifier.height(24.dp))

                // --- Account security ---
                SectionTitle("Account Security", "Set a password to secure your account")
                Spacer(Modifier.height(12.dp))
                IconField(
                    icon = null, label = "Password", placeholder = "Enter password",
                    value = s.password, onChange = vm::setPassword,
                    keyboardType = KeyboardType.Password,
                    visualTransformation = if (passVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailing = { EyeToggle(passVisible) { passVisible = !passVisible } },
                )
                Spacer(Modifier.height(12.dp))
                IconField(
                    icon = null, label = "Confirm Password", placeholder = "Confirm your password",
                    value = s.confirm, onChange = vm::setConfirm,
                    keyboardType = KeyboardType.Password,
                    visualTransformation = if (confirmVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailing = { EyeToggle(confirmVisible) { confirmVisible = !confirmVisible } },
                )
                Spacer(Modifier.height(16.dp))

                TermsRow(checked = s.acceptedTerms, onToggle = vm::setAcceptedTerms)
                Spacer(Modifier.height(16.dp))

                Button(
                    onClick = vm::register,
                    enabled = !s.loading,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Navy),
                ) {
                    if (s.loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = androidx.compose.ui.graphics.Color.White,
                            strokeWidth = 2.dp,
                        )
                        Spacer(Modifier.width(10.dp))
                    }
                    Text(
                        if (s.loading) "Creating account..." else "Create Account",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Spacer(Modifier.height(12.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Already have an account? ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "Login",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = BrandBlue,
                        modifier = Modifier.clickable(onClick = onBackToLogin),
                    )
                }
                Spacer(Modifier.height(18.dp))
                InfoBanner()
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
/** Confirmation shown after a successful sign-up (account created + documents uploaded). */
@Composable
private fun SignUpSuccessDialog(onContinue: () -> Unit) {
    AlertDialog(
        onDismissRequest = onContinue,
        icon = {
            Icon(
                Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = BrandBlue,
                modifier = Modifier.size(48.dp),
            )
        },
        title = {
            Text(
                "Account Created",
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
        },
        text = {
            Text(
                "Your account and documents were uploaded successfully. Your account is now " +
                    "pending verification — we'll let you know once it's approved.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
            )
        },
        confirmButton = {
            TextButton(onClick = onContinue) {
                Text("Continue", fontWeight = FontWeight.SemiBold, color = BrandBlue)
            }
        },
    )
}

@Composable
private fun HeroHeader(onBack: () -> Unit) {
    val white = androidx.compose.ui.graphics.Color.White
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(bottomStart = 30.dp, bottomEnd = 30.dp))
            .background(Brush.verticalGradient(listOf(Navy, NavyDark))),
    ) {
        Box(Modifier.fillMaxWidth().statusBarsPadding().padding(top = 12.dp, bottom = 28.dp)) {
            // Centered logo + wordmark.
            Column(
                Modifier.align(Alignment.Center).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Image(painterResource(R.drawable.ic_logo), contentDescription = "SMART DRILL", modifier = Modifier.size(74.dp))
                Spacer(Modifier.height(6.dp))
                Text("SMART DRILL", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = white)
                Text(
                    "Verified Borehole Service Providers",
                    style = MaterialTheme.typography.bodySmall,
                    color = white.copy(alpha = 0.85f),
                )
            }
            // Back button, vertically centred on the left — level with the logo.
            IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).padding(start = 4.dp)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = white)
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String, subtitle: String? = null) {
    Column {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Navy)
        subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp)) }
    }
}

@Composable
private fun IconField(
    icon: ImageVector?,
    label: String,
    placeholder: String,
    value: String,
    onChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailing: (@Composable () -> Unit)? = null,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (icon != null) {
                Icon(icon, null, tint = Navy, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(14.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(3.dp))
                BasicTextField(
                    value = value,
                    onValueChange = onChange,
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                    keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                    visualTransformation = visualTransformation,
                    cursorBrush = SolidColor(BrandBlue),
                    modifier = Modifier.fillMaxWidth(),
                    decorationBox = { inner ->
                        Box(contentAlignment = Alignment.CenterStart) {
                            if (value.isEmpty()) {
                                Text(placeholder, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            inner()
                        }
                    },
                )
            }
            trailing?.invoke()
        }
    }
}

@Composable
private fun EyeToggle(visible: Boolean, onToggle: () -> Unit) {
    IconButton(onClick = onToggle, modifier = Modifier.size(28.dp)) {
        Icon(
            if (visible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
            contentDescription = if (visible) "Hide" else "Show",
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp),
        )
    }
}

@Composable
private fun ServiceGrid(selected: Set<String>, onToggle: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ServiceCatalog.all.chunked(2).forEach { pair ->
            if (pair.size == 2) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    pair.forEach { svc ->
                        ServiceGridItem(svc, svc.code in selected, { onToggle(svc.code) }, Modifier.weight(1f))
                    }
                }
            } else {
                val svc = pair[0]
                ServiceGridItem(svc, svc.code in selected, { onToggle(svc.code) }, Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun ServiceGridItem(service: ServiceDef, checked: Boolean, onToggle: () -> Unit, modifier: Modifier) {
    Surface(
        modifier = modifier.height(68.dp).clickable(onClick = onToggle),
        shape = RoundedCornerShape(12.dp),
        color = if (checked) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (checked) BrandBlue else MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(
            Modifier.padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(service.icon, null, tint = Navy, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(10.dp))
            Text(
                "${service.label} (${service.badge})",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
                maxLines = 2,
            )
            Box(
                Modifier
                    .size(20.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(if (checked) BrandBlue else androidx.compose.ui.graphics.Color.Transparent)
                    .border(1.5.dp, if (checked) BrandBlue else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(5.dp)),
                contentAlignment = Alignment.Center,
            ) {
                if (checked) Icon(Icons.Filled.VerifiedUser, null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(13.dp))
            }
        }
    }
}

@Composable
private fun TermsRow(checked: Boolean, onToggle: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = checked, onCheckedChange = onToggle)
        Text(
            buildAnnotatedString {
                append("I agree to the Smart Drill ")
                withStyle(SpanStyle(color = BrandBlue, fontWeight = FontWeight.SemiBold)) { append("Terms and Conditions") }
                append(" and ")
                withStyle(SpanStyle(color = BrandBlue, fontWeight = FontWeight.SemiBold)) { append("Privacy Policy") }
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun InfoBanner() {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.primaryContainer).padding(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(Icons.Outlined.Shield, null, tint = BrandBlue, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(10.dp))
        Text(
            "All providers are verified before they can receive jobs through Smart Drill. Your information is secure and will only be used for verification purposes.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
        )
    }
}

/** Maximum accepted statutory-document size (matches the "Max 5MB" UI hint). */
private const val MAX_DOC_BYTES = 5 * 1024 * 1024
private val ALLOWED_DOC_MIME = setOf("application/pdf", "image/png", "image/jpeg")
private val ALLOWED_DOC_MIME_TYPES = ALLOWED_DOC_MIME.toTypedArray()

/** Outcome of picking a document: either a validated file or a system rejection reason. */
private sealed interface DocPick {
    data class Ok(val doc: DocumentUpload) : DocPick
    data class Error(val message: String) : DocPick
}

/**
 * Read + validate a picked document off the main thread. Rejects unsupported
 * formats and files over 5 MB (checking the reported size before reading, then
 * the actual bytes as a backstop) so only valid files are ever accepted.
 */
private fun readDocumentValidated(context: Context, field: String, uri: Uri): DocPick {
    val cr = context.contentResolver
    val mime = cr.getType(uri)?.lowercase()
    if (mime == null || mime !in ALLOWED_DOC_MIME) {
        return DocPick.Error("Unsupported file type. Upload a PDF, PNG or JPG.")
    }
    val reportedSize = runCatching {
        cr.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { c ->
            if (c.moveToFirst() && !c.isNull(0)) c.getLong(0) else null
        }
    }.getOrNull()
    if (reportedSize != null && reportedSize > MAX_DOC_BYTES) {
        return DocPick.Error("File is too large. The maximum size is 5 MB.")
    }
    val name = runCatching {
        cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        }
    }.getOrNull() ?: uri.lastPathSegment ?: "document"
    val bytes = runCatching { cr.openInputStream(uri)?.use { it.readBytes() } }.getOrNull()
        ?: return DocPick.Error("Couldn't read the file. Please try again.")
    if (bytes.size > MAX_DOC_BYTES) {
        return DocPick.Error("File is too large. The maximum size is 5 MB.")
    }
    return DocPick.Ok(DocumentUpload(field, name, mime, bytes))
}
