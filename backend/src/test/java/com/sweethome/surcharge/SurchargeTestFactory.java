package com.sweethome.surcharge;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/** Tạo entity Surcharge cho test, gán id qua reflection vì id chỉ sinh khi lưu DB thật. */
final class SurchargeTestFactory {

	private SurchargeTestFactory() {
	}

	static Surcharge overstay(long id, String name, int graceMinutes) {
		Surcharge s = base(id, name, SurchargeWhenType.OVERSTAY);
		s.setGraceMinutes(graceMinutes);
		return s;
	}

	static Surcharge weekday(long id, String name, long percent, DayOfWeek... days) {
		Surcharge s = base(id, name, SurchargeWhenType.WEEKDAY);
		s.setAmount(percent);
		s.setWeekdays(Set.of(days));
		return s;
	}

	static Surcharge dateRange(long id, String name, long percent, LocalDate from, LocalDate to) {
		Surcharge s = base(id, name, SurchargeWhenType.DATE_RANGE);
		s.setAmount(percent);
		SurchargeDateRange range = new SurchargeDateRange();
		range.setName(name);
		range.setFromDate(from);
		range.setToDate(to);
		s.setDateRanges(List.of(range));
		return s;
	}

	static Surcharge extraGuest(long id, String name, long amountPerGuest) {
		Surcharge s = base(id, name, SurchargeWhenType.EXTRA_GUEST);
		s.setAmount(amountPerGuest);
		return s;
	}

	static Surcharge manual(long id, String name, long amount) {
		Surcharge s = base(id, name, SurchargeWhenType.MANUAL);
		s.setAmount(amount);
		return s;
	}

	private static Surcharge base(long id, String name, SurchargeWhenType whenType) {
		Surcharge s = new Surcharge();
		s.setName(name);
		s.setWhenType(whenType);
		setId(s, id);
		return s;
	}

	private static void setId(Surcharge s, long id) {
		try {
			var field = Surcharge.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(s, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}
