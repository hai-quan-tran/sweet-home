import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../core/auth.service';
import { formatMoney } from '../../core/money';
import { PricingOverview, RoomDto } from '../../core/room.models';
import { RoomService } from '../../core/room.service';
import { SurchargeDto } from '../../core/surcharge.models';
import { SurchargeService } from '../../core/surcharge.service';
import { PricingDialog } from './pricing-dialog';
import { SurchargeDialog, WEEKDAY_OPTIONS } from './surcharge-dialog';

type Tab = 'phong' | 'bang-gia' | 'phu-thu';

const WHEN_LABELS: Record<SurchargeDto['whenType'], string> = {
  OVERSTAY: 'Quá giờ trả phòng',
  EXTRA_GUEST: 'Vượt số khách tối đa',
  WEEKDAY: 'Ngày trong tuần',
  DATE_RANGE: 'Khoảng ngày',
  MANUAL: 'Thêm tay vào đơn',
};

/** Màn Phòng & bảng giá: danh sách phòng, bảng giá theo hạng, phụ thu. */
@Component({
  selector: 'app-rooms-page',
  imports: [RouterLink, ButtonModule, PricingDialog, SurchargeDialog],
  templateUrl: './rooms-page.html',
  styleUrl: './rooms-page.scss',
})
export class RoomsPage {
  private readonly roomService = inject(RoomService);
  private readonly surchargeService = inject(SurchargeService);
  private readonly auth = inject(AuthService);

  protected readonly formatMoney = formatMoney;
  protected readonly tab = signal<Tab>('phong');
  protected readonly rooms = signal<RoomDto[]>([]);
  protected readonly pricing = signal<PricingOverview | null>(null);
  protected readonly surcharges = signal<SurchargeDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly pricingDialogVisible = signal(false);
  protected readonly surchargeDialogVisible = signal(false);
  protected readonly editingSurcharge = signal<SurchargeDto | null>(null);
  protected readonly restoreError = signal<string | null>(null);
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');

  protected readonly activeSurcharges = computed(() => this.surcharges().filter((s) => s.active));
  protected readonly hiddenSurcharges = computed(() => this.surcharges().filter((s) => !s.active));

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.roomService.list().subscribe((rooms) => {
      this.rooms.set(rooms);
      this.loading.set(false);
    });
    this.roomService.pricingOverview().subscribe((overview) => this.pricing.set(overview));
    this.reloadSurcharges();
  }

  private reloadSurcharges(): void {
    this.surchargeService.list().subscribe((surcharges) => this.surcharges.set(surcharges));
  }

  /** Nhãn "Áp dụng khi" hiển thị trên danh sách phụ thu. */
  whenLabel(surcharge: SurchargeDto): string {
    return WHEN_LABELS[surcharge.whenType];
  }

  /** Mô tả ngắn điều kiện áp dụng, hiển thị dưới tên phụ thu. */
  whenDescription(surcharge: SurchargeDto): string {
    switch (surcharge.whenType) {
      case 'OVERSTAY':
        return `Sau ${surcharge.graceMinutes} phút ân hạn · làm tròn lên theo giờ`;
      case 'EXTRA_GUEST':
        return 'Vượt số khách tối đa của phòng';
      case 'WEEKDAY':
        return surcharge.weekdays
          .map((day) => WEEKDAY_OPTIONS.find((o) => o.value === day)?.label ?? day)
          .join(', ');
      case 'DATE_RANGE':
        return surcharge.dateRanges.map((r) => r.name).join(', ');
      case 'MANUAL':
      default:
        return surcharge.roomTypeNames.join(', ');
    }
  }

  /** Giá trị hiển thị bên phải một dòng phụ thu. */
  amountLabel(surcharge: SurchargeDto): string {
    switch (surcharge.whenType) {
      case 'OVERSTAY':
        return 'Giá mỗi giờ thêm';
      case 'WEEKDAY':
      case 'DATE_RANGE':
        return `+${surcharge.amount}%`;
      case 'EXTRA_GUEST':
        return `${this.formatMoney(surcharge.amount)}/khách`;
      case 'MANUAL':
      default:
        return `${this.formatMoney(surcharge.amount)}/lần`;
    }
  }

  /** Mở dialog thêm phụ thu mới. */
  openAddSurcharge(): void {
    this.editingSurcharge.set(null);
    this.surchargeDialogVisible.set(true);
  }

  /** Mở dialog sửa một phụ thu. */
  openEditSurcharge(surcharge: SurchargeDto): void {
    this.editingSurcharge.set(surcharge);
    this.surchargeDialogVisible.set(true);
  }

  /** Khôi phục một phụ thu đã ẩn. */
  restoreSurcharge(surcharge: SurchargeDto): void {
    this.restoreError.set(null);
    this.surchargeService.setActive(surcharge.id, true).subscribe({
      next: () => this.reloadSurcharges(),
      error: (err) => this.restoreError.set(err?.error?.detail ?? 'Không khôi phục được phụ thu, thử lại sau.'),
    });
  }

  /** Cập nhật lại danh sách phụ thu sau khi dialog lưu/ẩn xong. */
  onSurchargeSaved(): void {
    this.reloadSurcharges();
  }

  /** Bật/tắt nhận đặt phòng ngay trên thẻ phòng. */
  toggleAccepting(room: RoomDto): void {
    this.roomService.setAcceptingBookings(room.id, !room.acceptingBookings).subscribe((updated) => {
      this.rooms.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    });
  }

  /** Cập nhật lại bảng giá sau khi dialog lưu xong. */
  onPricingSaved(overview: PricingOverview): void {
    this.pricing.set(overview);
    this.reload();
  }

  /** Nhãn hình thức check-in mặc định hiển thị trên thẻ phòng. */
  checkInLabel(room: RoomDto): string {
    return room.defaultCheckInMode === 'SELF' ? 'Mặc định: khách tự check-in' : 'Mặc định: nhân viên check-in';
  }

  protected readonly roomTypeCount = computed(() => this.pricing()?.roomTypes.length ?? 0);

  /** Ảnh bìa của phòng, null nếu chưa có ảnh. */
  coverPhoto(room: RoomDto): string | null {
    return room.photos.find((p) => p.cover)?.url ?? null;
  }
}
