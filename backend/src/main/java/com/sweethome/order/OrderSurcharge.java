package com.sweethome.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Một dòng phụ thu đã tính và cộng vào đơn lúc tạo (snapshot tên + số tiền tại thời điểm tính,
 * không tham chiếu ngược tới {@code Surcharge} gốc).
 */
@Entity
@Table(name = "order_surcharge")
public class OrderSurcharge {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id", nullable = false)
	private RentalOrder order;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(nullable = false)
	private long amount;

	public Long getId() {
		return id;
	}

	public RentalOrder getOrder() {
		return order;
	}

	public void setOrder(RentalOrder order) {
		this.order = order;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public long getAmount() {
		return amount;
	}

	public void setAmount(long amount) {
		this.amount = amount;
	}
}
