package com.sweethome.surcharge;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

/**
 * Kiểm tra bộ tính phụ thu: quá giờ (ân hạn + làm tròn lên theo giờ), theo ngày (lấy mức cao hơn
 * khi thoả nhiều phụ thu), và luôn cộng dồn quá giờ/thêm khách/thêm tay.
 */
class SurchargeCalculatorTest {

	private final SurchargeCalculator calculator = new SurchargeCalculator();

	private SurchargeCalculationInput input(List<SurchargeDayCharge> stayDays, long extraHourPrice,
			LocalDateTime scheduledCheckOut, LocalDateTime actualCheckOut, int extraGuestCount,
			Set<Long> manualSurchargeIds) {
		return new SurchargeCalculationInput(stayDays, extraHourPrice, scheduledCheckOut, actualCheckOut,
				extraGuestCount, manualSurchargeIds);
	}

	@Test
	void overstayWithinGraceChargesNothing() {
		Surcharge overstay = SurchargeTestFactory.overstay(1, "Quá giờ trả phòng", 15);
		LocalDateTime scheduled = LocalDateTime.of(2026, 1, 1, 13, 0);
		var in = input(List.of(), 50000, scheduled, scheduled.plusMinutes(10), 0, Set.of());

		var result = calculator.calculate(in, List.of(overstay));

		assertThat(result.items()).isEmpty();
		assertThat(result.total()).isZero();
	}

	@Test
	void overstayRoundsUpToNextHourAfterGrace() {
		Surcharge overstay = SurchargeTestFactory.overstay(1, "Quá giờ trả phòng", 15);
		LocalDateTime scheduled = LocalDateTime.of(2026, 1, 1, 13, 30);
		// Trễ 1 giờ 20 phút (80 phút) -> làm tròn lên 2 giờ, như ví dụ trong thiết kế.
		var in = input(List.of(), 50000, scheduled, scheduled.plusMinutes(80), 0, Set.of());

		var result = calculator.calculate(in, List.of(overstay));

		assertThat(result.total()).isEqualTo(2 * 50000);
	}

	@Test
	void overstayExactlyThirtyMinutesLateChargesOneHour() {
		Surcharge overstay = SurchargeTestFactory.overstay(1, "Quá giờ trả phòng", 15);
		LocalDateTime scheduled = LocalDateTime.of(2026, 1, 1, 13, 0);
		var in = input(List.of(), 50000, scheduled, scheduled.plusMinutes(30), 0, Set.of());

		var result = calculator.calculate(in, List.of(overstay));

		assertThat(result.total()).isEqualTo(50000);
	}

	@Test
	void overstayNotCheckedOutYetChargesNothing() {
		Surcharge overstay = SurchargeTestFactory.overstay(1, "Quá giờ trả phòng", 15);
		var in = input(List.of(), 50000, LocalDateTime.of(2026, 1, 1, 13, 0), null, 0, Set.of());

		var result = calculator.calculate(in, List.of(overstay));

		assertThat(result.total()).isZero();
	}

	@Test
	void weekdaySurchargeAppliesPercentOfThatDayPrice() {
		// P101 qua đêm, nhận phòng Thứ Sáu 09/10/2026, giá qua đêm 350.000đ, cuối tuần +10%.
		Surcharge weekend = SurchargeTestFactory.weekday(2, "Cuối tuần", 10, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY);
		LocalDate friday = LocalDate.of(2026, 10, 9);
		var in = input(List.of(new SurchargeDayCharge(friday, 350000)), 50000, null, null, 0, Set.of());

		var result = calculator.calculate(in, List.of(weekend));

		assertThat(result.total()).isEqualTo(35000);
	}

