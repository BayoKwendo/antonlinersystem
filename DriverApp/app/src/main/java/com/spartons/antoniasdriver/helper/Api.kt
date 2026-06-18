package com.spartons.antoniasdriver.helper

import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.POST
import retrofit2.http.Query

interface Api {
    @POST("checkStk")
    fun CheckStK(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @POST("nearby")
    fun NearBy(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @POST("service_url")
    fun Service(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @POST("stk")
    fun StK(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @POST("stk_t")
    fun StK2(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @POST("make_report")
    fun makeReport(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @POST("initiate_airtime_deposit")
    @Headers("Content-Type: application/json")
    fun airtime(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("loan_request")
    fun applyLoan(@Body map: Map<String?, String?>?): Call<ResponseBody?>?
    fun changePaymentPlan(hashMap: HashMap<String?, Int?>?): Call<ResponseBody?>?

    @POST("change_customer_payment_plan")
    @Headers("Content-Type: application/json")
    fun changePaymentPlan(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("entity_customer")
    fun checkEntity(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("customer/stk/clear/loan")
    @Headers("Content-Type: application/json")
    fun clearLoan(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("customer_loans")
    fun customerLoans(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("initiate_repayment")
    @Headers("Content-Type: application/json")
    fun deposit(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("forgot_password")
    @Headers("Content-Type: application/json")
    fun forgot(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("instalment_post")
    fun fuliza_statement(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @GET("users")
    fun getSpecific(@Query("id") i: String): Call<ResponseBody?>?

    @GET("users")
    fun getFetch(@Query("id_number") str: String?): Call<ResponseBody?>?
    @POST("login")
    @Headers("Content-Type: application/json")
    fun login(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @POST("registration_otp")
    @Headers("Content-Type: application/json")
    fun optRequest(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("customer_payment_plans_available")
    fun paymentPlan(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("deactivate_user")
    fun switchUser(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @POST("booking_status")
    fun updatebooking(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?


    @POST("update_location")
    fun updateLocation(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?
    @POST("register")
    @Headers("Content-Type: application/json")
    fun register(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("reset_password")
    @Headers("Content-Type: application/json")
    fun reset(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("customer_statements")
    fun statement(@Body map: Map<String?, String?>?): Call<ResponseBody?>?

    @POST("stktest")
    fun stkP(@Body map: java.util.HashMap<String, String>): Call<ResponseBody?>?

    @GET("/")
    fun testSMS(): Call<ResponseBody?>?

    @POST("initiate_token_deposit")
    @Headers("Content-Type: application/json")
    fun token_deposit(@Body map: Map<String?, String?>?): Call<ResponseBody?>?
}