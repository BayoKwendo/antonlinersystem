package com.spartons.antoniasdriver.helper
import android.content.Context
import android.content.SharedPreferences
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit


class RetrofitClient private constructor() {

//    Log.d("addItemsFromJSON: ", name.toString())

    val interceptor = HttpLoggingInterceptor()
    val client: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(interceptor) //.addInterceptor(REWRITE_CACHE_CONTROL_INTERCEPTOR)
        .connectTimeout(2, TimeUnit.MINUTES)
        .writeTimeout(2, TimeUnit.MINUTES) // write timeout
        .readTimeout(2, TimeUnit.MINUTES) // read timeout
        .addNetworkInterceptor(Interceptor { chain ->
            val request: Request =
                chain.request().newBuilder() // .addHeader(Constant.Header, authToken)
                    .build()
            chain.proceed(request)
        }).addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("x-access-token",  name.toString())
                .build()
            chain.proceed(request)
        }.build()

    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    val api: Api
        get() = retrofit.create(Api::class.java)
    companion object {
        private const val BASE_URL = "https://api.antonlinersystems.co.ke/"
        private var mInstance: RetrofitClient? = null
        //
        lateinit var sharedPreferences: SharedPreferences
        var name: String? = ""

        fun init(context: Context) {
            // to prevent multiple initialization
            if (!Companion::sharedPreferences.isInitialized) {
                sharedPreferences = context.getSharedPreferences("Onfon", 0)
                name = sharedPreferences.getString("token", "").toString()
            }
        }

        @get:Synchronized
        val instance: RetrofitClient?
            get() {
                if (mInstance == null) mInstance = RetrofitClient()
                return mInstance
            }
    }
}
