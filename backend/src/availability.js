const BLOCKING_STATUSES = ['pending', 'confirmed', 'needs_clarification'];
const BOOKING_DAYS_AHEAD = 120;

function toMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

function addMinutes(time, minutes) {
  return toTime(toMinutes(time) + minutes);
}

function overlaps(startA, endA, startB, endB) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB);
}

function getService(db, serviceId) {
  return db.services.find((service) => service.id === serviceId);
}

function getWorkingHoursRule(db) {
  return db.bookingRules.find((rule) => rule.type === 'working_hours' && rule.isActive);
}

function getRestMinutes(db) {
  const rule = db.bookingRules.find((item) => item.type === 'horse_rest_after_lesson' && item.isActive);
  return Number(rule?.config?.restMinutes ?? 30);
}

function getWorkingRange(db) {
  const workingRule = getWorkingHoursRule(db);
  return {
    startTime: String(workingRule?.config?.startTime ?? '09:00'),
    endTime: String(workingRule?.config?.endTime ?? '18:00'),
    slotStepMinutes: Number(workingRule?.config?.slotStepMinutes ?? 30),
  };
}

function isDateClosed(db, date) {
  const weekday = new Date(`${date}T00:00:00`).getDay();

  return db.bookingRules
    .filter((rule) => rule.type === 'closed_date' && rule.isActive)
    .map((rule) => {
      const dates = Array.isArray(rule.config?.dates) ? rule.config.dates : [];
      const weekDays = Array.isArray(rule.config?.weekDays) ? rule.config.weekDays : [];
      const reason = typeof rule.config?.reason === 'string' ? rule.config.reason : 'Выбранный день закрыт для записи';
      return {
        closed: dates.includes(date) || weekDays.includes(weekday),
        reason,
      };
    })
    .find((item) => item.closed);
}

function isWorkingDay(db, date) {
  const workingRule = getWorkingHoursRule(db);
  const weekDays = Array.isArray(workingRule?.config?.workingWeekDays)
    ? workingRule.config.workingWeekDays
    : [1, 2, 3, 4, 5, 6];
  const weekday = new Date(`${date}T00:00:00`).getDay();
  return weekDays.includes(weekday);
}

function getHorseUnavailabilityReason(db, horse, date, startTime, endTime) {
  const rule = db.bookingRules.find((item) => {
    if (item.type !== 'horse_unavailable' || !item.isActive) return false;
    return (
      item.config?.horseId === horse.id &&
      item.config?.date === date &&
      overlaps(startTime, endTime, String(item.config?.startTime), String(item.config?.endTime))
    );
  });

  if (!rule) return '';
  return typeof rule.config?.reason === 'string' ? rule.config.reason : 'Лошадь недоступна в выбранное время';
}

function getHorseBookingConflictReason(db, horse, date, startTime, endTime) {
  const restMinutes = getRestMinutes(db);
  const horseBookings = db.bookings.filter(
    (booking) =>
      booking.date === date &&
      BLOCKING_STATUSES.includes(booking.status) &&
      booking.assignedHorses.some((assignment) => assignment.horseId === horse.id),
  );

  for (const booking of horseBookings) {
    if (overlaps(startTime, endTime, booking.startTime, booking.endTime)) {
      return 'Нет свободных лошадей для выбранного времени';
    }

    const restEnd = addMinutes(booking.endTime, restMinutes);
    if (toMinutes(startTime) >= toMinutes(booking.endTime) && toMinutes(startTime) < toMinutes(restEnd)) {
      return 'Лошадь должна отдохнуть после предыдущего занятия';
    }
  }

  return '';
}

function getHorseProblem(db, horse, participant, serviceId, date, startTime, endTime) {
  if (!horse.isActive) return 'Лошадь временно отключена из записи';
  if (horse.status !== 'available') return 'Лошадь сейчас недоступна';
  if (!horse.allowedServiceIds.includes(serviceId)) return 'Услуга недоступна для одной из лошадей';
  if (Number(participant.weightKg) > Number(horse.maxRiderWeightKg)) return 'Для одного из участников нет подходящей лошади по весу';

  const unavailableReason = getHorseUnavailabilityReason(db, horse, date, startTime, endTime);
  if (unavailableReason) return unavailableReason;

  return getHorseBookingConflictReason(db, horse, date, startTime, endTime);
}

function getTrainerBookingConflictReason(db, trainer, date, startTime, endTime) {
  const trainerBookings = db.bookings.filter(
    (booking) =>
      booking.date === date &&
      BLOCKING_STATUSES.includes(booking.status) &&
      booking.assignedTrainerId === trainer.id,
  );

  for (const booking of trainerBookings) {
    if (overlaps(startTime, endTime, booking.startTime, booking.endTime)) {
      return 'Нет свободного тренера для выбранного времени';
    }
  }

  return '';
}

function getTrainerProblem(db, trainer, serviceId, date, startTime, endTime) {
  const weekDay = new Date(`${date}T00:00:00`).getDay();

  if (!trainer.isActive) return 'Нет свободного тренера для выбранного времени';
  if (trainer.status !== 'active') return 'Нет свободного тренера для выбранного времени';
  if (!trainer.allowedServiceIds.includes(serviceId)) return 'Тренер не проводит выбранную услугу';
  if (!trainer.workingDays.includes(weekDay)) return 'Тренер не работает в выбранный день';
  if (toMinutes(startTime) < toMinutes(trainer.workStartTime) || toMinutes(endTime) > toMinutes(trainer.workEndTime)) {
    return 'Тренер недоступен в выбранный временной интервал';
  }

  return getTrainerBookingConflictReason(db, trainer, date, startTime, endTime);
}

