package com.sweethome.schedule;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;

/**
 * Một ca đã xếp cho một tài khoản. Lưu bản sao tên, màu, giờ tại lúc xếp (không đổi khi ca mẫu bị
 * sửa/xoá); {@code templateId} chỉ để biết ca theo mẫu nào (null = ca lẻ hoặc mẫu đã xoá). Ca thuộc
 * ngày của {@code startAt}; ca đêm có {@code endAt} sang hôm sau.
 */
@Entity
@Table(name = "work_shift")
public class WorkShift extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "account_id", nullable = false)
	private Long accountId;

	@Column(name = "template_id")
	private Long templateId;

	@Column(nullable = false, length = 50)
	private String name;

	@Column(nullable = false)
	private int color;

	@Column(name = "start_at", nullable = false)
	private LocalDateTime startAt;

	@Column(name = "end_at", nullable = false)
	private LocalDateTime endAt;

	/** Giờ khác giờ của ca mẫu tại lúc lưu. */
	@Column(nullable = false)
	private boolean edited;

	@Column
	private String note;

	public Long getId() {
		return id;
	}

	public Long getAccountId() {
		return accountId;
	}

	public void setAccountId(Long accountId) {
		this.accountId = accountId;
	}

	public Long getTemplateId() {
		return templateId;
	}

	public void setTemplateId(Long templateId) {
		this.templateId = templateId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public int getColor() {
		return color;
	}

	public void setColor(int color) {
		this.color = color;
	}

	public LocalDateTime getStartAt() {
		return startAt;
	}

	public void setStartAt(LocalDateTime startAt) {
		this.startAt = startAt;
	}

	public LocalDateTime getEndAt() {
		return endAt;
	}

	public void setEndAt(LocalDateTime endAt) {
		this.endAt = endAt;
	}

	public boolean isEdited() {
		return edited;
	}

	public void setEdited(boolean edited) {
		this.edited = edited;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}
}
