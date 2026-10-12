package com.sweethome.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;
import com.sweethome.room.CheckInMode;

/**
 * Mẫu tin nhắn gửi khách. Nội dung dùng các biến dạng {ten_khach}, {ma_cua}, ... được thay thế ở
 * frontend lúc sao chép (xem {@code business-rules.md} mục "Tin nhắn gửi khách" để biết đủ danh
 * sách biến). {@link #defaultForCheckInMode} khác null nghĩa là mẫu này tự chọn sẵn khi tạo đơn
 * có hình thức check-in tương ứng; tối đa 1 mẫu cho mỗi hình thức (lưu mẫu mới nhận giữ mặc định
 * này thì tự bỏ mặc định ở mẫu cũ, xem {@link MessageTemplateService}).
 */
@Entity
@Table(name = "message_template")
public class MessageTemplate extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(nullable = false, length = 2000)
	private String body;

	@Enumerated(EnumType.STRING)
	@Column(name = "default_for_check_in_mode", length = 20)
	private CheckInMode defaultForCheckInMode;

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getBody() {
		return body;
	}

	public void setBody(String body) {
		this.body = body;
	}

	public CheckInMode getDefaultForCheckInMode() {
		return defaultForCheckInMode;
	}

	public void setDefaultForCheckInMode(CheckInMode defaultForCheckInMode) {
		this.defaultForCheckInMode = defaultForCheckInMode;
	}
}