function findAvailableTrainersForSlot(db, serviceId, date, startTime, endTime) {
  const reasons = new Set();
  const availableTrainerIds = [];

  for (const trainer of db.trainers) {
    const problem = getTrainerProblem(db, trainer, serviceId, date, startTime, endTime);
    if (problem) {
      reasons.add(problem);
      continue;
    }
    availableTrainerIds.push(trainer.id);
  }

  return {
    isAvailable: availableTrainerIds.length > 0,
    availableTrainerIds,
    reasons: availableTrainerIds.length > 0 ? [] : Array.from(reasons.size > 0 ? reasons : new Set(['Нет свободного тренера для выбранного времени'])),
  };
}

function assignHorses(db, participants, serviceId, date, startTime, endTime) {
  const usedHorseIds = new Set();
  const assignedHorses = [];
  const reasons = new Set();

  for (const participant of participants) {
    const sortedHorses = [...db.horses].sort((a, b) => Number(a.maxRiderWeightKg) - Number(b.maxRiderWeightKg));
    const horse = sortedHorses.find((candidate) => {
      if (usedHorseIds.has(candidate.id)) return false;
      const problem = getHorseProblem(db, candidate, participant, serviceId, date, startTime, endTime);
      if (problem) {
        reasons.add(problem);
        return false;
      }
      return true;
    });

    if (!horse) {
      reasons.add('Нет свободных лошадей для выбранного времени');
      return { assignedHorses, reasons: Array.from(reasons), isAvailable: false };
    }

    usedHorseIds.add(horse.id);
    assignedHorses.push({ participantId: participant.id, horseId: horse.id });
  }

  return { assignedHorses, reasons: [], isAvailable: true };
}

function getAvailableDates(db, serviceId, participantsCount = 1, days = BOOKING_DAYS_AHEAD) {
  const service = getService(db, serviceId);
  if (!service?.isAvailable) return [];

  const today = new Date();
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index + 1);
    const isoDate = date.toISOString().slice(0, 10);
    const closed = isDateClosed(db, isoDate);
    const workingDay = isWorkingDay(db, isoDate);

    return {
      date: isoDate,
      isAvailable: !closed && workingDay && participantsCount > 0,
      reason: closed?.reason || (!workingDay ? 'Выбранный день закрыт для записи' : ''),
    };
  });
}

function getAvailableTimeSlots(db, serviceId, date, participants = []) {
  const service = getService(db, serviceId);
  const closed = isDateClosed(db, date);
  const { startTime, endTime, slotStepMinutes } = getWorkingRange(db);

  if (!service || closed || !isWorkingDay(db, date)) {
    return [];
  }

  const checkParticipants = participants.length > 0
    ? participants
    : [
        {
          id: 'preview-participant',
          fullName: 'Participant',
          age: service.minAge,
          weightKg: 70,
          experience: 'beginner',
        },
      ];

  const slots = [];
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  for (let current = start; current + service.durationMinutes <= end; current += slotStepMinutes) {
    const slotStart = toTime(current);
    const slotEnd = toTime(current + service.durationMinutes);
    const horseResult = assignHorses(db, checkParticipants, serviceId, date, slotStart, slotEnd);
    const trainerResult = findAvailableTrainersForSlot(db, serviceId, date, slotStart, slotEnd);
    const mergedReasons = Array.from(new Set([...horseResult.reasons, ...trainerResult.reasons]));
    const slotAvailable = horseResult.isAvailable && trainerResult.isAvailable;

    slots.push({
      id: `${date}_${slotStart}`,
      startTime: slotStart,
      endTime: slotEnd,
      isAvailable: slotAvailable,
      reasons: slotAvailable ? [] : mergedReasons,
      availableHorseIds: horseResult.assignedHorses.map((assignment) => assignment.horseId),
      availableTrainerIds: trainerResult.availableTrainerIds,
    });
  }

  return slots;
}

function validateBookingRules(db, request) {
  const service = getService(db, request.serviceId);
  const reasons = [];

  if (!service?.isAvailable) reasons.push('Услуга временно недоступна');
  if (isDateClosed(db, request.date) || !isWorkingDay(db, request.date)) reasons.push('Выбранный день закрыт для записи');

  for (const participant of request.participants || []) {
    if (service && Number(participant.age) < Number(service.minAge)) {
      reasons.push(`Возраст участника ${participant.fullName || 'без имени'} ниже ограничения услуги`);
    }
  }

  return reasons;
}

function resolveBookingTime(db, request) {
  const service = getService(db, request.serviceId);
  const startTime = String(request.timeSlotId || '').split('_')[1] || request.timeSlotId;
  const endTime = service ? addMinutes(startTime, Number(service.durationMinutes)) : startTime;
  return { service, startTime, endTime };
}

function checkBookingAvailability(db, request) {
  const participants = Array.isArray(request.participants) ? request.participants : [];
  const { startTime, endTime } = resolveBookingTime(db, request);
  const ruleReasons = validateBookingRules(db, request);
  const horseResult = assignHorses(db, participants, request.serviceId, request.date, startTime, endTime);
  const trainerResult = findAvailableTrainersForSlot(db, request.serviceId, request.date, startTime, endTime);
  const reasons = Array.from(new Set([...ruleReasons, ...horseResult.reasons, ...trainerResult.reasons]));

  return {
    isAvailable: reasons.length === 0 && horseResult.isAvailable && trainerResult.isAvailable,
    reasons,
    assignedHorses: horseResult.assignedHorses,
    availableTrainerIds: trainerResult.availableTrainerIds,
  };
}

module.exports = {
  addMinutes,
  checkBookingAvailability,
  getAvailableDates,
  getAvailableTimeSlots,
  getTrainerProblem,
  resolveBookingTime,
};
