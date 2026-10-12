package com.sweethome.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
 * Kiểm tra thêm/sửa/xoá mẫu tin nhắn: tối đa 1 mẫu mặc định cho mỗi hình thức check-in.
 */
@ExtendWith(MockitoExtension.class)
class MessageTemplateServiceTest {

	@Mock
	private MessageTemplateRepository repository;

	private MessageTemplateService service;

	@BeforeEach
	void setUp() {
		service = new MessageTemplateService(repository);
		lenient().when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	private MessageTemplate template(long id, CheckInMode defaultMode) {
		MessageTemplate t = new MessageTemplate();
		t.setName("Mẫu");
		t.setBody("Xin chào {ten_khach}");
		t.setDefaultForCheckInMode(defaultMode);
		try {
			var field = MessageTemplate.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(t, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
		return t;
	}

	@Test
	void createClearsDefaultOnOtherTemplateForSameCheckInMode() {
		MessageTemplate existing = template(1L, CheckInMode.SELF);
		when(repository.findByDefaultForCheckInMode(CheckInMode.SELF)).thenReturn(Optional.of(existing));
		var request = new MessageTemplateUpsertRequest("Mẫu mới", "Nội dung {ma_cua}", CheckInMode.SELF);

		MessageTemplateDto dto = service.create(request);

		assertThat(existing.getDefaultForCheckInMode()).isNull();
		assertThat(dto.defaultForCheckInMode()).isEqualTo(CheckInMode.SELF);
		assertThat(dto.containsDoorCode()).isTrue();
	}

	@Test
	void createWithoutDefaultDoesNotTouchOtherTemplates() {
		var request = new MessageTemplateUpsertRequest("Mẫu", "Nội dung", null);

		service.create(request);

		verify(repository, never()).findByDefaultForCheckInMode(any());
	}

	@Test
	void updateSameTemplateKeepingItsOwnDefaultDoesNotClearItself() {
		MessageTemplate existing = template(1L, CheckInMode.STAFF);
		when(repository.findById(1L)).thenReturn(Optional.of(existing));
		when(repository.findByDefaultForCheckInMode(CheckInMode.STAFF)).thenReturn(Optional.of(existing));
		var request = new MessageTemplateUpsertRequest("Mẫu đổi tên", "Nội dung", CheckInMode.STAFF);

		MessageTemplateDto dto = service.update(1L, request);

		assertThat(dto.defaultForCheckInMode()).isEqualTo(CheckInMode.STAFF);
	}

	@Test
	void deleteRemovesTemplate() {
		when(repository.existsById(1L)).thenReturn(true);

		service.delete(1L);

		verify(repository).deleteById(1L);
	}

	@Test
	void deleteRejectsUnknownId() {
		when(repository.existsById(99L)).thenReturn(false);

		assertThatThrownBy(() -> service.delete(99L)).isInstanceOf(BusinessException.class);
	}
}
