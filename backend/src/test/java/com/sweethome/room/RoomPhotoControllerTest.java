package com.sweethome.room;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Kiểm tra RoomPhotoController trả đúng nội dung và content-type.
 */
@ExtendWith(MockitoExtension.class)
class RoomPhotoControllerTest {

	@Mock
	private RoomService roomService;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new RoomPhotoController(roomService)).build();
	}

	@Test
	void returnsImageBytesWithContentType() throws Exception {
		when(roomService.readPhoto(10L)).thenReturn(new RoomPhotoStorageService.StoredFile("abc".getBytes(), "image/png"));

		mvc.perform(get("/room-photos/10"))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andExpect(content().bytes("abc".getBytes()));
	}
}
