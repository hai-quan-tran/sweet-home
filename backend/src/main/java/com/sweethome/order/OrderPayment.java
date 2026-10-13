package com.sweethome.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;

/**
 * Một khoản thu thêm của đơn (ngoài tiền cọc lưu trên đơn). Thời điểm thu và người thu lấy từ
 * {@code createdAt/createdBy} của {@link Auditable}.
 */
@Entity
@Table(name = "order_payment")
public class OrderPayment extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id", nullable = false)
	private RentalOrder order;

	@Column(nullable = false)
	private long amount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private PaymentMethod method;

	@Column(length = 255)
	private String note;

	public Long getId() {
		return id;
	}

	public RentalOrder getOrder() {
		return order;
	}

	public void setOrder(RentalOrder order) {
		this.order = order;
	}

	public long getAmount() {
		return amount;
	}

	public void setAmount(long amount) {
		this.amount = amount;
	}

	public PaymentMethod getMethod() {
		return method;
	}

	public void setMethod(PaymentMethod method) {
		this.method = method;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}
}
