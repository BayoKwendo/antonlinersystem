package com.spartons.antonis.data

import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/** Thrown when the API returns an envelope without data. */
class ApiException(message: String) : Exception(message)

fun <T> ApiResponse<T>.unwrap(): T = data ?: throw ApiException(message ?: "Request failed")

object Network {
    // Production. For the Android emulator against a local server use:
    //   http://10.0.2.2:5002/api/v1/
//    const val BASE_URL = "https://api.antonlinersystems.co.ke/api/v1/"
    const val BASE_URL = "http://178.128.32.32:5002/api/v1/"

    fun create(session: SessionStore): ApiService {
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }

        val authHeader = Interceptor { chain ->
            val builder = chain.request().newBuilder()
            session.cachedAccess?.let { builder.header("Authorization", "Bearer $it") }
            chain.proceed(builder.build())
        }

        // A bare client/api used only to refresh (no authenticator -> no recursion).
        val refreshApi = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(OkHttpClient.Builder().build())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)

        val authenticator = Authenticator { _, response ->
            val refresh = session.cachedRefresh ?: return@Authenticator null
            if (responseCount(response) >= 2) return@Authenticator null // already retried
            val newTokens = runBlocking {
                runCatching { refreshApi.refresh(RefreshReq(refresh)).data }.getOrNull()
            } ?: return@Authenticator null
            runBlocking { session.updateTokens(newTokens.accessToken, newTokens.refreshToken) }
            response.request.newBuilder()
                .header("Authorization", "Bearer ${newTokens.accessToken}")
                .build()
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authHeader)
            .addInterceptor(logging)
            .authenticator(authenticator)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
