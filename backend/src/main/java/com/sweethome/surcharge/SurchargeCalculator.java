package com.sweethome.surcharge;

import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

/**
 * Bộ tính tiền phụ thu cho một đơn, theo đúng các quy tắc đã chốt:
 * <ul>
 * <li>Quá giờ: trong ân hạn không tính; quá ân hạn tính từ giờ trả phòng (không trừ phút ân hạn),
 * luôn làm tròn lên theo giờ, theo giá "mỗi giờ thêm".</li>
 * <li>Theo ngày (WEEKDAY, DATE_RANGE): tính % trên giá phòng của từng ngày khách ở; một ngày thoả
 * nhiều phụ thu theo ngày thì chỉ lấy mức cao hơn.</li>
 * <li>Quá giờ, vượt khách, thêm tay luôn cộng dồn, kể cả khi đã có phụ thu theo ngày.</li>
 * </ul>
 * Chỉ nhận dữ liệu thuần (không truy vấn DB) để dễ kiểm tra bằng unit test.
 */
@Component
public class SurchargeCalculator {

	/**
	 * Tính tổng phụ thu cho một đơn.
	 *
	 * @param input      dữ liệu đơn cần tính
	 * @param surcharges các phụ thu đang áp dụng được cho hạng phòng của đơn (đã lọc {@code active}
	 *                   và theo hạng phòng từ bên gọi)
	 * @return các dòng phụ thu và tổng
	 */
	public SurchargeCalculationResult calculate(SurchargeCalculationInput input, List<Surcharge> surcharges) {
		List<SurchargeLineItem> items = new ArrayList<>();

		for (Surcharge s : surcharges) {
			if (s.getWhenType() == SurchargeWhenType.OVERSTAY) {
				long amount = overstayAmount(s, input);
				if (amount > 0) {
					items.add(new SurchargeLineItem(s.getId(), s.getName(), amount));
				}
			}
		}

		items.addAll(dayBasedLineItems(input, surcharges));

		for (Surcharge s : surcharges) {
			if (s.getWhenType() == SurchargeWhenType.EXTRA_GUEST && input.extraGuestCount() > 0) {
				items.add(new SurchargeLineItem(s.getId(), s.getName(), s.getAmount() * input.extraGuestCount()));
			}
		}

		for (Surcharge s : surcharges) {
			if (s.getWhenType() == SurchargeWhenType.MANUAL && input.manualSurchargeIds().contains(s.getId())) {
				items.add(new SurchargeLineItem(s.getId(), s.getName(), s.getAmount()));
			}
		}

		long total = items.stream().mapToLong(SurchargeLineItem::amount).sum();
		return new SurchargeCalculationResult(items, total);
	}

	/** Trễ trong ân hạn thì 0. Quá ân hạn tính từ giờ trả phòng, làm tròn lên theo giờ. */
	private long overstayAmount(Surcharge s, SurchargeCalculationInput input) {
		if (input.scheduledCheckOut() == null || input.actualCheckOut() == null) {
			return 0;
		}
		long lateMinutes = Duration.between(input.scheduledCheckOut(), input.actualCheckOut()).toMinutes();
		int grace = s.getGraceMinutes() != null ? s.getGraceMinutes() : 0;
		if (lateMinutes <= grace) {
			return 0;
		}
		long hours = Math.ceilDiv(lateMinutes, 60);
		return hours * input.extraHourPrice();
	}

	/** Mỗi ngày khách ở, chỉ lấy phụ thu theo ngày có mức cao hơn; cộng dồn số tiền theo từng phụ thu qua các ngày. */
	private List<SurchargeLineItem> dayBasedLineItems(SurchargeCalculationInput input, List<Surcharge> surcharges) {
		List<Surcharge> dayBased = surcharges.stream()
				.filter(s -> s.getWhenType() == SurchargeWhenType.WEEKDAY || s.getWhenType() == SurchargeWhenType.DATE_RANGE)
				.toList();

		Map<Long, Long> amountById = new LinkedHashMap<>();
		Map<Long, String> nameById = new LinkedHashMap<>();
		for (SurchargeDayCharge day : input.stayDays()) {
			Surcharge winner = null;
			long winnerAmount = 0;
			for (Surcharge s : dayBased) {
				if (!matchesDay(s, day.date())) {
					continue;
				}
				long amount = Math.round(day.roomPrice() * s.getAmount() / 100.0);
				if (winner == null || amount > winnerAmount) {
					winner = s;
					winnerAmount = amount;
				}
			}
			if (winner != null && winnerAmount > 0) {
				amountById.merge(winner.getId(), winnerAmount, Long::sum);
				nameById.putIfAbsent(winner.getId(), winner.getName());
			}
		}

		List<SurchargeLineItem> items = new ArrayList<>();
		amountById.forEach((id, amount) -> items.add(new SurchargeLineItem(id, nameById.get(id), amount)));
		return items;
	}

	private boolean matchesDay(Surcharge s, LocalDate date) {
		if (s.getWhenType() == SurchargeWhenType.WEEKDAY) {
			return s.getWeekdays().contains(date.getDayOfWeek());
		}
		return s.getDateRanges().stream().anyMatch(r -> !date.isBefore(r.getFromDate()) && !date.isAfter(r.getToDate()));
	}
}