	@Test
	void dateRangeSurchargeAppliesPerMatchingDayOnly() {
		// P201 theo ngày 03->07/02/2027 (ở 4 ngày: 03,04,05,06), Tết 05-10/02 +30%, giá ngày 650.000đ.
		Surcharge tet = SurchargeTestFactory.dateRange(3, "Ngày lễ, Tết", 30,
				LocalDate.of(2027, 2, 5), LocalDate.of(2027, 2, 10));
		List<SurchargeDayCharge> stayDays = List.of(
				new SurchargeDayCharge(LocalDate.of(2027, 2, 3), 650000),
				new SurchargeDayCharge(LocalDate.of(2027, 2, 4), 650000),
				new SurchargeDayCharge(LocalDate.of(2027, 2, 5), 650000),
				new SurchargeDayCharge(LocalDate.of(2027, 2, 6), 650000));
		var in = input(stayDays, 60000, null, null, 0, Set.of());

		var result = calculator.calculate(in, List.of(tet));

		assertThat(result.total()).isEqualTo(2 * 195000);
	}

	@Test
	void whenSameDayMatchesWeekdayAndDateRangeOnlyHigherOneApplies() {
		// 06/02/2027 là Thứ Bảy, vừa cuối tuần (+10%) vừa trong khoảng Tết (+30%) -> lấy 30%.
		Surcharge weekend = SurchargeTestFactory.weekday(2, "Cuối tuần", 10, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
		Surcharge tet = SurchargeTestFactory.dateRange(3, "Ngày lễ, Tết", 30,
				LocalDate.of(2027, 2, 5), LocalDate.of(2027, 2, 10));
		LocalDate saturday = LocalDate.of(2027, 2, 6);
		var in = input(List.of(new SurchargeDayCharge(saturday, 650000)), 60000, null, null, 0, Set.of());

		var result = calculator.calculate(in, List.of(weekend, tet));

		assertThat(result.items()).hasSize(1);
		assertThat(result.items().get(0).surchargeId()).isEqualTo(3L);
		assertThat(result.total()).isEqualTo(195000);
	}

	@Test
	void extraGuestSurchargeMultipliesByExtraGuestCount() {
		Surcharge extraGuest = SurchargeTestFactory.extraGuest(4, "Thêm khách", 50000);
		var in = input(List.of(), 50000, null, null, 3, Set.of());

		var result = calculator.calculate(in, List.of(extraGuest));

		assertThat(result.total()).isEqualTo(150000);
	}

	@Test
	void manualSurchargeOnlyAppliesWhenSelected() {
		Surcharge manual = SurchargeTestFactory.manual(5, "Hút thuốc trong phòng", 200000);
		var notSelected = input(List.of(), 50000, null, null, 0, Set.of());
		var selected = input(List.of(), 50000, null, null, 0, Set.of(5L));

		assertThat(calculator.calculate(notSelected, List.of(manual)).total()).isZero();
		assertThat(calculator.calculate(selected, List.of(manual)).total()).isEqualTo(200000);
	}

	@Test
	void allApplicableSurchargesAlwaysAccumulate() {
		Surcharge overstay = SurchargeTestFactory.overstay(1, "Quá giờ trả phòng", 15);
		Surcharge tet = SurchargeTestFactory.dateRange(3, "Ngày lễ, Tết", 30,
				LocalDate.of(2027, 2, 5), LocalDate.of(2027, 2, 10));
		Surcharge extraGuest = SurchargeTestFactory.extraGuest(4, "Thêm khách", 50000);
		Surcharge manual = SurchargeTestFactory.manual(5, "Hút thuốc trong phòng", 200000);
		LocalDateTime scheduled = LocalDateTime.of(2027, 2, 5, 12, 0);
		var in = input(List.of(new SurchargeDayCharge(LocalDate.of(2027, 2, 5), 650000)), 60000,
				scheduled, scheduled.plusMinutes(90), 2, Set.of(5L));

		var result = calculator.calculate(in, List.of(overstay, tet, extraGuest, manual));

		long expectedOverstay = 2 * 60000; // 90 phút -> làm tròn 2 giờ
		long expectedTet = 195000; // 650.000 * 30%
		long expectedExtraGuest = 2 * 50000;
		long expectedManual = 200000;
		assertThat(result.total()).isEqualTo(expectedOverstay + expectedTet + expectedExtraGuest + expectedManual);
		assertThat(result.items()).hasSize(4);
	}
}
