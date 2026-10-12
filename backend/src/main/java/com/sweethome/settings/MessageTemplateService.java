package com.sweethome.settings;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.common.error.BusinessException;

/**
 * Quản lý mẫu tin nhắn: thêm/sửa/xoá. Không xoá mềm (khác hạng phòng/phụ thu) vì đơn không tham
 * chiếu tới mẫu — nội dung tin nhắn chỉ dựng tạm lúc sao chép, không lưu lại trong đơn.
 */
@Service
public class MessageTemplateService {

	private final MessageTemplateRepository repository;

	public MessageTemplateService(MessageTemplateRepository repository) {
		this.repository = repository;
	}

	/**
	 * Danh sách mẫu tin nhắn, sắp theo tên.
	 *
	 * @return danh sách mẫu
	 */
	@Transactional(readOnly = true)
	public List<MessageTemplateDto> list() {
		return repository.findAllByOrderByNameAsc().stream().map(MessageTemplateDto::from).toList();
	}

	/**
	 * Thêm mẫu mới.
	 *
	 * @param request dữ liệu mẫu
	 * @return mẫu vừa tạo
	 */
	@Transactional
	public MessageTemplateDto create(MessageTemplateUpsertRequest request) {
		MessageTemplate template = new MessageTemplate();
		applyRequest(template, request);
		return MessageTemplateDto.from(repository.save(template));
	}

	/**
	 * Sửa mẫu.
	 *
	 * @param id      id mẫu
	 * @param request dữ liệu mẫu
	 * @return mẫu sau khi sửa
	 */
	@Transactional
	public MessageTemplateDto update(Long id, MessageTemplateUpsertRequest request) {
		MessageTemplate template = findTemplate(id);
		applyRequest(template, request);
		return MessageTemplateDto.from(repository.save(template));
	}

	/**
	 * Xoá mẫu.
	 *
	 * @param id id mẫu
	 */
	@Transactional
	public void delete(Long id) {
		if (!repository.existsById(id)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "Mẫu tin nhắn không tồn tại");
		}
		repository.deleteById(id);
	}

	private void applyRequest(MessageTemplate template, MessageTemplateUpsertRequest request) {
		template.setName(request.name());
		template.setBody(request.body());
		if (request.defaultForCheckInMode() != null) {
			// Mỗi hình thức check-in tối đa 1 mẫu tự chọn sẵn: mẫu khác đang giữ mặc định này thì bỏ.
			repository.findByDefaultForCheckInMode(request.defaultForCheckInMode())
					.filter(other -> !other.getId().equals(template.getId()))
					.ifPresent(other -> {
						other.setDefaultForCheckInMode(null);
						repository.save(other);
					});
		}
		template.setDefaultForCheckInMode(request.defaultForCheckInMode());
	}

	private MessageTemplate findTemplate(Long id) {
		return repository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Mẫu tin nhắn không tồn tại"));
	}
}
