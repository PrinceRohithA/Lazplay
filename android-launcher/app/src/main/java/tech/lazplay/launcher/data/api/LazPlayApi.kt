package tech.lazplay.launcher.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import tech.lazplay.launcher.BuildConfig
import tech.lazplay.launcher.data.local.TokenStore
import java.util.concurrent.TimeUnit

class LazPlayApi(private val tokenStore: TokenStore) {
    private val service: LazPlayApiService = Retrofit.Builder()
        .baseUrl(ensureTrailingSlash(BuildConfig.API_BASE_URL))
        .client(
            OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .writeTimeout(120, TimeUnit.SECONDS)
                .apply {
                    if (BuildConfig.DEBUG) {
                        addInterceptor(
                            HttpLoggingInterceptor().apply {
                                level = HttpLoggingInterceptor.Level.BASIC
                            },
                        )
                    }
                }
                .build(),
        )
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(LazPlayApiService::class.java)

    private fun authHeader(): String {
        val token = tokenStore.getAccessToken()
            ?: throw ApiException("Not authenticated")
        return "Bearer $token"
    }

    suspend fun login(identifier: String, password: String): LoginResponse {
        val response = service.login(LoginRequest(identifier.trim(), password))
        return unwrap(response) ?: throw ApiException("Empty login response")
    }

    suspend fun me(): UserDto {
        val response = service.me(authHeader())
        return unwrap(response) ?: throw ApiException("Empty profile response")
    }

    suspend fun library(): List<LibraryItemDto> {
        val response = service.library(authHeader())
        return unwrap(response).orEmpty()
    }

    suspend fun claimGame(gameId: String) {
        val response = service.claimGame(authHeader(), ClaimGameRequest(gameId))
        unwrap(response)
    }

    private fun <T> unwrap(response: Response<ApiEnvelope<T>>): T? {
        if (!response.isSuccessful) {
            val err = response.errorBody()?.string()
            throw ApiException(err ?: "HTTP ${response.code()}")
        }
        val body = response.body()
        if (body?.success == false) {
            throw ApiException(body.error?.message ?: "Request failed")
        }
        return body?.data
    }

    companion object {
        fun create(tokenStore: TokenStore): LazPlayApi = LazPlayApi(tokenStore)

        private fun ensureTrailingSlash(url: String): String =
            if (url.endsWith("/")) url else "$url/"
    }
}

class ApiException(message: String) : Exception(message)
