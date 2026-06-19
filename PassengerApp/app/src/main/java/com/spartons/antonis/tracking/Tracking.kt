package com.spartons.antonis.tracking

import com.google.android.gms.maps.model.LatLng
import com.spartons.antonis.data.Network
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject

/** wss URL for the tracking socket, derived from the REST base URL. */
private fun wsUrl(token: String?): String {
    val base = Network.BASE_URL // e.g. https://host/api/v1/
    val origin = base.substringBefore("/api/v1")
    val ws = origin.replaceFirst("https", "wss").replaceFirst("http", "ws")
    return "$ws/ws?token=${token ?: ""}"
}

/** Stream the assigned provider's live location for a booking, over the authenticated WS. */
fun trackBooking(bookingId: Long, token: String?): Flow<LatLng> = callbackFlow {
    val client = OkHttpClient()
    val request = Request.Builder().url(wsUrl(token)).build()
    val socket = client.newWebSocket(request, object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            webSocket.send(JSONObject().put("type", "subscribe").put("bookingId", bookingId).toString())
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            try {
                val obj = JSONObject(text)
                if (obj.optString("type") == "location") {
                    trySend(LatLng(obj.getDouble("lat"), obj.getDouble("lng")))
                }
            } catch (_: Exception) { /* ignore malformed */ }
        }
    })
    awaitClose {
        socket.close(1000, "left tracking")
        client.dispatcher.executorService.shutdown()
    }
}
