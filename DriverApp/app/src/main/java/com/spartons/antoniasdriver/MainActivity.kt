package com.spartons.antoniasdriver

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ContentValues
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager.PERMISSION_DENIED
import android.content.pm.PackageManager.PERMISSION_GRANTED
import android.location.Address
import android.location.Geocoder
import android.os.Build
import android.os.Bundle
import android.os.Looper
import android.provider.Settings
import android.text.method.LinkMovementMethod
import android.text.util.Linkify
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.spartons.antoniasdriver.helper.GoogleMapHelper
import com.spartons.antoniasdriver.helper.MarkerAnimationHelper
import com.spartons.antoniasdriver.helper.RetrofitClient
import com.spartons.antoniasdriver.helper.UiHelper
import com.spartons.antoniasdriver.interfaces.IPositiveNegativeListener
import com.spartons.antoniasdriver.interfaces.LatLngInterpolator
import com.thecode.aestheticdialogs.AestheticDialog
import com.thecode.aestheticdialogs.DialogAnimation
import com.thecode.aestheticdialogs.DialogStyle
import com.thecode.aestheticdialogs.DialogType
import com.thecode.aestheticdialogs.OnDialogClickListener
import okhttp3.ResponseBody
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.IOException
import java.util.Locale
import kotlin.jvm.internal.Intrinsics


class MainActivity : AppCompatActivity() {

    companion object {
        private const val MY_PERMISSIONS_REQUEST_ACCESS_FINE_LOCATION = 2200
    }

    private lateinit var googleMap: GoogleMap
    private lateinit var locationProviderClient: FusedLocationProviderClient
    private lateinit var locationRequest: LocationRequest
    private lateinit var locationCallback: LocationCallback
    private var locationFlag = true
    private var driverOnlineFlag = true
    private var currentPositionMarker: Marker? = null
    private val googleMapHelper = GoogleMapHelper()
    var alert2: AlertDialog? = null

    var driver_status: String? = "Available"
    var customer_number: String? = ""
    var customer_user_id: String? = ""

    var customer_id: String? = ""
    var customer_to_pay: String? = "0"
    var customer_to_total: String? = "0"
    var book_id: String? = "0"

    private val markerAnimationHelper = MarkerAnimationHelper()
    private val uiHelper = UiHelper()

    var driverStatusTextView: TextView? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val sharedPreferences = getSharedPreferences("Onfon", 0)
        Intrinsics.checkNotNull(sharedPreferences)

        val mapFragment: SupportMapFragment =
            supportFragmentManager.findFragmentById(R.id.supportMap) as SupportMapFragment
        mapFragment.getMapAsync(OnMapReadyCallback { p0 -> googleMap = p0!! })
        createLocationCallback()
        locationProviderClient = LocationServices.getFusedLocationProviderClient(this)
        locationRequest = uiHelper.getLocationRequest()
        if (!uiHelper.isPlayServicesAvailable(this)) {
            Toast.makeText(this, "Play Services did not installed!", Toast.LENGTH_SHORT).show()
            finish()
        } else requestLocationUpdate()
        requestNotificationPermission()
        driverStatusTextView = findViewById<TextView>(R.id.driverStatusTextView)

        findViewById<Button>(R.id.actionnbtn).setOnClickListener {
            takeAction()
        }

        fetchStatus()

