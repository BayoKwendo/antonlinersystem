package com.spartons.antonis

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.method.LinkMovementMethod
import android.text.util.Linkify
import android.util.Log
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.spartons.antonis.helpers.GoogleMapHelper
import com.spartons.antonis.helpers.MarkerAnimationHelper
import com.spartons.antonis.helpers.PassengerTrackingSocket
import com.spartons.antonis.helpers.RetrofitClient
import com.spartons.antonis.helpers.UiHelper
import com.spartons.antonis.interfaces.IPositiveNegativeListener
import com.spartons.antonis.interfaces.LatLngInterpolator
import okhttp3.ResponseBody
import org.json.JSONArray
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response


class MainActivity : AppCompatActivity(), PassengerTrackingSocket.Listener {

    companion object {
        const val MY_PERMISSIONS_REQUEST_ACCESS_FINE_LOCATION = 6161
    }

    private lateinit var googleMap: GoogleMap
    private lateinit var locationProviderClient: FusedLocationProviderClient
    private lateinit var locationRequest: LocationRequest
    private lateinit var locationCallback: LocationCallback
    private var locationFlag = true
    private val uiHelper = UiHelper()
    private val googleMapHelper = GoogleMapHelper()
    private var trackingSocket: PassengerTrackingSocket? = null
    private var driverMarker: Marker? = null
    var handler: Handler = Handler()
    var handler2: Handler = Handler()

    var mid: Int = 11

    private var runnable2: Runnable? = null

    private lateinit var totalOnlineDrivers: TextView
    private lateinit var on_refresh: TextView

    @SuppressLint("SetTextI18n")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        setContentView(R.layout.activity_main)
        totalOnlineDrivers = findViewById(R.id.totalOnlineDrivers)
        on_refresh = findViewById(R.id.on_refresh)
        val mapFragment: SupportMapFragment =
            supportFragmentManager.findFragmentById(R.id.supportMap) as SupportMapFragment
        mapFragment.getMapAsync { googleMap = it }
        createLocationCallback()
        locationProviderClient = LocationServices.getFusedLocationProviderClient(this)
        locationRequest = uiHelper.getLocationRequest()
//        val html = "You have been booked, booking number $book_id: Call $customer_number for direction and inquiries."
        totalOnlineDrivers.movementMethod= LinkMovementMethod.getInstance()

        val html = intent.getStringExtra("mdetails") + "\nStatus: Offline\n" + "Movement Status: Unknown"

        totalOnlineDrivers.setLinkTextColor(getResources().getColor(R.color.colorPrimaryDark))
        totalOnlineDrivers.text = html
        Linkify.addLinks(totalOnlineDrivers, Linkify.WEB_URLS or Linkify.PHONE_NUMBERS)
        Linkify.addLinks(totalOnlineDrivers, Linkify.ALL)


