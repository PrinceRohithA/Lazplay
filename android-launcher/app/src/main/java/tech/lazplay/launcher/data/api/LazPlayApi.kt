package tech.lazplay.launcher.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
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

    private var cachedUser: UserDto? = null

    fun clearCache() {
        cachedUser = null
    }

    suspend fun login(identifier: String, password: String): LoginResponse {
        clearCache()
        val response = service.login(LoginRequest(identifier.trim(), password))
        return unwrap(response) ?: throw ApiException("Empty login response")
    }

    suspend fun me(): UserDto {
        cachedUser?.let { return it }
        val response = service.me(authHeader())
        val user = unwrap(response) ?: throw ApiException("Empty profile response")
        cachedUser = user
        return user
    }

    suspend fun library(): List<LibraryItemDto> {
        val response = service.library(authHeader(), "ANDROID")
        return unwrap(response).orEmpty()
    }

    suspend fun claimGame(gameId: String) {
        val response = service.claimGame(authHeader(), ClaimGameRequest(gameId))
        unwrap(response)
    }

    private fun <T> unwrap(response: Response<ApiEnvelope<T>>): T? {
        if (!response.isSuccessful) {
            val err = response.errorBody()?.string()
            val cleanMessage = if (!err.isNullOrEmpty()) {
                try {
                    com.google.gson.Gson().fromJson(err, ApiEnvelope::class.java)?.error?.message
                } catch (e: Exception) {
                    null
                }
            } else {
                null
            }
            throw ApiException(cleanMessage ?: "HTTP ${response.code()}")
        }
        val body = response.body()
        if (body?.success == false) {
            throw ApiException(body.error?.message ?: "Request failed")
        }
        return body?.data
    }

    suspend fun tryRefresh(): Boolean {
        return try {
            val refreshToken = tokenStore.getRefreshToken()
                ?: return false
            val response = service.refresh(RefreshRequest(refreshToken))
            if (!response.isSuccessful) return false
            val body = response.body()
            if (body?.success == false) return false
            val data = body?.data ?: return false
            val newAccess = data.accessToken ?: return false
            val newRefresh = data.refreshToken ?: return false
            tokenStore.saveSession(newAccess, newRefresh)
            true
        } catch (e: Exception) {
            false
        }
    }

    companion object {
        fun create(tokenStore: TokenStore): LazPlayApi = LazPlayApi(tokenStore)

        private fun ensureTrailingSlash(url: String): String =
            if (url.endsWith("/")) url else "$url/"
    }
}

class ApiException(message: String) : Exception(message)
