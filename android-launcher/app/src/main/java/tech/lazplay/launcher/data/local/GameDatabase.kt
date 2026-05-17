package tech.lazplay.launcher.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [InstalledGameEntity::class], version = 1, exportSchema = false)
abstract class GameDatabase : RoomDatabase() {
    abstract fun installedGameDao(): InstalledGameDao

    companion object {
        @Volatile
        private var instance: GameDatabase? = null

        fun get(context: Context): GameDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    GameDatabase::class.java,
                    "lazplay_launcher.db",
                ).build().also { instance = it }
            }
    }
}
