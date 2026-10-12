package com.sweethome.settings;

import com.sweethome.room.CheckInMode;

/**
 * Một mẫu tin nhắn.
 *
 * @param id                    id mẫu
 * @param name                  tên mẫu
 * @param body                  nội dung mẫu (còn nguyên biến, chưa thay thế)
 * @param defaultForCheckInMode hình thức check-in tự chọn sẵn mẫu này; null nếu chọn tay
 * @param containsDoorCode      nội dung có biến {ma_cua} hay không
 */
public record MessageTemplateDto(Long id, String name, String body, CheckInMode defaultForCheckInMode,
		boolean containsDoorCode) {

	public static MessageTemplateDto from(MessageTemplate template) {
		return new MessageTemplateDto(template.getId(), template.getName(), template.getBody(),
				template.getDefaultForCheckInMode(), template.getBody().contains("{ma_cua}"));
	}
}
