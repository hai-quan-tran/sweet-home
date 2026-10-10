package com.sweethome.room;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.sweethome.common.error.GlobalExceptionHandler;

/**
 * Kiểm tra RoomController: endpoint trả đúng dữ liệu, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class RoomControllerTest {

	@Mock
	private RoomService roomService;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		RoomController controller = new RoomController(roomService);
		mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	private RoomDto sampleDto() {
		return new RoomDto(1L, "101", "Mộc", 1, 1L, "Tiêu chuẩn", 2, "1 giường đôi", null,
				RoomPricingMode.ROOM_TYPE, null, null, null, null, 150000L, 50000L, 350000L, 500000L,
				CheckInMode.SELF, null, true, List.of());
	}

	@Test
	void listReturnsRooms() throws Exception {
		when(roomService.list()).thenReturn(List.of(sampleDto()));

		mvc.perform(get("/rooms"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].roomNumber").value("101"));
	}

	@Test
	void getReturnsRoomDetail() throws Exception {
		when(roomService.get(1L)).thenReturn(sampleDto());

		mvc.perform(get("/rooms/1")).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Mộc"));
	}

	@Test
	void createRejectsMissingRequiredFields() throws Exception {
		mvc.perform(post("/rooms").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createReturnsCreatedRoom() throws Exception {
		when(roomService.create(any())).thenReturn(sampleDto());

		mvc.perform(post("/rooms").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"roomNumber":"101","name":"Mộc","floor":1,"roomTypeId":1,"maxGuests":2,
								 "pricingMode":"ROOM_TYPE","defaultCheckInMode":"SELF","acceptingBookings":true}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.roomNumber").value("101"));
	}

	@Test
	void setAcceptingBookingsCallsService() throws Exception {
		when(roomService.setAcceptingBookings(eq(1L), eq(false))).thenReturn(sampleDto());

		mvc.perform(patch("/rooms/1/accepting-bookings").contentType(MediaType.APPLICATION_JSON)
						.content("{\"acceptingBookings\":false}"))
				.andExpect(status().isOk());
	}

	@Test
	void addPhotosAcceptsMultipart() throws Exception {
		when(roomService.addPhotos(eq(1L), any())).thenReturn(sampleDto());
		MockMultipartFile file = new MockMultipartFile("files", "a.jpg", "image/jpeg", "data".getBytes());

		mvc.perform(multipart("/rooms/1/photos").file(file)).andExpect(status().isOk());
	}

	@Test
	void deletePhotoCallsService() throws Exception {
		when(roomService.deletePhoto(1L, 2L)).thenReturn(sampleDto());

		mvc.perform(delete("/rooms/1/photos/2")).andExpect(status().isOk());
	}
}
