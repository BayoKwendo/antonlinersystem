package com.spartons.antonis.helpers

import android.os.Handler
import android.os.Looper
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Passenger-side real-time channel. Connects to the backend WebSocket, sends a
 * one-off subscribe ({ role: "passenger", driverId }) and forwards incoming
 * driver coordinates to [listener] on the main thread.
 *
 * Auto-reconnects with a fixed backoff until [close] is called.
 */
class PassengerTrackingSocket(
    private val driverId: String,
    private val listener: Listener
) {

    interface Listener {
        fun onLocation(lat: Double, lng: Double)
        fun onOffline()
    }

    companion object {
        private const val WS_URL = "wss://api.antonlinersystems.co.ke/ws"
        private const val RECONNECT_DELAY_MS = 3000L
        private const val TAG = "PassengerTracking"
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .build()

    private val main = Handler(Looper.getMainLooper())
    private var webSocket: WebSocket? = null

    @Volatile
    private var closed = false

    fun connect() {
        if (closed) return
        val request = Request.Builder().url(WS_URL).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                val subscribe = JSONObject().apply {
                    put("role", "passenger")
                    put("driverId", driverId)
                }.toString()
                ws.send(subscribe)
            }

            override fun onMessage(ws: WebSocket, text: String) {
                try {
                    val obj = JSONObject(text)
                    when (obj.optString("type")) {
                        "location" -> {
                            val lat = obj.getDouble("lat")
                            val lng = obj.getDouble("lng")
                            main.post { listener.onLocation(lat, lng) }
                        }
                        "offline" -> main.post { listener.onOffline() }
                    }
                } catch (e: Exception) {
                    Log.i(TAG, "bad message: $e")
                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                webSocket = null
                scheduleReconnect()
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                webSocket = null
            }
        })
    }

    private fun scheduleReconnect() {
        if (closed) return
        main.postDelayed({ if (!closed) connect() }, RECONNECT_DELAY_MS)
    }

    fun close() {
        closed = true
        main.removeCallbacksAndMessages(null)
        webSocket?.close(1000, "stopped tracking")
        webSocket = null
        client.dispatcher.executorService.shutdown()
    }
}
