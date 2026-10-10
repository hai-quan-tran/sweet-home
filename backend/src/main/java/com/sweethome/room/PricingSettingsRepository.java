package com.sweethome.room;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Truy vấn khung giờ áp dụng chung (chỉ có 1 dòng, id {@link PricingSettings#SINGLETON_ID}).
 */
public interface PricingSettingsRepository extends JpaRepository<PricingSettings, Long> {
}
