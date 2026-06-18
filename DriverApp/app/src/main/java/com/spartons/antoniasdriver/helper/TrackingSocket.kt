package com.spartons.antoniasdriver.helper

import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Driver-side real-time channel. Opens a WebSocket to the backend and streams
 * the driver's coordinates as { role: "driver", driverId, lat, lng }.
 *
 * Reconnection is lazy: if the socket is gone when [sendLocation] is called
 * (every few seconds from the location service), it reconnects before sending.
 */
class TrackingSocket(private val driverId: String) {

    companion object {
        // wss:// mirror of the REST base URL (https://api.antonlinersystems.co.ke/).
        private const val WS_URL = "wss://api.antonlinersystems.co.ke/ws"
        private const val TAG = "TrackingSocket"
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null

    @Volatile
    private var closed = false

    fun connect() {
        if (closed) return
        val request = Request.Builder().url(WS_URL).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.i(TAG, "connected")
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.i(TAG, "failure: $t")
                webSocket = null
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                webSocket = null
            }
        })
    }

    /** Stream a coordinate; (re)connects transparently if needed. */
    fun sendLocation(lat: Double, lng: Double) {
        if (closed) return
        if (webSocket == null) connect()
        val payload = JSONObject().apply {
            put("role", "driver")
            put("driverId", driverId)
            put("lat", lat)
            put("lng", lng)
        }.toString()
        val sent = webSocket?.send(payload) ?: false
        // Drop the handle so the next call rebuilds the connection.
        if (!sent) webSocket = null
    }

    fun close() {
        closed = true
        webSocket?.close(1000, "driver offline")
        webSocket = null
        client.dispatcher.executorService.shutdown()
    }
}
