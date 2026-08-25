<template>
  <!-- Shown only to the attendee actually being recorded (gated by the
       caller on recordingMode.shouldRecord) — the only visible sign a
       recording is happening at all, or that it briefly stalled. Sits in
       the topbar next to the timer, so it stays compact: a blinking dot and
       a short "REC" tag, nothing more. -->
  <v-tooltip v-if="active || pending" location="bottom" :text="tooltipText">
    <template #activator="{ props: tip }">
      <div v-bind="tip" class="recording-indicator" :class="{ 'recording-indicator--pending': pending }">
        <span class="recording-indicator__dot" />
        <span class="recording-indicator__label">{{ label }}</span>
      </div>
    </template>
  </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  // A segment is actively recording right now.
  active: { type: Boolean, default: false },
  // Recording is expected but not yet running (grace-wait on a track, or a
  // cutover in progress) — distinct from `active` so a brief gap reads as
  // "about to record" rather than looking identical to "not recording".
  pending: { type: Boolean, default: false },
})

const label = computed(() =>
  props.active ? t('focusGroup.session.recordingActive') : '',
)
const tooltipText = computed(() =>
  props.active
    ? t('focusGroup.session.recordingActiveHint')
    : t('focusGroup.session.recordingPendingHint'),
)
</script>

<style scoped>
.recording-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-error), 0.12);
  color: rgb(var(--v-theme-error));
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.recording-indicator--pending {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.recording-indicator__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.recording-indicator:not(.recording-indicator--pending) .recording-indicator__dot {
  animation: recording-indicator-pulse 1.6s ease-in-out infinite;
}

@keyframes recording-indicator-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
