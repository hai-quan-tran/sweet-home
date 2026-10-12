package com.sweethome.order;

import com.sweethome.room.CheckInMode;
import com.sweethome.room.Room;
import com.sweethome.room.RoomPricingMode;
import com.sweethome.room.RoomType;

/** Tạo entity Room/RoomType cho test, gán id qua reflection vì id chỉ sinh khi lưu DB thật. */
final class OrderTestFactory {

	private OrderTestFactory() {
	}

	static RoomType roomType(long id, String name, long twoHour, long extraHour, long overnight, long daily) {
		RoomType type = new RoomType();
		type.setName(name);
		type.setTwoHourPrice(twoHour);
		type.setExtraHourPrice(extraHour);
		type.setOvernightPrice(overnight);
		type.setDailyPrice(daily);
		setId(type, id, RoomType.class);
		return type;
	}

	static Room room(long id, String roomNumber, RoomType type, int maxGuests) {
		Room room = new Room();
		room.setRoomNumber(roomNumber);
		room.setName("Phòng " + roomNumber);
		room.setRoomType(type);
		room.setMaxGuests(maxGuests);
		room.setPricingMode(RoomPricingMode.ROOM_TYPE);
		room.setDefaultCheckInMode(CheckInMode.SELF);
		room.setAcceptingBookings(true);
		setId(room, id, Room.class);
		return room;
	}

	private static void setId(Object entity, long id, Class<?> type) {
		try {
			var field = type.getDeclaredField("id");
			field.setAccessible(true);
			field.set(entity, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}
