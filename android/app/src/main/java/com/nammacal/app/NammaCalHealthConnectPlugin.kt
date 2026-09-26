package com.nammacal.app

import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Capacitor native bridge plugin for Android Health Connect.
 * Exposes methods to JavaScript/TypeScript:
 * - checkAvailability
 * - checkPermissions
 * - requestPermissions
 * - getDailySteps
 * - getExerciseSessions
 * - openHealthConnectSettings
 */
@CapacitorPlugin(name = "NammaCalHealthConnect")
class NammaCalHealthConnectPlugin : Plugin() {

    private lateinit var healthConnectManager: HealthConnectManager
    private val scope = CoroutineScope(Dispatchers.IO)

    override fun load() {
        super.load()
        healthConnectManager = HealthConnectManager(context)
    }

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        val status = healthConnectManager.getSdkStatus()
        val ret = JSObject()
        ret.put("status", status)
        ret.put("isAvailable", status == "available")
        call.resolve(ret)
    }

    @PluginMethod
    fun checkPermissions(call: PluginCall) {
        scope.launch {
            try {
                val granted = healthConnectManager.getGrantedPermissions()
                val required = healthConnectManager.requiredPermissions
                val hasAll = granted.containsAll(required)

                val ret = JSObject()
                ret.put("hasAllPermissions", hasAll)

                val grantedArray = JSArray()
                for (p in granted) {
                    grantedArray.put(p)
                }
                ret.put("grantedPermissions", grantedArray)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Failed to check permissions: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (!healthConnectManager.isAvailable()) {
            call.reject("Health Connect is not available on this device")
            return
        }

        try {
            val contract = PermissionController.createRequestPermissionResultContract()
            val permissionIntent = contract.createIntent(context, healthConnectManager.requiredPermissions)
            startActivityForResult(call, permissionIntent, "handlePermissionResult")
        } catch (e: Exception) {
            try {
                val settingsIntent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
                activity.startActivity(settingsIntent)
                val ret = JSObject()
                ret.put("openedSettings", true)
                call.resolve(ret)
            } catch (e2: Exception) {
                call.reject("Failed to launch Health Connect permissions: ${e.message}", e)
            }
        }
    }

    @ActivityCallback
    private fun handlePermissionResult(call: PluginCall, result: androidx.activity.result.ActivityResult) {
        scope.launch {
            try {
                val granted = healthConnectManager.getGrantedPermissions()
                val required = healthConnectManager.requiredPermissions
                val hasAll = granted.containsAll(required)

                val ret = JSObject()
                ret.put("granted", hasAll)
                val grantedArray = JSArray()
                for (p in granted) {
                    grantedArray.put(p)
                }
                ret.put("grantedPermissions", grantedArray)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Failed to process permission result: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun getDailySteps(call: PluginCall) {
        val startDateStr = call.getString("startDate")
        val endDateStr = call.getString("endDate")

        scope.launch {
            try {
                val zoneId = ZoneId.systemDefault()
                val startInstant = if (startDateStr != null) {
                    LocalDate.parse(startDateStr).atStartOfDay(zoneId).toInstant()
                } else {
                    LocalDate.now().minusDays(7).atStartOfDay(zoneId).toInstant()
                }
                val endInstant = if (endDateStr != null) {
                    LocalDate.parse(endDateStr).plusDays(1).atStartOfDay(zoneId).toInstant()
                } else {
                    Instant.now()
                }

                val steps = healthConnectManager.getDailySteps(startInstant, endInstant)
                val stepsArray = JSArray()
                for (item in steps) {
                    val obj = JSObject()
                    obj.put("date", item.date)
                    obj.put("steps", item.steps)
                    val origins = JSArray()
                    for (origin in item.sourceOrigins) {
                        origins.put(origin)
                    }
                    obj.put("sourceOrigins", origins)
                    stepsArray.put(obj)
                }

                val ret = JSObject()
                ret.put("days", stepsArray)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Failed to get daily steps: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun getExerciseSessions(call: PluginCall) {
        val startDateStr = call.getString("startDate")
        val endDateStr = call.getString("endDate")

        scope.launch {
            try {
                val zoneId = ZoneId.systemDefault()
                val startInstant = if (startDateStr != null) {
                    LocalDate.parse(startDateStr).atStartOfDay(zoneId).toInstant()
                } else {
                    LocalDate.now().minusDays(7).atStartOfDay(zoneId).toInstant()
                }
                val endInstant = if (endDateStr != null) {
                    LocalDate.parse(endDateStr).plusDays(1).atStartOfDay(zoneId).toInstant()
                } else {
                    Instant.now()
                }

                val sessions = healthConnectManager.getExerciseSessions(startInstant, endInstant)
                val sessionsArray = JSArray()
                for (s in sessions) {
                    val obj = JSObject()
                    obj.put("externalRecordId", s.externalRecordId)
                    obj.put("activityType", s.activityType)
                    obj.put("durationMinutes", s.durationMinutes)
                    if (s.distanceKm != null) obj.put("distanceKm", s.distanceKm)
                    if (s.steps != null) obj.put("steps", s.steps)
                    if (s.caloriesBurned != null) obj.put("caloriesBurned", s.caloriesBurned)
                    if (s.calorieProvenance != null) obj.put("calorieProvenance", s.calorieProvenance)
                    obj.put("startTime", s.startTime)
                    obj.put("endTime", s.endTime)
                    obj.put("loggedAt", s.loggedAt)
                    if (s.title != null) obj.put("title", s.title)
                    if (s.notes != null) obj.put("notes", s.notes)
                    obj.put("sourceOrigin", s.sourceOrigin)
                    sessionsArray.put(obj)
                }

                val ret = JSObject()
                ret.put("sessions", sessionsArray)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Failed to get exercise sessions: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun openHealthConnectSettings(call: PluginCall) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            val ret = JSObject()
            ret.put("opened", true)
            call.resolve(ret)
        } catch (e: Exception) {
            try {
                val playStoreIntent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=com.google.android.apps.healthdata")
                )
                playStoreIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(playStoreIntent)
                val ret = JSObject()
                ret.put("openedPlayStore", true)
                call.resolve(ret)
            } catch (e2: Exception) {
                call.reject("Failed to open Health Connect settings: ${e.message}", e)
            }
        }
    }
}