        RetrofitClient.instance!!.api.getSpecific(
            sharedPreferences.getString("user_id", "").toString()
        )!!.enqueue(object :
            Callback<ResponseBody?> {
            override fun onResponse(
                call: Call<ResponseBody?>,
                response: Response<ResponseBody?>
            ) {
                val jSONObject = JSONObject(response.body()!!.string())

                if (!response.isSuccessful || response.code() !== 200) {
                    Toast.makeText(
                        this@MainActivity,
                        jSONObject.getString("message"),
                        Toast.LENGTH_SHORT
                    )
                        .show()
                    return
                } else {

                    if ((jSONObject.getString("data")).isNotEmpty()) {
                        val jsonArray = JSONArray(jSONObject.getString("data"))
                        val itemObj = jsonArray.getJSONObject(0)
                        Log.i("onEmptyvvResponse", "" + itemObj) //

                        driver_status = itemObj.getString("booking_status")
                        if (itemObj.getString("active_status") == "active") {
                            findViewById<SwitchCompat>(R.id.driverStatusSwitch).isChecked = true
                            driverOnlineFlag = true
                            driverStatusTextView?.text = resources.getString(R.string.online_driver)
                        } else {

                            findViewById<SwitchCompat>(R.id.driverStatusSwitch).isChecked = false
                            driverOnlineFlag = false
                            driverStatusTextView?.text = resources.getString(R.string.offline)

                        }
                    }

                    Toast.makeText(this@MainActivity, "Success", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                Log.i("onEmptyvvResponse", "" + t) //
                Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT).show()
            }
        })
        findViewById<ImageView>(R.id.logut).setOnClickListener {
            val sharedPreferences = applicationContext.getSharedPreferences("Onfon", 0)
            val edit = sharedPreferences.edit()
            Intrinsics.checkNotNullExpressionValue(edit, "pref!!.edit()")
            edit.putBoolean("isLogin", false)
            edit.clear()
            edit.apply()
            DriverLocationService.stop(this)
            startActivity(Intent(this, Login::class.java))
            finish()
        }
        findViewById<SwitchCompat>(R.id.driverStatusSwitch).setOnCheckedChangeListener { _, b ->
            driverOnlineFlag = b
            if (driverOnlineFlag) {
                DriverLocationService.start(this)
                driverStatusTextView?.text = resources.getString(R.string.online_driver)

                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["id"] = sharedPreferences.getString("user_id", "").toString()
                params["status"] = "active"
                RetrofitClient.instance!!.api.switchUser(params)!!.enqueue(object :
                    Callback<ResponseBody?> {
                    override fun onResponse(
                        call: Call<ResponseBody?>,
                        response: Response<ResponseBody?>
                    ) {
                        val jSONObject = JSONObject(response.body()!!.string())
                        if (!response.isSuccessful || response.code() !== 200) {
                            Toast.makeText(
                                this@MainActivity,
                                jSONObject.getString("message"),
                                Toast.LENGTH_SHORT
                            )
                                .show()
                            return
                        } else {

                            Toast.makeText(this@MainActivity, "Success", Toast.LENGTH_SHORT).show()
                        }
                    }

                    override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                        Log.i("onEmptyvvResponse", "" + t) //
                        Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT)
                            .show()
                    }
                })
            } else {
                DriverLocationService.stop(this)
                driverStatusTextView?.text = resources.getString(R.string.offline)

                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["id"] = sharedPreferences.getString("user_id", "").toString()
                params["status"] = "inactive"
                RetrofitClient.instance!!.api.switchUser(params)!!.enqueue(object :
                    Callback<ResponseBody?> {
                    override fun onResponse(
                        call: Call<ResponseBody?>,
                        response: Response<ResponseBody?>
                    ) {
                        val jSONObject = JSONObject(response.body()!!.string())
                        if (!response.isSuccessful || response.code() !== 200) {
                            Toast.makeText(
                                this@MainActivity,
                                jSONObject.getString("message"),
                                Toast.LENGTH_SHORT
                            )
                                .show()
                            return
                        } else {

                            Toast.makeText(this@MainActivity, "Success", Toast.LENGTH_SHORT).show()
                        }
                    }

                    override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                        Log.i("onEmptyvvResponse", "" + t) //
                        Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT)
                            .show()

                    }
                })

            }
        }
    }

    private fun fetchStatus() {

        val sharedPreferences = getSharedPreferences("Onfon", 0)
        Intrinsics.checkNotNull(sharedPreferences)
        RetrofitClient.instance!!.api.getSpecific(
            sharedPreferences.getString("user_id", "").toString()
        )!!.enqueue(object :
            Callback<ResponseBody?> {
            override fun onResponse(
                call: Call<ResponseBody?>,
                response: Response<ResponseBody?>
            ) {
                val jSONObject = JSONObject(response.body()!!.string())

                if (!response.isSuccessful || response.code() !== 200) {
                    Toast.makeText(
                        this@MainActivity,
                        jSONObject.getString("message"),
                        Toast.LENGTH_SHORT
                    )
                        .show()
                    return
                } else {

                    if ((jSONObject.getString("data")).isNotEmpty()) {
                        val jsonArray = JSONArray(jSONObject.getString("data"))
                        val itemObj = jsonArray.getJSONObject(0)
                        Log.i("onEmptyvvResponse", "" + itemObj) //

                        driver_status = itemObj.getString("booking_status")

                        customer_user_id = itemObj.getString("muser_id")

                        customer_id = itemObj.getString("id_number_cus")
                        customer_number = itemObj.getString("msisdn_cus")
                        customer_to_pay = itemObj.getString("amount_paid")
                        customer_to_total = itemObj.getString("amount_to_pay")
                        book_id = itemObj.getString("booking_id")



                        if (itemObj.getString("active_status") == "active") {
                            findViewById<SwitchCompat>(R.id.driverStatusSwitch).isChecked = true
                            driverOnlineFlag = true
                            driverStatusTextView!!.text =
                                resources.getString(R.string.online_driver)
                        } else {
                            findViewById<SwitchCompat>(R.id.driverStatusSwitch).isChecked = false
                            driverOnlineFlag = false
                            driverStatusTextView!!.text = resources.getString(R.string.offline)
                        }
                    }
                    Toast.makeText(this@MainActivity, "Success", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                Log.i("onEmptyvvResponse", "" + t) //
                Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT).show()
            }
        })
        findViewById<ImageView>(R.id.logut).setOnClickListener {
            val sharedPreferences = applicationContext.getSharedPreferences("Onfon", 0)
            val edit = sharedPreferences.edit()
            Intrinsics.checkNotNullExpressionValue(edit, "pref!!.edit()")
            edit.putBoolean("isLogin", false)
            edit.clear()
            edit.apply()
            DriverLocationService.stop(this)
            startActivity(Intent(this, Login::class.java))
            finish()
        }
        findViewById<SwitchCompat>(R.id.driverStatusSwitch).setOnCheckedChangeListener { _, b ->
            driverOnlineFlag = b
            if (driverOnlineFlag) {
                DriverLocationService.start(this)
                driverStatusTextView?.text = resources.getString(R.string.online_driver)

                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["id"] = sharedPreferences.getString("user_id", "").toString()
                params["status"] = "active"
                RetrofitClient.instance!!.api.switchUser(params)!!.enqueue(object :
                    Callback<ResponseBody?> {
                    override fun onResponse(
                        call: Call<ResponseBody?>,
                        response: Response<ResponseBody?>
                    ) {
                        val jSONObject = JSONObject(response.body()!!.string())
                        if (!response.isSuccessful || response.code() !== 200) {
                            Toast.makeText(
                                this@MainActivity,
                                jSONObject.getString("message"),
                                Toast.LENGTH_SHORT
                            )
                                .show()
                            return
                        } else {

                            Toast.makeText(this@MainActivity, "Success", Toast.LENGTH_SHORT).show()
                        }
                    }

                    override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                        Log.i("onEmptyvvResponse", "" + t) //
                        Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT)
                            .show()
                    }
                })
            } else {
                DriverLocationService.stop(this)
                driverStatusTextView?.text = resources.getString(R.string.offline)

                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["id"] = sharedPreferences.getString("user_id", "").toString()
                params["status"] = "inactive"
                RetrofitClient.instance!!.api.switchUser(params)!!.enqueue(object :
                    Callback<ResponseBody?> {
                    override fun onResponse(
                        call: Call<ResponseBody?>,
                        response: Response<ResponseBody?>
                    ) {
                        val jSONObject = JSONObject(response.body()!!.string())
                        if (!response.isSuccessful || response.code() !== 200) {
                            Toast.makeText(
                                this@MainActivity,
                                jSONObject.getString("message"),
                                Toast.LENGTH_SHORT
                            )
                                .show()
                            return
                        } else {

                            Toast.makeText(this@MainActivity, "Success", Toast.LENGTH_SHORT).show()
                        }
                    }

                    override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                        Log.i("onEmptyvvResponse", "" + t) //
                        Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT)
                            .show()

                    }
                })

            }
        }
    }

    @SuppressLint("SuspiciousIndentation", "MissingInflatedId", "SetTextI18n")
    fun takeAction() {
        fetchStatus()
        val sharedPreferences = getSharedPreferences("Onfon", 0)
        val alertDialog = AlertDialog.Builder(this)
        val inflater: LayoutInflater =
            getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        val layout_pwd: View =
            inflater.inflate(R.layout.layout_action, null)
        alertDialog.setView(layout_pwd)
        alert2 = alertDialog.create()
        var mstatus = driver_status
        val mid_submit =
            layout_pwd.findViewById<View>(R.id.update) as View

        val make_report =
            layout_pwd.findViewById<View>(R.id.btnReport) as View
        make_report.visibility = View.GONE
        val mid_logout =
            layout_pwd.findViewById<View>(R.id.logout) as View
        val mid_booking =
            layout_pwd.findViewById<Button>(R.id.btnAction) as Button
        val margintext =
            layout_pwd.findViewById<TextView>(R.id.tvName) as TextView

        val marginEdit: EditText =
            layout_pwd.findViewById(R.id.report)

        val margindec =
            layout_pwd.findViewById<TextView>(R.id.tvdesc) as TextView

        if (driver_status == "available") {
            margindec.visibility = View.VISIBLE
            margintext.visibility = View.GONE
            mid_booking.visibility = View.GONE
            margindec.text = "Your are waiting for new jobs"
//                mid_booking.text = "Request Payment"
//                mstatus = "Finished"
        }
        if (driver_status == "booked") {
            margindec.visibility = View.VISIBLE
            margintext.visibility = View.VISIBLE
            margintext.movementMethod = LinkMovementMethod.getInstance()
            margintext.setLinkTextColor(getResources().getColor(R.color.colorSecod))
            val html =
                "You have been booked, booking number $book_id: Call $customer_number for direction and inquiries."
            margintext.text = html
            Linkify.addLinks(margintext, Linkify.WEB_URLS or Linkify.PHONE_NUMBERS)
            Linkify.addLinks(margintext, Linkify.ALL)
            margindec.text = "Have you arrived? Click below"
            mid_booking.text = "I have Arrived"
            mstatus = "arrived"
        }
        if (driver_status == "arrived") {
            margindec.visibility = View.GONE
            margintext.visibility = View.VISIBLE
            val bal = customer_to_total?.toInt()!! - customer_to_pay?.toInt()!!
//            margindec.text = "Click on the below to request customer for final payment of Ksh. $bal. Call $customer_number to close booking number $book_id"
            margintext.movementMethod = LinkMovementMethod.getInstance()
            margintext.setLinkTextColor(getResources().getColor(R.color.colorSecod))
            val html =
                "Click on the below to request customer for final payment of Ksh. $bal. Call $customer_number to close booking number $book_id"
            margintext.text = html
            Linkify.addLinks(margintext, Linkify.WEB_URLS or Linkify.PHONE_NUMBERS)
            Linkify.addLinks(margintext, Linkify.ALL)
            mid_booking.text = "Request Payment"
            mstatus = "finisheddx"
        }

        if (driver_status == "finished") {
            margindec.visibility = View.GONE
            margintext.visibility = View.VISIBLE
            marginEdit.visibility = View.VISIBLE
            mid_booking.visibility = View.VISIBLE
            make_report.visibility = View.VISIBLE

            val bal = customer_to_total?.toInt()!! - customer_to_pay?.toInt()!!
//            margindec.text = "Click on the below to request customer for final payment of Ksh. $bal. Call $customer_number to close booking number $book_id"
            margintext.movementMethod = LinkMovementMethod.getInstance()
            margintext.setLinkTextColor(getResources().getColor(R.color.colorSecod))
            val html =
                "Click on the below to request customer for final payment of Ksh. $bal. Call $customer_number to close booking number $book_id"
            margintext.text = html
            Linkify.addLinks(margintext, Linkify.WEB_URLS or Linkify.PHONE_NUMBERS)
            Linkify.addLinks(margintext, Linkify.ALL)
            mid_booking.text = "Request Payment"
        }
        mid_submit.setOnClickListener {
            fetchStatus()
            alert2!!.dismiss()
        }

        mid_logout.setOnClickListener {
            val sharedPreferences = applicationContext.getSharedPreferences("Onfon", 0)
            val edit = sharedPreferences.edit()
            Intrinsics.checkNotNullExpressionValue(edit, "pref!!.edit()")
            edit.putBoolean("isLogin", false)
            edit.clear()
            edit.apply()
            DriverLocationService.stop(this)
            startActivity(Intent(this, Login::class.java))
            finish()
        }
        mid_booking.setOnClickListener {
            if (mstatus == "arrived") {
                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["id"] = sharedPreferences.getString("user_id", "").toString()
                params["status"] = mstatus
                params["customer_number"] = customer_number.toString()

                RetrofitClient.instance!!.api.updatebooking(params)!!.enqueue(object :
                    Callback<ResponseBody?> {
                    override fun onResponse(
                        call: Call<ResponseBody?>,
                        response: Response<ResponseBody?>
                    ) {
                        val jSONObject = JSONObject(response.body()!!.string())
                        fetchStatus()
                        alert2!!.dismiss()
                        Toast.makeText(this@MainActivity, "Success", Toast.LENGTH_SHORT)
                            .show()
                    }

                    override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                        Log.i("onEmptyvvResponse", "" + t) //
                        Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT)
                            .show()
                    }
                })
            }
            if (mstatus == "finisheddx") {
                val param: java.util.HashMap<String, String> = java.util.HashMap()
                param["id"] = sharedPreferences.getString("user_id", "").toString()
                param["status"] = "finished"
                param["customer_number"] = customer_number.toString()
                RetrofitClient.instance!!.api.updatebooking(param)!!.enqueue(object :
                    Callback<ResponseBody?> {
                    override fun onResponse(
                        call: Call<ResponseBody?>,
                        response: Response<ResponseBody?>
                    ) {
                        val jSONObject = JSONObject(response.body()!!.string())
                        fetchStatus()
                        alert2!!.dismiss()
                        Toast.makeText(this@MainActivity, "Success", Toast.LENGTH_SHORT)
                            .show()
                    }

                    override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                        Log.i("onEmptyvvResponse", "" + t) //
                        Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT)
                            .show()
                    }
                })
                val bal = customer_to_total?.toInt()!! - customer_to_pay?.toInt()!!
                val pref2: SharedPreferences = getSharedPreferences("Onfon", 0)
                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["id_number"] = customer_id.toString()
                params["msisdn"] = customer_number.toString()
                params["id_record"] = customer_user_id.toString()
                params["amount"] = bal.toString()
                RetrofitClient.instance!!.api.StK2(params)!!
                    .enqueue(object : Callback<ResponseBody?> {
                        override fun onResponse(
                            call: Call<ResponseBody?>, response: Response<ResponseBody?>
                        ) {
                            if (response.isSuccessful && response.code() == 200) {
                                try {
                                    successDialogue(alert2)
                                } catch (e: JSONException) {
                                    Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                                } catch (e: IOException) {
                                    Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                                }
                            } else {
//                                    Log.d("string", response.errorBody()!!.string())
                            }
                        }

                        override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                            Log.i("onEmptyvvResponse", "" + t) //
                        }
                    })
            }
            if (mstatus == "finished") {
                val bal = customer_to_total?.toInt()!! - customer_to_pay?.toInt()!!
                val pref2: SharedPreferences = getSharedPreferences("Onfon", 0)
                val params: java.util.HashMap<String, String> = java.util.HashMap()
                params["id_number"] = customer_id.toString()
                params["msisdn"] = customer_number.toString()
                params["id_record"] = customer_user_id.toString()
                params["amount"] = bal.toString()
                RetrofitClient.instance!!.api.StK2(params)!!
                    .enqueue(object : Callback<ResponseBody?> {
                        override fun onResponse(
                            call: Call<ResponseBody?>, response: Response<ResponseBody?>
                        ) {
                            if (response.isSuccessful && response.code() == 200) {
                                try {
                                    successDialogue(alert2)
                                } catch (e: JSONException) {
                                    Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                                } catch (e: IOException) {
                                    Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                                }
                            } else {
//                                    Log.d("string", response.errorBody()!!.string())
                            }
                        }

                        override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                            Log.i("onEmptyvvResponse", "" + t) //
                        }
                    })
            }
        }

        make_report.setOnClickListener {
            margindec.visibility = View.GONE
            margintext.visibility = View.VISIBLE
            val bal = customer_to_total?.toInt()!! - customer_to_pay?.toInt()!!
            val pref2: SharedPreferences = getSharedPreferences("Onfon", 0)
            val params: java.util.HashMap<String, String> = java.util.HashMap()
            val medit = marginEdit.getText().toString();

            if (medit.isEmpty()) {
                Toast.makeText(this@MainActivity, "Complain can not be empty", Toast.LENGTH_SHORT)
                    .show()
            } else {
                params["id_number"] = customer_id.toString()
                params["msisdn"] = customer_number.toString()
                params["id_record"] = customer_user_id.toString()
                params["notes"] = medit
                params["user_id"] = sharedPreferences.getString("user_id", "").toString()
                params["book_id"] = book_id.toString()
                params["amount"] = bal.toString()
                RetrofitClient.instance!!.api.makeReport(params)!!
                    .enqueue(object : Callback<ResponseBody?> {
                        override fun onResponse(
                            call: Call<ResponseBody?>, response: Response<ResponseBody?>
                        ) {
                            if (response.isSuccessful && response.code() == 200) {
                                try {
                                    fetchStatus()
                                    alert2!!.dismiss()
                                } catch (e: JSONException) {
                                    fetchStatus()
                                    Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                                } catch (e: IOException) {
                                    fetchStatus()
                                    Log.d(ContentValues.TAG, "addItemsFromJSON: ", e)
                                }
                            } else {
                                fetchStatus()
//                                    Log.d("string", response.errorBody()!!.string())
                            }
                        }
                        override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                            fetchStatus()
                            Log.i("onEmptyvvResponse", "" + t) //
                        }
                    })
            }
        }
        alert2!!.setCancelable(false)
        alert2!!.show()
    }


    fun successDialogue(alert2: AlertDialog?) {
        AestheticDialog.Builder(this, DialogStyle.FLAT, DialogType.SUCCESS)
            .setTitle("Payment Request Sent Successfully").setMessage("").setCancelable(false)
            .setDarkMode(true).setGravity(Gravity.CENTER).setAnimation(DialogAnimation.SHRINK)
            .setOnClickListener(object : OnDialogClickListener {
                override fun onClick(dialog: AestheticDialog.Builder) {
                    dialog.dismiss()
                    alert2!!.dismiss()
                }
            }).show()
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
                Log.e("Location", locationResult.toString() + " , " + latLng.longitude)
                if (locationFlag) {
                    locationFlag = false
                    animateCamera(latLng)
                }
                // Publishing over the socket + backend is owned by DriverLocationService
                // so it keeps working when the app is backgrounded. This callback
                // only drives the on-screen map.
                showOrAnimateMarker(latLng)
            }
        }
    }

    private fun showOrAnimateMarker(latLng: LatLng) {
        if (currentPositionMarker == null)
            currentPositionMarker =
                googleMap.addMarker(googleMapHelper.getDriverMarkerOptions(latLng))
        else markerAnimationHelper.animateMarkerToGB(
            currentPositionMarker!!,
            latLng,
            LatLngInterpolator.Spherical()
        )
    }

    private fun animateCamera(latLng: LatLng) {
        val cameraUpdate = googleMapHelper.buildCameraUpdate(latLng)
        googleMap.animateCamera(cameraUpdate, 10, null)
    }

    fun getAddress(lat: Double, lng: Double) {
        val geocoder = Geocoder(this, Locale.getDefault())
        try {
            val addresses: List<Address>? = geocoder.getFromLocation(lat, lng, 5)
            val obj: Address = addresses!![0]
            updateLocation(lat.toString(), lng.toString(), obj.locality)
            // TennisAppActivity.showDialog(add);
        } catch (e: IOException) {
            // TODO Auto-generated catch block
            e.printStackTrace()
            Toast.makeText(this, e.message, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == MY_PERMISSIONS_REQUEST_ACCESS_FINE_LOCATION) {
            val value = grantResults[0]
            if (value == PERMISSION_DENIED) {
                Toast.makeText(this, "Location Permission denied", Toast.LENGTH_SHORT).show()
                finish()
            } else if (value == PERMISSION_GRANTED) requestLocationUpdate()
        }

    }

    /** Android 13+ needs runtime consent to show the foreground-service notification. */
    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                3001
            )
        }
    }


    fun updateLocation(lat: String, longitude: String, loc: String) {
        val sharedPreferences = getSharedPreferences("Onfon", 0)

        val params: java.util.HashMap<String, String> = java.util.HashMap()
        params["id"] = sharedPreferences.getString("user_id", "").toString()
        params["longitude"] = longitude
        params["lat"] = lat
        params["location"] = loc

        RetrofitClient.instance!!.api.updateLocation(params)!!.enqueue(object :
            Callback<ResponseBody?> {
            override fun onResponse(
                call: Call<ResponseBody?>,
                response: Response<ResponseBody?>
            ) {
            }

            override fun onFailure(call: Call<ResponseBody?>, t: Throwable) {
                Log.i("onEmptyvvResponse", "" + t) //
                Toast.makeText(this@MainActivity, "Error switching", Toast.LENGTH_SHORT).show()
            }
        })
    }

}

