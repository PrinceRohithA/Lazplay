package tech.lazplay.launcher.data.api

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

data class ApiEnvelope<T>(
    val success: Boolean? = null,
    val data: T? = null,
    val error: ApiError? = null,
)

data class ApiError(
    val code: String? = null,
    val message: String? = null,
)

data class LoginRequest(
    val identifier: String,
    val password: String,
)

data class LoginResponse(
    @SerializedName("accessToken") val accessToken: String?,
    @SerializedName("refreshToken") val refreshToken: String?,
    val user: UserDto?,
)

data class UserDto(
    val id: String?,
    val username: String?,
    val email: String?,
    @SerializedName("displayName") val displayName: String?,
    val roles: List<String>? = null,
)

data class LibraryItemDto(
    val id: String? = null,
    @SerializedName("gameId") val gameId: String? = null,
    val title: String? = null,
    val slug: String? = null,
    val description: String? = null,
    val platforms: List<String>? = null,
    val version: String? = null,
    val size: Long? = null,
    val entrypoint: String? = null,
    @SerializedName("downloadUrl") val downloadUrl: String? = null,
    @SerializedName("usesChunkDistribution") val usesChunkDistribution: Boolean? = null,
    @SerializedName("coverUrl") val coverUrl: String? = null,
    @SerializedName("heroBannerUrl") val heroBannerUrl: String? = null,
    @SerializedName("heroImageUrl") val heroImageUrl: String? = null,
    val game: JsonElement? = null,
)

data class ClaimGameRequest(
    @SerializedName("gameId") val gameId: String,
)

data class ChunkDownloadUrlsRequest(
    val hashes: List<String>,
)

data class ChunkDownloadUrlItem(
    val hash: String,
    val url: String,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    val size: Long? = null,
)

data class ChunkDownloadUrlsResponse(
    val urls: List<ChunkDownloadUrlItem>? = null,
)

fun LibraryItemDto.resolvedGameId(): String =
    gameId ?: id.orEmpty()

fun LibraryItemDto.isAndroidGame(): Boolean {
    val p = platforms.orEmpty().map { it.uppercase() }
    return p.isEmpty() || p.any { it == "ANDROID" }
}

fun LibraryItemDto.isWebOnly(): Boolean {
    val web = setOf("WEB", "BROWSER", "HTML5")
    val p = platforms.orEmpty().map { it.uppercase() }
    return p.isNotEmpty() && p.all { it in web }
}
