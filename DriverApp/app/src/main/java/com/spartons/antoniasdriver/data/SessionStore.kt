package com.spartons.antoniasdriver.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

private val Context.dataStore by preferencesDataStore("session")

/**
 * Persists the auth session (access/refresh tokens + user) in DataStore, and
 * keeps an in-memory copy of the tokens so the synchronous OkHttp interceptor
 * /authenticator can read them without suspending.
 */
class SessionStore(private val context: Context) {
    private val gson = Gson()

    @Volatile
    var cachedAccess: String? = null
        private set

    @Volatile
    var cachedRefresh: String? = null
        private set

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { it[ACCESS] != null }

    init {
        // Prime the in-memory cache at startup (read once, blocking).
        runBlocking {
            val prefs = context.dataStore.data.first()
            cachedAccess = prefs[ACCESS]
            cachedRefresh = prefs[REFRESH]
        }
    }

    suspend fun save(result: AuthResult) {
        cachedAccess = result.accessToken
        cachedRefresh = result.refreshToken
        context.dataStore.edit {
            it[ACCESS] = result.accessToken
            it[REFRESH] = result.refreshToken
            it[USER] = gson.toJson(result.user)
        }
    }

    suspend fun updateTokens(access: String, refresh: String) {
        cachedAccess = access
        cachedRefresh = refresh
        context.dataStore.edit {
            it[ACCESS] = access
            it[REFRESH] = refresh
        }
    }

    suspend fun clear() {
        cachedAccess = null
        cachedRefresh = null
        context.dataStore.edit { it.clear() }
    }

    fun currentUser(): AuthUser? = runBlocking {
        context.dataStore.data.first()[USER]?.let { gson.fromJson(it, AuthUser::class.java) }
    }

    companion object {
        private val ACCESS = stringPreferencesKey("access_token")
        private val REFRESH = stringPreferencesKey("refresh_token")
        private val USER = stringPreferencesKey("user")
    }
}
