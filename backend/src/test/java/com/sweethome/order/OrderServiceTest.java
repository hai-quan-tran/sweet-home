package com.sweethome.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.common.crypto.CryptoService;
import com.sweethome.common.error.BusinessException;
import com.sweethome.room.CheckInMode;
import com.sweethome.room.PricingSettings;
import com.sweethome.room.PricingSettingsRepository;
import com.sweethome.room.Room;
import com.sweethome.room.RoomRepository;
import com.sweethome.room.RoomType;
import com.sweethome.surcharge.SurchargeCalculator;
import com.sweethome.surcharge.SurchargeRepository;

/**
 * Kiểm tra tạo đơn: tính giờ nhận/trả và tiền phòng theo từng loại thuê, kiểm tra trùng lịch,
 * mã hoá CCCD/mã cửa, cộng phụ thu vượt khách.
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

	@Mock
	private RentalOrderRepository orderRepository;
	@Mock
	private RoomRepository roomRepository;
	@Mock
	private PricingSettingsRepository pricingSettingsRepository;
	@Mock
	private SurchargeRepository surchargeRepository;

	private OrderService service;
	private Room room;
	private PricingSettings settings;

	@BeforeEach
	void setUp() {
		CryptoService cryptoService = new CryptoService(Base64.getEncoder().encodeToString(new byte[32]));
		service = new OrderService(orderRepository, roomRepository, pricingSettingsRepository, surchargeRepository,
				new SurchargeCalculator(), cryptoService);

		RoomType type = OrderTestFactory.roomType(1L, "Tiêu chuẩn", 150000, 50000, 350000, 500000);
		room = OrderTestFactory.room(10L, "101", type, 2);

		settings = new PricingSettings();
		settings.setMinHours(2);
		settings.setOvernightCheckIn(LocalTime.of(21, 0));
		settings.setOvernightCheckOut(LocalTime.of(12, 0));
		settings.setDailyCheckIn(LocalTime.of(14, 0));
		settings.setDailyCheckOut(LocalTime.of(12, 0));

		lenient().when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
		lenient().when(pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)).thenReturn(Optional.of(settings));
		lenient().when(surchargeRepository.findActiveByRoomTypeId(1L)).thenReturn(List.of());
		lenient().when(orderRepository.findOverlapping(anyLong(), any(), any())).thenReturn(List.of());
		lenient().when(orderRepository.save(any())).thenAnswer(inv -> {
			RentalOrder order = inv.getArgument(0);
			if (order.getId() == null) {
				setId(order, 42L);
			}
			return order;
		});
	}

	private OrderUpsertRequest requestHourly(LocalDate date, LocalTime time, Integer hours) {
		return new OrderUpsertRequest(10L, RentalType.HOURLY, date, time, hours, "Nguyễn Văn A", "0900000000",
				null, 2, OrderSource.ZALO, null, CheckInMode.SELF, "123456", 0L, null, 0L, null);
	}

	@Test
	void createHourlyComputesCheckOutAndRoomPrice() {
		var dto = service.create(requestHourly(LocalDate.of(2026, 10, 7), LocalTime.of(15, 0), 3));

		assertThat(dto.checkInAt()).isEqualTo(LocalDateTime.of(2026, 10, 7, 15, 0));
		assertThat(dto.checkOutAt()).isEqualTo(LocalDateTime.of(2026, 10, 7, 18, 0));
		// 2 giờ đầu 150.000 + 1 giờ thêm x 50.000 = 200.000
		assertThat(dto.roomPriceAmount()).isEqualTo(200000);
		assertThat(dto.totalAmount()).isEqualTo(200000);
	}

	@Test
	void createHourlyDefaultsToMinHoursWhenQuantityMissing() {
		var dto = service.create(requestHourly(LocalDate.of(2026, 10, 7), LocalTime.of(15, 0), null));

		assertThat(dto.checkOutAt()).isEqualTo(LocalDateTime.of(2026, 10, 7, 17, 0));
		assertThat(dto.roomPriceAmount()).isEqualTo(150000);
	}

	@Test
	void createHourlyRejectsBelowMinHours() {
		assertThatThrownBy(() -> service.create(requestHourly(LocalDate.of(2026, 10, 7), LocalTime.of(15, 0), 1)))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void createHourlyRequiresCheckInTime() {
		assertThatThrownBy(() -> service.create(requestHourly(LocalDate.of(2026, 10, 7), null, 3)))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void createOvernightUsesFixedScheduleAndFlatPrice() {
		var request = new OrderUpsertRequest(10L, RentalType.OVERNIGHT, LocalDate.of(2026, 10, 7), null, null,
				"Nguyễn Văn A", "0900000000", null, 2, OrderSource.ZALO, null, CheckInMode.SELF, "123456", 0L, null,
				0L, null);

		var dto = service.create(request);

		assertThat(dto.checkInAt()).isEqualTo(LocalDateTime.of(2026, 10, 7, 21, 0));
		assertThat(dto.checkOutAt()).isEqualTo(LocalDateTime.of(2026, 10, 8, 12, 0));
		assertThat(dto.roomPriceAmount()).isEqualTo(350000);
	}

	@Test
	void createDailyMultipliesByNumberOfDays() {
		var request = new OrderUpsertRequest(10L, RentalType.DAILY, LocalDate.of(2026, 10, 7), null, 3,
				"Nguyễn Văn A", "0900000000", null, 2, OrderSource.ZALO, null, CheckInMode.SELF, "123456", 0L, null,
				0L, null);

		var dto = service.create(request);

		assertThat(dto.checkInAt()).isEqualTo(LocalDateTime.of(2026, 10, 7, 14, 0));
		assertThat(dto.checkOutAt()).isEqualTo(LocalDateTime.of(2026, 10, 10, 12, 0));
		assertThat(dto.roomPriceAmount()).isEqualTo(3 * 500000);
	}

	@Test
	void createRejectsWhenRoomNotAcceptingBookings() {
		room.setAcceptingBookings(false);

		assertThatThrownBy(() -> service.create(requestHourly(LocalDate.of(2026, 10, 7), LocalTime.of(15, 0), 3)))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void createRejectsWhenSelfCheckInMissingDoorCode() {
		var request = new OrderUpsertRequest(10L, RentalType.HOURLY, LocalDate.of(2026, 10, 7), LocalTime.of(15, 0),
				3, "Nguyễn Văn A", "0900000000", null, 2, OrderSource.ZALO, null, CheckInMode.SELF, " ", 0L, null,
				0L, null);

		assertThatThrownBy(() -> service.create(request)).isInstanceOf(BusinessException.class);
	}

	@Test
	void createAllowsStaffCheckInWithoutDoorCode() {
		var request = new OrderUpsertRequest(10L, RentalType.HOURLY, LocalDate.of(2026, 10, 7), LocalTime.of(15, 0),
				3, "Nguyễn Văn A", "0900000000", null, 2, OrderSource.ZALO, null, CheckInMode.STAFF, null, 0L, null,
				0L, null);

		var dto = service.create(request);

		assertThat(dto.hasDoorCode()).isFalse();
	}

	@Test
	void createRejectsOnScheduleConflict() {
		RentalOrder existing = new RentalOrder();
		setId(existing, 99L);
		when(orderRepository.findOverlapping(anyLong(), any(), any())).thenReturn(List.of(existing));

		assertThatThrownBy(() -> service.create(requestHourly(LocalDate.of(2026, 10, 7), LocalTime.of(15, 0), 3)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining(OrderDto.codeOf(99L));
	}

	@Test
	void createEncryptsDoorCodeAndCccdStoringOnlyLast4Plain() {
		var request = new OrderUpsertRequest(10L, RentalType.HOURLY, LocalDate.of(2026, 10, 7), LocalTime.of(15, 0),
				3, "Nguyễn Văn A", "0900000000", "079201007302", 2, OrderSource.ZALO, null, CheckInMode.SELF,
				"482915", 0L, null, 0L, null);
		ArgumentCaptor<RentalOrder> captor = ArgumentCaptor.forClass(RentalOrder.class);

		var dto = service.create(request);

		verify(orderRepository).save(captor.capture());
		RentalOrder saved = captor.getValue();
		assertThat(saved.getDoorCodeEncrypted()).isNotEqualTo("482915");
		assertThat(saved.getGuestIdNumberEncrypted()).isNotEqualTo("079201007302");
		assertThat(saved.getGuestIdNumberLast4()).isEqualTo("7302");
		assertThat(dto.guestIdNumberMasked()).isEqualTo("•••••••• 7302");
		assertThat(dto.hasDoorCode()).isTrue();
	}

	@Test
	void createAppliesExtraGuestSurchargeWhenOverMaxGuests() {
		var surcharge = extraGuestSurcharge(1L, "Thêm khách", 50000);
		when(surchargeRepository.findActiveByRoomTypeId(1L)).thenReturn(List.of(surcharge));
		var request = new OrderUpsertRequest(10L, RentalType.HOURLY, LocalDate.of(2026, 10, 7), LocalTime.of(15, 0),
				3, "Nguyễn Văn A", "0900000000", null, 4, OrderSource.ZALO, null, CheckInMode.SELF, "482915", 0L,
				null, 0L, null);

		var dto = service.create(request);

		assertThat(dto.surcharges()).hasSize(1);
		assertThat(dto.surcharges().get(0).amount()).isEqualTo(2 * 50000);
		assertThat(dto.totalAmount()).isEqualTo(200000 + 100000);
	}

	@Test
	void createSubtractsDiscountFromTotal() {
		var request = new OrderUpsertRequest(10L, RentalType.HOURLY, LocalDate.of(2026, 10, 7), LocalTime.of(15, 0),
				3, "Nguyễn Văn A", "0900000000", null, 2, OrderSource.ZALO, null, CheckInMode.SELF, "482915", 0L,
				null, 50000L, "Khách quen");

		var dto = service.create(request);

		assertThat(dto.discount()).isEqualTo(50000);
		assertThat(dto.totalAmount()).isEqualTo(200000 - 50000);
		assertThat(dto.dueAmount()).isEqualTo(200000 - 50000);
	}

	@Test
	void previewReportsConflictWithoutPersisting() {
		RentalOrder existing = new RentalOrder();
		setId(existing, 77L);
		when(orderRepository.findOverlapping(anyLong(), any(), any())).thenReturn(List.of(existing));
		var request = new OrderPreviewRequest(10L, RentalType.HOURLY, LocalDate.of(2026, 10, 7), LocalTime.of(15, 0),
				3, 2, 0L, 0L);

		var result = service.preview(request);

		assertThat(result.available()).isFalse();
		assertThat(result.conflictMessage()).contains(OrderDto.codeOf(77L));
		verify(orderRepository, org.mockito.Mockito.never()).save(any());
	}

	private void setId(RentalOrder order, long id) {
		try {
			var field = RentalOrder.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(order, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}

	private com.sweethome.surcharge.Surcharge extraGuestSurcharge(long id, String name, long amountPerGuest) {
		var surcharge = new com.sweethome.surcharge.Surcharge();
		surcharge.setName(name);
		surcharge.setWhenType(com.sweethome.surcharge.SurchargeWhenType.EXTRA_GUEST);
		surcharge.setAmount(amountPerGuest);
		try {
			var field = com.sweethome.surcharge.Surcharge.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(surcharge, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
		return surcharge;
	}
}
