package tech.lazplay.launcher.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface InstalledGameDao {
    @Query("SELECT * FROM installed_games ORDER BY title ASC")
    fun observeAll(): Flow<List<InstalledGameEntity>>

    @Query("SELECT * FROM installed_games WHERE gameId = :gameId LIMIT 1")
    suspend fun get(gameId: String): InstalledGameEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(game: InstalledGameEntity)

    @Query("SELECT * FROM installed_games")
    suspend fun getAll(): List<InstalledGameEntity>

    @Query("DELETE FROM installed_games WHERE gameId = :gameId")
    suspend fun delete(gameId: String)

    @Query("DELETE FROM installed_games")
    suspend fun deleteAll()
}
