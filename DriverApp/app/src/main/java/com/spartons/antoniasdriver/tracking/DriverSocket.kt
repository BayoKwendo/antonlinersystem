package com.spartons.antoniasdriver.tracking

import android.util.Log
import com.spartons.antoniasdriver.data.Network
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** wss URL for the tracking socket, derived from the REST base URL + access token. */
private fun wsUrl(token: String?): String {
    val base = Network.BASE_URL // e.g. https://host/api/v1/
    val origin = base.substringBefore("/api/v1")
    val ws = origin.replaceFirst("https", "wss").replaceFirst("http", "ws")
    return "$ws/ws?token=${token ?: ""}"
}

/**
 * Driver-side publisher for the authenticated tracking WebSocket. Streams the
 * driver's coordinates scoped to the active booking as
 * { type: "location", bookingId, lat, lng } so the booking's customer (who has
 * subscribed) sees the live position. Reconnection is lazy: if the socket is
 * gone when [publish] is called, it reconnects before sending.
 */
class DriverSocket(private val token: String?) {

    companion object {
        private const val TAG = "DriverSocket"
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null

    @Volatile
    private var closed = false

    fun connect() {
        if (closed) return
        val request = Request.Builder().url(wsUrl(token)).build()
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

    /** Publish a coordinate for [bookingId]; (re)connects transparently if needed. */
    fun publish(bookingId: Long, lat: Double, lng: Double) {
        if (closed) return
        if (webSocket == null) connect()
        val payload = JSONObject().apply {
            put("type", "location")
            put("bookingId", bookingId)
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
