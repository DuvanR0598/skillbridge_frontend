import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Visor de imagen a pantalla completa (lightbox) para ver el avatar en grande.
 * Se muestra cuando `imageUrl` tiene valor; emite `closed` al cerrar.
 */
@Component({
  selector: 'app-avatar-viewer',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (imageUrl()) {
      <div
        class="av-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Foto de perfil"
        (click)="closed.emit()"
      >
        <button class="av-close" type="button" aria-label="Cerrar" (click)="closed.emit()">
          <mat-icon>close</mat-icon>
        </button>
        <img
          class="av-image"
          [src]="imageUrl()"
          [alt]="alt()"
          (click)="$event.stopPropagation()"
        />
        @if (caption()) {
          <p class="av-caption" (click)="$event.stopPropagation()">{{ caption() }}</p>
        }
      </div>
    }
  `,
  styles: [
    `
      .av-overlay {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 24px;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        cursor: zoom-out;
      }

      .av-image {
        max-width: min(90vw, 640px);
        max-height: 80vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        cursor: default;
      }

      .av-caption {
        color: #fff;
        font-size: 14px;
        font-weight: 500;
        margin: 0;
        text-align: center;
      }

      .av-close {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    `,
  ],
})
export class AvatarViewer {
  imageUrl = input<string | null>(null);
  alt = input('Foto de perfil');
  caption = input<string | null>(null);
  closed = output<void>();
}
