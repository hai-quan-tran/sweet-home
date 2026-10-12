package com.sweethome.surcharge;

import java.time.LocalDate;

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
 * Một khoảng ngày (ví dụ "Tết Nguyên đán") thuộc một phụ thu kiểu {@code DATE_RANGE}.
 */
@Entity
@Table(name = "surcharge_date_range")
public class SurchargeDateRange {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "surcharge_id", nullable = false)
	private Surcharge surcharge;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(name = "from_date", nullable = false)
	private LocalDate fromDate;

	@Column(name = "to_date", nullable = false)
	private LocalDate toDate;

	public Long getId() {
		return id;
	}

	public Surcharge getSurcharge() {
		return surcharge;
	}

	public void setSurcharge(Surcharge surcharge) {
		this.surcharge = surcharge;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public LocalDate getFromDate() {
		return fromDate;
	}

	public void setFromDate(LocalDate fromDate) {
		this.fromDate = fromDate;
	}

	public LocalDate getToDate() {
		return toDate;
	}

	public void setToDate(LocalDate toDate) {
		this.toDate = toDate;
	}
}