        if (!uiHelper.isPlayServicesAvailable(this)) {
            Toast.makeText(this, "Play Services did not installed!", Toast.LENGTH_SHORT).show()
            finish()
        } else requestLocationUpdate()
        // Open the real-time channel for this provider and track their movement.
        val driverId = intent.getStringExtra("service_type_id").toString()
        trackingSocket = PassengerTrackingSocket(driverId, this)
        trackingSocket?.connect()
        mRefresh()
    }


    fun mRefresh(){
        runnable2 = object : Runnable {
            override fun run() {
                try {
                    var refresh: Runnable? = null
                    handler2.postDelayed(this, 1000)
                    mid -= 1
                    on_refresh.text = "Refreshing in $mid sec"
                    if(mid == 0) {
                        mid = 11
                        RetrofitClient.instance!!.api.getSpecificRole(
                            intent.getStringExtra("service_type_id").toString()
                        )!!.enqueue(object :
                            Callback<ResponseBody?> {
                            override fun onResponse(
                                call: Call<ResponseBody?>,
                                response: Response<ResponseBody?>
                            ) {
                                val jSONObject = JSONObject(response.body()!!.string())
                                if (!response.isSuccessful || response.code() !== 200) {
                                    totalOnlineDrivers.movementMethod= LinkMovementMethod.getInstance()

                                    val html =
                                        intent.getStringExtra("mdetails") + "\nStatus: Offline\n" + "Movement Status: Static"
                                    totalOnlineDrivers.setLinkTextColor(getResources().getColor(R.color.colorPrimaryDark))
                                    totalOnlineDrivers.text = html
                                    Linkify.addLinks(totalOnlineDrivers, Linkify.WEB_URLS or Linkify.PHONE_NUMBERS)
                                    Linkify.addLinks(totalOnlineDrivers, Linkify.ALL)

                                } else {
                                    if ((jSONObject.getString("data")).isNotEmpty()) {
                                        val jsonArray = JSONArray(jSONObject.getString("data"))
                                        val itemObj = jsonArray.getJSONObject(0)
                                        if (itemObj.getString("active_status") == "active") {
                                            totalOnlineDrivers.movementMethod= LinkMovementMethod.getInstance()
                                            val html =
                                                intent.getStringExtra("mdetails") + "\nStatus: Online\n" + "Movement Status: Static"

                                            totalOnlineDrivers.setLinkTextColor(getResources().getColor(R.color.colorPrimaryDark))
                                            totalOnlineDrivers.text = html
                                            Linkify.addLinks(totalOnlineDrivers, Linkify.WEB_URLS or Linkify.PHONE_NUMBERS)
                                            Linkify.addLinks(totalOnlineDrivers, Linkify.ALL)

                                        } else {
                                            totalOnlineDrivers.movementMethod= LinkMovementMethod.getInstance()
                                            val html =
                                                intent.getStringExtra("mdetails") + "\nStatus: Offline\n" + "Movement Status: Static"
                                            totalOnlineDrivers.setLinkTextColor(getResources().getColor(R.color.colorPrimaryDark))
                                            totalOnlineDrivers.text = html
                                            Linkify.addLinks(totalOnlineDrivers, Linkify.WEB_URLS or Linkify.PHONE_NUMBERS)
                                            Linkify.addLinks(totalOnlineDrivers, Linkify.ALL)

                                        }
                                    }
                                }
                            }

                            override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                                Log.i("onEmptyvvResponse", "" + t) //
                                Toast.makeText(
                                    this@MainActivity,
                                    "Error switching",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        })
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
        handler2.postDelayed(runnable2 as Runnable, 0)
    }
    @SuppressLint("MissingPermission")
    private fun requestLocationUpdate() {
        if (!uiHelper.isHaveLocationPermission(this)) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                MY_PERMISSIONS_REQUEST_ACCESS_FINE_LOCATION
            )
            return
        }
        if (uiHelper.isLocationProviderEnabled(this))
            uiHelper.showPositiveDialogWithListener(
                this,
                resources.getString(R.string.need_location),
                resources.getString(R.string.location_content),
                object : IPositiveNegativeListener {
                    override fun onPositive() {
                        startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                    }
                },
                "Turn On",
                false
            )
        locationProviderClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.myLooper()
        )
    }

    private fun createLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                val lastLocation = locationResult.lastLocation ?: return
                val latLng = LatLng(
                    lastLocation.latitude,
                    lastLocation.longitude
                )
                Log.e("Location", latLng.latitude.toString() + " , " + latLng.longitude)
                if (locationFlag) {
                    locationFlag = false
//                    animateCamera(latLng)
                }
            }
        }
    }

    private fun animateCamera(lat: Double, Lng: Double) {
        googleMap.moveCamera(
            CameraUpdateFactory.newLatLngZoom(
                LatLng(lat, Lng),
                17.0f
            )
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == MY_PERMISSIONS_REQUEST_ACCESS_FINE_LOCATION) {
            val value = grantResults[0]
            if (value == PackageManager.PERMISSION_DENIED) {
                Toast.makeText(this, "Location Permission denied", Toast.LENGTH_SHORT).show()
                finish()
            } else if (value == PackageManager.PERMISSION_GRANTED) requestLocationUpdate()
        }
    }

    /** A live coordinate arrived over the socket: add or move the marker. */
    @SuppressLint("SetTextI18n")
    override fun onLocation(lat: Double, lng: Double) {
        if (!::googleMap.isInitialized) return
        val position = LatLng(lat, lng)
        val marker = driverMarker
        if (marker == null) {
            driverMarker = googleMap.addMarker(googleMapHelper.getDriverMarkerOptions(position))
            animateCamera(lat, lng)
        } else {
            MarkerAnimationHelper.animateMarkerToGB(
                marker, position, LatLngInterpolator.Spherical()
            )
        }
        setStatus("Online", "Moving")
    }

    /** The driver socket dropped: drop the marker and mark them offline. */
    @SuppressLint("SetTextI18n")
    override fun onOffline() {
        driverMarker?.remove()
        driverMarker = null
        setStatus("Offline", "Unknown")
    }

    @SuppressLint("SetTextI18n")
    private fun setStatus(status: String, movement: String) {
        totalOnlineDrivers.movementMethod = LinkMovementMethod.getInstance()
        totalOnlineDrivers.setLinkTextColor(resources.getColor(R.color.colorPrimaryDark))
        totalOnlineDrivers.text =
            intent.getStringExtra("mdetails") + "\nStatus: $status\n" + "Movement Status: $movement"
        Linkify.addLinks(totalOnlineDrivers, Linkify.WEB_URLS or Linkify.PHONE_NUMBERS)
        Linkify.addLinks(totalOnlineDrivers, Linkify.ALL)
    }

    override fun onDestroy() {
        trackingSocket?.close()
        trackingSocket = null
        super.onDestroy()
    }
}