package expo.modules.phoneusage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Encendidos y apagados de la pantalla, leídos con UsageStatsManager. Solo lee; nada sale del teléfono.
class PhoneUsageModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PhoneUsage")

    Function("hasAccess") {
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      }
      mode == AppOpsManager.MODE_ALLOWED
    }

    Function("openAccessSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    AsyncFunction("screenEvents") { start: Double, end: Double ->
      val result = mutableListOf<Map<String, Any>>()
      // Los eventos de pantalla existen desde Android 9.
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return@AsyncFunction result
      val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val events = manager.queryEvents(start.toLong(), end.toLong())
      val event = UsageEvents.Event()
      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        when (event.eventType) {
          UsageEvents.Event.SCREEN_INTERACTIVE -> result.add(mapOf("time" to event.timeStamp.toDouble(), "on" to true))
          UsageEvents.Event.SCREEN_NON_INTERACTIVE -> result.add(mapOf("time" to event.timeStamp.toDouble(), "on" to false))
        }
      }
      result
    }
  }
}
