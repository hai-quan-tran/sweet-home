package com.sweethome.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.common.error.BusinessException;
import com.sweethome.room.CheckInMode;

/**
 * Kiểm tra thu tiền: cộng vào tổng đã thu, không vượt tổng tiền, sửa/xoá khoản thu, chặn đơn đã
 * đóng.
 */
@ExtendWith(MockitoExtension.class)
class OrderPaymentServiceTest {

	@Mock
	private RentalOrderRepository orderRepository;

	private OrderPaymentService service;
	private RentalOrder order;

	@BeforeEach
	void setUp() {
		service = new OrderPaymentService(orderRepository);
		order = new RentalOrder();
		setField(RentalOrder.class, order, 1L);
		order.setRoom(OrderTestFactory.room(10L, "101", OrderTestFactory.roomType(1L, "A", 1, 1, 1, 1), 2));
		order.setRentalType(RentalType.HOURLY);
		order.setCheckInMode(CheckInMode.SELF);
		order.setTotalAmount(300000);
		order.setDeposit(100000);
		lenient().when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
		lenient().when(orderRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	@Test
	void addIncreasesPaidAndReducesDue() {
		var dto = service.add(1L, new OrderPaymentRequest(150000, PaymentMethod.CASH, " "));

		assertThat(dto.payments()).hasSize(1);
		assertThat(dto.payments().get(0).note()).isNull();
		assertThat(dto.paidAmount()).isEqualTo(250000);
		assertThat(dto.dueAmount()).isEqualTo(50000);
	}

	@Test
	void addRejectsOverpayment() {
		assertThatThrownBy(() -> service.add(1L, new OrderPaymentRequest(200001, PaymentMethod.CASH, null)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("vượt");
	}

	@Test
	void addRejectsClosedOrder() {
		order.setStatus(OrderStatus.CANCELLED);

		assertThatThrownBy(() -> service.add(1L, new OrderPaymentRequest(1000, PaymentMethod.CASH, null)))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void addRejectsMissingOrder() {
		when(orderRepository.findById(2L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.add(2L, new OrderPaymentRequest(1000, PaymentMethod.CASH, null)))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void updateChangesAmountAndMethod() {
		OrderPayment payment = existingPayment(7L, 50000);

		var dto = service.update(1L, 7L, new OrderPaymentRequest(80000, PaymentMethod.TRANSFER, "Bổ sung"));

		assertThat(payment.getAmount()).isEqualTo(80000);
		assertThat(payment.getMethod()).isEqualTo(PaymentMethod.TRANSFER);
		assertThat(dto.paidAmount()).isEqualTo(180000);
	}

	@Test
	void updateRejectsOverpayment() {
		existingPayment(7L, 50000);

		assertThatThrownBy(() -> service.update(1L, 7L, new OrderPaymentRequest(250000, PaymentMethod.CASH, null)))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void updateRejectsUnknownPayment() {
		existingPayment(7L, 50000);

		assertThatThrownBy(() -> service.update(1L, 8L, new OrderPaymentRequest(1000, PaymentMethod.CASH, null)))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void deleteRemovesPayment() {
		existingPayment(7L, 50000);

		var dto = service.delete(1L, 7L);

		assertThat(dto.payments()).isEmpty();
		assertThat(dto.paidAmount()).isEqualTo(100000);
	}

	private OrderPayment existingPayment(long id, long amount) {
		OrderPayment payment = new OrderPayment();
		payment.setAmount(amount);
		payment.setMethod(PaymentMethod.CASH);
		setField(OrderPayment.class, payment, id);
		order.addPayment(payment);
		return payment;
	}

	private static void setField(Class<?> type, Object target, long id) {
		try {
			var field = type.getDeclaredField("id");
			field.setAccessible(true);
			field.set(target, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}
