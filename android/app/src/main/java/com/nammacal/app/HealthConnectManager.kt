package com.nammacal.app

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.Period
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * HealthConnectManager handles communication with Android Health Connect.
 *
 * Invariants:
 * 1. Read-only permissions: READ_STEPS, READ_EXERCISE, READ_DISTANCE, READ_ACTIVE_CALORIES_BURNED, READ_TOTAL_CALORIES_BURNED.
 * 2. Source attribution: Every step count and workout preserves its source origin.
 * 3. NO GPS / distance-to-step inference: If steps are absent, they remain null. Never infer steps from distance or GPS.
 * 4. Calorie provenance: All calories reported from Health Connect are marked 'device_reported'.
 */
class HealthConnectManager(private val context: Context) {

    val requiredPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
    )

    fun getSdkStatus(): String {
        val status = HealthConnectClient.getSdkStatus(context)
        return when (status) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "needs_update"
            HealthConnectClient.SDK_UNAVAILABLE -> "unavailable"
            else -> "unsupported"
        }
    }

    fun isAvailable(): Boolean {
        return HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    }

    private fun getClient(): HealthConnectClient? {
        return if (isAvailable()) {
            HealthConnectClient.getOrCreate(context)
        } else {
            null
        }
    }

    suspend fun getGrantedPermissions(): Set<String> {
        val client = getClient() ?: return emptySet()
        return client.permissionController.getGrantedPermissions()
    }

    suspend fun hasAllPermissions(): Boolean {
        val granted = getGrantedPermissions()
        return granted.containsAll(requiredPermissions)
    }

    /**
     * Reads aggregated daily steps for a specified date range.
     * Prevents double-counting by returning aggregated daily totals per date bucket.
     */
    suspend fun getDailySteps(startInstant: Instant, endInstant: Instant): List<DailyStepItem> {
        val client = getClient() ?: return emptyList()
        val zoneId = ZoneId.systemDefault()
        val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(zoneId)

        val request = AggregateGroupByPeriodRequest(
            metrics = setOf(StepsRecord.COUNT_TOTAL),
            timeRangeFilter = TimeRangeFilter.between(startInstant, endInstant),
            timeRangeSlicer = Period.ofDays(1)
        )

        val response = client.aggregateGroupByPeriod(request)
        val results = mutableListOf<DailyStepItem>()

        for (bucket in response) {
            val stepCount = bucket.result[StepsRecord.COUNT_TOTAL] ?: 0L
            val dateStr = dateFormatter.format(bucket.startTime)
            val origins = bucket.dataOrigins.map { it.packageName }

            results.add(
                DailyStepItem(
                    date = dateStr,
                    steps = stepCount.toInt(),
                    sourceOrigins = origins
                )
            )
        }

        return results
    }

    /**
     * Reads exercise sessions within the specified time range.
     * Maps Health Connect exercise types to NammaCal activity types deterministically.
     * Reads associated distance and energy metrics for the session interval.
     */
    suspend fun getExerciseSessions(startInstant: Instant, endInstant: Instant): List<ExerciseSessionItem> {
        val client = getClient() ?: return emptyList()

        val request = ReadRecordsRequest(
            recordType = ExerciseSessionRecord::class,
            timeRangeFilter = TimeRangeFilter.between(startInstant, endInstant)
        )

        val response = client.readRecords(request)
        val sessions = mutableListOf<ExerciseSessionItem>()

        for (record in response.records) {
            val durationMinutes = ChronoUnit.MINUTES.between(record.startTime, record.endTime).coerceAtLeast(1).toInt()
            val mappedType = mapHealthConnectExerciseType(record.exerciseType)
            val origin = record.metadata.dataOrigin.packageName

            // Query session aggregates for active calories, total calories, distance, and steps
            val sessionTimeFilter = TimeRangeFilter.between(record.startTime, record.endTime)
            val aggregateRequest = AggregateRequest(
                metrics = setOf(
                    ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
                    TotalCaloriesBurnedRecord.ENERGY_TOTAL,
                    DistanceRecord.DISTANCE_TOTAL,
                    StepsRecord.COUNT_TOTAL
                ),
                timeRangeFilter = sessionTimeFilter
            )

            val sessionAggregate = try {
                client.aggregate(aggregateRequest)
            } catch (e: Exception) {
                null
            }

            var caloriesBurned: Double? = null
            var calorieProvenance: String? = null

            val activeEnergy = sessionAggregate?.get(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
            val totalEnergy = sessionAggregate?.get(TotalCaloriesBurnedRecord.ENERGY_TOTAL)

            if (activeEnergy != null && activeEnergy.inKilocalories > 0) {
                caloriesBurned = Math.round(activeEnergy.inKilocalories * 10.0) / 10.0
                calorieProvenance = "device_reported"
            } else if (totalEnergy != null && totalEnergy.inKilocalories > 0) {
                caloriesBurned = Math.round(totalEnergy.inKilocalories * 10.0) / 10.0
                calorieProvenance = "device_reported"
            }

            var distanceKm: Double? = null
            val distance = sessionAggregate?.get(DistanceRecord.DISTANCE_TOTAL)
            if (distance != null && distance.inKilometers > 0) {
                distanceKm = Math.round(distance.inKilometers * 100.0) / 100.0
            }

            // CRITICAL INVARIANT: Only use steps if explicitly recorded in the StepsRecord.
            // Never infer steps from distance or GPS.
            val sessionSteps = sessionAggregate?.get(StepsRecord.COUNT_TOTAL)?.toInt()

            val zoneId = ZoneId.systemDefault()
            val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(zoneId)
            val logDate = dateFormatter.format(record.startTime)

            sessions.add(
                ExerciseSessionItem(
                    externalRecordId = record.metadata.id,
                    activityType = mappedType,
                    durationMinutes = durationMinutes,
                    distanceKm = distanceKm,
                    steps = sessionSteps,
                    caloriesBurned = caloriesBurned,
                    calorieProvenance = calorieProvenance,
                    startTime = record.startTime.toString(),
                    endTime = record.endTime.toString(),
                    loggedAt = logDate,
                    title = record.title,
                    notes = record.notes,
                    sourceOrigin = origin
                )
            )
        }

        return sessions
    }

    /**
     * Deterministic mapping from Health Connect exercise type to NammaCal activity type.
     */
    private fun mapHealthConnectExerciseType(type: Int): String {
        return when (type) {
            ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "walking"
            ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
            ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "running"
            ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
            ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY -> "cycling"
            ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
            ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING,
            ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS -> "strength_training"
            ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING,
            ExerciseSessionRecord.EXERCISE_TYPE_BOOTCAMP,
            ExerciseSessionRecord.EXERCISE_TYPE_GYMNASTICS -> "gym_workout"
            ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL,
            ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER -> "swimming"
            ExerciseSessionRecord.EXERCISE_TYPE_YOGA,
            ExerciseSessionRecord.EXERCISE_TYPE_PILATES -> "yoga"
            ExerciseSessionRecord.EXERCISE_TYPE_BADMINTON,
            ExerciseSessionRecord.EXERCISE_TYPE_CRICKET,
            ExerciseSessionRecord.EXERCISE_TYPE_FOOTBALL_AMERICAN,
            ExerciseSessionRecord.EXERCISE_TYPE_FOOTBALL_AUSTRALIAN,
            ExerciseSessionRecord.EXERCISE_TYPE_SOCCER,
            ExerciseSessionRecord.EXERCISE_TYPE_BASKETBALL,
            ExerciseSessionRecord.EXERCISE_TYPE_TENNIS,
            ExerciseSessionRecord.EXERCISE_TYPE_TABLE_TENNIS,
            ExerciseSessionRecord.EXERCISE_TYPE_SQUASH,
            ExerciseSessionRecord.EXERCISE_TYPE_VOLLEYBALL,
            ExerciseSessionRecord.EXERCISE_TYPE_MARTIAL_ARTS -> "sports"
            else -> "other"
        }
    }
}

data class DailyStepItem(
    val date: String,
    val steps: Int,
    val sourceOrigins: List<String>
)

data class ExerciseSessionItem(
    val externalRecordId: String,
    val activityType: String,
    val durationMinutes: Int,
    val distanceKm: Double?,
    val steps: Int?,
    val caloriesBurned: Double?,
    val calorieProvenance: String?,
    val startTime: String,
    val endTime: String,
    val loggedAt: String,
    val title: String?,
    val notes: String?,
    val sourceOrigin: String
)
