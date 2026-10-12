package com.sweethome.settings;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sweethome.room.CheckInMode;

/**
 * Truy vấn mẫu tin nhắn.
 */
public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, Long> {

	List<MessageTemplate> findAllByOrderByNameAsc();

	Optional<MessageTemplate> findByDefaultForCheckInMode(CheckInMode mode);
}
