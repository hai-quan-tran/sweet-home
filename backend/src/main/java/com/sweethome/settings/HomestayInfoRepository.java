package com.sweethome.settings;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Truy vấn thông tin homestay (chỉ 1 dòng).
 */
public interface HomestayInfoRepository extends JpaRepository<HomestayInfo, Long> {
}
