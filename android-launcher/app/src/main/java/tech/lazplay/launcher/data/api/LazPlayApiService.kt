package tech.lazplay.launcher.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface LazPlayApiService {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<ApiEnvelope<LoginResponse>>

    @GET("auth/me")
    suspend fun me(@Header("Authorization") authorization: String): Response<ApiEnvelope<UserDto>>

    @GET("library")
    suspend fun library(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Query("platform") platform: String,
    ): Response<ApiEnvelope<List<LibraryItemDto>>>

    @POST("library")
    suspend fun claimGame(
        @Header("Authorization") authorization: String,
        @Body body: ClaimGameRequest,
    ): Response<ApiEnvelope<LibraryItemDto>>
}
